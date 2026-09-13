import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { User, Member } from '../types/firestore';

/**
 * Validate consistency between `users.orgIds` and `orgs/{orgId}/members`.
 */
export const validateUserOrgConsistency = async (
  db: Firestore,
  userId: string,
  orgId: string
): Promise<boolean> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.error(`User ${userId} does not exist.`);
    return false;
  }

  const userData = userSnap.data() as User;

  if (!userData.orgIds.includes(orgId)) {
    console.error(`Organization ${orgId} is not listed in user ${userId}'s orgIds.`);
    return false;
  }

  const memberRef = doc(db, 'orgs', orgId, 'members', userId);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    console.error(`User ${userId} is not a member of organization ${orgId}.`);
    return false;
  }

  return true;
};

/**
 * Ensure `users.orgIds` and `orgs/{orgId}/members` are synchronized.
 */
export const synchronizeUserOrgData = async (
  db: Firestore,
  userId: string,
  orgId: string,
  role: Member['role']
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error(`User ${userId} does not exist.`);
  }

  const userData = userSnap.data() as User;

  if (!userData.orgIds.includes(orgId)) {
    userData.orgIds.push(orgId);
    await setDoc(userRef, userData);
  }

  const memberRef = doc(db, 'orgs', orgId, 'members', userId);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    await setDoc(memberRef, { role, joinedAt: new Date() });
  }
};