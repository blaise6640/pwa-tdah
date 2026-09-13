// 📦 hooks/usePhotoUpload.js
// Compresse un blob image, l’upload dans Firebase Storage, retourne l’URL

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { storage } from '../firebase'; // adapte le chemin si besoin

const usePhotoUpload = () => {
  const uploadPhoto = async (blob, path = 'photos/photo.jpg') => {
    try {
      // 1. Compression
      const compressed = await imageCompression(blob, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      // 2. Upload dans Firebase Storage
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, compressed);

      // 3. Récupération de l’URL publique
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Erreur lors de l’upload de la photo :', error);
      throw error;
    }
  };

  return { uploadPhoto };
};

export default usePhotoUpload;
