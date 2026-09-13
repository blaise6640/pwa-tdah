// src/hooks/useFirebaseNotifications.js
/**
 * useFirebaseNotifications.js
 * Hook React pour gérer les notifications Firebase en premier plan.
 * - Écoute les messages via onMessage
 * - Affiche toujours le titre et le corps reçus
 * - Affiche une notification système et une snackbar
 */
import { useEffect } from "react";
import app from "../firebase";
import { useSnackbar } from "../contexts/SnackbarProvider";
import showSystemNotification from "../utils/showSystemNotification";

const useFirebaseNotifications = () => {
  const { showInfo } = useSnackbar();

  useEffect(() => {
    console.log("🔔 Initialisation de l'écouteur de notifications en premier plan");

    // Configuration de l'écouteur onMessage
    let unsubscribe = () => {};
    (async () => {
      try {
        const { getMessaging, onMessage } = await import('firebase/messaging');
        const messaging = getMessaging(app);
        unsubscribe = onMessage(messaging, (payload) => {
          console.log("📩 Notification reçue en premier plan :", payload);

          // Extraction du titre et du corps
          const title =
            payload.notification?.title ||
            payload.data?.title ||
            "Nouvelle notification";

          const body =
            payload.notification?.body ||
            payload.data?.body ||
            "Vous avez reçu une nouvelle notification.";

          // Affichage dans la snackbar
          console.log(`Affichage notification: ${title} – ${body}`);
          showInfo(`${title} – ${body}`);

          // Affichage de la notification système
          if (!payload.notification) {
            showSystemNotification(title, body);
          }
        });
        console.log("✅ Écouteur onMessage configuré avec succès (dynamique)");
      } catch (err) {
        console.error('Erreur lors du chargement dynamique de firebase/messaging pour onMessage', err);
      }
    })();

    // Nettoyage
    return () => {
      console.log("Nettoyage de l'écouteur onMessage");
      try {
        unsubscribe();
      } catch (e) {}
    };
  }, [showInfo]);
};

export default useFirebaseNotifications;
