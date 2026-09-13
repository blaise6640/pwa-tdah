import ExpenseDetailPage from "./pages/ExpenseDetailPage";
/**
 * main.jsx
 * Point d’entrée de l’app PWA :
 *  - Enregistre le service worker pour Firebase Messaging
 *  - Récupère le token FCM et l’envoie à Firestore
 *  - Monte ensuite votre application React (routage, thèmes, providers…)
 *  - Initialise le hook de notifications pour les messages en premier plan
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import des pages et composants
import Login from "./pages/Login";
import Home from "./pages/Home";
import MesPhotosPage from "./pages/MesPhotosPage";
import AdminDashboard from "./pages/AdminDashboard";
import AccueillantDashboard from "./pages/AccueillantDashboard";
import DeveloppeurDashboard from "./pages/DeveloppeurDashboard";
import EmployeDashboard from "./pages/EmployeDashboard";
import PatronDashboard from "./pages/PatronDashboard";
import AdminUserManagement from "./features/users/pages/AdminUserManagement";
import AdminUserPhotosPage from "./pages/AdminUserPhotosPage";
import DevPreview from "./pages/DevPreview";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import OrganizationsPropertiesPage from "./pages/OrganizationsPropertiesPage";
// PropertyLeasesPage has been migrated into PropertyOverviewPage (PropertyLeasesSection)
// import PropertyLeasesPage from "./pages/PropertyLeasesPage";
import LeaseDetailPage from "./pages/LeaseDetailPage";
import LeaseFlowsPage from "./pages/leases/LeaseFlowsPage";
import PaymentsPage from "./pages/PaymentsPage";
import OrganizationDetailPage from "./pages/OrganizationDetailPage";
import DashboardPage from "./pages/DashboardPage";
import OrgExpenseSettingsPage from "./pages/OrgExpenseSettingsPage";
import PropertyExpensesPage from "./pages/PropertyExpensesPage";
import PropertyOverviewPage from "./pages/PropertyOverviewPage";
import { db } from './firebase';
import OrganizationsPage from "./pages/OrganizationsPage";
import LoansPage from "./pages/loans/LoansPage";
import LoanDetailsPage from "./pages/loans/LoanDetailsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";

// Import des contexts et utils
import { UserProvider } from "./contexts/UserContext";
import { SnackbarProvider } from "./contexts/SnackbarProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalLoader from "./components/GlobalLoader";


// Material UI
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// Firebase Messaging
import app, { getMessagingToken } from "./firebase";

// Hook de notifications en premier plan
import useFirebaseNotifications from "./hooks/useFirebaseNotifications";

// Petit composant pour lancer le hook
const NotificationsListener = () => {
  useFirebaseNotifications();
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
          // Optionally send to remote logging endpoint if configured
          // if (import.meta.env.VITE_LOG_URL) fetch(import.meta.env.VITE_LOG_URL, { method: 'POST', body: JSON.stringify({ type: 'error', message: String(event.error || event.message), stack: event.error?.stack }) });
        } catch (e) {}
      });
      window.addEventListener('unhandledrejection', (ev) => {
        try {
          console.error('[GlobalError] unhandledrejection', ev.reason);
          // if (import.meta.env.VITE_LOG_URL) fetch(import.meta.env.VITE_LOG_URL, { method: 'POST', body: JSON.stringify({ type: 'unhandledrejection', reason: ev.reason }) });
        } catch (e) {}
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
      // TODO : envoyer ce token à Firestore pour l’utilisateur connecté
      console.log("Token FCM obtenu :", token);
    }
  } catch (err) {
    console.error("❌ Erreur SW FCM ou token :", err);
  }

  // 3) Montée de l’app React
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
                  <Route path="*" element={<NotFound />} />

                  <Route element={<ProtectedRoute allowedRoles={["Employe", "Patron"]} />}>
                    <Route path="/employe-dashboard" element={<EmployeDashboard />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Admin", "Developpeur", "Patron"]} />}>
                    <Route path="/admin-users" element={<AdminUserManagement />} />
                    <Route path="/admin/photos/:uid" element={<AdminUserPhotosPage />} />
                    <Route path="/employe-dashboard" element={<EmployeDashboard />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />
                    <Route path="/admin-users" element={<AdminUserManagement />} />
                    <Route path="/admin/photos/:uid" element={<AdminUserPhotosPage />} />
                    {/* Note: les routes d'organisation sont gérées ailleurs pour permettre l'accès aux utilisateurs authentifiés */}
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Accueillant"]} />}>
                    <Route path="/accueillant-dashboard" element={<AccueillantDashboard />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["Admin", "Developpeur", "Patron"]} />}>
                    <Route path="/developpeur-dashboard" element={<DeveloppeurDashboard />} />
                    <Route path="/dev-preview" element={<DevPreview />} />
                  </Route>


                  <Route element={<ProtectedRoute allowedRoles={["Patron"]} />}>
                    <Route path="/patron-dashboard" element={<PatronDashboard />} />
                  </Route>

                  <Route element={<ProtectedRoute />}>  
                    <Route path="/home" element={<Home />} />
                    <Route path="/mes-photos" element={<MesPhotosPage />} />
                    {/* Routes organisations accessibles aux utilisateurs authentifiés */}
                    <Route path="/organizations" element={<OrganizationsPage db={db} />} />
                    <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
                    <Route path="/organizations/:orgId/properties" element={<OrganizationsPropertiesPage />} />
                    <Route path="/organizations/:orgId/dashboard" element={<DashboardPage />} />
                    <Route path="/organizations/:orgId/properties/:propertyId/dashboard" element={<DashboardPage />} />
                    {/* Route obsolète supprimée : gestion des baux intégrée dans PropertyOverviewPage */}
                    <Route path="/organizations/:orgId/properties/:propertyId/overview" element={<PropertyOverviewPage />} />
                    <Route path="/organizations/:orgId/properties/:propertyId/expenses" element={<PropertyExpensesPage />} />
                    <Route path="/organizations/:orgId/properties/:propertyId/expenses/:expenseId" element={<ExpenseDetailPage />} />
                    <Route path="/organizations/:orgId/properties/:propertyId/leases/:leaseId/*" element={<LeaseDetailPage />} />
                    <Route path="/organizations/:orgId/payments" element={<PaymentsPage />} />
                    <Route path="/organizations/:orgId/loans" element={<LoansPage />} />
                    <Route path="/organizations/:orgId/loans/:loanId" element={<LoanDetailsPage />} />
                    <Route path="/organizations/:orgId/settings/expenses" element={<OrgExpenseSettingsPage />} />
                    <Route path="/organizations/:orgId/properties/:propertyId/leases/:leaseId/flows" element={<LeaseFlowsPage />} />
                    <Route path="/organizations/:orgId/properties/:propertyId" element={<PropertyDetailPage />} />
                  </Route>
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
