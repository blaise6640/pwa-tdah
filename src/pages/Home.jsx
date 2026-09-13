import React from 'react';
import { Container, Button, Typography, Stack } from '@mui/material';
import { useSnackbar } from '../contexts/SnackbarProvider'; // import correct

const Home = () => {
  const { showSuccess, showError } = useSnackbar(); // 💡 tu prends les méthodes que tu veux

  const handleTest = () => {
    showSuccess("Tout s’est bien passé !");
    // ou showError("Une erreur est survenue !");
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Page d'accueil</Typography>
        <Button variant="contained" color="primary" onClick={handleTest}>
          Tester le toast
        </Button>
      </Stack>
    </Container>
  );
};

export default Home;
