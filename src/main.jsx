/**
 * main.jsx
 * Point d’entrée de l’app PWA :
 *  - Enregistre le service worker pour Firebase Messaging
 *  - Récupère le token FCM et l’envoie à Firestore
 *  - Montre ensuite votre application React (routage, thèmes, providers…)
 *  - Initialise le hook de notifications pour les messages en premier plan
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@fontsource/press-start-2p"; // Import font

// Import des pages et composants
import Login from "./pages/Login";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import DashboardPage from "./pages/DashboardPage";
import PlanningPage from "./pages/PlanningPage"; // Will create this

// Import des contexts et utils
import { UserProvider } from "./contexts/UserContext";
import { SnackbarProvider } from "./contexts/SnackbarProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalLoader from "./components/GlobalLoader";


// Material UI
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

import app, { getMessagingToken } from "./firebase";

// Hook de notifications en premier plan
import useFirebaseNotifications from "./hooks/useFirebaseNotifications";
import useAggressiveReminders from "./hooks/useAggressiveReminders";

// Petit composant pour lancer le hook
const NotificationsListener = () => {
  useFirebaseNotifications();
  useAggressiveReminders();
  return null;
};

/**
 * Bootstrap de l’application :
 * 1) Enregistrement du SW pour FCM
 * 2) Récupération du token FCM
 * 3) Montée de l’arbre React
 */
async function bootstrap() {
  // Global error handlers (helpful for production debugging)
  try {
    const isProd = import.meta.env.MODE === 'production';
    if (isProd) {
      window.addEventListener('error', (event) => {
        try {
          console.error('[GlobalError] error event', event.error || event.message || event);
        } catch (e) { }
      });
      window.addEventListener('unhandledrejection', (ev) => {
        try {
          console.error('[GlobalError] unhandledrejection', ev.reason);
        } catch (e) { }
      });
    }
  } catch (e) {
    // ignore environment introspection errors
  }
  // 1) Enregistrement du service worker pour FCM
  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("✅ SW FCM enregistré :", registration);

    // 2) Récupération du token FCM
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const token = await getMessagingToken(vapidKey, registration);
    if (token) {
      console.log("Token FCM obtenu :", token);
    }
  } catch (err) {
    console.error("❌ Erreur SW FCM ou token :", err);
  }

  // 3) Montée de l'app React
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <UserProvider>
        <SnackbarProvider>
          <ErrorBoundary>
            {/* Hook notifications en premier plan */}
            <NotificationsListener />
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <GlobalLoader />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />

                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/planning" element={<PlanningPage />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ThemeProvider>
          </ErrorBoundary>
        </SnackbarProvider>
      </UserProvider>
    </React.StrictMode>
  );
}

bootstrap();
