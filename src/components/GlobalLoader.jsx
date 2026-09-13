// ⏳ GlobalLoader.jsx
// Affiche un loader en overlay pendant le chargement global (user ou API)

import React from 'react';
import { Backdrop, CircularProgress, Typography, Stack } from '@mui/material';
import { useUser } from '../contexts/UserContext';

// Accept optional props so callers can control the loader explicitly.
const GlobalLoader = ({ open, message } = {}) => {
  const { loading } = useUser(); // fallback global loading
  const isOpen = typeof open === 'boolean' ? open : loading;

  return (
    <Backdrop open={isOpen} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: '#fff' }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress color="inherit" />
        {message ? <Typography>{message}</Typography> : null}
      </Stack>
    </Backdrop>
  );
};

export default GlobalLoader;
