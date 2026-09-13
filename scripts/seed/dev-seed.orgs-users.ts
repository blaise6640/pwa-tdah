// Script de seed pour l'émulateur Firestore
// Ce script crée des utilisateurs, des organisations et des membres cohérents pour l'environnement de développement.

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'demo-project',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedFirestore = async () => {
  try {
    // Créer des organisations
    const orgA = { name: 'Organisation AAA', type: 'company', billingPlan: 'pro', createdAt: new Date() };
    const orgB = { name: 'Organisation BBB', type: 'agency', billingPlan: 'free', createdAt: new Date() };

    await setDoc(doc(db, 'orgs', 'org-aaa'), orgA);
    await setDoc(doc(db, 'orgs', 'org-bbb'), orgB);

    // Créer des utilisateurs
    const user1 = { email: 'user1@example.com', orgIds: ['org-aaa'], rolesByOrg: { 'org-aaa': 'owner' } };
    const user2 = { email: 'user2@example.com', orgIds: ['org-aaa', 'org-bbb'], rolesByOrg: { 'org-aaa': 'admin', 'org-bbb': 'viewer' } };
    const user3 = { email: 'user3@example.com', orgIds: ['org-bbb'], rolesByOrg: { 'org-bbb': 'manager' } };

    await setDoc(doc(db, 'users', 'user-1'), user1);
    await setDoc(doc(db, 'users', 'user-2'), user2);
    await setDoc(doc(db, 'users', 'user-3'), user3);

    // Créer des membres pour les organisations
    const member1 = { role: 'owner', joinedAt: new Date() };
    const member2 = { role: 'admin', joinedAt: new Date() };
    const member3 = { role: 'viewer', joinedAt: new Date() };
    const member4 = { role: 'manager', joinedAt: new Date() };

    await setDoc(doc(db, 'orgs', 'org-aaa', 'members', 'user-1'), member1);
    await setDoc(doc(db, 'orgs', 'org-aaa', 'members', 'user-2'), member2);
    await setDoc(doc(db, 'orgs', 'org-bbb', 'members', 'user-2'), member3);
    await setDoc(doc(db, 'orgs', 'org-bbb', 'members', 'user-3'), member4);

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding Firestore:', error);
  }
};

seedFirestore();