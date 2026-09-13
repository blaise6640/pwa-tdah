/**
 * index.js
 * 
 * Point d'entrée des Cloud Functions:
 * - Exporte sendEmail (HTTP) depuis fonctions_mail.js
 * - Exporte les autres handlers (notifications, bugs, scheduler, reporting)
 * 
 * TODO: déployer avec `firebase deploy --only functions`.
 */

const functionsV1 = require("firebase-functions/v1");
const admin = require("firebase-admin");

// Initialise l'app Firebase Admin si ce n'est pas encore fait
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import des modules de fonctions
const fonctionsMail = require("./fonctions_mail");
const fonctionsNotifs = require("./fonctions_notifs");
const fonctionsBug = require("./fonctions_bug");

// Exports de toutes les Cloud Functions
module.exports = {
  // Fonction HTTP d'envoi d'email
  ...fonctionsMail,

  // Autres handlers
  ...fonctionsNotifs,
  ...fonctionsBug,
  // generateLeaseFlows cloud function removed - generation done client-side via src/lib/leaseFlows.generateLeaseFlows
};
