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
        message: 'ID de profil requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      // Récupérer un profil par ID
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        WHERE id = ${id}
      `;

      if (!profiles[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profil récupéré avec succès',
        data: { profile: profiles[0] }
      });

    } else if (req.method === 'PUT') {
      // Modifier un profil (admin seulement ou son propre profil)
      if (!user.isAdmin && user.profileId !== parseInt(id)) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const { 
        name, description, type, color, avatar_class, avatar_content, 
        level, is_active, is_locked 
      } = req.body;

      // Vérifier que le profil existe
      const existingProfile = await sql`
        SELECT * FROM profiles WHERE id = ${id}
      `;

      if (!existingProfile[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      // Déterminer les flags selon le type (si fourni)
      let is_admin, is_child, is_teen;
      if (type) {
        is_admin = type === 'admin';
        is_child = type === 'child';
        is_teen = type === 'teen';
      }

      const result = await sql`
        UPDATE profiles 
        SET 
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          type = COALESCE(${type}, type),
          color = COALESCE(${color}, color),
          avatar_class = COALESCE(${avatar_class}, avatar_class),
          avatar_content = COALESCE(${avatar_content}, avatar_content),
          level = COALESCE(${level}, level),
          is_active = COALESCE(${is_active}, is_active),
          is_locked = COALESCE(${is_locked}, is_locked),
          is_admin = COALESCE(${is_admin}, is_admin),
          is_child = COALESCE(${is_child}, is_child),
          is_teen = COALESCE(${is_teen}, is_teen),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      res.status(200).json({
        success: true,
        message: 'Profil modifié avec succès',
        data: { profile: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Supprimer un profil (admin seulement)
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const result = await sql`
        DELETE FROM profiles 
        WHERE id = ${id}
        RETURNING *
      `;

      if (!result[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Profil non trouvé' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profil supprimé avec succès',
        data: { profile: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion du profil');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

