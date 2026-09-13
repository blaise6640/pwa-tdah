import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function useTenants(orgId: string | null | undefined, leaseId: string | null | undefined) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId || !leaseId) return;
    setLoading(true);
    const col = collection(db, 'orgs', orgId, 'leases', leaseId, 'tenants');
    const q = query(col, orderBy('role'));
    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setTenants(arr);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsub();
  }, [orgId, leaseId]);

  return { tenants, loading, error };
}
