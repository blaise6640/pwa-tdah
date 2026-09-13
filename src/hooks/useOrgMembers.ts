import { useEffect, useState } from 'react';
import { Firestore, collection, getDocs } from 'firebase/firestore';
import { Member } from '../types/firestore';

interface OrgMembers {
  members: Member[];
  loading: boolean;
}

/**
 * React hook to fetch the list of members and their roles for a specific organization.
 */
export const useOrgMembers = (db: Firestore, orgId: string): OrgMembers => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const membersRef = collection(db, 'orgs', orgId, 'members');
      const membersSnap = await getDocs(membersRef);

      const membersList = membersSnap.docs.map((doc) => doc.data() as Member);
      setMembers(membersList);
      setLoading(false);
    };

    fetchMembers().catch((error) => {
      console.error('Error fetching organization members:', error);
      setLoading(false);
    });
  }, [db, orgId]);

  return { members, loading };
};