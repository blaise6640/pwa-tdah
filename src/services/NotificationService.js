import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

/**
 * Enregistre un token FCM pour un utilisateur dans Firestore.
 * Crée/écrase le document users/{uid}/fcmTokens/{token}
 */
export const saveFcmToken = async (uid, token, platform = 'web') => {
  if (!uid || !token) return null;
  try {
    const auth = getAuth();
    console.log('saveFcmToken: currentUser uid=', auth.currentUser?.uid);
    console.log('saveFcmToken: requested uid=', uid);
    const ref = doc(db, 'users', uid, 'fcmTokens', token);
    await setDoc(ref, {
      token,
      platform,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('Erreur saveFcmToken:', err);
    // Re-throw so callers can react to permission errors
    throw err;
  }
};

export default { saveFcmToken };
