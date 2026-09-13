// 📬 ContactDeveloperButton.jsx
// Composant réutilisable pour permettre à l'utilisateur de contacter le développeur
// - Affiche un bouton personnalisable
// - Ouvre une modal avec formulaire
// - Permet de configurer la logique d’envoi via la prop `onSubmit`
// - Peut être utilisé dans tous les dashboards

import React, { useState } from 'react';
import {
  Box,
  Button,
  Modal,
  Typography,
  TextField,
} from '@mui/material';

const ContactDeveloperButton = ({
  label = "Contacter le développeur",
  color = "secondary",
  variant = "outlined",
  onSubmit, // fonction async : ({ title, description }) => ...
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsSuccess(false);
    setSubmitMessage('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIssueTitle('');
    setIssueDescription('');
  };

  const handleIssueSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage('');
    try {
      await onSubmit({
        title: issueTitle,
        description: issueDescription,
      });
      setIsSuccess(true);
      setSubmitMessage('Problème envoyé avec succès.');
    } catch (err) {
      console.error('Erreur envoi développeur :', err);
      setSubmitMessage("Erreur lors de l'envoi du message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Button variant={variant} color={color} onClick={handleOpenModal}>
          {label}
        </Button>
      </Box>

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="contact-dev-modal"
        aria-describedby="contact-dev-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "95%",
            maxWidth: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          {isSuccess ? (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                Merci ! Votre message a bien été envoyé.
              </Typography>
              <Button variant="contained" color="primary" onClick={handleCloseModal}>
                OK
              </Button>
            </Box>
          ) : (
            <>
              <Typography id="contact-dev-modal" variant="h6" gutterBottom>
                Contacter le développeur
              </Typography>
              <TextField
                label="Titre du message"
                fullWidth
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <TextField
                label="Message / Description"
                multiline
                rows={4}
                fullWidth
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleIssueSubmit}
                disabled={isSubmitting}
                fullWidth
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer"}
              </Button>
              {submitMessage && (
                <Typography
                  variant="body2"
                  color={submitMessage.includes("succès") ? "green" : "error"}
                  sx={{ mt: 2 }}
                >
                  {submitMessage}
                </Typography>
              )}
            </>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default ContactDeveloperButton;
