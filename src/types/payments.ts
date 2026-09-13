import type { DocumentSnapshot } from 'firebase/firestore';

export type Currency = 'EUR';

export interface Payment {
  id: string; // doc.id
  orgId: string;
  amount: number;
  // amountRemaining is the authoritative remaining amount available to allocate.
  // It is initialized to the payment.amount when created and decremented
  // transactionally by allocation creation.
  amountRemaining?: number;
  currency: Currency;
  date: Date;
  direction: 'in' | 'out';
  status: 'open' | 'partially_allocated' | 'allocated' | 'void';
  memo?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  propertyId?: string; // si le paiement concerne une propriété spécifique
  bankRef?: string; // identifiant externe si import via API bancaire
  createdAt?: Date;
  // Champs de régularisation
  isRegularization?: boolean;
  expenseId?: string;
  regularizationMode?: 'retroactive' | 'adjustment' | null;
  regularizationPeriod?: { start: Date; end: Date } | null;
  regularizationNote?: string;
}

export interface Allocation {
  id: string;
  paymentId: string;
  flowId: string;
  orgId: string;
  amount: number;
  createdAt?: Date;
  parentType?: string;
  parentId?: string;
  groupId?: string;
  // Snapshot fields from flow at allocation time
  flowLabel?: string | null;
  flowCategory?: string | null;
  flowTags?: string[];
  flowDueDate?: Date | null;
  flowCurrency?: string;
  flowExpected?: number;
  flowStatus?: string;
}

/**
 * Map a Firestore DocumentSnapshot to a typed Payment object.
 * Accepts a DocumentSnapshot (from firebase/firestore).
 */
export function mapPayment(doc: DocumentSnapshot): Payment {
  const data = (doc.data && doc.data()) || {};

  // Helper to convert Firestore Timestamp-like objects to Date
  const toDate = (v: any): Date | undefined => {
    if (!v) return undefined;
    if (v.toDate && typeof v.toDate === 'function') return v.toDate();
    // If it's already a Date
    if (v instanceof Date) return v;
    // Try to parse ISO string
    const parsed = new Date(v);
    if (!isNaN(parsed.getTime())) return parsed;
    return undefined;
  };

  // On retourne tous les champs du doc Firestore, en plus du typage Payment
  return {
    id: (doc.id as string) || '',
    orgId: data.orgId || '',
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
    amountRemaining: typeof data.amountRemaining === 'number' ? data.amountRemaining : undefined,
    currency: (data.currency as Currency) || 'EUR',
    date: toDate(data.date) || new Date(0),
    direction: data.direction === 'out' ? 'out' : 'in',
    status: data.status || 'open',
    memo: data.memo,
    counterpartyName: data.counterpartyName,
    counterpartyIban: data.counterpartyIban,
    propertyId: data.propertyId,
    bankRef: data.bankRef,
    createdAt: toDate(data.createdAt),
    // Hydrater proprement les champs de régularisation avec valeurs par défaut
    isRegularization: typeof data.isRegularization === 'boolean' ? data.isRegularization : false,
    expenseId: data.expenseId,
    regularizationMode: data.regularizationMode ?? null,
    regularizationPeriod: (data.regularizationPeriod && typeof data.regularizationPeriod === 'object') ? {
      start: toDate(data.regularizationPeriod.start) || new Date(0),
      end: toDate(data.regularizationPeriod.end) || new Date(0)
    } : null,
    regularizationNote: data.regularizationNote,
    // Ajout : tous les autres champs additionnels Firestore
    ...data
  } as Payment;
}

export function mapAllocation(doc: DocumentSnapshot): Allocation {
  const data = (doc.data && doc.data()) || {};
  const toDate = (v: any): Date | undefined => {
    if (!v) return undefined;
    if (v.toDate && typeof v.toDate === 'function') return v.toDate();
    if (v instanceof Date) return v;
    const parsed = new Date(v);
    if (!isNaN(parsed.getTime())) return parsed;
    return undefined;
  };

  return {
    id: doc.id,
    orgId: data.orgId || '',
    paymentId: data.paymentId || '',
    flowId: data.flowId || '',
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
    createdAt: toDate(data.createdAt),
    // Hydrater snapshot fields si présents
    flowLabel: typeof data.flowLabel === 'string' ? data.flowLabel : (data.flowLabel === null ? null : undefined),
    flowCategory: typeof data.flowCategory === 'string' ? data.flowCategory : (data.flowCategory === null ? null : undefined),
    flowTags: Array.isArray(data.flowTags) ? data.flowTags : undefined,
    flowDueDate: toDate(data.flowDueDate),
    flowCurrency: typeof data.flowCurrency === 'string' ? data.flowCurrency : undefined,
    flowExpected: typeof data.flowExpected === 'number' ? data.flowExpected : undefined,
    flowStatus: typeof data.flowStatus === 'string' ? data.flowStatus : undefined
  } as Allocation;
}
