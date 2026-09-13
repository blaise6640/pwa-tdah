import { getDbInstance } from '../firebase';
import type { QueryConstraint } from 'firebase/firestore';
import type { ScheduledFlow } from '../types/flows';
import { mapScheduledFlow } from '../types/flows';
import { updateDoc, DocumentReference } from 'firebase/firestore';
import dayjs from 'dayjs';

/**
 * Recalculate allocatedAmount / remainingAmount / status for a scheduledFlow
 * by aggregating allocations that point to this flow.
 */
export async function recalculateScheduledFlowFromAllocations(flowId: string, orgId: string): Promise<void> {
  if (!flowId || !orgId) throw new Error('flowId and orgId are required');

  try {
  const db = await getDbInstance();
  const { collectionGroup, query, where, getDocs, updateDoc, DocumentReference } = await import('firebase/firestore');

  // 1) gather allocations for this flow
  const allocQ = query(collectionGroup(db, 'allocations'), where('flowId', '==', flowId), where('orgId', '==', orgId));
  const allocSnap = await getDocs(allocQ);
    let totalAllocated = 0;
    // Regrouper les allocations par parentId
    const allocationsByParentId: Record<string, any[]> = {};
    allocSnap.forEach((d) => {
      const data: any = d.data();
      const amt = typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0;
      totalAllocated += amt;
      const parentId = data && typeof data.parentId === 'string' ? data.parentId : '__NO_PARENT__';
      if (!allocationsByParentId[parentId]) allocationsByParentId[parentId] = [];
      allocationsByParentId[parentId].push({ id: d.id, ...data });
    });

    // Round to cents
    totalAllocated = Math.round(totalAllocated * 100) / 100;

    // Vérifier qu'il n'y a pas plusieurs parentId différents référencés par des allocations
    // (plusieurs allocations pour le même parentId sont valides — plusieurs paiements peuvent cibler
    //  le même scheduledFlow — mais s'il y a des parentId différents cela indique une incohérence)
    const distinctParentIds = Object.keys(allocationsByParentId).filter(pid => pid !== '__NO_PARENT__');
    if (distinctParentIds.length > 1) {
      // Log détaillé pour diagnostic
      console.error('[recalculateScheduledFlowFromAllocations] Ambiguïté détectée pour flowId', flowId, 'orgId', orgId, 'parentIds', distinctParentIds, '\nAllocations trouvées:', allocationsByParentId);
      throw new Error('Ambiguïté: plusieurs parentId différents référencés pour ce flowId');
    }

    // Trouver le parentId attendu (s'il y en a)
    let expectedParentId: string | null = null;
    const parentIds = Object.keys(allocationsByParentId).filter(pid => pid !== '__NO_PARENT__');
    if (parentIds.length > 0) {
      expectedParentId = parentIds[0];
    }
    // If flowId looks like a full document path (even number of segments), we can query by __name__.
    // Otherwise (common case where flowId is just the doc id), collectionGroup where('__name__', '==', flowId)
    // will fail because it expects a path; fallback to scanning org-limited collectionGroup and matching doc.id.
    let flowDoc: any = null;
    try {
      const isPath = typeof flowId === 'string' && flowId.split('/').length % 2 === 0;
      if (isPath) {
        const flowQ = query(collectionGroup(db, 'scheduledFlows'), where('__name__', '==', flowId), where('orgId', '==', orgId));
        const flowSnap = await getDocs(flowQ);
        if (!flowSnap.empty) flowDoc = flowSnap.docs[0];
      } else {
        // fallback: query by orgId and scan for matching doc.id, but enforce expectedParentId if known
        const flowQ = query(collectionGroup(db, 'scheduledFlows'), where('orgId', '==', orgId));
        const flowSnap = await getDocs(flowQ);
        const matches = flowSnap.docs.filter((d) => d.id === flowId);
        if (matches.length === 0) {
          flowDoc = null;
        } else if (matches.length === 1 && !expectedParentId) {
          flowDoc = matches[0];
        } else {
          // If multiple documents share the same id, select the one matching expectedParentId
          const filtered = expectedParentId ? matches.filter((d) => {
            const pd = d.data();
            return pd && pd.parentId === expectedParentId;
          }) : matches;
          if (filtered.length === 1) {
            flowDoc = filtered[0];
          } else if (filtered.length > 1) {
            throw new Error('Ambiguïté: plusieurs scheduledFlows avec le même id et même parentId');
          } else {
            throw new Error('Flow introuvable pour id donné et parentId attendu');
          }
        }
      }
    } catch (e2) {
      // if something unexpected happens, log and rethrow
      console.error('recalculateScheduledFlowFromAllocations: error finding scheduledFlow', e2);
      throw e2;
    }

    if (!flowDoc) {
      console.warn('recalculateScheduledFlowFromAllocations: scheduledFlow not found for', flowId);
      return;
    }
    const flowData: any = flowDoc.data() || {};
    const expected = typeof flowData.amountExpected === 'number' ? flowData.amountExpected : Number(flowData.amountExpected) || 0;

    let remaining = Math.max(0, expected - totalAllocated);
    remaining = Math.round(remaining * 100) / 100;

    let status: ScheduledFlow['status'] = 'scheduled';
    if (expected <= 0) {
      status = 'paid';
    } else if (remaining <= 0) {
      status = 'paid';
    } else if (totalAllocated > 0) {
      status = 'partially_paid';
    } else {
      status = 'scheduled';
    }

    // 3) update only the three fields
    await updateDoc(flowDoc.ref as DocumentReference, {
      allocatedAmount: totalAllocated,
      remainingAmount: remaining,
      status,
    });
  } catch (e) {
    console.error('recalculateScheduledFlowFromAllocations error', e);
    throw e;
  }
}

type ParentType = 'lease' | 'expense' | 'loan';

export async function getScheduledFlows(
  orgId: string,
  options?: {
    parentType?: ParentType;
    parentId?: string;
    propertyId?: string;
    fromDate?: Date;
    toDate?: Date;
  }
): Promise<ScheduledFlow[]> {
  if (!orgId) throw new Error('orgId is required');

  // Load db and firestore helpers before building constraints
  const db = await getDbInstance();
  const { collectionGroup, query, where, orderBy, getDocs } = await import('firebase/firestore');

  // Build query constraints
  const constraints: QueryConstraint[] = [];
  constraints.push(where('orgId', '==', orgId));
  if (options?.parentType) constraints.push(where('parentType', '==', options.parentType));
  if (options?.parentId) constraints.push(where('parentId', '==', options.parentId));
  if (options?.propertyId) constraints.push(where('propertyId', '==', options.propertyId));
  if (options?.fromDate && options?.toDate) {
    const upperBound = dayjs(options.toDate).add(1, 'day').toDate();
    constraints.push(where('dueDate', '>=', options.fromDate));
    constraints.push(where('dueDate', '<', upperBound));
  } else {
    if (options?.fromDate) constraints.push(where('dueDate', '>=', options.fromDate));
    if (options?.toDate) constraints.push(where('dueDate', '<=', options.toDate));
  }
  constraints.push(orderBy('dueDate', 'asc'));

  console.log('[getScheduledFlows] params', { orgId, options });

  const q = query(collectionGroup(db, 'scheduledFlows'), ...constraints);
  let snap;
  try {
    snap = await getDocs(q);
  } catch (err: any) {
    console.error('[getScheduledFlows] collectionGroup query failed', err && (err.stack || err.message || err));
    // return empty array on failure
    return [];
  }

  console.log('[getScheduledFlows] query returned', snap.size, 'documents');
  const flows: ScheduledFlow[] = [];
  let first = true;
  snap.forEach((d: any) => {
    try {
      const mapped = mapScheduledFlow(d);
      if (first) {
        console.log('[getScheduledFlows] example flow', mapped);
        first = false;
      }
      flows.push(mapped);
    } catch (e: any) {
      console.warn('[getScheduledFlows] failed to map doc', d.id, e && (e.stack || e.message || e));
    }
  });

  return flows;
}
