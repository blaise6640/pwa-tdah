import React from "react";
import { useUser } from "../../contexts/UserContext";
import { Card, CardContent, Typography, Box } from "@mui/material";

const DebugCapabilities = () => {
  const { user, role, capabilities } = useUser();

  return (
    <Box sx={{ mt: 3 }}>
      <Card sx={{ backgroundColor: "#f0f0f0" }}>
        <CardContent>
          <Typography variant="h6">🧪 Debug - UserContext</Typography>
          <Typography>Email : {user?.email || "Non connecté"}</Typography>
          <Typography>Rôle : {role || "Non défini"}</Typography>
          <Typography>
            📷 Caméra : {capabilities.camera ? "✅ Disponible" : "❌ Non disponible"}
          </Typography>
          <Typography>
            🔔 Notifications : {capabilities.notifications ? "✅ Autorisées" : "❌ Refusées"}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DebugCapabilities;
