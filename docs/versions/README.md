# 🔥 App-Pwa – Template React + Firebase

Bienvenue dans ce **template PWA** conçu pour des applications web modernes avec :

- ✅ Authentification Firebase (email, Google)
- ✅ Redirection par rôle
- ✅ Firestore centralisé
- ✅ Notifications push Firebase (FCM)
- ✅ Envoi d’e-mails via Gmail
- ✅ Upload de photos sécurisé sur Firebase Storage
- ✅ Interface Material UI

---

## 🚀 Lancer le projet

```bash
git clone https://github.com/tonrepo/my-pwa-template.git
cd my-pwa-template
npm install
npm run dev
```

---

## ⚙️ Environnements

| Type     | Projet Firebase             |
|----------|-----------------------------|
| Dev      | `pwa-tdah`     |
| Prod     | `xxx`      |

> 📦 Configurations dans `app.config.js`

---

## 🧠 Structure du projet

```
src/
├── app.config.js               // Configuration globale
├── components/                 // Composants réutilisables (Layouts, UI)
├── features/                  // Modules métier (users, photos, etc.)
│   └── users/
│       ├── services/           // API Firebase pour users / notifs / email
│       ├── helpers/            // Fonctions internes
│       └── pages/              // Pages spécifiques au rôle
├── hooks/                     // Custom hooks (useAppUser, useFirebaseNotifications)
├── firebase.js                // Init Firebase
```

---

## 🧪 Fonctionnalités

| Fonction                | Inclus |
|-------------------------|--------|
| Auth Firebase           | ✅     |
| Rôles utilisateurs      | ✅     |
| Création automatique doc Firestore | ✅ |
| Notifications FCM       | ✅     |
| Envoi de mail (Gmail)   | ✅     |
| Upload photo sécurisé   | ✅     |
| Redirection dynamique   | ✅     |

---

## 🔐 Sécurité

### Firestore rules

```js
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  allow get, list: if request.auth.token.role in ["Admin", "Developpeur"];
}
```

### Storage rules

```js
match /photos/{photoId} {
  allow read, write: if request.auth != null;
}
```

---

## 🔧 Déploiement

### En dev :

```bash
npm run deploy:dev
```

### En prod :

```bash
npm run deploy:prod
```

---

## 🎯 Personnalisation

- `defaultUserRole`: modifiable dans `app.config.js`
- `roleRedirects`: redirection dynamique post-login
- `disabledRoutesByRole`: masquage automatique de certaines routes

---

## ✉️ Contact

> Ce template a été créé avec ❤️ par [Patrick]  
> Utilisez-le, améliorez-le et lancez vos apps plus vite !