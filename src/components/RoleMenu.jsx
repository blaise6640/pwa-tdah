import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  Paper
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import PersonIcon from '@mui/icons-material/Person';
import APP_CONFIG from '../app.config';

// Fonction pour obtenir l'icône en fonction du rôle
const getRoleIcon = (role) => {
  switch(role) {
    case 'Admin': 
      return <AdminPanelSettingsIcon color="error" />;
    case 'Patron': 
      return <BusinessIcon color="primary" />;
    case 'Employe': 
      return <WorkIcon color="success" />;
    case 'Developpeur': 
      return <DeveloperModeIcon color="warning" />;
    case 'Accueillant': 
      return <PersonIcon color="info" />;
    default:
      return <WorkIcon color="action" />;
  }
};

// Fonction pour obtenir la description du rôle
const getRoleDescription = (role) => {
  switch(role) {
    case 'Admin': 
      return 'Accès complet à toutes les fonctionnalités';
    case 'Patron': 
      return 'Accès aux fonctionnalités de gestion';
    case 'Employe': 
      return 'Accès limité aux fonctionnalités';
    case 'Developpeur': 
      return 'Accès aux fonctionnalités de développement';
    case 'Accueillant': 
      return 'Accès aux fonctionnalités d\'accueil';
    default:
      return 'Accès standard';
  }
};

const RoleMenu = ({ anchorEl, onClose, onSelect, currentRole, isMobile }) => {
  const theme = useTheme();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        elevation: 3,
        sx: {
          mt: 1.5,
          width: isMobile ? '200px' : '250px',
          borderRadius: 1,
          '& .MuiMenuItem-root': {
            py: isMobile ? 1 : 1.5,
          }
        },
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          p: 1.5,
          py: 1,
          fontWeight: 'medium',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        Sélectionner un rôle
      </Typography>

      {APP_CONFIG.userRoles.map((role, index) => [
          <MenuItem
            key={`role-${role}`}
            onClick={() => {
              onSelect(role);
              onClose();
            }}
            dense={isMobile}
            selected={role === currentRole}
            sx={{
              bgcolor: role === currentRole ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: role === currentRole ? 'action.selected' : 'action.hover',
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: isMobile ? '30px' : '40px' }}>
              {getRoleIcon(role)}
            </ListItemIcon>
            <ListItemText 
              primary={role}
              secondary={!isMobile && getRoleDescription(role)}
              primaryTypographyProps={{
                fontSize: isMobile ? '0.875rem' : '1rem',
                fontWeight: role === currentRole ? 'medium' : 'regular'
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
              }}
            />
          </MenuItem>,
          // Ajouter un séparateur si ce n'est pas le dernier élément
          index < APP_CONFIG.userRoles.length - 1 ? <Divider key={`divider-${role}`} variant="middle" /> : null
        ]).flat().filter(Boolean)}
    </Menu>
  );
};

export default RoleMenu;
