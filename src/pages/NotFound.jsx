import React from "react";
import { Button, Container, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom"; // Ajout de useLocation
import MainLayout from "../components/MainLayout";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Récupération de l'URL actuelle

  return (
    <MainLayout>
      <Container sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="h3" color="error" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Oups ! Page non trouvée.
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          La page que vous cherchez <strong>{location.pathname}</strong> n'existe pas ou a été déplacée.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/")}>
          Revenir à l'accueil
        </Button>
      </Container>
    </MainLayout>
  );
};

export default NotFound;
