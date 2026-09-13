import { createContext, useContext, useEffect, useState } from "react";
import useAppUser from "../hooks/useAppUser";
import { checkCameraAccess, requestNotificationPermission } from "../utils/permissions";
import { initFirebaseMessaging } from "../utils/initFirebaseMessaging";
import { detectPlatformForFcm } from "../utils/notificationService";
import { saveFcmToken } from "../services/NotificationService";
import APP_CONFIG from "../app.config";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { firebaseUser, appUserData, role, uid, loading: loadingAppUser } = useAppUser();

  const [capabilities, setCapabilities] = useState({
    camera: false,
    notifications: false,
  });

  const [hasRegisteredToken, setHasRegisteredToken] = useState(false);

  // 🔔 Enregistrement du token FCM une fois l'utilisateur chargé
  useEffect(() => {
    const registerToken = async () => {
      if (firebaseUser && uid && !hasRegisteredToken) {
        const token = await initFirebaseMessaging();
        if (token) {
          const platform = detectPlatformForFcm();
          try {
            const ok = await saveFcmToken(uid, token, platform);
            if (ok) {
              console.log('✅ Token FCM enregistré pour', uid);
              setHasRegisteredToken(true);
            }
          } catch (e) {
            console.warn('⚠️ Impossible d\'enregistrer le token FCM', e);
          }
        }
      }
    };

    registerToken();
  }, [firebaseUser, uid, hasRegisteredToken]);

  // 🔁 Re-tentative sur retour d'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        firebaseUser &&
        uid &&
        !hasRegisteredToken
      ) {
        initFirebaseMessaging().then(async (token) => {
          if (token) {
            try {
              const platform = detectPlatformForFcm();
              const ok = await saveFcmToken(uid, token, platform);
              if (ok) {
                console.log('✅ Token FCM enregistré (visibilitychange) pour', uid);
                setHasRegisteredToken(true);
              }
            } catch (e) {
              console.warn('⚠️ Impossible d\'enregistrer le token FCM (visibilitychange)', e);
            }
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [firebaseUser, uid, hasRegisteredToken]);

  // 🎥🔔 Détection des capacités
  useEffect(() => {
    const detectCapabilities = async () => {
      // Vérifie si les notifications sont activées dans la config
      const notificationsEnabled = APP_CONFIG.features.notifications;
      // Vérifie si la capture photo est activée dans la config
      const photoCaptureEnabled = APP_CONFIG.features.photoCapture;

      // Définit les valeurs de capacités en fonction de la configuration
      let cameraAccess = false;
      let notificationAccess = false;

      // Demande les permissions seulement pour les fonctionnalités activées
      if (photoCaptureEnabled) {
        cameraAccess = await checkCameraAccess();
      }

      if (notificationsEnabled) {
        notificationAccess = await requestNotificationPermission();
      }

      setCapabilities({ camera: cameraAccess, notifications: notificationAccess });
    };

    detectCapabilities();
  }, []);

  //  console.log('UserProvider state:', { firebaseUser, appUserData, role, uid, loadingAppUser });

  return (
    <UserContext.Provider
      value={{
        user: {
          ...firebaseUser,
          ...appUserData,
          orgIds: appUserData?.orgIds || [], // take orgIds from Firestore user doc
        },
        role,
        uid,
        hasRegisteredToken,
        capabilities,
        loading: loadingAppUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
