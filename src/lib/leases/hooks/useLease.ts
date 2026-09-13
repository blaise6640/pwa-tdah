import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Lease } from '@/types/lease';

export default function useLease(orgId: string | null | undefined, leaseId: string | null | undefined) {
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId || !leaseId) {
      setLease(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'orgs', orgId, 'leases', leaseId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setLease(null);
        setLoading(false);
        return;
      }
      const data: any = snap.data();
      setLease({ id: snap.id, ...data } as Lease);
      setLoading(false);
    }, (err) => {
      setError(err as Error);
      setLoading(false);
    });

    return () => unsub();
  }, [orgId, leaseId]);

  return { lease, loading, error };
}
