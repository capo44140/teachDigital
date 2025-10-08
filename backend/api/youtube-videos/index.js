import sql from '../../lib/database.js';
import { handleCors } from '../../lib/cors.js';
import { successResponse, errorResponse, handleError } from '../../lib/response.js';

export default async function handler(req, res) {
  // Gestion CORS
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      // Récupérer toutes les vidéos YouTube
      const videos = await sql`
        SELECT 
          id, url, video_id, title, description, category,
          age_group, is_active, created_at, updated_at
        FROM youtube_videos 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        message: 'Vidéos YouTube récupérées avec succès',
        data: {
          videos: videos || []
        }
      });

    } else if (req.method === 'POST') {
      // Créer une nouvelle vidéo YouTube
      const {
        url,
        video_id,
        title,
        description,
        category,
        age_group
      } = req.body;

      if (!url || !video_id || !title) {
        res.status(400).json({
          success: false,
          message: 'URL, video_id et titre sont requis'
        });
        return;
      }

      const newVideo = await sql`
        INSERT INTO youtube_videos (
          url, video_id, title, description, category, age_group, is_active
        )
        VALUES (
          ${url}, ${video_id}, ${title}, ${description || ''}, 
          ${category || 'general'}, ${age_group || '6-12'}, true
        )
        RETURNING *
      `;

      res.status(201).json({
        success: true,
        message: 'Vidéo YouTube créée avec succès',
        data: {
          video: newVideo[0]
        }
      });

    } else {
      res.status(405).json({ error: 'Méthode non autorisée' });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des vidéos YouTube');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}
