import APP_CONFIG from "../app.config";
import app from "../firebase";

export const initFirebaseMessaging = async () => {
  console.log("🚀 Lancement de initFirebaseMessaging");

  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Service workers non supportés");
    return null;
  }

  try {
    console.log("🔧 Tentative d'enregistrement du service worker...");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });

    const vapidKey =
      import.meta.env.MODE === "production"
        ? APP_CONFIG.firebase.prod.vapidKey
        : APP_CONFIG.firebase.dev.vapidKey;

    // Dynamically import messaging to avoid including it in the main bundle
    const { getMessaging, getToken } = await import('firebase/messaging');

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      return token;
    } else {
      console.warn("⚠️ Aucun token reçu (getToken a retourné null)");
      return null;
    }
  } catch (error) {
    console.error("❌ Erreur dans initFirebaseMessaging :", error);
    return null;
  }
};
