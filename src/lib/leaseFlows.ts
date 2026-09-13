import { doc, getDoc, collection, addDoc, serverTimestamp, collectionGroup, query, where, getDocs, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import { createFlowDocIdShort } from './flowIds';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { db } from '../firebase';
import { Lease } from './leases';
import type { GeneratedFlow } from './leaseFlowsGenerator.js';
import { buildLeaseFlows, makeFlowKey } from './leaseFlowsGenerator.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

export interface GenerateLeaseFlowsOptions {
  prorataFirstMonth?: boolean; // default true
  prorataLastMonth?: boolean; // default false
  preview?: boolean; // if true, do not persist, return generated flows
}

type ExistingFlowInfo = {
  id: string;
  status: string;
  logicalId: string | null;
  ref: any;
  data: any;
};

const normalizeToDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const computeLogicalId = (date: Date | null, tags: any[]): string | null => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const baseId = `flow_${year}-${month}`;
  const primaryTag = Array.isArray(tags) && tags.length > 0 ? String(tags[0] ?? '').toLowerCase().replace(/\s+/g, '_') : '';
  return primaryTag ? `${baseId}_${primaryTag}` : baseId;
};

const buildExistingFlowIndex = (snapshot: any) => {
  const entries: ExistingFlowInfo[] = [];
  const byLogicalId = new Map<string, ExistingFlowInfo[]>();
  if (!snapshot) return { entries, byLogicalId };
  snapshot.forEach((docSnap: any) => {
    const data = docSnap.data ? docSnap.data() : undefined;
    const status = String(data?.status || '').toLowerCase();
    const dueDate = normalizeToDate(data?.dueDate);
    const logicalFromDoc = typeof data?.logicalId === 'string' && data.logicalId ? data.logicalId : null;
    const computedLogicalId = logicalFromDoc || computeLogicalId(dueDate, data?.tags || []);
    const info: ExistingFlowInfo = {
      id: docSnap.id,
      status,
      logicalId: computedLogicalId || null,
      ref: docSnap.ref,
      data,
    };
    entries.push(info);
    if (computedLogicalId) {
      const bucket = byLogicalId.get(computedLogicalId) || [];
      bucket.push(info);
      byLogicalId.set(computedLogicalId, bucket);
    }
  });
  return { entries, byLogicalId };
};

/**
 * Génère les flows et les persiste par défaut.
 * Si options.preview === true alors ne persiste pas et retourne les flows générés.
 */
export async function generateLeaseFlows(orgId: string, leaseId: string, options: GenerateLeaseFlowsOptions = {}): Promise<any> {
  const { prorataFirstMonth = true, prorataLastMonth = false, preview = false } = options;
  // Récupérer le bail
  const leaseRef = doc(db, 'orgs', orgId, 'leases', leaseId);
  const leaseSnap = await getDoc(leaseRef);
  if (!leaseSnap.exists()) throw new Error(`Lease ${leaseId} not found for org ${orgId}`);
  const lease = leaseSnap.data() as Lease;

  // Créer (ou réutiliser) un flowGroup : use deterministic id to make client-side idempotent
  let groupId: string;
  if (preview) {
    // En preview, on utilise quand même l'ID déterministe pour vérifier l'existence de docs sans écrire
    groupId = `generated_${leaseId}`;
  } else {
    // Deterministic id matches server-side `generated_${leaseId}`
    groupId = `generated_${leaseId}`;
    try {
      const groupRef = doc(db, 'orgs', orgId, 'leases', leaseId, 'flowGroups', groupId);
      const gSnap = await getDoc(groupRef);
      if (!gSnap.exists()) {
        // create with setDoc so we don't create duplicates
        await setDoc(groupRef, {
          label: `Flux du bail ${leaseId}`,
          createdAt: serverTimestamp(),
          parentType: 'lease',
          parentId: leaseId,
          createdByGenerator: true,
        } as any);
      }
    } catch (err) {
      console.warn('Failed to ensure deterministic flowGroup on client, falling back to addDoc', err);
      const groupCol = collection(db, 'orgs', orgId, 'leases', leaseId, 'flowGroups');
      const groupRef = await addDoc(groupCol, {
        label: `Flux du bail ${leaseId}`,
        createdAt: serverTimestamp(),
        parentType: 'lease',
        parentId: leaseId,
      } as any);
      groupId = groupRef.id;
    }
  }

  const scheduledFlowsCol = (gId: string) => collection(db, 'orgs', orgId, 'leases', leaseId, 'flowGroups', gId, 'scheduledFlows');

  const start = dayjs(lease.startDate.toDate());
  const end = lease.endDate ? dayjs(lease.endDate.toDate()) : start.add(1, 'year').subtract(1, 'day');

  // Helper pour créer un scheduledFlow object
  const makeFlow = (opts: {
    direction: 'in' | 'out';
    amountExpected: number;
    dueDate: dayjs.Dayjs;
    tags: string[];
  }) => ({
    direction: opts.direction,
    amountExpected: Math.round((opts.amountExpected + Number.EPSILON) * 100) / 100,
    dueDate: opts.dueDate.toDate(),
    currency: 'EUR',
    status: 'scheduled',
    tags: opts.tags,
    parentType: 'lease',
    parentId: leaseId,
    groupId,
    createdAt: preview ? new Date() : serverTimestamp(),
  });

  // Use shared generator to build flows (pure, deterministic)
  const flowsToCreate: GeneratedFlow[] = buildLeaseFlows({ ...lease, id: leaseId }, { prorataFirstMonth, prorataLastMonth });

  // Temporary debug log to confirm execution
  try {
    const count = Array.isArray(flowsToCreate) ? flowsToCreate.length : 0;
    console.log(`✅ Lease flows generated for ${leaseId}, count: ${count}`);
  } catch (e) {
    // swallow
  }

  // Si preview -> ne pas persister. On retourne une liste d'objets détaillant l'action
  // prévue par flux (create/skip) selon l'état existant.
  // Apply prorata for last month when requested (post-process generated flows)
  if (prorataLastMonth) {
    try {
      const leaseEnd = end;
      let adjusted = 0;
      const prorataApplicable = new Set(['loyer', 'charges_privatives', 'charges_communes']);
      for (const f of flowsToCreate) {
        // Apply prorata to rents and charges (loyer, charges_privatives, charges_communes)
        if (!Array.isArray(f.tags) || !f.tags.some(t => prorataApplicable.has(String(t)))) continue;

        // normalize dueDate to dayjs
        const due = (f.dueDate instanceof Date) ? dayjs(f.dueDate) : (typeof (f.dueDate as any)?.toDate === 'function' ? dayjs((f.dueDate as any).toDate()) : dayjs(f.dueDate as any));
        const periodStart = due.startOf('day');
        const periodEnd = due.add(1, 'month').subtract(1, 'day').endOf('day');

        // If lease ends before the end of the due period but after or on the period start => prorate
        if (leaseEnd.isBefore(periodEnd) && (leaseEnd.isSame(periodStart) || leaseEnd.isAfter(periodStart))) {
          const daysInPeriod = periodEnd.diff(periodStart, 'day') + 1;
          const daysCovered = leaseEnd.diff(periodStart, 'day') + 1;
          const fraction = Math.max(0, Math.min(1, daysCovered / daysInPeriod));
          const old = f.amountExpected;
          f.amountExpected = Math.round((old * fraction + Number.EPSILON) * 100) / 100;
          // add a tag to indicate prorata applied
          if (!f.tags.includes('prorata')) f.tags.push('prorata');
          adjusted++;
        }
      }
      if (adjusted > 0) console.log(`Applied prorataLastMonth to ${adjusted} flow(s) for lease ${leaseId}`);
    } catch (err) {
      console.warn('Failed to apply prorataLastMonth post-processing', err);
    }
  }

  const colRef = scheduledFlowsCol(groupId);
  let existingSnapshot: any = null;
  let existingIndex = { entries: [] as ExistingFlowInfo[], byLogicalId: new Map<string, ExistingFlowInfo[]>() };
  try {
    existingSnapshot = await getDocs(colRef);
    existingIndex = buildExistingFlowIndex(existingSnapshot);
  } catch (err) {
    console.warn('Failed to load existing scheduled flows for group', groupId, err);
  }

  if (preview) {
    const results: Array<{ action: 'create' | 'skip'; key: string; existingId?: string | null; reason?: string | null; flow: GeneratedFlow }>
      = [];
    for (const f of flowsToCreate) {
      // normalize dueDate -> Date
      const d = normalizeToDate(f.dueDate);
      const preferredLogicalId = computeLogicalId(d, f.tags || []);
      const fallbackLogical = d && Array.isArray(f.tags) && f.tags.length ? makeFlowKey(d, f.tags[0]) : null;
      const logicalId = preferredLogicalId || fallbackLogical || `flow_${d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown'}`;
      const matches = existingIndex.byLogicalId.get(logicalId) || [];
      const scheduledExisting = matches.find((m) => m.status === 'scheduled');

      if (scheduledExisting) {
        results.push({ action: 'update', key: logicalId, existingId: scheduledExisting.id, reason: null, flow: f });
        continue;
      }

      if (matches.length > 0) {
        const first = matches[0];
        results.push({ action: 'skip', key: logicalId, existingId: first.id, reason: `existing ${first.status || 'unknown'}`, flow: f });
        continue;
      }

      results.push({ action: 'create', key: logicalId, existingId: null, reason: null, flow: f });
    }
    return results;
  }

  const created: string[] = [];
  const updated: string[] = [];
  const skipped: Array<{ id: string; logicalId: string; reason: string; status?: string }> = [];
  const matchedExistingIds = new Set<string>();

  for (const f of flowsToCreate) {
    // normalize dueDate -> Date
    const d = normalizeToDate(f.dueDate);
    if (!d) continue;
    const preferredLogicalId = computeLogicalId(d, f.tags || []);
    const fallbackLogical = Array.isArray(f.tags) && f.tags.length ? makeFlowKey(d, f.tags[0]) : null;
    const logicalId = preferredLogicalId || fallbackLogical || `flow_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const matches = existingIndex.byLogicalId.get(logicalId) || [];
    const scheduledExisting = matches.find((m) => m.status === 'scheduled');
    const primaryExisting = scheduledExisting || matches[0];
    const hasExistingNonScheduled = matches.some((m) => m.status && m.status !== 'scheduled');

    // compute a friendly label
    const labelStr = (Array.isArray(f.tags) && f.tags.includes('garantie'))
      ? 'Garantie locative'
      : (Array.isArray(f.tags) && f.tags.includes('loyer'))
        ? `Loyer ${dayjs(d).format('MMMM YYYY')}`
        : (lease.label ? lease.label : `Flux bail ${leaseId}`);

    const payload: any = {
      amountExpected: f.amountExpected,
      dueDate: Timestamp.fromDate(d),
      status: 'scheduled',
      direction: f.direction,
      parentType: 'lease',
      parentId: leaseId,
      orgId,
      propertyId: lease.propertyId || (lease as any).propertyId || '',
      logicalId,
      label: labelStr,
      tags: Array.isArray(f.tags) ? f.tags : [],
      currency: 'EUR',
      allocatedAmount: 0,
      remainingAmount: 0,
      groupId,
      createdAt: serverTimestamp(),
    };
    if (scheduledExisting) {
      try {
        await setDoc(scheduledExisting.ref, { ...payload, id: scheduledExisting.id });
        (f as any).id = scheduledExisting.id;
        (f as any).logicalId = logicalId;
        updated.push(scheduledExisting.id);
        matchedExistingIds.add(scheduledExisting.id);
      } catch (err) {
        console.warn(`Failed to update existing scheduled flow ${scheduledExisting.id}`, err);
        skipped.push({ id: scheduledExisting.id, logicalId, reason: 'failedToUpdateExistingScheduled', status: scheduledExisting.status });
        matchedExistingIds.add(scheduledExisting.id);
      }
      continue;
    }

    if (primaryExisting && hasExistingNonScheduled) {
      skipped.push({ id: primaryExisting.id, logicalId, reason: `preservedExisting${primaryExisting.status ? `_${primaryExisting.status}` : ''}`, status: primaryExisting.status });
      matchedExistingIds.add(primaryExisting.id);
      continue;
    }

    const customId = createFlowDocIdShort(logicalId);
    const ref = doc(colRef, customId);

    try {
      await setDoc(ref, { ...payload, id: customId });
      (f as any).id = customId;
      (f as any).logicalId = logicalId;
      created.push(customId);
    } catch (err) {
      console.warn(`setDoc failed for ${customId}, falling back to addDoc:`, err);
      const added = await addDoc(colRef, { ...payload, id: customId });
      created.push(added.id);
    }
  }

  // Supprimer les anciens scheduled non régénérés
  if (existingIndex.entries.length > 0) {
    const deletions: Promise<void>[] = [];
    for (const entry of existingIndex.entries) {
      if (entry.status === 'scheduled' && !matchedExistingIds.has(entry.id)) {
        deletions.push(deleteDoc(entry.ref));
        skipped.push({ id: entry.id, logicalId: entry.logicalId || entry.id, reason: 'deletedObsoleteScheduled', status: entry.status });
      }
    }
    if (deletions.length > 0) {
      try {
        await Promise.all(deletions);
      } catch (err) {
        console.warn('Failed to delete obsolete scheduled flows', err);
      }
    }
  }

  // Log résumé
  const counts = {
    loyer: flowsToCreate.filter(f => f.tags?.includes('loyer')).length,
    charges_privatives: flowsToCreate.filter(f => f.tags?.includes('charges_privatives')).length,
    charges_communes: flowsToCreate.filter(f => f.tags?.includes('charges_communes')).length,
    garantie: flowsToCreate.filter(f => f.tags?.includes('garantie')).length,
  };
  console.log(`Generated ${created.length} scheduledFlows (${counts.loyer} loyer, ${counts.charges_privatives} charges_privatives, ${counts.charges_communes} charges_communes, ${counts.garantie} garantie). Updated: ${updated.length}. Skipped: ${skipped.length}.`);
  return { createdIds: created, updatedIds: updated, skipped, flows: flowsToCreate };
}
