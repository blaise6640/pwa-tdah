
// Service Worker généré automatiquement - DÉVELOPPEMENT
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD_N6MZD6uuy7sifEQWcWIZP4u-eGd4zlg",
  authDomain: "pwa-tdah.firebaseapp.com",
  projectId: "pwa-tdah",
  storageBucket: "pwa-tdah.firebasestorage.app",
  messagingSenderId: "629896279890",
  appId: "1:629896279890:web:ac077d13c67748c1886c8b"
});

const messaging = firebase.messaging();
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  clients.claim();
});
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  console.log("🔕 Notification reçue en arrière-plan :", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const notificationTitle = data.title || "Nouvelle notification";
  const notificationOptions = {
    body: data.body || notification.body || "Tu as reçu une notification.",
    icon: "/icon.png",
    requireInteraction: true, // ✅ Empêche la fermeture automatique
    data: {
      url: data.screen ? `/${data.screen}` : "/developpeur-dashboard"
    },
    actions: [
      {
        action: "open_dashboard",
        title: "🔍 Vers l'application"
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function(event) {
  console.log("🖱️ Notification cliquée :", event.notification);
  event.notification.close();

  const redirectUrl = event.notification.data?.url || "/employe-dashboard";
  const origin = self.origin || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 1. Onglet qui contient l'URL cible
      for (const client of clientList) {
        const url = new URL(client.url);
        const pathAndSearch = `${url.pathname}${url.search}`;
        if (pathAndSearch.includes(redirectUrl)) {
          console.log("✅ Onglet avec URL correspondante trouvé :", client.url);
          return client.focus();
        }
      }

      // 2. N'importe quel onglet de l'application
      for (const client of clientList) {
        if (client.url.startsWith(origin)) {
          console.log("🔄 Redirection dans onglet existant :", client.url);
          client.postMessage({ type: "redirect", url: redirectUrl });
          return client.focus();
        }
      }

      // 3. Sinon, ouvrir un nouvel onglet
      console.log("🆕 Aucun onglet existant trouvé. Ouverture :", redirectUrl);
      return clients.openWindow(redirectUrl);
    })
  );
});
  