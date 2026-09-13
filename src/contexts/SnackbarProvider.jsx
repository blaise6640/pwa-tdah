// src/contexts/SnackbarProvider.jsx
/**
 * SnackbarProvider.jsx
 * Fournit un contexte global pour afficher des snackbars/toasts.
 * La Snackbar ne se ferme jamais automatiquement ;
 * l’utilisateur doit cliquer sur l’icône de fermeture pour la fermer.
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert, Slide, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Création du contexte
export const SnackbarContext = createContext();

// Fournisseur global
export const SnackbarProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");

  // Fonction centralisée pour déclencher un toast
  const showSnackbar = useCallback((msg, type = "info") => {
    // si un message est déjà ouvert, on le ferme puis on enchaîne le nouveau
    setOpen(false);
    setMessage("");
    setSeverity(type);
    // ouverture du nouveau message à la prochaine frame
    requestAnimationFrame(() => {
      setMessage(msg);
      setOpen(true);
    });
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  // Valeurs exposées au contexte
  const value = {
    showSuccess: (msg) => showSnackbar(msg, "success"),
    showError:   (msg) => showSnackbar(msg, "error"),
    showWarning: (msg) => showSnackbar(msg, "warning"),
    showInfo:    (msg) => showSnackbar(msg, "info"),
  };

  // Transition personnalisée
  const TransitionSlide = (props) => <Slide {...props} direction="up" />;

  // Bouton de fermeture
  const action = (
    <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
      <CloseIcon fontSize="small" />
    </IconButton>
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={null}           // ne se ferme jamais automatiquement
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={TransitionSlide}
        action={action}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          iconMapping={{
            success: <span>✅</span>,
            error:   <span>❌</span>,
            warning: <span>⚠️</span>,
            info:    <span>ℹ️</span>,
          }}
          sx={{ width: "100%", fontWeight: "bold", fontSize: "1rem" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

// Hook prêt à l’emploi
export const useSnackbar = () => useContext(SnackbarContext);
