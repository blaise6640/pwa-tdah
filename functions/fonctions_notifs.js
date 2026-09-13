// 📦 fonctions_notifs.js
/**
 * Module centralisé de gestion des notifications
 * 
 * Contient :
 * - sendNotification : fonction principale d'envoi adaptée à la plateforme (web, android, ios)
 * - sendDaily20hNotification : fonction planifiée (PubSub) à 20h
 * - notificationTest : fonction callable pour tester les notifs depuis le front
 * - notificationTestHttp : version HTTP pour appel via fetch
 * 
 * Usage :
 * - Déployez sur Firebase : `firebase deploy --only functions`
 * - /notificationTestHttp : POST avec authentification Bearer + { userId: optionnel }
 * - sendDaily20hNotification se déclenche automatiquement à 20h Europe/Paris
 */

const functionsV1 = require('firebase-functions/v1');
const admin = require('firebase-admin');
const cors = require('cors');
const { logger, https } = require('firebase-functions');
const APP_CONFIG = require('./app.config');


/**
 * Envoie un message FCM à tous les tokens valides d'un user,
 * adapte le payload selon la plateforme (web, android, ios).
 * @param {string} userId - Identifiant de l'utilisateur
 * @param {Object} notificationOptions - Options de notification
 * @param {Object} [options] - Options supplémentaires
 * @param {number} [options.maxRetries=2] - Nombre maximal de tentatives en cas d'échec
 * @returns {Promise<number>} Nombre de notifications envoyées avec succès
 */
async function sendNotification(userId, notificationOptions, options = {}) {
  const { maxRetries = 2 } = options;
  let retryCount = 0;
  
  // Fonction récursive avec retry
  const sendWithRetry = async () => {
    try {
      const userRef = admin.firestore().collection('users').doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        logger.warn(`Utilisateur introuvable: ${userId}`);
        return 0;
      }

      const userData = userSnap.data();
      // On gère le cas où fcmTokens est un tableau d'objets {token, platform}
      let tokens = [];
      if (Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0 && typeof userData.fcmTokens[0] === 'object') {
        tokens = userData.fcmTokens.map(t => ({ token: t.token, platform: t.platform || 'web' }));
      } else if (Array.isArray(userData.fcmTokens)) {
        // Ancien format : tableau de string
        tokens = userData.fcmTokens.map(token => ({ token, platform: 'web' }));
      } else if (userData.fcmToken) {
        tokens = [{ token: userData.fcmToken, platform: 'web' }];
      }

      if (tokens.length === 0) {
        logger.warn(`Aucun token FCM pour l'utilisateur ${userId}`);
        return 0;
      }

      const batch = admin.firestore().batch();
      let successCount = 0;
      let temporaryErrors = 0;
      
      for (const { token, platform } of tokens) {
        // Adapter le payload selon la plateforme
        let payload;
        if (platform === 'web') {
          // Web : notification + data
          // payload = { ...notificationOptions };
            const { notification, ...rest } = notificationOptions;
            payload = rest; // ✅ Supprimer 'notification' pour empêcher l'affichage auto
        } else {
          // Android/iOS natif : uniquement data (pas de champ notification)
          const { notification, ...rest } = notificationOptions;
          payload = rest;
        }
        
        try {
          // Ajout d'un timeout de 3 secondes pour éviter de bloquer trop longtemps
          const sendPromise = admin.messaging().send({ token, ...payload });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('FCM send timeout')), 3000)
          );
          
          await Promise.race([sendPromise, timeoutPromise]);
          successCount++;
        } catch (err) {
          const errCode = err.code || '';
          logger.error(`Erreur FCM pour ${userId}: ${token} (${errCode || err.message})`);
          
          // Gestion spécifique par type d'erreur
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token'
          ) {
            // Token invalide à supprimer
            batch.update(userRef, {
              fcmTokens: admin.firestore.FieldValue.arrayRemove(
                typeof userData.fcmTokens[0] === 'object' ? { token, platform } : token
              )
            });
          } else if (
            errCode === 'messaging/server-unavailable' || 
            errCode === 'messaging/internal-error' ||
            err.message === 'FCM send timeout'
          ) {
            // Erreur temporaire qui justifie un retry
            temporaryErrors++;
          }
          // Autres erreurs: on les log mais on ne retry pas
        }
      }

      if (batch._ops && batch._ops.length > 0) {
        await batch.commit();
        logger.info(`Tokens invalides purgés pour ${userId}`);
      }
      
      // Si uniquement des erreurs temporaires et qu'on n'a pas dépassé le nombre max de retries
      if (successCount === 0 && temporaryErrors > 0 && retryCount < maxRetries) {
        retryCount++;
        logger.info(`Retry ${retryCount}/${maxRetries} pour l'utilisateur ${userId}`);
        
        // Attendre un peu avant de réessayer (backoff exponentiel)
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        return sendWithRetry();
      }
      
      logger.info(`sendNotification → ${successCount}/${tokens.length} réussites pour ${userId} (après ${retryCount} retries)`);
      
      // Préparer les statistiques pour le monitoring et le logging
      const notificationStats = {
        successCount,
        failureCount: tokens.length - successCount,
        retryCount,
        tokens: tokens.map(t => ({ 
          token: t.token.substr(0, 8) + '...' + t.token.substr(-8), // Tronquer pour confidentialité
          platform: t.platform,
          success: successCount > 0 // Simplification, on ne trace pas chaque token individuellement
        }))
      };
      
      // Enregistrer des métriques pour le monitoring
      try {
        await admin.firestore().collection('notification_metrics').add({
          userId,
          successCount,
          failureCount: tokens.length - successCount,
          retryCount,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Logger les détails de la notification
        await logNotificationDetails({
          userId, 
          notificationOptions, 
          stats: notificationStats
        });
      } catch (metricError) {
        logger.warn('Impossible d\'enregistrer les métriques:', metricError);
      }
      
      // Enregistrer les détails de la notification dans Firestore
      try {
        await logNotificationDetails({
          userId,
          notificationOptions,
          stats: { successCount, failureCount: tokens.length - successCount, retryCount },
          simulated: false
        });
      } catch (logError) {
        logger.warn('Erreur lors de l\'enregistrement des détails de la notification:', logError);
      }
      
      return successCount;
    } catch (error) {
      logger.error(`Erreur critique dans sendNotification pour ${userId}:`, error);
      
      // Retry en cas d'erreur générale
      if (retryCount < maxRetries) {
        retryCount++;
        logger.info(`Retry général ${retryCount}/${maxRetries} pour l'utilisateur ${userId}`);
        
        // Attendre un peu avant de réessayer (backoff exponentiel)
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        return sendWithRetry();
      }
      
      return 0;
    }
  };
  
  // Lancer le processus d'envoi avec retry
  return sendWithRetry();
}

// Exporter sendNotification pour qu'elle soit utilisable par d'autres modules si nécessaire
exports.sendNotification = sendNotification;
exports.logNotificationDetails = logNotificationDetails;

/**
 * Fonction planifiée : envoie une notification à 20h tous les jours (heure locale Europe/Paris).
 */
exports.sendDaily20hNotification = functionsV1
  .region('europe-west1')
  .pubsub.schedule('every day 20:00') // 20:00 UTC = 20:00 CET/CEST
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    logger.info('🔄 Exécution de la fonction planifiée sendDaily20hNotification');
    try {
      const snapshot = await admin.firestore().collection('users').get();
      
      // Obtenir l'environnement courant (production ou non)
      const environment = process.env.NODE_ENV || 'development';
      const isProduction = environment === 'production';
      
      // Créer le titre avec le nom de l'app et l'indication [TST] si nécessaire
      const titlePrefix = isProduction ? '⏰ Pour ' : '⏰ [TST] Pour ';
      const notifTitle = `${titlePrefix}${APP_CONFIG.shortName} il est 20h`;
      
      // Statistiques pour monitoring
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Envoi à chaque utilisateur individuellement avec un timeout et 
      // sans interruption en cas d'erreur sur un utilisateur
      for (const doc of snapshot.docs) {
        try {
          const userId = doc.id;
          const payload = {
            notification: {
              title: notifTitle,
              body: 'Ouvrez l\'application pour voir les dernières nouveautés.',
            },
            data: { 
              screen: 'home',
              title: notifTitle,
              body: 'Ouvrez l\'application pour voir les dernières nouveautés.' 
            },
            webpush: {
              fcmOptions: { link: '/home' }
            }
          };
          
          // Utiliser Promise avec timeout pour éviter les blocages
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout pour l'utilisateur ${userId}`)), 5000);
          });
          
          // Course entre l'envoi normal et le timeout
          const result = await Promise.race([
            sendNotification(userId, payload),
            timeoutPromise
          ]);
          
          if (result && result > 0) {
            successCount++;
          }
        } catch (userError) {
          errorCount++;
          // Limiter le nombre d'erreurs stockées pour éviter overflow
          if (errors.length < 10) {
            errors.push({
              userId: doc.id,
              error: userError.message || 'Erreur inconnue'
            });
          }
          logger.error(`Erreur lors de l'envoi à ${doc.id}:`, userError);
          // Continuer avec les autres utilisateurs
        }
      }
      
      logger.info(`📊 Statistiques: ${successCount} succès, ${errorCount} échecs`);
      if (errors.length > 0) {
        logger.error('📝 Détails des erreurs:', JSON.stringify(errors));
      }
      
      // Logger un résumé global de l'exécution
      try {
        await logNotificationDetails({
          userId: 'SYSTEM',
          notificationOptions: {
            notification: {
              title: notifTitle,
              body: 'Notification quotidienne 20h'
            },
            data: {
              type: 'daily_20h'
            }
          },
          stats: {
            successCount,
            failureCount: errorCount,
            retryCount: 0,
            tokens: [],
            error: errors.length > 0 ? `${errors.length} erreurs détectées` : null
          }
        });
      } catch (logError) {
        logger.error('Erreur lors du logging de la synthèse des notifications:', logError);
      }
      
      logger.info('📤 Traitement des notifications 20h terminé');
    } catch (error) {
      logger.error('❌ Erreur critique dans la fonction planifiée:', error);
      // Enregistrer dans une collection d'erreurs pour monitoring
      try {
        await admin.firestore().collection('system_errors').add({
          function: 'sendDaily20hNotification',
          error: error.message || 'Erreur inconnue',
          stack: error.stack,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (dbError) {
        logger.error('Impossible d\'enregistrer l\'erreur dans Firestore:', dbError);
      }
    }
  });

/**
 * Fonction Callable pour tester une notification depuis le front.
 * Appel via : firebase.functions().httpsCallable('notificationTest')({ userId })
 */
exports.notificationTest = functionsV1
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Vérifie que l'utilisateur est authentifié
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Vous devez être connecté pour tester la notification.');
    }

    // Par défaut, notification à soi-même
    let targetUserId = context.auth.uid;

    // Si userId fourni, vérifier que l'appelant est admin
    if (data && data.userId && data.userId !== context.auth.uid) {
      const callerRef = admin.firestore().collection('users').doc(context.auth.uid);
      const callerSnap = await callerRef.get();
      const callerData = callerSnap.data();
      targetUserId = data.userId;
    }

    const messageId = `test_${Date.now()}`;
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    
    // Obtenir l'environnement courant (production ou non)
    const environment = process.env.NODE_ENV || 'development';
    const isProduction = environment === 'production';
    
    // Créer le titre avec le nom de l'app et l'indication [TST] si nécessaire
    const titlePrefix = isProduction ? '🔔 Test pour ' : '🔔 [TST] Test pour ';
    const notifTitle = `${titlePrefix}${APP_CONFIG.shortName}`;

    const payload = {
      notification: {
        title: notifTitle,
        body: `Ceci est NOTIFICATIONTEST envoyée à ${now}`,
      },
      data: {
        title: notifTitle,
        body: `Ceci est NOTIFICATIONTEST envoyée à ${now}`,
        screen: 'employe-dashboard',
        messageId
      },
      webpush: {
        fcmOptions: { link: '/employe-dashboard' }
      }
    };


    try {
      const successCount = await sendNotification(targetUserId, payload, { maxRetries: 1 });
      
      // Logger les détails de la notification de test
      await logNotificationDetails({
        userId: targetUserId,
        notificationOptions: payload,
        stats: {
          successCount,
          failureCount: successCount > 0 ? 0 : 1,
          retryCount: 0
        }
      });
      
      if (successCount > 0) {
        return { 
          success: true, 
          result: `Notification de test envoyée à l'utilisateur ${targetUserId} (${successCount} appareils)` 
        };
      } else {
        return { 
          success: false, 
          result: `Aucun appareil n'a reçu la notification pour l'utilisateur ${targetUserId}`
        };
      }
    } catch (error) {
      logger.error(`Erreur lors de l'envoi du test de notification à ${targetUserId}:`, error);
      // Classification de l'erreur pour donner un message plus clair à l'utilisateur
      let errorType = 'internal';
      let errorMessage = 'Erreur interne lors de l\'envoi de la notification de test';
      
      if (error.code === 'messaging/quota-exceeded') {
        errorType = 'resource-exhausted';
        errorMessage = 'Quota FCM dépassé, réessayez plus tard';
      } else if (error.code === 'messaging/server-unavailable') {
        errorType = 'unavailable';
        errorMessage = 'Service FCM indisponible temporairement, réessayez plus tard';
      } else if (error.code && error.code.startsWith('messaging/')) {
        errorType = 'failed-precondition';
        errorMessage = `Erreur FCM: ${error.message}`;
      }
      
      throw new https.HttpsError(errorType, errorMessage, error);
    }
  });

/**
 * Version HTTP (onRequest) de notificationTest, pour appel via fetch côté front.
 * Authentification par Bearer token (Firebase ID token).
 */
exports.notificationTestHttp = functionsV1
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    // Gestion CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // Authentification Firebase
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.*)$/);
    if (!match) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    const idToken = match[1];
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    // Par défaut, notification à soi-même
    let targetUserId = decoded.uid;
    const { userId } = req.body || {};
    // Si userId fourni, vérifier que l'appelant est admin
    if (userId && userId !== decoded.uid) {
      const callerRef = admin.firestore().collection('users').doc(decoded.uid);
      const callerSnap = await callerRef.get();
      const callerData = callerSnap.data();
      targetUserId = userId;
    }

    const messageId = `test_${Date.now()}`;
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    
    // Obtenir l'environnement courant (production ou non)
    const environment = process.env.NODE_ENV || 'development';
    const isProduction = environment === 'production';
    
    // Créer le titre avec le nom de l'app et l'indication [TST] si nécessaire
    const titlePrefix = isProduction ? '🔔 Test pour ' : '🔔 [TST] Test pour ';
    const notifTitle = `${titlePrefix}${APP_CONFIG.shortName}`;
    
    const payload = {
      notification: {
        title: notifTitle,
        body: `Ceci est une notification de test envoyée à ${now}`,
      },
      data: {
        title: notifTitle,
        body: `Ceci est une notification de test envoyée à ${now}`,
        screen: 'employe-dashboard',
        messageId
      },
      webpush: {
        fcmOptions: { link: '/employe-dashboard' }
      }
    };

    try {
      const successCount = await sendNotification(targetUserId, payload, { maxRetries: 1 });
      
      // Logger les détails de la notification de test HTTP
      await logNotificationDetails({
        userId: targetUserId,
        notificationOptions: payload,
        stats: {
          successCount,
          failureCount: successCount > 0 ? 0 : 1,
          retryCount: 0,
          requestMethod: 'HTTP',
          requesterIp: req.ip || 'unknown'
        }
      });
      
      if (successCount > 0) {
        return res.json({ 
          success: true, 
          result: `Notification de test envoyée à l'utilisateur ${targetUserId} (${successCount} appareils)` 
        });
      } else {
        return res.status(404).json({ 
          success: false, 
          error: 'Aucun appareil disponible',
          result: `Aucun appareil n'a reçu la notification pour l'utilisateur ${targetUserId}`
        });
      }
    } catch (error) {
      logger.error(`Erreur HTTP lors de l'envoi du test à ${targetUserId}:`, error);
      
      // Classification de l'erreur pour utiliser le code HTTP approprié
      let statusCode = 500;
      let errorMessage = 'Erreur interne lors de l\'envoi de la notification de test';
      
      if (error.code === 'messaging/quota-exceeded') {
        statusCode = 429; // Too Many Requests
        errorMessage = 'Quota FCM dépassé, réessayez plus tard';
      } else if (error.code === 'messaging/server-unavailable') {
        statusCode = 503; // Service Unavailable
        errorMessage = 'Service FCM indisponible temporairement, réessayez plus tard';
      } else if (error.code && error.code.startsWith('messaging/')) {
        statusCode = 400; // Bad Request pour les erreurs FCM spécifiques
        errorMessage = `Erreur FCM: ${error.message}`;
      }
      
      return res.status(statusCode).json({ 
        success: false, 
        error: errorMessage, 
        details: process.env.NODE_ENV === 'production' ? undefined : error.toString()
      });
    }
  });

/**
 * Fonction locale qui enregistre les détails d'une notification dans Firestore
 * @param {string} userId - Identifiant de l'utilisateur destinataire
 * @param {Object} notificationOptions - Les options de la notification envoyée
 * @param {Object} stats - Statistiques de l'envoi (succès, échecs, etc.)
 * @param {boolean} [simulated=false] - Indique si la notification a été simulée ou réellement envoyée
 * @returns {Promise<Object>} Résultat de l'opération avec ID du document créé
 */
async function logNotificationDetails({ userId, notificationOptions, stats, simulated = false }) {
  try {
    // Extraire les informations pertinentes de notificationOptions
    const { notification, data, webpush } = notificationOptions;
    
    // Extraire les statistiques
    const { successCount, failureCount, retryCount, error } = stats || {};
    
    // Créer un document de log avec des informations pertinentes
    const docRef = await admin.firestore().collection('notificationLogs').add({
      userId,
      title: notification?.title || data?.title || 'Sans titre',
      body: notification?.body || data?.body || 'Sans contenu',
      notificationType: getNotificationType(notificationOptions),
      targetScreens: data?.screen || webpush?.fcmOptions?.link || 'non spécifié',
      successCount: successCount || 0,
      failureCount: failureCount || 0,
      retryCount: retryCount || 0,
      errorMessage: error ? (error.message || error.toString()) : null,
      tokens: stats.tokens || [],
      simulated,
      environment: process.env.NODE_ENV || 'development',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`📝 Détails de la notification enregistrés pour ${userId} (ID: ${docRef.id})`);
    return { success: true, logId: docRef.id };
  } catch (error) {
    logger.error("❌ Erreur lors de l'enregistrement des détails de notification:", error);
    // Ne pas faire échouer l'opération principale si la journalisation échoue
    return { success: false, error: error.message };
  }
}

/**
 * Détermine le type de notification à partir des options
 * @param {Object} notificationOptions - Les options de la notification
 * @returns {string} Le type de notification (daily, test, custom, etc.)
 */
function getNotificationType(notificationOptions) {
  // Analyse du contenu pour déterminer le type de notification
  const { notification, data } = notificationOptions;
  const title = notification?.title || data?.title || '';
  const body = notification?.body || data?.body || '';
  
  if (title.includes('⏰') && title.includes('20h')) {
    return 'daily_reminder';
  } else if (title.includes('🔔 Test')) {
    return 'test_notification';
  } else if (data?.messageId?.startsWith('test_')) {
    return 'test_notification';
  }
  
  // Type par défaut
  return 'custom_notification';
}


