// Script pour tester la configuration de photoCapture
const APP_CONFIG = require('../src/app.config.js');

console.log('Configuration actuelle:');
console.log(`- photoCapture: ${APP_CONFIG.features.photoCapture}`);

// Modifier temporairement la configuration pour le test
console.log('\nTest avec photoCapture désactivé:');
APP_CONFIG.features.photoCapture = false;
console.log(`- photoCapture modifié: ${APP_CONFIG.features.photoCapture}`);

// Vérifier que les modifications fonctionnent
console.log(`
Si les modifications ont été correctement appliquées:
1. L'application ne devrait pas demander l'accès à la caméra au démarrage.
2. Le composant PhotoCapture devrait afficher un message indiquant que la fonction est désactivée.
3. Les éléments d'interface liés à la capture photo dans MesPhotosPage.jsx devraient être masqués.
4. Les fonctionnalités de visualisation des photos existantes dans AdminPhotoAccess.jsx et 
   AdminUserPhotosPage.jsx devraient rester disponibles.

Pour tester:
1. Modifiez APP_CONFIG.features.photoCapture = false dans src/app.config.js
2. Redémarrez l'application
3. Vérifiez que les comportements ci-dessus sont respectés
`);
