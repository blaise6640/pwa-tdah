import { db } from '../firebase';
import { collection, doc, collectionGroup, query, where, getDocs, setDoc, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { recalculateScheduledFlowFromAllocations } from './flows';

/**
 * Create an allocation document under /orgs/{orgId}/payments/{paymentId}/allocations/{allocationId}
 * and update the corresponding scheduledFlow's allocatedAmount and status.
 */



export async function createAllocation(orgId: string, paymentId: string, flowId: string, amount: number, paymentDataArg?: any) {
  if (!orgId || !paymentId || !flowId) throw new Error('orgId, paymentId and flowId are required');
  if (!(amount > 0)) throw new Error('amount must be > 0');

  // Charger le flow pour enrichir l'allocation ET pour validation
  let parentType: string | undefined;
  let parentId: string | undefined;
  let groupId: string | undefined;
  let allocationExtra: Record<string, any> = {};
  let flowData: any = null;
  try {
    // Résolution stricte par chemin exact: évite collisions sur des ids génériques (ex: "flow_YYYY-MM")
    if (paymentDataArg && paymentDataArg.parentType === 'expense' && paymentDataArg.parentId && paymentDataArg.propertyId) {
      const exactRef = doc(db, 'orgs', orgId, 'properties', String(paymentDataArg.propertyId), 'expenses', String(paymentDataArg.parentId), 'scheduledFlows', flowId);
      const exactSnap = await getDoc(exactRef);
      if (exactSnap.exists()) {
        flowData = exactSnap.data();
      } else {
        throw new Error('Flow introuvable au chemin exact (expense)');
      }
    } else if (paymentDataArg && paymentDataArg.parentType === 'lease' && paymentDataArg.parentId) {
      // For leases, scheduledFlows are stored under flowGroups: /leases/{leaseId}/flowGroups/{groupId}/scheduledFlows/{flowId}
      // Try scanning the lease's flowGroups to locate the flow document.
      try {
        const groupsCol = collection(db, 'orgs', orgId, 'leases', String(paymentDataArg.parentId), 'flowGroups');
        const groupsSnap = await getDocs(groupsCol);
        for (const g of groupsSnap.docs) {
          try {
            const candidateRef = doc(db, 'orgs', orgId, 'leases', String(paymentDataArg.parentId), 'flowGroups', g.id, 'scheduledFlows', flowId);
            const candidateSnap = await getDoc(candidateRef);
            if (candidateSnap.exists()) {
              flowData = candidateSnap.data();
              break;
            }
          } catch (e) {
            // ignore per-group errors
          }
        }
        if (!flowData) throw new Error('Flow introuvable au chemin exact (lease)');
      } catch (e) {
        throw e;
      }
    } else if (paymentDataArg && paymentDataArg.parentType === 'loan' && paymentDataArg.parentId) {
      // For loans, scheduledFlows are usually stored under /loans/{loanId}/scheduledFlows/{flowId}
      try {
        const exactRef = doc(db, 'orgs', orgId, 'loans', String(paymentDataArg.parentId), 'scheduledFlows', flowId);
        const exactSnap = await getDoc(exactRef);
        if (exactSnap.exists()) {
          flowData = exactSnap.data();
        } else {
          // Fallback: try collectionGroup search constrained by orgId, parentType and parentId
          const flowQ = query(collectionGroup(db, 'scheduledFlows'), where('orgId', '==', orgId), where('parentType', '==', 'loan'), where('parentId', '==', String(paymentDataArg.parentId)), where('__name__', '==', flowId));
          const flowSnap = await getDocs(flowQ);
          if (!flowSnap.empty) {
            flowData = flowSnap.docs[0].data();
          } else {
            throw new Error('Flow introuvable au chemin exact (loan)');
          }
        }
      } catch (e) {
        throw e;
      }
    } else {
      // Pour d'autres parentType (ex: loan?) ou si le contexte est incomplet, on échoue ici
      throw new Error('Contexte paiement incomplet pour résoudre le flow');
    }
    if (flowData) {
      parentType = flowData.parentType;
      parentId = flowData.parentId;
      groupId = flowData.groupId;
      // Enrichissement pour les dépenses : récupérer label et category
      if (parentType === 'expense' && parentId) {
        try {
          const propertyId = flowData.propertyId;
          if (propertyId) {
            const expenseSnap = await getDocs(query(collection(db, 'orgs', orgId, 'properties', propertyId, 'expenses'), where('__name__', '==', parentId)));
            let expenseData;
            if (!expenseSnap.empty) {
              expenseData = expenseSnap.docs[0].data();
            }
            if (expenseData) {
              allocationExtra.label = expenseData.label;
              allocationExtra.category = expenseData.category;
            }
          }
        } catch (e) {
          console.error('createAllocation: failed to fetch expense for enrichment', e);
        }
      }
    }
  } catch (e) {
    console.error('createAllocation: failed to fetch flow for enrichment', e);
  }

  // Charger le paiement pour validation (si non fourni)
  let paymentData: any = paymentDataArg ?? null;
  if (!paymentData) {
    try {
      const paymentRef = doc(db, 'orgs', orgId, 'payments', paymentId);
      const paymentSnap = await getDoc(paymentRef);
      if (paymentSnap.exists()) {
        paymentData = paymentSnap.data();
      }
    } catch (e) {
      // non bloquant ici
    }
  }

  // Sécurité : si le paiement est ciblé (parentType && parentId définis), vérifier la cohérence du flow
  if (paymentData && paymentData.parentType && paymentData.parentId) {
    if (!flowData) {
      throw new Error('Incohérence : flow introuvable pour allocation');
    }
    if (
      flowData.orgId !== orgId ||
      flowData.parentType !== paymentData.parentType ||
      flowData.parentId !== paymentData.parentId
    ) {
      throw new Error('Incohérence : allocation vers un flow externe à la cible du paiement');
    }
  }

  // Fallback : si parentType absent mais parentId et groupId présents, on suppose 'lease'
  if (!parentType && parentId && groupId) {
    parentType = 'lease';
  }
  const allocationData: Record<string, any> = {
    orgId,
    paymentId,
    flowId,
    amount,
    createdAt: serverTimestamp(),
  };
  if (parentType !== undefined) allocationData.parentType = parentType;
  if (parentId !== undefined) allocationData.parentId = parentId;
  if (groupId !== undefined) allocationData.groupId = groupId;
  // Ajout des champs enrichis pour expense
  if (Object.keys(allocationExtra).length > 0) {
    Object.assign(allocationData, allocationExtra);
  }

  const allocationsCol = collection(db, 'orgs', orgId, 'payments', paymentId, 'allocations');
  const allocationRef = doc(allocationsCol);
  // Before creating the allocation, ensure there's no ambiguity with existing allocations
  try {
    const existingQ = query(collectionGroup(db, 'allocations'), where('flowId', '==', flowId), where('orgId', '==', orgId));
    const existingSnap = await getDocs(existingQ);
    const existingParentIds = new Set<string>();
    existingSnap.forEach((d) => {
      const dd: any = d.data();
      if (dd && typeof dd.parentId === 'string') existingParentIds.add(dd.parentId as string);
      else existingParentIds.add('__NO_PARENT__');
    });
    // If there are existing allocations for the same flow but with different parentId(s), refuse to create
    if (existingParentIds.size > 0) {
      // If there is at least one existing parentId that differs from the flow's parentId, it's ambiguous
      const currentParent = parentId ?? '__NO_PARENT__';
      const hasDifferent = Array.from(existingParentIds).some((pid: string) => pid !== currentParent);
      if (hasDifferent) {
        const msg = `Ambiguïté: allocations existantes pour flowId=${flowId} avec parentIds=[${Array.from(existingParentIds).join(',')}], cannot create allocation for parentId=${parentId}`;
        console.error('createAllocation: ambiguity detected', { flowId, orgId, existingParentIds: Array.from(existingParentIds), parentId });
        throw new Error(msg);
      }
    }
  } catch (e) {
    // If the check fails (query error), fail fast
    console.error('createAllocation: failed to validate existing allocations for ambiguity', e);
    throw e;
  }

  await setDoc(allocationRef, allocationData);

  // Recalculate the scheduledFlow aggregates (allocatedAmount / remaining / status)
  try {
    await recalculateScheduledFlowFromAllocations(flowId, orgId);
  } catch (e) {
    console.error('createAllocation: failed to recalculate scheduledFlow', e);
  }

  // Update the payment's remaining amount transactionally so the payment
  // remains the single source of truth for remaining funds.
  try {
    const paymentRef = doc(db, 'orgs', orgId, 'payments', paymentId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(paymentRef);
      if (!snap.exists()) return;
      const data: any = snap.data() || {};
      const currentRemaining = typeof data.amountRemaining === 'number'
        ? data.amountRemaining
        : (typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0);
      const originalAmount = typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0;
      const newRemaining = Math.max(0, currentRemaining - amount);
      const EPSILON = 0.01;
      const newStatus = newRemaining <= EPSILON ? 'allocated' : (newRemaining < originalAmount ? 'partially_allocated' : 'open');
      tx.update(paymentRef, { amountRemaining: newRemaining, status: newStatus });
    });
  } catch (e) {
    console.error('createAllocation: failed to update payment amountRemaining', e);
  }
}
import type { Allocation } from '../types/payments';
import { mapAllocation } from '../types/payments';

export async function getAllocationsForFlow(flowId: string, orgId: string): Promise<Allocation[]> {
  if (!flowId || !orgId) return [];
  const q = query(
    collectionGroup(db, 'allocations'),
    where('flowId', '==', flowId),
    where('orgId', '==', orgId)
  );
  const snap = await getDocs(q);
  console.log('[getAllocationsForFlow]', flowId, '→', snap.docs.length, 'documents');
  return snap.docs.map(mapAllocation);
  
}

/**
 * Fetch allocations that belong to a specific payment (/orgs/{orgId}/payments/{paymentId}/allocations)
 */
export async function getAllocationsForPayment(paymentId: string, orgId: string): Promise<Allocation[]> {
  if (!paymentId || !orgId) return [];
  const col = collection(db, 'orgs', orgId, 'payments', paymentId, 'allocations');
  const snap = await getDocs(query(col));
  console.log('[getAllocationsForPayment]', paymentId, '→', snap.docs.length, 'documents');
  return snap.docs.map(mapAllocation);
}
