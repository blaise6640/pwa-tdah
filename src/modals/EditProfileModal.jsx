// src/features/profile/components/EditProfileModal.jsx

/**
 * EditProfileModal.jsx
 *
 * Modal permettant à un employé de renseigner ou corriger son prénom et nom.
 * Sauvegarde les informations dans Firestore à la validation.
 * Optimisé mobile-first avec Material UI.
 *
 * Props :
 * - open (bool) : ouvre ou ferme le modal.
 * - onClose (function) : fonction pour fermer le modal.
 * - userId (string) : UID de l'utilisateur à mettre à jour.
 */

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from '@mui/material';
import app from '../firebase';

const EditProfileModal = ({ open, onClose, userId }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    setLoading(true);
    try {
      // lazy-load firestore + auth to avoid bundling them in the main chunk
      const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
      const { getAuth, updateProfile } = await import('firebase/auth');
      const db = getFirestore(app);
      const auth = getAuth(app);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await updateProfile(auth.currentUser, {
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil :', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Complétez votre profil</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || !firstName.trim() || !lastName.trim()}>
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProfileModal;
