// 👤 UserBadge.jsx
// Affiche le rôle et l'état actif/inactif de l'utilisateur connecté (avec icône et couleurs)

import React from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useUser } from '../contexts/UserContext';

const UserBadge = () => {
  const { user, role, actif } = useUser();

  if (!user) return null;

  const color = actif ? 'success' : 'default';
  const label = actif ? 'Actif' : 'Inactif';

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="body1" fontWeight="bold">
        {role}
      </Typography>
      <Chip label={label} color={color} size="small" />
    </Stack>
  );
};

export default UserBadge;
