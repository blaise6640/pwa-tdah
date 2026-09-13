// 📦 fonctions_bug.js
// Contient la Cloud Function `createGitHubIssue`
// Crée une issue GitHub via API ou fallback vers Firestore
// Nécessite : axios, cors, firestore et le secret GITHUB_TOKEN

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const axios = require("axios");
const nodemailer = require("nodemailer");
const APP_CONFIG = require("./app.config");

const db = admin.firestore();

// Fonction utilitaire pour envoyer un mail (copiée/adaptée de categoryReport.js)
async function sendGitHubReportMail({ to, subject, text }) {
  try {
    // Vérifier l'existence de la configuration Gmail de manière plus sûre
    const gmailConfig = functions.config().gmail || {};
    const gmailEmail = gmailConfig.email;
    const gmailPassword = gmailConfig.password;
    
    if (!gmailEmail || !gmailPassword) {
      console.warn("⚠️ Config Gmail manquante, mail non envoyé.");
      return { success: false, error: "Config Gmail manquante" };
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailPassword,
      },
    });
    await transporter.sendMail({
      from: `Github Reporter <${gmailEmail}>`,
      to,
      subject,
      text,
    });
    console.log(`✉️ Mail envoyé à ${to}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi du mail :", error);
    return { success: false, error: error.message };
  }
}

const createGitHubIssue = functions
  .region("europe-west1")
  //.runWith({ secrets: ["GITHUB_TOKEN"] }) // Commenté pour utiliser la config à la place
  .https.onRequest(async (req, res) => {
    console.log("🧪 Fonction createGitHubIssue appelée depuis fonctions_bug.js !");
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Méthode non autorisée");
      }

      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).send("Le titre et la description sont requis");
      }

      // Envoi du mail à chaque création d'issue - ne pas bloquer le traitement si échec
      try {
        await sendGitHubReportMail({
          to: APP_CONFIG.defaultEmail,
          subject: `${APP_CONFIG.shortName} Github Report (${title})`,
          text: body,
        });
      } catch (emailError) {
        console.warn("⚠️ Échec de l'envoi du mail, mais continuation du traitement:", emailError.message);
      }

      // Utilisation de la config Firebase au lieu de Secret Manager
      const githubToken = functions.config().github?.token;

      if (!githubToken) {
        const issueRef = await db.collection("issues").add({
          title,
          body,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "open"
        });

        return res.status(201).json({
          success: true,
          message: "Issue enregistrée dans Firestore (pas de token GitHub)",
          issue_id: issueRef.id
        });
      }

      const response = await axios.post(
        "https://api.github.com/repos/blaise6640/my-pwa-template/issues",
        { 
          title: `[${APP_CONFIG.shortName}] ${title}`, 
          body 
        },
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      return res.status(201).json({
        success: true,
        issue_url: response.data.html_url
      });
    } catch (error) {
      console.error("❌ Erreur GitHub :", error.message);    try {
      const issueRef = await db.collection("issues").add({
        title: `[${APP_CONFIG.shortName}] ${title}`,  // Utiliser le même format que pour GitHub
        body: body,  // Utiliser la variable extraite plutôt que req.body.body
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "open"
      });

        return res.status(201).json({
          success: true,
          fallback: true,
          message: "Issue enregistrée dans Firestore (fallback)",
          issue_id: issueRef.id
        });
      } catch (firestoreError) {
        return res.status(500).json({
          success: false,
          error: "Échec Firestore après échec GitHub",
        });
      }
    }
  });

module.exports = {
  createGitHubIssue
};
