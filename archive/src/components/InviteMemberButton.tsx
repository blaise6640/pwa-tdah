import React, { useState } from 'react';
import { Firestore, doc, setDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { Member } from '../../types/firestore';

interface InviteMemberButtonProps {
  db: Firestore;
  orgId: string;
}

const InviteMemberButton: React.FC<InviteMemberButtonProps> = ({ db, orgId }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Member['role']>('viewer');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);

    try {
      const userId = email.replace(/[@.]/g, '_'); // Example userId generation
      const memberRef = doc(db, 'orgs', orgId, 'members', userId);

      const newMember: Member = {
        role,
        joinedAt: serverTimestamp() as unknown as FieldValue,
      };

      await setDoc(memberRef, newMember);
      alert(`Member ${email} invited successfully!`);
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Failed to invite member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="email"
        placeholder="Member email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <select value={role} onChange={(e) => setRole(e.target.value as Member['role'])} disabled={loading}>
        <option value="viewer">Viewer</option>
        <option value="accountant">Accountant</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
        <option value="owner">Owner</option>
      </select>
      <button onClick={handleInvite} disabled={loading || !email}>
        {loading ? 'Inviting...' : 'Invite Member'}
      </button>
    </div>
  );
};

export default InviteMemberButton;
