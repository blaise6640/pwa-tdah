import { getAuth } from "firebase/auth";

/**
 * Détecte la plateforme pour l'enregistrement du token FCM.
 * @returns {"web"|"android"|"ios"}
 */
export function detectPlatformForFcm() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
  return "web";
}

/**
 * Déclenche l'envoi d'une notification test à soi-même ou à un utilisateur donné.
 * @param {string} userId - (optionnel) ID de l'utilisateur cible
 * @returns {Promise<object>} Résultat de l'appel à la fonction Cloud
 */
export const sendNotificationTest = async (userId) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Non authentifié");
  const token = await user.getIdToken();

  const params = {};
  if (userId) params.userId = userId;

  const response = await fetch("/notificationTestHttp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  return await response.json();
};