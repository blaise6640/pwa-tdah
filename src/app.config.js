const APP_CONFIG = {
  appName: "PWA-Clo",
  shortName: "PWA-Clo",
  defaultEmail: "[EMAIL_ADDRESS]",
  appDescription: "Template",
  appVersion: "0.0.1",
  defaultUserRole: "Parent",
  userRoles: ["Admin", "Developpeur", "Accueillant", "Patron", "Employe", "User"],
  blockedUserMessage: "Votre accès a été suspendu. Contactez un administrateur.",
  roleRedirects: {
    Parent: "/dashboard",
    Child: "/dashboard",
    Admin: "/admin-dashboard",
    Developpeur: "/developpeur-dashboard",
    Accueillant: "/accueillant-dashboard",
    Patron: "/employe-dashboard",
    Employe: "/employe-dashboard",
    User: "/organizations",
  },
  features: {
    notifications: true,
    email: true,
    photoCapture: true,
  },
  disabledRoutesByRole: {
    Employe: [],
    Accueillant: ["/developpeur-dashboard", "/admin-users"],
    Admin: [],
    Developpeur: [],
    Patron: [],
  },
  firebase: {
    dev: {
      apiKey: "AIzaSyD_N6MZD6uuy7sifEQWcWIZP4u-eGd4zlg",
      authDomain: "pwa-tdah.firebaseapp.com",
      projectId: "pwa-tdah",
      storageBucket: "pwa-tdah.firebasestorage.app",
      messagingSenderId: "629896279890",
      appId: "1:629896279890:web:ac077d13c67748c1886c8b",
      vapidKey: "BPbgb7VVR1q8JcSz_eH_vRspaaNcW1vLHmksKAViOwIA6fvptxpZQpcqR6p6q5AKzFOZjBrJ9vB8mU9rl-BGLdE"
    },
    prod: {
      apiKey: "AIzaSyD_N6MZD6uuy7sifEQWcWIZP4u-eGd4zlg",
      authDomain: "pwa-tdah.firebaseapp.com",
      projectId: "pwa-tdah",
      storageBucket: "pwa-tdah.firebasestorage.app",
      messagingSenderId: "629896279890",
      appId: "1:629896279890:web:ac077d13c67748c1886c8b",
      vapidKey: "BPbgb7VVR1q8JcSz_eH_vRspaaNcW1vLHmksKAViOwIA6fvptxpZQpcqR6p6q5AKzFOZjBrJ9vB8mU9rl-BGLdE"
    }
  }
};


export default APP_CONFIG; // ✅ maintenant tu peux faire `import APP_CONFIG from ...`
