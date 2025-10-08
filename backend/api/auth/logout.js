import { authenticateToken, deleteSession } from '../../lib/auth.js';
import { successResponse, handleError } from '../../lib/response.js';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    // Vérifier l'authentification
    const user = authenticateToken(req);

    // Supprimer la session de la base de données
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      await deleteSession(token);
    }

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la déconnexion');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

