import { Firestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Organization, Member } from '../types/firestore';

/**
 * Create a default organization for a new user with the role `owner`.
 */
export const createDefaultOrganization = async (
  db: Firestore,
  userId: string,
  userEmail: string
): Promise<void> => {
  const orgId = `org-${userId}`; // Example orgId generation
  const orgRef = doc(db, 'orgs', orgId);
  const memberRef = doc(db, 'orgs', orgId, 'members', userId);

  const organization: Organization = {
    name: `${userEmail}'s Organization`,
    type: 'owner',
    billingPlan: 'free',
    createdAt: serverTimestamp() as any, // Firestore server timestamp
  };

  const member: Member = {
    role: 'owner',
    joinedAt: serverTimestamp() as any,
  };

  try {
    await setDoc(orgRef, organization);
    await setDoc(memberRef, member);
    console.log(`Default organization created for user ${userId}`);
  } catch (error) {
    console.error('Error creating default organization:', error);
  }
};