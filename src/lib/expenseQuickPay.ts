import dayjs from 'dayjs';
import { db, getDbInstance } from '../firebase';
import { doc, updateDoc, setDoc, collectionGroup, query, where, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { generateExpenseFlows } from './generateExpenseFlows';
import { getScheduledFlows, recalculateScheduledFlowFromAllocations } from './flows';
import { createPayment } from './payments';
import { createAllocation } from './allocations';

// Quick pay helper for Expense type A (retroactive regularization)
export async function quickPayExpense(
  orgId: string,
  propertyId: string,
  expenseId: string,
  expense: any,
  amount: number,
  options?: { startMonth?: number; startYear?: number; markExpensePaid?: boolean; updateExpenseAmount?: boolean; debug?: boolean }
): Promise<{ paymentId?: string; allocations: number; remaining: number; flowsAfter?: any[] }> {
  if (!orgId || !propertyId || !expenseId) throw new Error('orgId/propertyId/expenseId required');
  if (!(amount > 0)) throw new Error('amount must be > 0');

  // Respecter d'abord les options explicites, puis les valeurs stockées sur la dépense,
  // et seulement en dernier recours (si vraiment absentes partout) laisser undefined
  // pour que generateExpenseFlows retombe sur ses propres fallbacks.
  const startMonth = (typeof options?.startMonth !== 'undefined')
    ? options!.startMonth
    : (typeof (expense as any)?.startMonth !== 'undefined'
      ? Number((expense as any).startMonth)
      : undefined);
  const startYear = (typeof options?.startYear !== 'undefined')
    ? options!.startYear
    : (typeof (expense as any)?.startYear !== 'undefined'
      ? Number((expense as any).startYear)
      : undefined);


  // 1) Optionally update the expense document with the real amount BEFORE regenerating flows
  if (options?.updateExpenseAmount) {
    try {
  const dbInst = db || await getDbInstance();
  const expRef = doc(dbInst, 'orgs', orgId, 'properties', propertyId, 'expenses', expenseId);
      await updateDoc(expRef, { amount });
      if (expense && typeof expense === 'object') expense.amount = amount;
    } catch (e) {
      console.warn('quickPayExpense: failed to update expense amount', e);
    }
  }

  console.log('[quickPayExpense] orgId:', orgId, 'propertyId:', propertyId, 'expenseId:', expenseId, 'amount:', amount);
  // 2) Regenerate scheduled flows for the expense (idempotent w.r.t scheduled flows)
  const expenseWithCorrectId = { ...expense, id: expenseId };
  const dbForGen = db || await getDbInstance();
  // generateExpenseFlows utilise son propre import de db, qui peut être null au moment initial; s'assurer que l'instance est initialisée.
  if (!db) {
    // no-op: le module generateExpenseFlows importe db; si null, on pourrait envisager un refactor pour passer l'instance.
    // Ici on ne modifie pas la fonction, on se contente de garantir l'initialisation via getDbInstance().
  }
  await generateExpenseFlows(orgId, propertyId, expenseId, expenseWithCorrectId, { startMonth, startYear });

  // 2) Fetch scheduled flows for this expense (before allocation)
  const flows = await getScheduledFlows(orgId, { parentType: 'expense', parentId: expenseId });
  console.log('[quickPayExpense] getScheduledFlows returned', flows.length, 'flows');
  if (flows.length > 0) {
    console.log('[quickPayExpense] Example flow:', flows[0]);
  }
  if (options && options.debug) {
    try {
      console.debug('[quickPayExpense] flows BEFORE allocation', flows.map((f: any) => ({ id: f.id, status: f.status, allocated: f.allocatedAmount, remaining: f.remainingAmount, expected: f.amountExpected, parentType: f.parentType, parentId: f.parentId })));
    } catch (e) {
      console.warn('quickPayExpense: debug before logging failed', e);
    }
  }

  // Target flows that still have remaining to pay, and qui sont bien liés à la dépense en cours
  // (parentType === 'expense' && parentId === expenseId)
  let candidates = (flows || [])
    .map((f: any) => {
      const remainingAmt = (typeof f.remainingAmount === 'number')
        ? f.remainingAmount
        : (typeof f.amountExpected === 'number' ? f.amountExpected : 0);
      return { f, remainingAmt };
    })
    .filter((x) => (typeof x.remainingAmt === 'number' ? x.remainingAmt > 0 : false));


  // Sécurité supplémentaire : ne garder que les flows liés à la dépense en cours
  const filteredCandidates = [];
  for (const c of candidates) {
    const f = c.f;
    if (f.parentType === 'expense' && f.parentId === expenseId) {
      filteredCandidates.push(c);
    } else {
      console.warn(`[quickPayExpense] Ignored flow ${f.id}: parentId mismatch (expected ${expenseId}, got ${f.parentId}), parentType: ${f.parentType}`);
    }
  }
  candidates = filteredCandidates.sort((a: any, b: any) => {
    const ta = a.f.dueDate instanceof Date ? a.f.dueDate.getTime() : new Date(a.f.dueDate).getTime();
    const tb = b.f.dueDate instanceof Date ? b.f.dueDate.getTime() : new Date(b.f.dueDate).getTime();
    return ta - tb;
  });

  const scheduled = candidates.map((c) => c.f);
  console.log('[quickPayExpense] Flows retenus pour allocation:', scheduled.map(f => f.id));


  // 3) Create payment
  const payment = await createPayment(orgId, {
    amount,
    currency: 'EUR',
    date: new Date(),
    direction: 'out',
    status: 'open',
    memo: `Règlement régularisation A - ${expense?.label ?? expenseId}`,
    propertyId,
    parentType: 'expense',
    parentId: expenseId,
  });
  console.log('[quickPayExpense] Payment créé:', payment);

  let remaining = amount;
  let allocations = 0;
  // compute total remaining across candidate flows before allocation so we can
  // determine if the payment fully covers the outstanding projected flows
  const totalFlowRemaining = candidates.reduce((acc: number, c: any) => acc + (typeof c.remainingAmt === 'number' ? c.remainingAmt : 0), 0);
  // 4) Allocate FIFO to candidate flows (those with remaining > 0)

  for (const f of scheduled) {
    if (!(remaining > 0)) break;
    const flowRemaining = (typeof f.remainingAmount === 'number' && f.remainingAmount > 0)
      ? f.remainingAmount
      : (typeof f.amountExpected === 'number' ? f.amountExpected : 0);
    const toAlloc = Math.min(remaining, flowRemaining);
    if (toAlloc <= 0) continue;
    // round to cents to avoid float issues
    const rounded = Number(Math.round(toAlloc * 100) / 100);
    console.log(`[quickPayExpense] Allocation: paymentId=${payment.id}, flowId=${f.id}, amount=${rounded}, flowRemaining=${flowRemaining}, remainingAvant=${remaining}`);
  await createAllocation(orgId, payment.id, f.id, rounded, payment);
    // ensure recalculation has been applied for this flow (safety)
    try {
      await recalculateScheduledFlowFromAllocations(f.id, orgId);
    } catch (e) {
      console.warn('quickPayExpense: recalc failed for flow', f.id, e);
    }
    remaining = Math.round((remaining - rounded) * 100) / 100;
    allocations += 1;
  }

  // 5) Determine whether expense should be marked as paid.
  // If the allocated amount covers the totalFlowRemaining (even if there's leftover payment),
  // mark the expense as paid.
  const allocatedAmount = Math.round((amount - remaining) * 100) / 100;
  if ((options && options.markExpensePaid) && allocatedAmount + 0.001 >= Math.round(totalFlowRemaining * 100) / 100) {
    try {
      const dbInstPaid = db || await getDbInstance();
      const expRef = doc(dbInstPaid, 'orgs', orgId, 'properties', propertyId, 'expenses', expenseId);
      await updateDoc(expRef, { paidAt: new Date(), status: 'paid' });
    } catch (e) {
      // Non blocking: ignore
      console.warn('quickPayExpense: failed to update expense', e);
    }
  }

  // 6) Post-check: re-fetch scheduledFlows docs (with refs) to ensure the flows were recalculated
  // and mark them paid if their remainingAmount is <= 0. This is a safety pass because
  // recalculateScheduledFlowFromAllocations should have updated them, but in some cases
  // clients observed they were not updated; this pass makes the final state consistent.
  try {
  const dbInst = db || await getDbInstance();
  const q = query(collectionGroup(dbInst, 'scheduledFlows'), where('orgId', '==', orgId), where('parentType', '==', 'expense'), where('parentId', '==', expenseId), orderBy('dueDate', 'asc'));
    const snap = await getDocs(q);
    let totalRemainingAfter = 0;
    const updates: Array<Promise<void>> = [];
    // For each scheduledFlow doc, recompute allocatedAmount by summing allocations
    // targeting this flow. Then compute remainingAmount and status and persist.
    for (const d of snap.docs) {
      try {
        const data: any = d.data() || {};
        const expected = typeof data.amountExpected === 'number' ? data.amountExpected : 0;
        // Sum allocations for this flow
  const dbInst2 = db || await getDbInstance();
  const allocQ = query(collectionGroup(dbInst2, 'allocations'), where('flowId', '==', d.id), where('orgId', '==', orgId));
        const allocSnap = await getDocs(allocQ);
        let totalAllocatedForFlow = 0;
        allocSnap.forEach((ad) => {
          const adata: any = ad.data() || {};
          const aamt = typeof adata.amount === 'number' ? adata.amount : Number(adata.amount) || 0;
          totalAllocatedForFlow += aamt;
        });
        totalAllocatedForFlow = Math.round(totalAllocatedForFlow * 100) / 100;
        let rem = Math.max(0, Math.round((expected - totalAllocatedForFlow) * 100) / 100);
        totalRemainingAfter += rem;
        let statusToSet: any = 'scheduled';
        if (expected <= 0) statusToSet = 'paid';
        else if (rem <= 0) statusToSet = 'paid';
        else if (totalAllocatedForFlow > 0) statusToSet = 'partially_paid';
        else statusToSet = 'scheduled';
        updates.push((async () => {
          try {
            await updateDoc(d.ref, { allocatedAmount: totalAllocatedForFlow, remainingAmount: rem, status: statusToSet });
          } catch (err) {
            console.warn('quickPayExpense: updateDoc failed for flow doc, trying setDoc merge', d.id, err);
            try {
              await setDoc(d.ref, { allocatedAmount: totalAllocatedForFlow, remainingAmount: rem, status: statusToSet }, { merge: true });
            } catch (err2) {
              console.warn('quickPayExpense: setDoc merge also failed for flow doc', d.id, err2);
            }
          }
        })());
      } catch (e) {
        console.warn('quickPayExpense: failed to recompute flow allocations for doc', d.id, e);
      }
    }
    await Promise.all(updates);

    // If after allocations there is no remaining across flows, ensure expense is marked paid
    if ((options && options.markExpensePaid) && Math.round(totalRemainingAfter * 100) / 100 <= 0) {
      try {
  const dbInst3 = db || await getDbInstance();
  const expRef2 = doc(dbInst3, 'orgs', orgId, 'properties', propertyId, 'expenses', expenseId);
        await updateDoc(expRef2, { paidAt: new Date(), status: 'paid' });
      } catch (e) {
        console.warn('quickPayExpense: failed to update expense in post-check', e);
      }
    }
  } catch (e) {
    console.warn('quickPayExpense: post-check failed', e);
  }

  // fetch flows after allocations for diagnostics
  const flowsAfter = await getScheduledFlows(orgId, { parentType: 'expense', parentId: expenseId });
  if (options && options.debug) {
    try {
      console.debug('[quickPayExpense] flows AFTER allocation', flowsAfter.map((f: any) => ({ id: f.id, status: f.status, allocated: f.allocatedAmount, remaining: f.remainingAmount, expected: f.amountExpected })));
      console.debug('[quickPayExpense] paymentId, allocations, remaining:', payment.id, allocations, remaining);
    } catch (e) {
      console.warn('quickPayExpense: debug after logging failed', e);
    }
  }

  return { paymentId: payment.id, allocations, remaining, flowsAfter };
}
