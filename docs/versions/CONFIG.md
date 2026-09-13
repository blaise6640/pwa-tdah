
# 📄 CONFIG.md – Paramétrage & personnalisation du template

## 🔧 Informations à adapter projet par projet

| Élément                                 | Fichier                                      | Description                                                                 |
|-----------------------------------------|----------------------------------------------|-----------------------------------------------------------------------------|
| 🔑 Clés Firebase (frontend)             | `src/firebase.js`                            | `apiKey`, `authDomain`, `projectId`, etc. – Copiés depuis la console Firebase |
| 🔐 Clé publique Web Push (FCM)          | `src/app.config.js`                          | Clé utilisée pour `getToken()` (`FCM_VAPID_KEY`)                            |
| 🔐 Clé privée serveur FCM               | `backend/.env`                               | `FCM_SERVER_KEY` – utilisée pour envoyer les notifications via HTTP v1     |
| 🗝️ Identifiants Admin SDK Firebase      | `backend/serviceAccountKey.json`             | Fichier JSON généré dans Firebase > Paramètres > Comptes de service        |
| 👤 UID de test pour envoi de notif      | `backend/routes/notifications.js`            | À remplacer par un utilisateur existant ou rendre dynamique                 |
| 🌐 URL du backend (API)                 | `src/features/users/services/notificationService.js` | URL utilisée pour `fetch("/notifications/test")`                          |
| 🔧 Nom de l’app, rôles, redirections    | `src/app.config.js`                          | `appName`, `defaultUserRole`, `roleRedirects`, etc.                         |

## 🧠 Astuce : structure du projet

```
my-pwa-template/
├── src/
│   ├── firebase.js
│   ├── app.config.js
│   ├── contexts/
│   │   └── UserContext.jsx
│   │   └── SnackbarProvider.jsx
│   └── hooks/
│       └── useFirebaseNotifications.js
├── backend/
│   ├── server.cjs
│   ├── .env
│   ├── serviceAccountKey.json
│   └── routes/
│       └── notifications.js
```

## ✅ À garder hors de Git

Ajoute ceci à `.gitignore` :

```
backend/.env
backend/serviceAccountKey.json
```

## 🧪 Vérification finale

- ✅ Clé VAPID correcte dans `app.config.js`
- ✅ Token utilisateur bien enregistré en Firestore
- ✅ Backend utilise `admin.messaging().send(...)`
- ✅ Le toast s'affiche correctement en premier plan
