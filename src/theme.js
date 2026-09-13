import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e676', // Neon Green (Minecraft XP)
      contrastText: '#000000',
    },
    secondary: {
      main: '#d500f9', // Neon Purple (Nether portal?)
      contrastText: '#ffffff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e', // Dark gray stone-like
    },
    error: {
      main: '#ff1744', // Redstone red
    },
    info: {
      main: '#2979ff', // Diamond blue
    },
    success: {
      main: '#00e676',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
  },
  typography: {
    fontFamily: '"Press Start 2P", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '2rem',
    },
    h2: {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '1.5rem',
    },
    h3: {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '1.25rem',
    },
    h4: {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    h5: {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '0.875rem',
    },
    h6: {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '0.75rem',
    },
    button: {
      fontFamily: '"Press Start 2P", cursive',
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Pixel style
          border: '2px solid',
          boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)', // Retro shadow
          '&:active': {
            boxShadow: 'none',
            transform: 'translate(4px, 4px)',
          },
        },
        containedPrimary: {
          borderColor: '#00a352',
        },
        containedSecondary: {
          borderColor: '#a000c8',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '2px solid #333',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '2px solid #555',
        }
      }
    }
  },
});

export default theme;
