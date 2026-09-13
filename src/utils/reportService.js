/**
 * reportService.js
 *
 * Service pour gérer les appels aux fonctions Cloud liées aux rapports.
 * Utilise la réécriture Firebase Hosting pour éviter le hardcoding de l'URL Cloud Function.
 */

import { getAuth } from 'firebase/auth';

/**
 * Déclenche la génération et l'envoi d'un rapport quotidien
 * @param {string} emailDestinataire - Email du destinataire (optionnel, utilisera l'email courant si non spécifié)
 * @returns {Promise<object>} Résultat de l'appel à la fonction Cloud
 */
export const generateDailyReport = async (emailDestinataire) => {
  try {
    // Préparer les headers avec le token d'authentification si l'utilisateur est connecté
    const headers = { 'Content-Type': 'application/json' };
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Utiliser l'email du destinataire fourni ou celui de l'utilisateur connecté
    const email = emailDestinataire || (user ? user.email : undefined);

    // Paramètres pour la fonction Cloud
    const params = {};
    if (email) {
      params.emailDestinataire = email;
    }

    // Appel à la fonction Cloud via l'URL réécrite
    const response = await fetch('/buildAndSendDailyReport', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur HTTP ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la génération du rapport quotidien:", error);
    throw error;
  }
};

/**
 * Déclenche la génération et l'envoi d'un rapport par catégorie
 * @param {string} emailDestinataire - Email du destinataire (optionnel, utilisera l'email courant si non spécifié)
 * @returns {Promise<object>} Résultat de l'appel à la fonction Cloud
 */
export const generateCategoryReport = async (emailDestinataire) => {
  try {
    // Préparer les headers avec le token d'authentification si l'utilisateur est connecté
    const headers = { 'Content-Type': 'application/json' };
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Utiliser l'email du destinataire fourni ou celui de l'utilisateur connecté
    const email = emailDestinataire || (user ? user.email : undefined);

    // Paramètres pour la fonction Cloud
    const params = {};
    if (email) {
      params.emailDestinataire = email;
    }

    // Appel à la fonction Cloud via l'URL réécrite
    const response = await fetch('/buildAndSendCategoryReport', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur HTTP ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la génération du rapport par catégorie:", error);
    throw error;
  }
};