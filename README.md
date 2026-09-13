# Documentation - App-Pwa Template

---

## **1. Pour l'utilisateur final**

### **Introduction**
Bienvenue dans **App-Pwa**, une application web progressive (PWA) moderne conçue pour offrir une expérience fluide et intuitive. Cette application propose des fonctionnalités avancées comme la capture de photos, les notifications push, et la gestion des utilisateurs.

---

### **Fonctionnalités principales**
- **Authentification sécurisée** : Connexion via e-mail/mot de passe ou Google.
- **Gestion des photos** : Capture, compression et stockage sécurisé.
- **Notifications push** : Recevez des alertes en temps réel.
- **Interface utilisateur intuitive** : Design responsive et moderne.

---

### **Guide d'utilisation**
1. **Connexion** : Connectez-vous avec vos identifiants ou via Google.
2. **Capture de photos** : Prenez une photo et ajoutez-la à votre galerie.
3. **Notifications** : Autorisez les notifications pour recevoir des alertes.
4. **Gestion des utilisateurs (Admin)** : Gérez les comptes et les rôles.

---

### **FAQ**
- **Je ne reçois pas de notifications. Que faire ?**
  - Vérifiez les paramètres de votre navigateur.
- **Puis-je supprimer une photo définitivement ?**
  - Oui, dans la galerie, sélectionnez une photo et choisissez **Supprimer**.

---

## **2. Pour les développeurs**

### **Introduction**
**App-Pwa** est un template PWA React + Firebase conçu pour accélérer le développement d'applications modernes.

---

### **Structure du projet**
```
my-pwa-template/
├── src/                     # Frontend React
├── backend/                 # Backend Express + Firebase Admin
├── functions/               # Cloud Functions Firebase
├── docs/                    # Documentation
```

---

### **Installation**
1. Clonez le projet :
   ```bash
   git clone https://github.com/tonrepo/my-pwa-template.git
   cd my-pwa-template
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Configurez Firebase dans `src/app.config.js` et `functions/.env`.
4. Lancez le projet en mode développement :
   ```bash
   npm run dev
   ```

---

### **Déploiement**
- **Frontend** :
  ```bash
  npm run build
  firebase deploy --only hosting
  ```
- **Backend** :
  ```bash
  firebase deploy --only functions
  ```

---

### **Tests**
- **Linting** :
  ```bash
  npm run lint
  ```
- **Tests unitaires** :
  ```bash
  npm test
  ```

---

## **3. Pour les clients potentiels**

### **Présentation**
**App-Pwa** est une solution clé en main pour développer des applications web modernes. Elle combine les meilleures pratiques de React, Firebase et Material UI.

---

### **Points forts**
- **Rapidité de développement** : Template prêt à l'emploi.
- **Sécurité intégrée** : Authentification Firebase et règles Firestore.
- **Expérience utilisateur moderne** : Notifications push et interface responsive.
- **Adaptabilité** : Convient à divers projets (gestion d'équipe, applications photo, etc.).

---

### **Cas d'utilisation**
1. **Gestion d'équipe** : Admin et employés avec rôles spécifiques.
2. **Application photo** : Capture, compression et stockage sécurisé.
3. **Notifications en temps réel** : Alertes pour des événements importants.

---

### **Démonstration**
- **Lien de démo** : [https://my-pwa-template-demo.web.app](https://my-pwa-template-demo.web.app)
- **Identifiants de test** :
  - Admin : `admin@test.com` / `password123`
  - Employé : `employe@test.com` / `password123`

---

### **Tarification**
- **Licence Standard** : 500 € (template + documentation).
- **Licence Premium** : 1000 € (template + documentation + support technique).

---

### **Contact**
Pour toute question ou demande de personnalisation, contactez-nous à **support@app-pwa.com**.





// 📦 rename-app.js
// Script CLI pour renommer proprement l'app depuis le template
// Utilise readline et fs pour remplacer les occurences du nom d’app

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const filesToEdit = [
  "app.config.js",
  "firebase.json",
  "public/manifest.json",
  "public/index.html",
  "README.md"
];

const replaceInFile = (filePath, oldName, newName) => {
  const absPath = path.resolve(filePath);
  const content = fs.readFileSync(absPath, "utf8");
  const replaced = content.replace(new RegExp(oldName, "g"), newName);
  fs.writeFileSync(absPath, replaced, "utf8");
  console.log(`✅ Mis à jour : ${filePath}`);
};

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

(async () => {
  console.log("\n🚀 Script de renommage d'application Template PWA");

  const oldName = "my-pwa-template"; // nom de base dans les fichiers
  const newName = await ask("🔤 Nouveau nom de l'application (ex: mon-super-projet) : ");

  console.log(`\n🔍 Remplacement de "${oldName}" par "${newName}" dans les fichiers...`);

  filesToEdit.forEach((file) => {
    if (fs.existsSync(file)) {
      replaceInFile(file, oldName, newName);
    }
  });

  console.log("\n🎉 Renommage terminé !");
  rl.close();
})();




# 🚀 Créer un nouveau projet à partir du template PWA

Ce guide t’explique comment créer un nouveau projet (ex: `ABCD-Appli`) basé sur le template `my-pwa-template`.

---

## 1. 📥 Cloner le template

```bash
git clone https://github.com/ton-utilisateur/my-pwa-template.git ABCD-Appli
cd ABCD-Appli
```

---

## 2. 🧽 Nettoyer l’historique Git

Tu veux repartir à zéro avec ton propre historique :

```bash
rm -rf .git
git init
git remote add origin https://github.com/ton-utilisateur/ABCD-Appli.git
```

---

## 3. 🛠 Renommer l’app avec le script intégré

Le template inclut un script pour renommer automatiquement le projet dans les fichiers clés :

```bash
node rename-app.js
```

👉 Exemple de réponse :
```
🔤 Nouveau nom de l'application : ABCD-Appli
```

---

## 4. 🧪 Tester en local

```bash
npm install
npm run dev
```

---

## 5. 🔥 Configurer Firebase

Tu dois associer le projet à Firebase :

```bash
firebase use --add
```

Puis modifie :
- `.firebaserc` (nom du projet Firebase)
- `app.config.js` (`firebase.dev.projectId`, etc.)

---

## 6. 🚀 Déployer le projet

Une fois prêt, tu peux déployer :

```bash
npm run deploy:dev
```

---

## 7. 🔖 Premier commit & version

```bash
git add .
git commit -m "🚀 Initialisation du projet ABCD-Appli depuis le template"
git push origin main
```

---

## ✅ C’est parti !

Ton projet est maintenant prêt à évoluer de manière autonome, tout en bénéficiant des fondations solides du template ✨


