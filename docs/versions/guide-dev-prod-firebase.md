# 🧭 Guide de séparation DEV / PROD pour Firebase

## ✅ 1. Créer 2 projets Firebase distincts

| Projet | Nom suggéré |
|--------|-------------|
| Test   | `my-pwa-template-dev` (ou `gestion-locative-dev`) |
| Prod   | `gestion-locative-prd` |

Depuis la console : https://console.firebase.google.com

🔹 Active Firestore, Auth et (optionnellement) Hosting dans les deux.

---

## ✅ 2. Gérer les 2 configurations côté frontend

### Crée 2 fichiers :

```bash
/src/firebase.config.dev.js
/src/firebase.config.prod.js
```

### Exemple de contenu :

```js
// firebase.config.dev.js
export const firebaseConfig = {
  apiKey: "xxx-dev",
  projectId: "my-pwa-template-dev",
  ...
};

// firebase.config.prod.js
export const firebaseConfig = {
  apiKey: "xxx-prod",
  projectId: "gestion-locative-dev",
  ...
};
```

---

## ✅ 3. Utiliser la bonne config automatiquement

Dans `firebase.js` :

```js
import { firebaseConfig as devConfig } from "./firebase.config.dev";
import { firebaseConfig as prodConfig } from "./firebase.config.prod";

const config = import.meta.env.MODE === "production" ? prodConfig : devConfig;
const app = initializeApp(config);
```

---

## ✅ 4. Ajouter les deux projets Firebase à la CLI

```bash
firebase use --add
```

Tu les nommes `dev` et `prod`.  
Ensuite, pour switcher :

```bash
firebase use dev
firebase use prod
```

---

## ✅ 5. Déploiement selon l’environnement

```bash
# pour les tests
firebase deploy --only functions --project dev

# pour la mise en production
firebase deploy --only functions --project prod
```

---

## 🧪 6. (Optionnel) Utiliser des variables d’environnement

Dans `.env` ou `.env.production` :

```env
VITE_FIREBASE_ENV=prod
```

Et dans le code :

```js
const isProd = import.meta.env.VITE_FIREBASE_ENV === "prod";
```