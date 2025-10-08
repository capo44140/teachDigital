import sql from '../../lib/database.js';
import { handleCors } from '../../lib/cors.js';
import { successResponse, errorResponse, handleError } from '../../lib/response.js';

export default async function handler(req, res) {
  // Gestion CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Récupérer toutes les activités
      const activities = await sql`
        SELECT 
          id, title, description, type, status, difficulty_level,
          estimated_duration, target_age_group, subject_area,
          is_active, created_at, updated_at
        FROM activities 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        message: 'Activités récupérées avec succès',
        data: {
          activities: activities || []
        }
      });

    } else if (req.method === 'POST') {
      // Créer une nouvelle activité
      const {
        title,
        description,
        type,
        difficulty_level,
        estimated_duration,
        target_age_group,
        subject_area
      } = req.body;

      if (!title || !description || !type) {
        res.status(400).json({
          success: false,
          message: 'Titre, description et type sont requis'
        });
        return;
      }

      const newActivity = await sql`
        INSERT INTO activities (
          title, description, type, difficulty_level,
          estimated_duration, target_age_group, subject_area,
          status, is_active
        )
        VALUES (
          ${title}, ${description}, ${type}, ${difficulty_level || 'medium'},
          ${estimated_duration || 30}, ${target_age_group || '6-12'}, 
          ${subject_area || 'general'}, 'active', true
        )
        RETURNING *
      `;

      res.status(201).json({
        success: true,
        message: 'Activité créée avec succès',
        data: {
          activity: newActivity[0]
        }
      });

    } else {
      res.status(405).json({ error: 'Méthode non autorisée' });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des activités');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}
