import React from "react";
import { Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Container sx={{ mt: 4, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom color="error">
          Accès non autorisé
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Vous n'avez pas les droits pour accéder à cette page.
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Chemin: {window.location.pathname}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Chemin voulu: {document.referrer || "Inconnu"}
        </Typography>
        <Button variant="contained" onClick={() => navigate("/")}>
          Revenir à l'accueil
        </Button>
      </Container>
    </MainLayout>
  );
};

export default Unauthorized;
