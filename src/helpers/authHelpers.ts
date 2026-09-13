import { Firestore, doc, setDoc } from 'firebase/firestore';
import { User } from '../types/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

/**
 * Create a Firestore document for a new user upon authentication.
 */
export const initializeUserDocument = (db: Firestore): void => {
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userData: User = {
        email: user.email || '',
        displayName: user.displayName || '',
        orgIds: [],
        rolesByOrg: {},
      };

      try {
        await setDoc(userRef, userData);
        console.log(`User document created for UID: ${user.uid}`);
      } catch (error) {
        console.error('Error creating user document:', error);
      }
    }
  });
};