import type { DocumentSnapshot } from 'firebase/firestore';
import type { Loan } from './loan';

function toDate(v: any): Date {
  if (!v) return new Date(0);
  // Firestore Timestamp has a toDate() method
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date(0);
}

export function mapLoan(docSnap: DocumentSnapshot): Loan {
  const data = (docSnap.data && docSnap.data()) || {};

  return {
    id: docSnap.id,
    orgId: data.orgId || '',
    propertyId: data.propertyId || undefined,
    label: data.label || '',
    lenderName: data.lenderName || '',
    amount: typeof data.amount === 'number' ? data.amount : (data.amount !== undefined ? Number(data.amount) : 0),
    interestRate: typeof data.interestRate === 'number' ? data.interestRate : (data.interestRate !== undefined ? Number(data.interestRate) : 0),
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    repaymentFrequency: (data.repaymentFrequency === 'monthly' || data.repaymentFrequency === 'quarterly') ? data.repaymentFrequency : 'monthly',
    repaymentMethod: (data.repaymentMethod === 'annuity' || data.repaymentMethod === 'linear') ? data.repaymentMethod : 'annuity',
    status: (data.status === 'active' || data.status === 'closed') ? data.status : 'active',
    createdAt: toDate(data.createdAt),
  } as Loan;
}

export default mapLoan;
