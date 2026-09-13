#!/usr/bin/env node
/**
 * Script pour synchroniser la configuration entre src/app.config.js et functions/app.config.js
 * 
 * Ce script extrait les propriétés importantes du fichier de configuration source (src/app.config.js)
 * et génère le fichier de configuration CommonJS pour les fonctions Cloud (functions/app.config.js)
 */

const fs = require('fs');
const path = require('path');

// Chemins des fichiers
const sourceFilePath = path.join(__dirname, '../src/app.config.js');
const targetFilePath = path.join(__dirname, '../functions/app.config.js');

// Lire le fichier source
console.log('📖 Lecture du fichier source:', sourceFilePath);
const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');

// Extraire les valeurs nécessaires du fichier source
// Note: Nous utilisons des expressions régulières pour extraire les valeurs du fichier ES module
function extractValue(content, key) {
  const regex = new RegExp(`${key}\\s*:\\s*["']([^"']*)["']`, 'i');
  const match = content.match(regex);
  return match ? match[1] : null;
}

// Extraire les valeurs de configuration importantes
const appName = extractValue(sourceContent, 'appName');
const shortName = extractValue(sourceContent, 'shortName');
const defaultEmail = extractValue(sourceContent, 'defaultEmail');
const appDescription = extractValue(sourceContent, 'appDescription');
const appVersion = extractValue(sourceContent, 'appVersion');

// Créer le contenu du fichier cible (CommonJS)
const targetContent = `// Configuration partagée entre l'application frontend et les fonctions Cloud
// Version simplifiée pour les fonctions Cloud (sans les imports qui ne fonctionnent pas dans CommonJS)
// Généré automatiquement par le script sync-config.js - NE PAS MODIFIER MANUELLEMENT

const APP_CONFIG = {
  appName: "${appName}",
  shortName: "${shortName}",
  defaultEmail: "${defaultEmail}",
  appDescription: "${appDescription}",
  appVersion: "${appVersion}",
  // Autres configurations nécessaires pour les fonctions Cloud
};

module.exports = APP_CONFIG;
`;

// Écrire le fichier cible
console.log('✍️ Écriture du fichier cible:', targetFilePath);
fs.writeFileSync(targetFilePath, targetContent);

console.log('✅ Synchronisation des configurations terminée avec succès !');
