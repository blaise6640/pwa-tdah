import { getDbInstance } from '../firebase';
import type { Payment } from '../types/payments';
import { mapPayment } from '../types/payments';

export async function getPayments(orgId: string): Promise<Payment[]> {
  const db = await getDbInstance();
  const { collection, query, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'orgs', orgId, 'payments'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapPayment);
}

export async function createPayment(orgId: string, payment: {
  amount: number;
  currency: 'EUR';
  date: Date;
  direction?: 'in' | 'out';
  status: 'open';
  memo?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  propertyId?: string;
  parentType?: string;
  parentId?: string;
}) {
  if (!orgId) throw new Error('orgId required');
  if (!(payment.amount > 0)) throw new Error('amount must be > 0');
  // Build a deterministic-ish id prefixed by encoding date yymmdd to improve readability
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `${yy}${mm}${dd}`; // yymmdd
  // short suffix to avoid collisions: use timestamp last 5 digits + random 2 hex chars
  const ts = String(Date.now());
  const suffix = ts.slice(-5) + Math.floor(Math.random() * 0xff).toString(16).padStart(2, '0');
  const customId = `${prefix}-${suffix}`;
  const db = await getDbInstance();
  const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(collection(db, 'orgs', orgId, 'payments'), customId);
  console.log('[createPayment] direction =', payment.direction);
  await setDoc(ref, {
    ...payment,
    orgId,
    direction: payment.direction ?? (payment.parentType === 'expense' ? 'out' : 'in'),
    // ensure stored amounts are rounded to cents
    amount: Math.round(payment.amount * 100) / 100,
    amountRemaining: Math.round(payment.amount * 100) / 100,
    createdAt: serverTimestamp()
  });
  // Retourner l'objet complet (id + tous les champs du paiement)
  return { id: customId, ...payment, orgId, direction: payment.direction ?? (payment.parentType === 'expense' ? 'out' : 'in'), amountRemaining: Math.round(payment.amount * 100) / 100 };
}
