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
        message: 'ID de leçon requis' 
      });
      return;
    }

    if (req.method === 'GET') {
      // Récupérer une leçon par ID
      const lessons = await sql`
        SELECT 
          l.id, l.title, l.description, l.subject, l.level, 
          l.image_filename, l.image_data, l.quiz_data, 
          l.is_published, l.created_at, l.updated_at,
          p.name as profile_name, p.id as profile_id
        FROM lessons l
        JOIN profiles p ON l.profile_id = p.id
        WHERE l.id = ${id}
      `;

      if (!lessons[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Leçon non trouvée' 
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Leçon récupérée avec succès',
        data: { lesson: lessons[0] }
      });

    } else if (req.method === 'PUT') {
      // Modifier une leçon (propriétaire ou admin)
      const { 
        title, description, subject, level, 
        imageFilename, imageData, quizData, isPublished 
      } = req.body;

      // Vérifier que la leçon existe et les permissions
      const existingLesson = await sql`
        SELECT * FROM lessons WHERE id = ${id}
      `;

      if (!existingLesson[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Leçon non trouvée' 
        });
        return;
      }

      // Vérifier les permissions (propriétaire ou admin)
      if (!user.isAdmin && existingLesson[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await sql`
        UPDATE lessons 
        SET 
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          subject = COALESCE(${subject}, subject),
          level = COALESCE(${level}, level),
          image_filename = COALESCE(${imageFilename}, image_filename),
          image_data = COALESCE(${imageData}, image_data),
          quiz_data = COALESCE(${quizData ? JSON.stringify(quizData) : null}, quiz_data),
          is_published = COALESCE(${isPublished}, is_published),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      res.status(200).json({
        success: true,
        message: 'Leçon modifiée avec succès',
        data: { lesson: result[0] }
      });

    } else if (req.method === 'DELETE') {
      // Supprimer une leçon (propriétaire ou admin)
      const existingLesson = await sql`
        SELECT * FROM lessons WHERE id = ${id}
      `;

      if (!existingLesson[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Leçon non trouvée' 
        });
        return;
      }

      // Vérifier les permissions (propriétaire ou admin)
      if (!user.isAdmin && existingLesson[0].profile_id !== user.profileId) {
        res.status(403).json({ 
          success: false, 
          message: 'Accès refusé' 
        });
        return;
      }

      const result = await sql`
        DELETE FROM lessons 
        WHERE id = ${id}
        RETURNING *
      `;

      res.status(200).json({
        success: true,
        message: 'Leçon supprimée avec succès',
        data: { lesson: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion de la leçon');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

