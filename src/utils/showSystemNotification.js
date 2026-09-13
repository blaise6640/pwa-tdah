// 📦 utils/showSystemNotification.js

/**
 * Affiche une notification native du système d'exploitation.
 * Fonctionne uniquement si l'utilisateur a accordé la permission.
 * Utilisable même en premier plan.
 */
const showSystemNotification = (title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",
      });
    } else {
      console.warn("🚫 Permission de notification non accordée.");
    }
  };
  
  export default showSystemNotification;
  