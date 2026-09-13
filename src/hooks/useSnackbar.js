// 🍞 useSnackbar.js
// Permet de déclencher facilement des snackbars globaux dans tout le projet

import { useContext } from 'react';
import { SnackbarContext } from '../contexts/SnackbarProvider';

const useSnackbar = () => {
  const { setSnackbar } = useContext(SnackbarContext);

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  return showSnackbar;
};

export default useSnackbar;
