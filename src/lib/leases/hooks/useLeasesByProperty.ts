import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Lease } from '@/types/lease';

function toDateMaybe(input: any): Date | null {
  if (!input && input !== 0) return null;
  if (typeof input?.toDate === 'function') {
    try { return input.toDate(); } catch { return null; }
  }
  if (input instanceof Date) return input;
  try {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export default function useLeasesByProperty(orgId: string | null | undefined, propertyId: string | null | undefined) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId || !propertyId) {
      setLeases([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const col = collection(db, 'orgs', orgId, 'leases');
    const q = query(col, where('propertyId', '==', propertyId));
    const unsub = onSnapshot(q, (snap) => {
      const arr: Lease[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          ...data,
          label: data.label ?? data.name ?? '',
          status: data.status ?? 'active',
          startDate: toDateMaybe(data.startDate),
          endDate: toDateMaybe(data.endDate),
          rentAmount: data.rentAmount !== undefined ? Number(data.rentAmount) : null,
          privateCharges: data.privateCharges !== undefined ? Number(data.privateCharges) : null,
          commonCharges: data.commonCharges !== undefined ? Number(data.commonCharges) : null,
          depositAmount: data.depositAmount !== undefined ? Number(data.depositAmount) : null,
          propertyId: data.propertyId ?? '',
          orgId: data.orgId ?? orgId ?? '',
        } as Lease;
      });

      setLeases(arr);
      setLoading(false);
    }, (err) => {
      setError(err as Error);
      setLoading(false);
    });

    return () => unsub();
  }, [orgId, propertyId]);

  return { leases, loading, error };
}
