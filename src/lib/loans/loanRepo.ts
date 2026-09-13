import { getDbInstance } from '../../firebase';
import type { Loan } from './loan';
import { mapLoan } from './loanMapper';

const orgLoansCollection = (db: any, orgId: string) => ({ db, orgId });

/**
 * Crée un prêt sous /orgs/{orgId}/loans
 * Retourne l'id créé
 */
export async function createLoan(orgId: string, data: Omit<Loan, 'id'|'createdAt'|'orgId'>): Promise<string> {
  const db = await getDbInstance();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const col = collection(db, 'orgs', orgId, 'loans');
  const payload: any = {
    ...data,
    orgId,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(col, payload);
  return ref.id;
}

/**
 * Upsert (set merge) d'un loan
 */
export async function upsertLoan(orgId: string, loanId: string, partial: Partial<Loan>): Promise<void> {
  const db = await getDbInstance();
  const { doc, setDoc } = await import('firebase/firestore');
  const ref = doc(db, 'orgs', orgId, 'loans', loanId);
  await setDoc(ref, { ...partial, orgId }, { merge: true } as any);
}

export async function getLoan(orgId: string, loanId: string): Promise<Loan|null> {
  const db = await getDbInstance();
  const { doc, getDoc } = await import('firebase/firestore');
  const ref = doc(db, 'orgs', orgId, 'loans', loanId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapLoan(snap as any);
}

export async function getLoans(orgId: string, opts?: { status?: 'active'|'closed' }): Promise<Loan[]> {
  const db = await getDbInstance();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const col = collection(db, 'orgs', orgId, 'loans');
  let q;
  if (opts && opts.status) {
    q = query(col, where('status', '==', opts.status));
  } else {
    q = query(col);
  }
  const snap = await getDocs(q);
  const out: Loan[] = [];
  snap.forEach((d) => out.push(mapLoan(d as any)));
  return out;
}

export default {
  createLoan,
  upsertLoan,
  getLoan,
  getLoans,
};
