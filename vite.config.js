import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from 'rollup-plugin-visualizer';
import copy from "rollup-plugin-copy";
import fs from "fs";
import path from "path";
// Importer la configuration
import appConfig from "./src/app.config.js";
import { VitePWA } from 'vite-plugin-pwa';


// Fonction pour générer le fichier SW
const generateServiceWorker = (isProd) => {
  const config = isProd ? appConfig.firebase.prod : appConfig.firebase.dev;
  const swContent = `
// Service Worker généré automatiquement - ${isProd ? 'PRODUCTION' : 'DÉVELOPPEMENT'}
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "${config.apiKey}",
  authDomain: "${config.authDomain}",
  projectId: "${config.projectId}",
  storageBucket: "${config.storageBucket}",
  messagingSenderId: "${config.messagingSenderId}",
  appId: "${config.appId}"
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
      url: data.screen ? \`/\${data.screen}\` : "/developpeur-dashboard"
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
        const pathAndSearch = \`\${url.pathname}\${url.search}\`;
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
  `;

  const filename = isProd
    ? "firebase-messaging-sw.prod.js"
    : "firebase-messaging-sw.dev.js";

  fs.writeFileSync(path.resolve(filename), swContent);

  return filename;
};

// Fonction d'aide pour l'affichage
const logEnvironment = (mode) => {
  const nodeEnv = process.env.NODE_ENV || 'non défini';
  const isProd = mode === "production";
  const swSource = isProd ? "firebase-messaging-sw.prod.js" : "firebase-messaging-sw.dev.js";

  console.log("\n┌────────────────────────────────────────────────┐");
  console.log("│           INFORMATIONS ENVIRONNEMENT           │");
  console.log("├────────────────────────────────────────────────┤");
  console.log(`│ Mode Vite      : ${mode.padEnd(29)} │`);
  console.log(`│ NODE_ENV       : ${nodeEnv.padEnd(29)} │`);
  console.log(`│ Fichier SW     : ${swSource.padEnd(29)} │`);
  console.log("└────────────────────────────────────────────────┘\n");
};

export default defineConfig(({ mode }) => {
  // Afficher les informations d'environnement
  logEnvironment(mode);

  const isProd = mode === "production";

  // Générer dynamiquement le fichier SW approprié
  const swSource = generateServiceWorker(isProd);
  console.log(`\x1b[32mFichier Service Worker généré: ${swSource}\x1b[0m`);

  return {
    // Enable sourcemaps in production builds to get readable stack traces
    build: {
      sourcemap: true,
      // note: keep minify as default to avoid huge bundles; sourcemap is enough for mapping
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id) return;
            // group firebase SDK into its own chunk to avoid inflating the main bundle
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            // group internal data libs to reduce duplication and help chunking
            if (id.includes('/src/lib/')) {
              return 'lib-data';
            }
            // group recharts/html2canvas if present
            if (id.includes('node_modules/recharts') || id.includes('html2canvas')) {
              return 'vendor-charts';
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon.ico', 'icons/icon-32x32.png', 'icons/icon-180x180.png'],
        workbox: {
          // Allow precaching of assets up to 8 MiB to accommodate large bundles
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        },
        manifest: {
          name: 'App Clovis',
          short_name: 'App Clovis',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#1976d2',
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        }
      }),
      copy({
        targets: [
          {
            src: swSource,
            dest: "dist",
            rename: "firebase-messaging-sw.js"
          }
        ],
        hook: "writeBundle"
      })
      , process.env.ANALYZE === 'true' ? visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true }) : null
    ]
  };
});