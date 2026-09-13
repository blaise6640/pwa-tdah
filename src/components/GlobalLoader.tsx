// src/components/GlobalLoader.tsx
import React from 'react';
import { Backdrop, CircularProgress, Typography, Stack } from '@mui/material';
import { useUser } from '../contexts/UserContext';

interface Props {
  open?: boolean;
  message?: string;
}

const GlobalLoader: React.FC<Props> = ({ open, message }) => {
  const { loading } = useUser();
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
