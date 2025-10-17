/**
 * Endpoint pour récupérer la clé VAPID publique
 * Utilisé pour les notifications push PWA
 */

import { successResponse, errorResponse } from '../lib/response.js';

export default async function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return errorResponse(res, 'Méthode non autorisée', 405);
  }

  try {
    // Clé VAPID publique (à configurer dans les variables d'environnement)
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      console.warn('⚠️ VAPID_PUBLIC_KEY non configurée dans les variables d\'environnement');
      
      // Clé de développement (à remplacer en production)
      const devVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8F8j8K4pQpVUfXz5JZvKz4L8uQ1Cz2vB3hF6gE9iD2cA5bB8eF1gH4jK7lM0nP3qR6sT9uV2wX5yZ8';
      
      return successResponse(res, {
        publicKey: devVapidKey,
        message: 'Clé VAPID de développement - Configurez VAPID_PUBLIC_KEY en production'
      });
    }

    return successResponse(res, {
      publicKey: vapidPublicKey
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la clé VAPID:', error);
    return errorResponse(res, 'Erreur serveur', 500);
  }
}
