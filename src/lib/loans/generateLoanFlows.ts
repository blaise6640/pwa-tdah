import dayjs from 'dayjs';
import { collection, doc, getDocs, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Loan } from './loan';
import { createFlowDocIdShort } from '../flowIds';

const round2 = (x: number) => Math.round(x * 100) / 100;
const perRate = (annual: number, freq: 'monthly' | 'quarterly') => freq === 'monthly' ? annual / 12 : annual / 4;
const addPeriods = (d: dayjs.Dayjs, freq: 'monthly' | 'quarterly', k: number) => d.add(freq === 'monthly' ? k : 3 * k, 'month');
const periodsBetween = (start: dayjs.Dayjs, end: dayjs.Dayjs, freq: 'monthly' | 'quarterly') => {
  const months = end.diff(start, 'month');
  const denom = freq === 'monthly' ? 1 : 3;
  return Math.max(1, Math.round(months / denom));
};

type PreviewRow = { index: number; dueDate: Date; kind: 'principal' | 'interest'; amount: number; total: number; outstanding: number };

export function previewLoanSchedule(loan: Loan): PreviewRow[] {
  const start = dayjs(loan.startDate);
  const end = dayjs(loan.endDate);
  const freq = loan.repaymentFrequency;
  const n = periodsBetween(start, end, freq);
  const P = loan.amount;
  const annual = loan.interestRate / 100; // stored as percent in loan
  const r = perRate(annual, freq);

  const rows: PreviewRow[] = [];
  let outstanding = P;

  // compute annuity A if needed
  let A = 0;
  if (loan.repaymentMethod === 'annuity') {
    if (r > 0) {
      A = P * r / (1 - Math.pow(1 + r, -n));
    } else {
      A = P / n;
    }
    A = round2(A);
  }

  for (let i = 1; i <= n; i++) {
    const due = addPeriods(start, freq, i);
    let interest = round2(outstanding * r);
    let principal = 0;
    let total = 0;

    if (loan.repaymentMethod === 'annuity') {
      principal = round2(A - interest);
      if (i === n) {
        principal = Math.min(principal, outstanding);
      }
      total = round2(principal + interest);
    } else {
      // linear
      principal = round2(P / n);
      if (i === n) {
        principal = Math.min(principal, outstanding);
      }
      total = round2(principal + interest);
    }

    outstanding = Math.max(0, round2(outstanding - principal));

    // push two rows per échéance: principal and interest
    rows.push({ index: i, dueDate: due.toDate(), kind: 'principal', amount: principal, total, outstanding });
    rows.push({ index: i, dueDate: due.toDate(), kind: 'interest', amount: interest, total, outstanding });
  }

  return rows;
}

export async function generateLoanFlows(orgId: string, loanId: string, loan: Loan): Promise<void> {
  if (!orgId || !loanId || !loan) return;

  // prepare schedule using preview helper to ensure consistency
  const schedule = previewLoanSchedule(loan);

  // load existing scheduledFlows and index them by dueDate|kind (principal/interest)
  const colRef = collection(db, 'orgs', orgId, 'loans', loanId, 'scheduledFlows');
  const q = query(colRef);
  const snap = await getDocs(q);
  const existingByKey: Record<string, any> = {};
  snap.forEach(d => {
    const data = d.data();
    const due = data.dueDate ? dayjs(data.dueDate.toDate ? data.dueDate.toDate() : data.dueDate) : null;
    if (!due || !data.tags) return;
    const kind = data.tags.includes('principal') ? 'principal' : data.tags.includes('interest') ? 'interest' : null;
    if (!kind) return;
    const key = `${due.format('YYYY-MM-DD')}|${kind}`;
    existingByKey[key] = { id: d.id, ref: doc(db, 'orgs', orgId, 'loans', loanId, 'scheduledFlows', d.id), data };
  });

  // iterate schedule (which now contains two entries per échéance)
  for (const row of schedule) {
    const kind = row.kind; // 'principal' | 'interest'
    const key = `${dayjs(row.dueDate).format('YYYY-MM-DD')}|${kind}`;

    const payload: any = {
      orgId,
      parentType: 'loan',
      parentId: loanId,
      loanId: loanId,
      propertyId: loan.propertyId || (loan as any).propertyId || '',
      groupId: 'amortization',
      direction: 'out',
      currency: 'EUR',
      dueDate: row.dueDate,
      amountExpected: row.amount,
      status: 'scheduled',
      tags: ['loan', loan.lenderName, kind].filter(Boolean),
    };

    const existing = existingByKey[key];
    if (existing) {
      const status = existing.data && existing.data.status;
      if (status === 'scheduled') {
        await setDoc(existing.ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true } as any);
      }
      // else do not touch non-scheduled flows
    } else {
      const due = dayjs(row.dueDate);
      const logicalId = `flow_${due.year()}-${String(due.month() + 1).padStart(2, '0')}`;
      const newId = createFlowDocIdShort(logicalId);
      const newRef = doc(collection(db, 'orgs', orgId, 'loans', loanId, 'scheduledFlows'), newId);
      await setDoc(newRef, { ...payload, createdAt: serverTimestamp(), id: newId, logicalId });
    }
  }
}

export default generateLoanFlows;
