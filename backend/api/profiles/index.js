import sql from '../../lib/database.js';
import { authenticateToken } from '../../lib/auth.js';
import { successResponse, forbiddenResponse, handleError } from '../../lib/response.js';

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
      // Récupérer tous les profils
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        message: 'Profils récupérés avec succès',
        data: { profiles }
      });

    } else if (req.method === 'POST') {
      // Créer un nouveau profil (admin seulement)
      if (!user.isAdmin) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé - Admin requis' 
        });
        return;
      }

      const { name, description, type, color, avatar_class, avatar_content, level } = req.body;

      // Validation
      if (!name || !type) {
        res.status(400).json({ 
          success: false, 
          message: 'Nom et type requis' 
        });
        return;
      }

      // Déterminer les flags selon le type
      const is_admin = type === 'admin';
      const is_child = type === 'child';
      const is_teen = type === 'teen';

      const result = await sql`
        INSERT INTO profiles (
          name, description, type, color, avatar_class, avatar_content, 
          level, is_admin, is_child, is_teen, is_active
        )
        VALUES (
          ${name}, ${description}, ${type}, ${color || 'purple'}, 
          ${avatar_class}, ${avatar_content}, ${level}, 
          ${is_admin}, ${is_child}, ${is_teen}, true
        )
        RETURNING *
      `;

      res.status(201).json({
        success: true,
        message: 'Profil créé avec succès',
        data: { profile: result[0] }
      });
    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des profils');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

