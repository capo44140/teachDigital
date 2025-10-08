import sql from '../../../lib/database.js';
import { authenticateToken } from '../../../lib/auth.js';
import { successResponse, handleError } from '../../../lib/response.js';

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
      // Récupérer les résultats de quiz pour une leçon
      const { profileId } = req.query;

      let query = sql`
        SELECT 
          qr.id, qr.score, qr.total_questions, qr.percentage, 
          qr.answers, qr.completed_at,
          p.name as profile_name
        FROM quiz_results qr
        JOIN profiles p ON qr.profile_id = p.id
        WHERE qr.lesson_id = ${id}
      `;

      // Filtrer par profil si spécifié (admin peut voir tous, utilisateur seulement les siens)
      if (profileId) {
        query = sql`${query} AND qr.profile_id = ${profileId}`;
      } else if (!user.isAdmin) {
        // Non-admin ne peut voir que ses propres résultats
        query = sql`${query} AND qr.profile_id = ${user.profileId}`;
      }

      query = sql`${query} ORDER BY qr.completed_at DESC`;

      const results = await query;

      res.status(200).json({
        success: true,
        message: 'Résultats de quiz récupérés avec succès',
        data: { results }
      });

    } else if (req.method === 'POST') {
      // Sauvegarder un résultat de quiz
      const { score, totalQuestions, percentage, answers } = req.body;

      // Validation
      if (score === undefined || !totalQuestions || percentage === undefined || !answers) {
        res.status(400).json({ 
          success: false, 
          message: 'Tous les champs sont requis (score, totalQuestions, percentage, answers)' 
        });
        return;
      }

      // Vérifier que la leçon existe
      const lesson = await sql`
        SELECT id FROM lessons WHERE id = ${id}
      `;

      if (!lesson[0]) {
        res.status(404).json({ 
          success: false, 
          message: 'Leçon non trouvée' 
        });
        return;
      }

      const result = await sql`
        INSERT INTO quiz_results (
          lesson_id, profile_id, score, total_questions, 
          percentage, answers
        )
        VALUES (
          ${id}, ${user.profileId}, ${score}, ${totalQuestions}, 
          ${percentage}, ${JSON.stringify(answers)}
        )
        RETURNING *
      `;

      res.status(201).json({
        success: true,
        message: 'Résultat de quiz sauvegardé avec succès',
        data: { result: result[0] }
      });

    } else {
      res.status(405).json({ 
        success: false, 
        message: 'Méthode non autorisée' 
      });
    }

  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la gestion des résultats de quiz');
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
  }
}

