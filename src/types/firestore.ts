import { Timestamp, FieldValue } from 'firebase/firestore';

// TypeScript types for Firestore collections

// User document type
export interface User {
  email: string;
  displayName?: string;
  orgIds: string[];
  rolesByOrg: {
    [orgId: string]: 'owner' | 'admin' | 'manager' | 'accountant' | 'viewer';
  };
}

// Organization document type
export interface Organization {
  name: string;
  type: 'owner' | 'company' | 'agency';
  billingPlan: 'free' | 'pro' | 'enterprise';
  createdAt: Timestamp;
}

// Member subcollection document type
export interface Member {
  role: 'owner' | 'admin' | 'manager' | 'accountant' | 'viewer';
  joinedAt: Timestamp | FieldValue;
}