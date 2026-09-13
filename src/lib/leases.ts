import { getDbInstance } from '../firebase';

// Types
import type { Timestamp } from 'firebase/firestore';

export type LeaseStatus = 'draft' | 'active' | 'ended';

export interface Lease {
  id: string;
  propertyId: string;
  // Libellé / nom du bail (optionnel)
  label?: string;
  status: LeaseStatus;
  startDate: Timestamp;
  endDate?: Timestamp;
  tenantPrimaryId?: string;
  regionRegistrationId?: string;
  myRentRegistrationId?: string;
  indexationRuleId?: string;
  rentAmount: number;
  privateCharges: number;
  commonCharges: number;
  depositAmount: number;
  createdAt: Timestamp;
}

export type LeaseInput = Omit<Lease, 'id' | 'createdAt'>;

export async function createLease(orgId: string, data: LeaseInput, options: { autoGenerateFlows?: boolean } = {}): Promise<string> {
  const { autoGenerateFlows = true } = options;
  const db = await getDbInstance();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const col = collection(db, 'orgs', orgId, 'leases');
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
  } as any;
  const ref = await addDoc(col, payload);
  const id = ref.id;
  if (autoGenerateFlows) {
    // After creating the lease persistently, generate scheduled flows client-side.
    // We intentionally do not await failures (caller can handle) but log errors.
    try {
      // import lazily to avoid circular deps at module load
      const mod = await import('./leaseFlows');
      if (mod && typeof mod.generateLeaseFlows === 'function') {
        // generate with prorata on last month
        mod.generateLeaseFlows(orgId, id, { prorataLastMonth: true }).catch(err => console.warn('generateLeaseFlows failed:', err));
      }
    } catch (err) {
      console.warn('Failed to invoke generateLeaseFlows after createLease', err);
    }
  }
  return id;
}
// Note: generateLeaseFlows is intentionally not re-exported here to avoid
// mixing static and dynamic imports. Consumers should import it dynamically
// when needed: `const { generateLeaseFlows } = await import('./leaseFlows')`.

export async function updateLease(orgId: string, leaseId: string, updates: Partial<LeaseInput>): Promise<void> {
  const db = await getDbInstance();
  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(db, 'orgs', orgId, 'leases', leaseId);
  await updateDoc(ref, { ...(updates as any), updatedAt: serverTimestamp() } as any);
}

export async function deleteLease(orgId: string, leaseId: string): Promise<void> {
  const db = await getDbInstance();
  const { doc, deleteDoc } = await import('firebase/firestore');
  const ref = doc(db, 'orgs', orgId, 'leases', leaseId);
  await deleteDoc(ref);
}

export async function getLeases(orgId: string, propertyId?: string): Promise<Lease[]> {
  const db = await getDbInstance();
  const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
  const col = collection(db, 'orgs', orgId, 'leases');
  let q;
  if (propertyId) {
    q = query(col, where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'));
  } else {
    q = query(col, orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(q);
  const results: Lease[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    results.push({ id: docSnap.id, ...(data as Omit<Lease, 'id'>) });
  });
  return results;
}
