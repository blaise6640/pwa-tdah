// 🧪 DevPreview.jsx
// Page de démonstration interne pour tester tous les composants et hooks du template (accès restreint aux développeurs)

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Stack,
  Divider,
  Button,
  MenuItem,
  Select,
  Chip,
  Paper,
} from '@mui/material';

import UserBadge from '../components/UserBadge';
import PhotoCapture from '../components/PhotoCapture';
import { useSnackbar } from '../contexts/SnackbarProvider';
import APP_CONFIG from '../app.config';

const DevPreview = () => {
  const { showSuccess, showError } = useSnackbar();
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Admin');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Dev Preview – Composants du Template
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={4}>

        {/* 🔐 USERBADGE */}
        <section>
          <Typography variant="h6">🔐 UserBadge</Typography>
          <UserBadge />
        </section>

        {/* 🍞 SNACKBARS */}
        <section>
          <Typography variant="h6">🍞 Snackbars</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => showSuccess("Succès !")}>
              Succès
            </Button>
            <Button variant="outlined" color="error" onClick={() => showError("Erreur !")}>
              Erreur
            </Button>
          </Stack>
        </section>

        {/* 📸 PHOTO CAPTURE */}
        <section>
          <Typography variant="h6">📸 PhotoCapture</Typography>
          {APP_CONFIG.features.photoCapture ? (
            <>
              <PhotoCapture
                onPhotoTaken={(blobUrl) => {
                  console.log("📷 Photo capturée :", blobUrl);
                  setCapturedUrl(blobUrl);
                }}
              />
              {capturedUrl && (
                <img
                  src={capturedUrl}
                  alt="Preview"
                  style={{ marginTop: 16, maxWidth: "100%", borderRadius: 12 }}
                />
              )}
            </>
          ) : (
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography color="text.secondary">
                La capture photo est désactivée dans la configuration de l'application.
              </Typography>
            </Paper>
          )}
        </section>

        {/* 🧭 ROLE MENU */}
        <section>
          <Typography variant="h6">🧭 RoleMenu (démo statique)</Typography>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            displayEmpty
            fullWidth
          >
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Developpeur">Developpeur</MenuItem>
            <MenuItem value="Patron">Patron</MenuItem>
            <MenuItem value="Employe">Employé</MenuItem>
            <MenuItem value="Accueillant">Accueillant</MenuItem>
          </Select>
          <Typography variant="body2" component="span" sx={{ mt: 1 }}>
            Rôle sélectionné : <Chip label={selectedRole} />
          </Typography>
        </section>

        {/* 🎨 CUSTOM BUTTON */}
        <section>
          <Typography variant="h6">🎨 CustomButton (exemple)</Typography>
          <Button variant="contained" sx={{ borderRadius: 4, fontWeight: 'bold' }}>
            Bouton stylé
          </Button>
        </section>

        {/* ✉️ NOTIFICATIONS / EMAILS */}
        <section>
          <Typography variant="h6">✉️ Prévisualisation Notifications / Emails</Typography>
          <Paper sx={{ p: 2, bgcolor: '#fafafa', border: '1px dashed #ccc' }}>
            <Typography variant="body2" component="div">
              Exemple de contenu de notification : <br />
              <strong>"Une nouvelle question vous a été assignée."</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 2 }}>
              Exemple d'e-mail HTML :<br />
              <code>&lt;h1&gt;Nouvelle demande&lt;/h1&gt;&lt;p&gt;Un utilisateur a besoin de vous.&lt;/p&gt;</code>
            </Typography>
          </Paper>
        </section>

      </Stack>
    </Container>
  );
};

export default DevPreview;
