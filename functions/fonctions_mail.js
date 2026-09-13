/**
 * fonctions_mail.js
 * Probablement plus utilisée..... 
 * Cloud Function callable "sendEmail" accessible en REST (via fetch('/sendEmail', ...)).
 * Envoie un e-mail via Gmail et, si une ID token est fourni, logge la date d'envoi dans Firestore.
 */
const functionsV1 = require("firebase-functions/v1");
const nodemailer = require("nodemailer");
const emailTemplates = require("./templates/emailTemplates");

// 🧠 admin.initializeApp() est déjà appelé dans index.js → on ne le répète pas ici
const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Fonction locale qui enregistre les détails de l'email dans Firestore
 */
async function logEmailDetails({ to, subject, text, html }) {
  try {
    await admin.firestore().collection('emailLogs').add({
      to,
      subject,
      textSample: text ? text.substring(0, 200) + "..." : null,
      htmlSample: html ? html.substring(0, 200) + "..." : null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      simulated: false
    });
    console.log(`Détails de l'email enregistrés pour ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des détails d'email:", error);
    // Enrichir l'erreur avec plus de contexte
    const enhancedError = new Error(`Échec de journalisation pour ${to}: ${error.message}`);
    enhancedError.originalError = error;
    throw enhancedError;
  }
}

/**
 * Fonction callable : envoie un e-mail via Gmail + log dans Firestore
 */
const sendEmail = functionsV1
  .region("europe-west1")
  .https.onCall(async (data, context) => {
    // Validation des données d'entrée
    if (!data.to || !data.to.includes('@')) {
      return { 
        success: false, 
        code: 'INVALID_RECIPIENT',
        message: "Adresse email du destinataire invalide ou manquante" 
      };
    }

    // ✅ La config est récupérée ici, au bon moment
    const gmailEmail = functionsV1.config().gmail.email;
    const gmailPassword = functionsV1.config().gmail.password;

    // 📬 Transporteur mail (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailPassword,
      },
    });

    const { to, subject, text, templateId, params } = data;

    let finalSubject = subject || "(Pas de sujet)";
    let finalText = text || "(Pas de contenu)";

    if (templateId && emailTemplates[templateId]) {
      const template = emailTemplates[templateId];
      finalSubject = template.subject;
      finalText =
        typeof template.text === "function" ? template.text(params || {}) : template.text;
    }

    const mailOptions = {
      from: gmailEmail,
      to,
      subject: finalSubject,
      text: finalText,
    };

    try {
      // Envoi de l'email
      await transporter.sendMail(mailOptions);

      // Enregistrement des détails dans une sous-fonction try/catch séparée
      try {
        await logEmailDetails({
          to,
          subject: finalSubject,
          text: finalText
        });
      } catch (logError) {
        console.error("Erreur de journalisation (l'email a été envoyé):", logError);
        // Ne pas faire échouer l'opération principale si la journalisation échoue
      }

      // Journalisation facultative dans un bloc try/catch séparé
      if (context.auth?.uid) {
        try {
          await db.collection("users").doc(context.auth.uid).update({
            lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (userLogError) {
          console.error("Erreur lors de la mise à jour de l'utilisateur:", userLogError);
          // Ne pas faire échouer l'opération principale
        }
      }

      return { success: true, message: "E-mail envoyé avec succès" };
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error);
      // Codes d'erreur plus spécifiques
      let errorCode = 'EMAIL_SEND_FAILED';
      if (error.code === 'EAUTH') {
        errorCode = 'GMAIL_AUTH_ERROR';
      } else if (error.responseCode === 550) {
        errorCode = 'RECIPIENT_REJECTED';
      }
      return { 
        success: false, 
        code: errorCode,
        message: "Échec de l'envoi de l'email", 
        error: error.toString() 
      };
    }
  });

// ✅ Export standard
module.exports = {
  sendEmail,
  logEmailDetails  // Export de la fonction pour qu'elle puisse être utilisée par d'autres modules
};
