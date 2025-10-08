import sql from '../../lib/database.js';
import { authenticateToken } from '../../lib/auth.js';
import { successResponse, handleError } from '../../lib/response.js';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Vérifier l'authentification
    const user = authenticateToken(req);

    if (req.method === 'GET') {
      // Récupérer les notifications
      const { profileId, isRead, type } = req.query;

      let query = sql`
        SELECT 
          n.id, n.type, n.title, n.message, n.data, 
          n.is_read, n.created_at,
          p.name as profile_name
        FROM notifications n
        JOIN profiles p ON n.profile_id = p.id
        WHERE 1=1
      `;

      // Filtrer par profil (admin peut voir tous, utilisateur seulement les siens)
      if (profileId) {
        query = sql`${query} AND n.profile_id = ${profileId}`;
      } else if (!user.isAdmin) {
        query = sql`${query} AND n.profile_id = ${user.profileId}`;
      }

      // Filtrer par statut de lecture
      if (isRead !== undefined) {
        query = sql`${query} AND n.is_read = ${isRead === 'true'}`;
      }

      // Filtrer par type
      if (type) {
        query = sql`${query} AND n.type = ${type}`;
      }

      query = sql`${query} ORDER BY n.created_at DESC`;

      const notifications = await query;

      res.status(200).json({
        success: true,
        message: 'Notifications récupérées avec succès',
        data: { notifications }
      });

    } else if (req.method === 'POST') {
      // Créer une nouvelle notification (admin seulement)
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const { profileId, type, title, message, data } = req.body;

      // Validation
      if (!profileId || !type || !title || !message) {
        res.status(400).json({ 
          success: false, 
          message: 'profileId, type, title et message requis' 
        });
        return;
      }

      // Vérifier que le profil existe
      const profile = await sql`
        SELECT id FROM profiles WHERE id = ${profileId}
      `;

      if (!profile[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message, data)
        VALUES (${profileId}, ${type}, ${title}, ${message}, ${data ? JSON.stringify(data) : null})
        RETURNING *
      `;

      res.status(201).json({
        success: true,
        message: 'Notification créée avec succès',
        data: { notification: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des notifications');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

