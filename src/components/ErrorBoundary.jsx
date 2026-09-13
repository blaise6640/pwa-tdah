// 📦 components/ErrorBoundary.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Typography, Box } from '@mui/material';
import { useUser } from '../contexts/UserContext';
import APP_CONFIG from '../app.config'; // ✅ import par défaut

// 🌟 Composant principal (class) — gère les erreurs
class ErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMsg: '',
      redirect: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error, info) {
    console.error('Erreur attrapée par ErrorBoundary :', error, info);
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'production') {
        // Emitting a clear, searchable log in production to help remote debugging
        const errStack = (error && error.stack) ? error.stack : String(error);
        console.error('[ProdLog] ErrorBoundary caught', { message: error && error.message ? error.message : String(error), stack: errStack, info });
      }
    } catch (e) {
      // ignore
    }
  }

  handleReset = () => {
    this.setState({ redirect: true });
  };

  render() {
    const { role } = this.props;

    if (this.state.redirect) {
      const fallbackRoute = APP_CONFIG.roleRedirects?.[role] || '/home';
      return <Navigate to={fallbackRoute} />;
    }

    if (this.state.hasError) {
      return (
        <Box
          sx={{
            padding: 4,
            textAlign: 'center',
            maxWidth: 500,
            margin: '40px auto',
            border: '2px solid #f44336',
            borderRadius: 4,
            backgroundColor: '#fff3f3',
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/2748/2748558.png"
            alt="Erreur"
            width={100}
            style={{ marginBottom: 20 }}
          />
          <Typography variant="h5" gutterBottom color="error">
            💥 Une erreur est survenue
          </Typography>
          <Typography variant="body1" gutterBottom>
            {this.state.errorMsg || 'Une erreur inconnue est survenue.'}
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={this.handleReset}
            sx={{ mt: 2 }}
          >
            🔙 Retour au dashboard
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// 🧠 Wrapper fonctionnel autour de la class, pour utiliser les hooks
const ErrorBoundary = ({ children }) => {
  const context = useUser();
  const role = context?.role || null;

  return <ErrorBoundaryCore role={role}>{children}</ErrorBoundaryCore>;
};

export default ErrorBoundary;
