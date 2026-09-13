import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAppUser from "../hooks/useAppUser";
import APP_CONFIG from "../app.config";
import app from "../firebase";
import { detectPlatformForFcm } from "../utils/notificationService";

import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  CircularProgress
} from "@mui/material";
// firebase auth/firestore will be loaded dynamically inside handlers

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();
  const { role, loading, orgIds } = useAppUser();

  // Redirection après login : si l'utilisateur a exactement 1 org -> aller directement
  // vers la liste des propriétés de cette org; sinon redirection par rôle.
  useEffect(() => {
    if (loading) return;

    // Si l'utilisateur a exactement une organisation, rediriger vers ses propriétés
    if (Array.isArray(orgIds) && orgIds.length === 1) {
      navigate(`/organizations/${orgIds[0]}/properties`);
      return;
    }

    if (role) {
      const redirectPath = APP_CONFIG.roleRedirects[role] || "/home";
      navigate(redirectPath);
    }
  }, [role, orgIds, loading, navigate]);

  const createUserDoc = async (user, db) => {
    if (!user) return;
    const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        role: APP_CONFIG.defaultUserRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        actif: true
      });
    }
  };

  const handleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { getDoc, doc, getFirestore } = await import('firebase/firestore');

      const auth = getAuth(app);
      const db = getFirestore(app);

      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      // Ensure user doc exists
      await createUserDoc(userCredential.user, db);

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().actif === false) {
        await auth.signOut();
        alert(APP_CONFIG.blockedUserMessage);
        return;
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const { getAuth, signInWithPopup, getFirestore, getDoc, doc } = await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore')
      ]).then(([authModule, firestoreModule]) => ({
        getAuth: authModule.getAuth,
        signInWithPopup: authModule.signInWithPopup,
        getFirestore: firestoreModule.getFirestore,
        getDoc: firestoreModule.getDoc,
        doc: firestoreModule.doc,
      }));

      const auth = getAuth(app);
      const db = getFirestore(app);

      // Use the provider factory if available (we attached it in firebase.js)
      const provider = auth.getGoogleProvider ? auth.getGoogleProvider() : undefined;
      const userCredential = await signInWithPopup(auth, provider);

      // Ensure user doc exists
      await createUserDoc(userCredential.user, db);

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().actif === false) {
        await auth.signOut();
        alert(APP_CONFIG.blockedUserMessage);
        return;
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return alert("Renseigne ton email !");
    setIsAuthenticating(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email de réinitialisation envoyé !");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAuth();
        }}
        noValidate
        autoComplete="off"
        sx={{
          p: 3,
          border: "1px solid #ccc",
          borderRadius: 2,
          textAlign: "center",
          backgroundColor: "#f9f9f9"
        }}
      >
        <Typography variant="h5" gutterBottom>
          Connexion
        </Typography>

        <Button
          variant="outlined"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleGoogleLogin}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <>
              <img
                src="../images/google-icon.png"
                alt="Google"
                style={{ width: 20, marginRight: 8 }}
              />
              Google
            </>
          )}
        </Button>

        <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
          ou
        </Typography>

        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <TextField
          label="Mot de passe"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            isLogin ? "Se connecter" : "S'inscrire"
          )}
        </Button>

        <Link
          component="button"
          variant="body2"
          onClick={handlePasswordReset}
          sx={{ mt: 2, display: "block" }}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            "Mot de passe oublié ?"
          )}
        </Link>

        <Typography variant="body2" sx={{ mt: 2 }}>
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <Button
            variant="text"
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            sx={{ ml: 1 }}
            disabled={isAuthenticating}
          >
            {isLogin ? "Inscris-toi" : "Connecte-toi"}
          </Button>
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;
