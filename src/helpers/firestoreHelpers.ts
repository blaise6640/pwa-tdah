import { Firestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { User, Organization, Member } from '../types/firestore';

/**
 * Firestore helper to manage `/users` collection
 */
export const getUser = async (db: Firestore, userId: string): Promise<User | null> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as User) : null;
};

export const setUser = async (db: Firestore, userId: string, userData: User): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, userData);
};

/**
 * Firestore helper to manage `/orgs` collection
 */
export const getOrganization = async (db: Firestore, orgId: string): Promise<Organization | null> => {
  const orgRef = doc(db, 'orgs', orgId);
  const orgSnap = await getDoc(orgRef);
  return orgSnap.exists() ? (orgSnap.data() as Organization) : null;
};

export const setOrganization = async (db: Firestore, orgId: string, orgData: Organization): Promise<void> => {
  const orgRef = doc(db, 'orgs', orgId);
  await setDoc(orgRef, orgData);
};

/**
 * Firestore helper to manage `/orgs/{orgId}/members` subcollection
 */
export const getMembers = async (db: Firestore, orgId: string): Promise<Member[]> => {
  const membersRef = collection(db, 'orgs', orgId, 'members');
  const membersSnap = await getDocs(membersRef);
  return membersSnap.docs.map(doc => doc.data() as Member);
};

export const addMember = async (db: Firestore, orgId: string, userId: string, memberData: Member): Promise<void> => {
  const memberRef = doc(db, 'orgs', orgId, 'members', userId);
  await setDoc(memberRef, memberData);
};

export const updateMember = async (db: Firestore, orgId: string, userId: string, memberData: Partial<Member>): Promise<void> => {
  const memberRef = doc(db, 'orgs', orgId, 'members', userId);
  await updateDoc(memberRef, memberData);
};