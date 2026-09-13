import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import useFirebaseNotifications from "./hooks/useFirebaseNotifications";
import { useSnackbar } from "./contexts/SnackbarProvider";
import showSystemNotification from "./utils/showSystemNotification";

function App() {
  const [count, setCount] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '' });
  const { showInfo } = useSnackbar();

  // Utiliser le hook pour gérer les notifications
  useFirebaseNotifications();

  // Fonction pour gérer les notifications manuelles
  const handleNotification = (message) => {
    setNotification({ open: true, message });
    // Si vous avez un composant NotificationPopup, ajoutez-le au JSX
  };

  useEffect(() => {
    setTimeout(() => {
      // Test des notifications UI
      console.log("Test de notification UI");
      showInfo("Test de notification Snackbar");
      
      // Test des notifications système
      showSystemNotification("Test", "Test de notification système");
      
      // Simuler une notification Firebase
      console.log("Simulation d'une notification Firebase");
      const mockPayload = {
        notification: {
          title: "Notification simulée",
          body: "Ceci est un test de notification"
        }
      };
      // Utiliser le même traitement que dans le hook
      showInfo(`${mockPayload.notification.title} – ${mockPayload.notification.body}`);
      showSystemNotification(mockPayload.notification.title, mockPayload.notification.body);
    }, 3000);
  }, [showInfo]); // Ajouter showInfo comme dépendance
  
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>TDA-app</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <button onClick={() => handleNotification("Test manuel : Notification Popup")}>
          Tester Notification
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      
      {/* Ajoutez ici votre composant NotificationPopup si vous en avez un */}
    </>
  );
}

export default App;