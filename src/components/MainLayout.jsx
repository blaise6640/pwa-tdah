// src/components/MainLayout.jsx
import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import { Container } from "@mui/material";
import { useParams, useNavigate } from 'react-router-dom';
import app from "../firebase";
import  APP_CONFIG from "../app.config";
import useAppUser from "../hooks/useAppUser";
import packageJson from "../../package.json";

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const { firebaseUser, displayName, loading } = useAppUser();

  if (loading || !firebaseUser) return null;

  const handleLogout = async () => {
    // dynamic import to avoid bundling firebase/auth into the main chunk
    const { getAuth, signOut } = await import('firebase/auth');
    const auth = getAuth(app);
    await signOut(auth);
    navigate("/login");
  };

  return (
    <>
      <AppBar position="static"
        sx={import.meta.env.MODE !== "production" ? { bgcolor: '#9c27b0' } : {}} // mauve en TST
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" component="div">
              {APP_CONFIG.appName}{import.meta.env.MODE !== "production" ? " [TST]" : ""} : Bonjour {displayName || "?"}
            </Typography>
            <Typography variant="caption" component="div" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
              v{packageJson.version}
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {children}
      </Container>
    </>
  );
};

export default MainLayout;
