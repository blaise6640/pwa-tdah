import { useEffect, useState } from 'react';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { User } from '../types/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

interface CurrentUser {
  user: User | null;
  loading: boolean;
}

/**
 * React hook to fetch the current user's Firestore document and roles.
 */
export const useCurrentUser = (db: Firestore): CurrentUser => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          console.error(`User document not found for UID: ${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  return { user, loading };
};