import { getScheduledFlows, recalculateScheduledFlowFromAllocations } from '../lib/flows';
import type { ScheduledFlow } from '../types/flows';
import { db } from '../firebase';
import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import { createFlowDocIdShort } from '../lib/flowIds';
import { createAllocation } from '../lib/allocations';

export type RegularizationPreviewRow = {
  monthLabel: string;
  initialAmount: number;
  adjustment: number;
  newAmount?: number;
  strategy: 'update' | 'microflow';
};

export async function previewRegularizationA(params: {
  orgId: string;
  expenseId: string;
  amountReal: number;
  paymentDate: Date;
}): Promise<RegularizationPreviewRow[]> {
  const { orgId, expenseId, amountReal } = params;
  if (!orgId || !expenseId) throw new Error('orgId and expenseId are required');

  // Load scheduled flows for this expense
  const flows = await getScheduledFlows(orgId, { parentType: 'expense', parentId: expenseId });

  if (!flows || flows.length === 0) {
    throw new Error('Aucun flux trouvé pour cette dépense');
  }

  // Filter out void and already-regularization tagged flows
  const candidateFlows: ScheduledFlow[] = flows.filter(f => f.status !== 'void' && (!Array.isArray(f.tags) || !f.tags.includes('regularization')));

  if (!candidateFlows || candidateFlows.length === 0) {
    throw new Error('Aucun flux éligible à la régularisation (tous void ou marqués regularization)');
  }

  // sumForecast = sum of amountExpected
  const sumForecast = candidateFlows.reduce((s, f) => s + (typeof f.amountExpected === 'number' ? f.amountExpected : 0), 0);

  // delta in euros
  const delta = Math.round((amountReal - sumForecast) * 100) / 100;

  if (Math.abs(delta) < 0.005) {
    // no adjustment necessary (delta == 0)
    return [];
  }

  return distributeDeltaAcrossFlows(delta, candidateFlows);
}

export default {
  previewRegularizationA,
};

/**
 * Prévisualisation pour la régularisation de type B (ajout de flux)
 * Retourne des lignes compatibles avec RegularizationPreviewRow (monthLabel, initialAmount, adjustment, strategy)
 */
export async function previewRegularizationB(params: {
  orgId: string;
  expenseId: string;
  amountReal: number;
  paymentDate: Date;
  periodStart: string; // YYYY-MM
  periodEnd: string; // YYYY-MM
  distribution: 'single' | 'monthly' | 'monthly_prorata';
  direction?: 'in' | 'out';
}): Promise<RegularizationPreviewRow[]> {
  const { amountReal, periodStart, periodEnd, distribution, paymentDate } = params;
  if (!periodStart || !periodEnd) throw new Error('Période invalide');

  function monthsBetween(start: string, end: string) {
    const [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    const months: { y: number; m: number }[] = [];
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      months.push({ y, m });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  }

  if (distribution === 'single') {
    const d = paymentDate instanceof Date ? paymentDate : new Date(paymentDate);
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return [{ monthLabel, initialAmount: 0, adjustment: Math.round(amountReal * 100) / 100, strategy: 'microflow' }];
  }

  const months = monthsBetween(periodStart, periodEnd);
  if (months.length === 0) throw new Error('Période vide');

  const rows: RegularizationPreviewRow[] = [];
  const cents = Math.round(amountReal * 100);

  if (distribution === 'monthly') {
    const base = Math.trunc(cents / months.length);
    let rem = cents - base * months.length;
    for (const { y, m } of months) {
      const amtCents = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem -= 1;
      rows.push({ monthLabel: `${y}-${String(m).padStart(2, '0')}`, initialAmount: 0, adjustment: amtCents / 100, strategy: 'microflow' });
    }
    return rows;
  }

  // monthly_prorata
  function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
  let totalDays = 0;
  const monthDays: number[] = [];
  for (const { y, m } of months) {
    const d = daysInMonth(y, m);
    monthDays.push(d);
    totalDays += d;
  }
  let distributed = 0;
  for (let i = 0; i < months.length; i++) {
    const { y, m } = months[i];
    const share = Math.round(cents * (monthDays[i] / totalDays));
    distributed += share;
    rows.push({ monthLabel: `${y}-${String(m).padStart(2, '0')}`, initialAmount: 0, adjustment: share / 100, strategy: 'microflow' });
  }
  const diff = cents - distributed;
  if (diff !== 0 && rows.length > 0) {
    rows[0].adjustment = +(rows[0].adjustment + diff / 100).toFixed(2);
  }
  return rows;
}

/**
 * Appliquer la régularisation type B: créer les flux (microflows ou flux) et allouer le paiement
 * Nécessite propertyId pour savoir où créer la sous-collection scheduledFlows
 */
export async function handleExpenseRegularizationB(params: {
  orgId: string;
  propertyId: string;
  expenseId: string;
  paymentId: string;
  amountReal: number;
  paymentDate: Date;
  periodStart: string; // YYYY-MM
  periodEnd: string; // YYYY-MM
  distribution: 'single' | 'monthly' | 'monthly_prorata';
  direction?: 'in' | 'out';
}) {
  const { orgId, propertyId, expenseId, paymentId, amountReal, paymentDate, periodStart, periodEnd, distribution } = params;
  if (!orgId || !expenseId || !propertyId) throw new Error('orgId, propertyId and expenseId are required');

  const preview = await previewRegularizationB({ orgId, expenseId, amountReal, paymentDate, periodStart, periodEnd, distribution });
  if (!preview || preview.length === 0) return { applied: false, createdFlows: [] };

  const createdFlows: { id: string; amount: number }[] = [];

  await runTransaction(db, async (tx) => {
    // For each preview row create a scheduledFlow under the expense and an allocation under the payment
    for (const row of preview) {
      const parentCol = collection(db, 'orgs', orgId, 'properties', propertyId, 'expenses', expenseId, 'scheduledFlows');
      const dueDate = new Date(row.monthLabel + '-01');
      const y = dueDate.getFullYear();
      const m = String(dueDate.getMonth() + 1).padStart(2, '0');
      const logicalBase = `flow_${y}-${m}`;
      // insert '-r' marker into logical id so produced id looks like: flow_YYYY-MM-r-<suffix>
      const logicalIdWithR = `${logicalBase}-r`;
      const customId = createFlowDocIdShort(logicalIdWithR);
      const newFlowRef = doc(parentCol, customId);
      const amt = Math.round((row.adjustment ?? 0) * 100) / 100;
      // create flow marked as paid and fully allocated
      tx.set(newFlowRef, {
        orgId,
        parentType: 'expense',
        parentId: expenseId,
        dueDate,
        direction: params.direction || 'out',
        propertyId,
        amountExpected: amt,
        status: 'paid',
        allocatedAmount: amt,
        remainingAmount: 0,
        tags: ['regularization', 'adjustment'],
        createdAt: serverTimestamp(),
        id: customId,
        logicalId: logicalIdWithR,
      });

      // We'll create allocations AFTER the transaction using the public helper
      createdFlows.push({ id: customId, amount: amt });
    }

    // Update payment to reflect allocation
    const paymentRef = doc(db, 'orgs', orgId, 'payments', paymentId);
    try {
      tx.update(paymentRef, { allocatedAmount: amountReal, amountRemaining: 0, status: 'allocated' });
    } catch (err) {
      // ignore
    }

    // Log regularization
    const logRef = doc(collection(db, `orgs/${orgId}/regularizations`));
    tx.set(logRef, {
      orgId,
      expenseId,
      paymentId,
      mode: 'adjustment',
      amountReal,
      periodStart,
      periodEnd,
      distribution,
      createdAt: serverTimestamp(),
    });
  });


  // After the transaction committed the flows, create allocations using the public helper
  let allocationsCreated = 0;
  let totalAllocated = 0;
  for (const f of createdFlows) {
    try {
      // paymentId is available in the outer scope
      await createAllocation(orgId, paymentId, f.id, f.amount, { parentType: 'expense', parentId: expenseId, propertyId });
      allocationsCreated += 1;
      totalAllocated += f.amount;
    } catch (e) {
      console.error('Failed to create allocation for regularization flow', f.id, e);
      // continue creating other allocations
    }
  }

  return { applied: true, createdFlows: createdFlows.map(f => f.id), allocationsCreated, totalAllocated };
}

/**
 * Pure helper: distribute a delta (euros) uniformly across flows and produce preview rows.
 * Exported for local testing.
 */
export function distributeDeltaAcrossFlows(delta: number, candidateFlows: ScheduledFlow[]): RegularizationPreviewRow[] {
  const n = candidateFlows.length;
  const totalCents = Math.round(delta * 100);
  const baseCents = Math.trunc(totalCents / n);
  let remainder = totalCents - baseCents * n;
  const rows: RegularizationPreviewRow[] = [];
  for (let i = 0; i < n; i++) {
    const f = candidateFlows[i];
    let cents = baseCents;
    if (remainder > 0) {
      cents += 1;
      remainder -= 1;
    } else if (remainder < 0) {
      cents -= 1;
      remainder += 1;
    }
    const adjustment = cents / 100;
    const initialAmount = typeof f.amountExpected === 'number' ? f.amountExpected : 0;
    const strategy: 'update' | 'microflow' = (f.status === 'scheduled' || f.status === 'overdue') ? 'update' : 'microflow';
    const newAmount = strategy === 'update' ? Math.round((initialAmount + adjustment) * 100) / 100 : undefined;
    const d = f.dueDate instanceof Date ? f.dueDate : new Date(f.dueDate);
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    rows.push({ monthLabel, initialAmount, adjustment, newAmount, strategy });
  }
  return rows;
}

export async function handleExpenseRegularizationA(params: {
  orgId: string;
  expenseId: string;
  paymentId: string;
  amountReal: number;
  paymentDate: Date;
}) {
  const { orgId, expenseId } = params;
  if (!orgId || !expenseId) throw new Error('orgId and expenseId are required');

  // Load scheduledFlows as QueryDocumentSnapshots so we can update via ref
  // We'll reuse getScheduledFlows to fetch mapped objects, but we need the underlying docs.
  // Simpler: run a collectionGroup query similar to getScheduledFlows but keep snapshots
  const snaps = await (async () => {
    // reuse the internal query logic from getScheduledFlows via direct call
    // fallback: call getScheduledFlows to get objects (with ids) and then find their doc refs by collectionGroup scan
    const flows = await getScheduledFlows(orgId, { parentType: 'expense', parentId: expenseId });
    if (!flows || flows.length === 0) throw new Error('Aucun flux trouvé pour cette dépense');
    // Now attempt to locate each document by scanning collectionGroup and matching id (inefficient but safe)
    // Use collectionGroup query from lib/flows (can't access inner snap), so we perform our own collectionGroup query
    const { collectionGroup, query, where, getDocs } = await import('firebase/firestore');
    const q = query(collectionGroup(db, 'scheduledFlows'), where('orgId', '==', orgId), where('parentType', '==', 'expense'), where('parentId', '==', expenseId));
    const snap = await getDocs(q);
    return { mapped: flows, snap };
  })();

  const flowsMapped: ScheduledFlow[] = snaps.mapped;
  const snap = snaps.snap;

  // Build array of pairs { flow, docSnap }
  const docMap: Map<string, any> = new Map();
  snap.forEach((d: any) => {
    docMap.set(d.id, d);
  });

  const candidatePairs: { flow: ScheduledFlow; docSnap: any }[] = flowsMapped
    .filter((f) => f.status !== 'void' && (!Array.isArray(f.tags) || !f.tags.includes('regularization')))
    .map((f) => ({ flow: f, docSnap: docMap.get(f.id) }))
    .filter(p => p.docSnap);

  if (candidatePairs.length === 0) throw new Error('Aucun flux éligible à la régularisation');

  const sumForecast = candidatePairs.reduce((s, p) => s + (typeof p.flow.amountExpected === 'number' ? p.flow.amountExpected : 0), 0);
  const delta = Math.round((params.amountReal - sumForecast) * 100) / 100;
  if (Math.abs(delta) < 0.005) return { applied: false, delta: 0 };

  // Distribute across flows (pure function) - returns rows in same order
  const candidateFlows = candidatePairs.map(p => p.flow);
  const rows = distributeDeltaAcrossFlows(delta, candidateFlows);

  // pair rows with doc snaps
  const distribution = candidatePairs.map((p, idx) => ({ flow: p.flow, docSnap: p.docSnap, ...rows[idx] }));
  // We'll collect affected flow IDs so we can recalculate aggregates after the transaction
  const affectedFlowIds: string[] = [];

  await runTransaction(db, async (tx) => {
    for (const item of distribution) {
      const flowRef = item.docSnap.ref;
      // Determine effective strategy for application:
      // - If original flow is already 'paid' -> create a microflow paid
      // - If original flow is 'partially_paid' -> apply update to set it paid
      // - Otherwise use item.strategy (update for scheduled/overdue)
      let effectiveStrategy: 'update' | 'microflow' = item.strategy;
      if (item.flow.status === 'paid') effectiveStrategy = 'microflow';
      if (item.flow.status === 'partially_paid') effectiveStrategy = 'update';

      if (effectiveStrategy === 'update') {
        const newAmount = +(item.flow.amountExpected + item.adjustment).toFixed(2);
        tx.update(flowRef, {
          amountExpected: newAmount,
          status: 'paid',
          allocatedAmount: newAmount,
          remainingAmount: 0,
        });

        // create allocation under the payment for this updated flow
        const allocRef = doc(collection(db, 'orgs', orgId, 'payments', params.paymentId, 'allocations'));
        tx.set(allocRef, {
          orgId: params.orgId,
          paymentId: params.paymentId,
          flowId: item.flow.id,
          amount: newAmount,
          // parent context so allocations include pivot info
          parentType: 'expense',
          parentId: expenseId,
          propertyId: item.flow.propertyId ?? (item.docSnap && item.docSnap.data && typeof item.docSnap.data === 'function' ? item.docSnap.data().propertyId : (item.docSnap && item.docSnap.data ? item.docSnap.data.propertyId : null)) ?? null,
          createdAt: serverTimestamp(),
        });

        // record affected flow id (original flow)
        affectedFlowIds.push(item.flow.id);
      } else {
        // create a micro adjustment flow as a sibling in the same scheduledFlows collection
        const parentCol = item.docSnap.ref.parent; // should point to scheduledFlows collection
        const adjRef = doc(parentCol);
        const adjAmount = +(item.adjustment).toFixed(2);
        // Microflow is created and set to paid (include pivot propertyId so UI mapping works)
        tx.set(adjRef, {
          orgId,
          parentType: 'expense',
          parentId: expenseId,
          dueDate: item.flow.dueDate instanceof Date ? item.flow.dueDate : new Date(item.flow.dueDate),
          direction: 'out',
          amountExpected: adjAmount,
          status: 'paid',
          allocatedAmount: adjAmount,
          remainingAmount: 0,
          tags: ['regularization', 'micro'],
          createdAt: serverTimestamp(),
          // Ensure pivot field so UI mapping can find the property
          propertyId: item.flow.propertyId ?? (item.docSnap && item.docSnap.data && typeof item.docSnap.data === 'function' ? item.docSnap.data().propertyId : (item.docSnap && item.docSnap.data ? item.docSnap.data.propertyId : null)) ?? null,
          // include id for consistency with other scheduledFlows
          id: adjRef.id,
        });

        // create allocation under the payment for this microflow (pointing to the newly created microflow id)
        const allocRef = doc(collection(db, 'orgs', orgId, 'payments', params.paymentId, 'allocations'));
        tx.set(allocRef, {
          orgId: params.orgId,
          paymentId: params.paymentId,
          flowId: adjRef.id,
          amount: adjAmount,
          // parent context to help downstream enrichment / UI
          parentType: 'expense',
          parentId: expenseId,
          propertyId: item.flow.propertyId ?? (item.docSnap && item.docSnap.data && typeof item.docSnap.data === 'function' ? item.docSnap.data().propertyId : (item.docSnap && item.docSnap.data ? item.docSnap.data.propertyId : null)) ?? null,
          createdAt: serverTimestamp(),
        });

        // record affected flow id (new microflow)
        affectedFlowIds.push(adjRef.id);
      }
    }

    // Update expense amount to reflect real amount and mark as paid
    // Attempt to derive expenseRef from the first docSnap parent; fallback to root path
    const firstDoc = distribution[0]?.docSnap;
    let expenseRef = null;
    if (firstDoc && firstDoc.ref && firstDoc.ref.parent && firstDoc.ref.parent.parent) {
      expenseRef = firstDoc.ref.parent.parent; // should point to expense doc
    } else {
      expenseRef = doc(db, `orgs/${orgId}/expenses/${expenseId}`);
    }
    try {
      tx.update(expenseRef, { amount: params.amountReal, status: 'paid' });
    } catch (err) {
      // If update fails, still proceed to log but surface error later
      console.warn('Failed to update expense amount in transaction', err);
    }

    // Update payment: mark as fully allocated
    try {
      const paymentRef = doc(db, 'orgs', orgId, 'payments', params.paymentId);
      tx.update(paymentRef, {
        allocatedAmount: params.amountReal,
        amountRemaining: 0,
        status: 'allocated',
      });
    } catch (err) {
      console.warn('Failed to update payment in transaction', err);
    }

    // log
    const logRef = doc(collection(db, `orgs/${orgId}/regularizations`));
    tx.set(logRef, {
      orgId,
      expenseId,
      paymentId: params.paymentId,
      mode: 'retroactive',
      delta,
      createdAt: serverTimestamp(),
    });
  });

  // After the transaction commits, trigger recalculation for each affected flow
  try {
    for (const fId of affectedFlowIds) {
      try {
        await recalculateScheduledFlowFromAllocations(fId, orgId);
      } catch (e) {
        console.warn('Failed to recalculate scheduledFlow after regularization for', fId, e);
      }
    }
  } catch (e) {
    console.error('Error when recalculating scheduled flows after regularization transaction', e);
  }

  return { applied: true, delta };
}
