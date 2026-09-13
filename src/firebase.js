// Import des modules Firebase nécessaires
import { initializeApp } from "firebase/app";
// Avoid importing heavy sub-modules (auth/firestore) here so they can be
// dynamically loaded by consumers when needed. messaging is already dynamic.
import { getFunctions } from 'firebase/functions';
import { getStorage } from "firebase/storage";
// Import auth + firestore synchronously so exported bindings are usable
// immediately by consumers (e.g. `useAuthState(auth)` or `doc(db, ...)`).
// This avoids runtime errors when modules expect `auth`/`db` to be defined.
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import APP_CONFIG from "./app.config";

// Sélection automatique de la bonne config selon l'environnement
const config = 
  import.meta.env.MODE === "production"
    ? APP_CONFIG.firebase.prod
    : APP_CONFIG.firebase.dev;

// Initialisation Firebase
const app = initializeApp(config);

// Exporte uniquement l'app (léger) et des helpers dynamiques si nécessaire.
// Les modules lourds (auth, firestore, messaging) doivent être importés
// dynamiquement par les consommateurs afin d'être placés dans des chunks
// séparés quand c'est pertinent.
export const storage = getStorage(app);
// Use europe-west1 for functions because project Cloud Functions run in that region
export const functions = getFunctions(app, 'europe-west1');

// Helpers pour obtenir auth / db dynamiquement (singletons)
// Export live bindings so other modules can import { auth, db }
// without forcing static import of firebase/auth or firestore at build time.
export let auth = null;
export let db = null;

// Initialize auth synchronously so other modules can import `auth` safely.
let _auth = getAuth(app);
// expose provider factory on the auth instance for convenience
_auth.getGoogleProvider = () => new GoogleAuthProvider();
auth = _auth; // update exported live binding

// Compatibility helper: returns the auth instance (kept async for callers that
// expect a Promise).
export const getAuthInstance = async () => {
  return _auth;
};

let _db = null;
// Initialize Firestore synchronously and keep a compatibility async helper.
_db = getFirestore(app);
db = _db;

export const getDbInstance = async () => {
  return _db;
};

// Demander uniquement la permission, sans traiter les tokens ici
Notification.requestPermission().then((permission) => {
  console.log("Permission de notification :", permission);
});

// Fonction d'aide pour récupérer un token FCM
// Helper to get FCM token without importing messaging at module-load time
export const getMessagingToken = async (vapidKey, registration) => {
  try {
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messagingInstance = getMessaging(app);
    const currentToken = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    console.log("Token FCM généré:", currentToken ? "✅" : "❌");
    return currentToken;
  } catch (error) {
    console.error("Erreur lors de la génération du token FCM:", error);
    return null;
  }
};

export default app;