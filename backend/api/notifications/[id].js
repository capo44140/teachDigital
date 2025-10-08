import sql from '../../lib/database.js';
import { authenticateToken } from '../../lib/auth.js';
import { successResponse, notFoundResponse, handleError } from '../../lib/response.js';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Vérifier l'authentification
    const user = authenticateToken(req);
    const { id } = req.query;

    if (!id) {
      res.status(400).json({ 
        success: false, 
        message: 'ID de notification requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      // Récupérer une notification par ID
      const notifications = await sql`
        SELECT 
          n.id, n.type, n.title, n.message, n.data, 
          n.is_read, n.created_at,
          p.name as profile_name, p.id as profile_id
        FROM notifications n
        JOIN profiles p ON n.profile_id = p.id
        WHERE n.id = ${id}
      `;

      if (!notifications[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Notification non trouvée' 
        });
        return;
      }

      // Vérifier les permissions (propriétaire ou admin)
      if (!user.isAdmin && notifications[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification récupérée avec succès',
        data: { notification: notifications[0] }
      });

    } else if (req.method === 'PUT') {
      // Marquer une notification comme lue/non lue
      const { isRead } = req.body;

      if (isRead === undefined) {
        res.status(400).json({ 
          success: false, 
          message: 'isRead requis' 
        });
        return;
      }

      // Vérifier que la notification existe et les permissions
      const existingNotification = await sql`
        SELECT * FROM notifications WHERE id = ${id}
      `;

      if (!existingNotification[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Notification non trouvée' 
        });
        return;
      }

      // Vérifier les permissions (propriétaire ou admin)
      if (!user.isAdmin && existingNotification[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await sql`
        UPDATE notifications 
        SET is_read = ${isRead}
        WHERE id = ${id}
        RETURNING *
      `;

      res.status(200).json({
        success: true,
        message: `Notification marquée comme ${isRead ? 'lue' : 'non lue'}`,
        data: { notification: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Supprimer une notification (admin seulement)
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const result = await sql`
        DELETE FROM notifications 
        WHERE id = ${id}
        RETURNING *
      `;

      if (!result[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Notification non trouvée' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification supprimée avec succès',
        data: { notification: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion de la notification');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

