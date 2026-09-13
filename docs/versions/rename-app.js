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
