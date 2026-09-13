// functions/templates/emailTemplates.js

const emailTemplates = {
    confirmation: {
      subject: "🧾 Confirmation d’inscription",
      text: ({ name }) =>
        `Bonjour ${name},\n\nVotre inscription a bien été enregistrée.\nMerci pour votre confiance !`,
    },
    invitation: {
      subject: "🎉 Vous êtes invité(e) à rejoindre notre app",
      text: ({ inviterName, appName }) =>
        `Bonjour,\n\n${inviterName} vous invite à rejoindre ${appName}.\nCliquez ici pour commencer !`,
    },
    support: {
      subject: "📩 Message de l'équipe support",
      text: ({ content }) =>
        `Bonjour,\n\nVoici un message de l’équipe support :\n\n${content}`,
    },
  };
  
  module.exports = emailTemplates;
  