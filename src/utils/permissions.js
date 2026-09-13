// permissions.js – détection caméra + notifications
import APP_CONFIG from "../app.config";

export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  };
  
  export const checkCameraAccess = async () => {
    // Si la fonctionnalité de capture photo est désactivée dans la config, retourner false sans demander l'accès
    if (!APP_CONFIG.features.photoCapture) return false;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      // Vérification double de la configuration avant de demander l'accès caméra
      if (!APP_CONFIG.features.photoCapture) return false;
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  };
  