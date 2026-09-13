// src/components/commons/DesktopOnlyDialog.jsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { Fade } from '@mui/material';

const DesktopOnlyDialog = ({ open, onClose, title = "Accès restreint", message = "Disponible uniquement sur PC." }) => {
  return (
    <Dialog open={open} onClose={onClose} fullScreen TransitionComponent={Fade}>
      <DialogTitle sx={{ fontWeight: 600, textAlign: 'center' }}>{title}</DialogTitle>
      <DialogContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {message}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Merci d'utiliser un ordinateur pour accéder à cette fonctionnalité.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DesktopOnlyDialog;
