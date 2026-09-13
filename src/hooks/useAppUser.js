import { useEffect, useState } from "react";
import app from "../firebase";


const useAppUser = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUserData, setAppUserData] = useState(null); // données Firestore
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => { };

    // Load auth/firestore lazily so they don't end up in the main chunk.
    (async () => {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const auth = getAuth(app);
      const db = getFirestore(app);

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);

        if (user) {
          // Création du doc Firestore si nécessaire
          // await createUserIfNotExists(user.uid, user.email);


          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setAppUserData(userSnap.data());
          } else {
            setAppUserData(null);
          }
        } else {
          setAppUserData(null);
        }

        setLoading(false);
      });
    })();

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        // noop
      }
    };
  }, []);

  return {
    firebaseUser,
    user: firebaseUser,
    appUserData,
    uid: firebaseUser?.uid || null,
    email: firebaseUser?.email || null,
    displayName: firebaseUser?.displayName || null,
    role: appUserData?.role || null,
    orgIds: appUserData?.orgIds || [],
    actif: appUserData?.actif !== false, // par défaut true
    loading,
  };
};

export default useAppUser;
