import { DocumentSnapshot, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export interface ScheduledFlow {
  id: string;
  orgId: string;
  propertyId: string;
  loanId?: string;
  parentType: 'lease' | 'expense' | 'loan' | 'property';
  parentId: string;
  groupId?: string;

  amountExpected: number;
  allocatedAmount: number;
  remainingAmount: number;

  dueDate: Date;
  status: 'scheduled' | 'paid' | 'partially_paid' | 'overdue' | 'void';
  direction: 'in' | 'out';

  label: string;
  tags: string[];

  currency: string;

  createdAt: Date;
}

/**
 * Map a Firestore DocumentSnapshot (scheduledFlows collection/doc) to ScheduledFlow
 * Converts Firestore Timestamp fields to JS Date and fills defaults for optional fields.
 */
export function mapScheduledFlow(doc: QueryDocumentSnapshot<unknown> | DocumentSnapshot<unknown>): ScheduledFlow {
  const data = doc.data() || ({} as any);

  // Helper: convert Firestore Timestamp|Date|any -> Date
  const safeToDate = (v: any): Date => {
    if (!v) return new Date(0);
    if (v && typeof v.toDate === 'function') return v.toDate();
    if (v instanceof Date) return v;
    const parsed = new Date(v);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date(0);
  };

  const dueDate = safeToDate(data.dueDate);
  const createdAt = safeToDate(data.createdAt);

  // mandatory pivots
  const orgId = data.orgId ? String(data.orgId) : '';
  const propertyId = data.propertyId ? String(data.propertyId) : '';
  const loanId = data.loanId ? String(data.loanId) : '';
  const parentType = (['lease','expense','loan','property'].includes(data.parentType) ? data.parentType : 'lease') as ScheduledFlow['parentType'];
  const parentId = data.parentId ? String(data.parentId) : '';

  // For loans, loanId is a valid pivot; for others propertyId/parentId should be present.
  if (parentType === 'loan') {
    // accept either loanId or parentId
    if (!orgId || (!loanId && !parentId)) {
      console.warn('[mapScheduledFlow] scheduledFlow missing pivot fields for loan', { id: doc.id, orgId, propertyId, loanId, parentType, parentId });
    }
  } else {
    if (!orgId || !propertyId || !parentId) {
      console.warn('[mapScheduledFlow] scheduledFlow missing pivot fields', { id: doc.id, orgId, propertyId, parentType, parentId });
    }
  }

  const amountExpected = Number(data.amountExpected ?? 0);
  const amountExpectedRaw = Number(data.amountExpected ?? 0);
  // normalize to cents
  const normalizedAmountExpected = Math.round(amountExpectedRaw * 100) / 100;
  const allocatedAmountRaw = typeof data.allocatedAmount === 'number' ? data.allocatedAmount : 0;
  const allocatedAmount = Math.round(allocatedAmountRaw * 100) / 100;
  // If remainingAmount is explicitly stored, use it, otherwise compute from expected - allocated.
  let remainingAmountRaw = typeof data.remainingAmount === 'number' ? data.remainingAmount : (normalizedAmountExpected - allocatedAmount);
  let remainingAmount = Math.round(remainingAmountRaw * 100) / 100;
  // Guard: if stored remainingAmount is 0 but computed remaining is positive, prefer the computed value
  const computedRemaining = Math.round((normalizedAmountExpected - allocatedAmount) * 100) / 100;
  if ((typeof data.remainingAmount === 'number') && remainingAmount === 0 && computedRemaining > 0) {
    remainingAmount = computedRemaining;
  }

  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const currency = data.currency ? String(data.currency) : 'EUR';
  const label = data.label ? String(data.label) : (tags.length ? String(tags[0]) : 'Flux');

  const statusAllowed = ['scheduled','paid','partially_paid','overdue','void'];
  const status = statusAllowed.includes(data.status) ? data.status : 'scheduled';

  const direction = data.direction === 'in' ? 'in' : 'out';

  return {
    id: doc.id,
    orgId,
    propertyId,
    loanId: loanId || undefined,
    parentType,
    parentId,
    groupId: data.groupId ? String(data.groupId) : undefined,

    amountExpected,
    allocatedAmount,
    remainingAmount,

    dueDate,
    status: status as ScheduledFlow['status'],
    direction: direction as ScheduledFlow['direction'],

    label,
    tags,

    currency,

    createdAt,
  };
}
