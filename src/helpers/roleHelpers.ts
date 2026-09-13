import { Firestore, doc, getDoc } from 'firebase/firestore';
import { User } from '../types/firestore';

/**
 * Check if a user has a specific role in an organization.
 */
export const hasRole = async (
  db: Firestore,
  userId: string,
  orgId: string,
  role: 'owner' | 'admin' | 'manager' | 'accountant' | 'viewer'
): Promise<boolean> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.error(`User ${userId} does not exist.`);
    return false;
  }

  const userData = userSnap.data() as User;
  const userRole = userData.rolesByOrg[orgId];

  return userRole === role;
};