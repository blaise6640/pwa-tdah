/* Type declarations for the runtime module src/firebase.js */
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Messaging } from 'firebase/messaging';
import type { Functions } from 'firebase/functions';
import type { FirebaseStorage } from 'firebase/storage';

declare module '../firebase' {
  // Note: auth is a live binding that may be null very early during app bootstrap.
  // Firestore (db) is initialized synchronously in src/firebase.js and is always available.
  export const auth: Auth | null;
  export const db: Firestore;
  export const storage: FirebaseStorage;
  export const functions: Functions;
  const app: FirebaseApp;
  export default app;
  export function getMessagingToken(vapidKey: string | undefined, registration?: ServiceWorkerRegistration | null): Promise<string | null>;
  export function getAuthInstance(): Promise<Auth>;
  export function getDbInstance(): Promise<Firestore>;
}

declare module 'src/firebase' {
  // same re-export for any import paths that use absolute-ish path
  export const auth: Auth | null;
  export const db: Firestore;
  export const storage: FirebaseStorage;
  export const functions: Functions;
  const app: FirebaseApp;
  export default app;
  export function getMessagingToken(vapidKey: string | undefined, registration?: ServiceWorkerRegistration | null): Promise<string | null>;
  export function getAuthInstance(): Promise<Auth>;
  export function getDbInstance(): Promise<Firestore>;
}
