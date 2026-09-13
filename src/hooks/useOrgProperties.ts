import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { Property } from '../types/property';
import { db } from '../firebase';

interface PropertyWithId extends Property {
  id: string;
}

interface UseOrgPropertiesResult {
  properties: PropertyWithId[];
  loading: boolean;
  error?: Error | null;
}

export const useOrgProperties = (orgId: string | null | undefined): UseOrgPropertiesResult => {
  const [properties, setProperties] = useState<PropertyWithId[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) {
      setProperties([]);
      setLoading(false);
      return;
    }

    const colRef = collection(db, 'orgs', orgId, 'properties');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Property) }));
        // If createdAt missing, fallback sort by name asc
        items.sort((a, b) => {
          const aTs: any = (a as any).createdAt;
          const bTs: any = (b as any).createdAt;
          if (aTs && bTs && typeof aTs.toMillis === 'function' && typeof bTs.toMillis === 'function') {
            return bTs.toMillis() - aTs.toMillis();
          }
          if (!aTs && !bTs) return a.name.localeCompare(b.name || '');
          return aTs ? -1 : 1;
        });
        setProperties(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error on properties snapshot', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [orgId]);

  return { properties, loading, error };
};

export default useOrgProperties;
