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
      // Récupérer les leçons
      const { profileId, published } = req.query;

      let query = sql`
        SELECT 
          l.id, l.title, l.description, l.subject, l.level, 
          l.image_filename, l.image_data, l.quiz_data, 
          l.is_published, l.created_at, l.updated_at,
          p.name as profile_name
        FROM lessons l
        JOIN profiles p ON l.profile_id = p.id
      `;

      const conditions = [];
      const params = [];

      // Filtrer par profil si spécifié
      if (profileId) {
        conditions.push(`l.profile_id = $${params.length + 1}`);
        params.push(profileId);
      }

      // Filtrer par statut de publication
      if (published !== undefined) {
        conditions.push(`l.is_published = $${params.length + 1}`);
        params.push(published === 'true');
      }

      // Ajouter les conditions si nécessaire
      if (conditions.length > 0) {
        query = sql`
          SELECT 
            l.id, l.title, l.description, l.subject, l.level, 
            l.image_filename, l.image_data, l.quiz_data, 
            l.is_published, l.created_at, l.updated_at,
            p.name as profile_name
          FROM lessons l
          JOIN profiles p ON l.profile_id = p.id
          WHERE ${sql.unsafe(conditions.join(' AND '), params)}
        `;
      }

      query = sql`${query} ORDER BY l.created_at DESC`;

      const lessons = await query;

      res.status(200).json({
        success: true,
        message: 'Leçons récupérées avec succès',
        data: { lessons }
      });

    } else if (req.method === 'POST') {
      // Créer une nouvelle leçon
      const { 
        title, description, subject, level, 
        imageFilename, imageData, quizData, isPublished = true 
      } = req.body;

      // Validation
      if (!title || !quizData) {
        res.status(400).json({ 
          success: false, 
          message: 'Titre et données de quiz requis' 
        });
        return;
      }

      const result = await sql`
        INSERT INTO lessons (
          profile_id, title, description, subject, level,
          image_filename, image_data, quiz_data, is_published
        )
        VALUES (
          ${user.profileId}, ${title}, ${description}, ${subject}, ${level},
          ${imageFilename}, ${imageData}, ${JSON.stringify(quizData)}, ${isPublished}
        )
        RETURNING *
      `;

      res.status(201).json({
        success: true,
        message: 'Leçon créée avec succès',
        data: { lesson: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des leçons');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

