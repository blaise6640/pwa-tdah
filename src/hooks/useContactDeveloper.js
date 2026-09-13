import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import APP_CONFIG from '../app.config';

/**
 * Hook personnalisé pour gérer l'envoi de messages au développeur via GitHub Issues
 * @returns {Function} handleContactSubmit - Fonction pour envoyer un message au développeur
 */
const useContactDeveloper = () => {
  const [user] = useAuthState(auth);

  const handleContactSubmit = async ({ title, description }) => {
    // Utilisation de l'URL réécrite pour la fonction Cloud (pas d'URL absolue)
    const url = "/createGitHubIssue";

    const displayName = user?.displayName;
    const email = user?.email;
    
    let userInfo = "utilisateur inconnu";
    
    if (displayName && email) {
      userInfo = `${displayName} (${email})`;
    } else if (displayName) {
      userInfo = displayName;
    } else if (email) {
      userInfo = email;
    }
    
    const body = `Signalé par ${userInfo} :\n\n${description}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.warn("⚠️ Pas de JSON dans la réponse :", jsonErr.message);
      }

      if (!response.ok) {
        throw new Error(data?.error || "Erreur lors de l'envoi de l'issue.");
      }

      return data;
    } catch (err) {
      console.error("🔥 Erreur envoi développeur :", err.message || err);
      throw err;
    }
  };

  return handleContactSubmit;
};

export default useContactDeveloper;
