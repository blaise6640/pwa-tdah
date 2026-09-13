# 📦 App-Pwa – Template PWA React + Firebase

## ✅ Version actuelle : v0.1.4

### Fonctions incluses :
- Authentification Firebase avec redirection basée sur le rôle
- Layout de base avec AppBar et structure responsive
- Gestion des utilisateurs par l’admin (rôles, statut actif/inactif)
- Composant `ProtectedRoute` pour sécuriser les routes
- Thème global Material UI (`theme.js`)
- Composants stylés : UserBadge, Snackbar global, Loader
- Page `/dev-preview` pour tester tous les composants (accès Developpeur)
- Capture photo avec compression (`PhotoCapture`)
- Snackbars success/error testables

---

## 🔜 Prochaines versions

### 🏷️ v0.1.5 – Notifications push Firebase
- Intégration complète de Firebase Cloud Messaging (FCM)
- Gestion des permissions
- Token enregistré dans Firestore
- Réception des notifications sur mobile et desktop (via service worker)

### 🏷️ v0.1.6 – Double environnement Firebase (Test & Prod)
- Configuration de deux projets Firebase (test + prod)
- Switch d’environnement dans `app.config.js`
- Séparation des clés `.env`
- Déploiement simplifié selon l’environnement

---

## 🔧 Environnement recommandé
- React 18 + Vite
- Material UI v5
- Firebase SDK v10+
- Hébergement Firebase Hosting
