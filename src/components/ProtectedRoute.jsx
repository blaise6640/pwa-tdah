import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import APP_CONFIG from '../app.config';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, role } = useUser();
  const location = useLocation();

//  console.log("🔐 ProtectedRoute:", { role, allowedRoles, user });

  if (loading) {
    return null;
  }

  if (!user) {
    console.log("⛔️ Not logged in → redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    console.log("🚫 Role not allowed → redirecting to unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }

  const disabledRoutes = APP_CONFIG.disabledRoutesByRole?.[role] || [];

  if (disabledRoutes.includes(location.pathname)) {
    console.log("🚫 This route is disabled for current role → blocking access");
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Accès désactivé</h2>
        <p>Cette fonctionnalité est momentanément indisponible pour votre profil.</p>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
