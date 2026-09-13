// Import des modules Firebase nécessaires
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";
import { getFunctions } from 'firebase/functions';
import { getStorage } from "firebase/storage";
import APP_CONFIG from "./app.config";

// Sélection automatique de la bonne config selon l'environnement
const config = 
  import.meta.env.MODE === "production"
    ? APP_CONFIG.firebase.prod
    : APP_CONFIG.firebase.dev;

// Initialisation Firebase
const app = initializeApp(config);

// Exporte les services dont tu as besoin
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); 
export const storage = getStorage(app);
export const messaging = getMessaging(app);
// Use europe-west1 for functions because project Cloud Functions run in that region
export const functions = getFunctions(app, 'europe-west1');

// Demander uniquement la permission, sans traiter les tokens ici
Notification.requestPermission().then((permission) => {
  console.log("Permission de notification :", permission);
});

// Fonction d'aide pour récupérer un token FCM
export const getMessagingToken = async (vapidKey, registration) => {
  try {
    const currentToken = await getToken(messaging, { 
      vapidKey, 
      serviceWorkerRegistration: registration 
    });
    console.log("Token FCM généré:", currentToken ? "✅" : "❌");
    return currentToken;
  } catch (error) {
    console.error("Erreur lors de la génération du token FCM:", error);
    return null;
  }
};

export default app;