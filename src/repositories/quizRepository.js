import { BaseRepository } from './baseRepository.js';
import sql from '../config/database.js';

/**
 * Repository pour la gestion des quiz et résultats
 * Centralise toutes les opérations de base de données liées aux quiz
 */
export class QuizRepository extends BaseRepository {
  constructor() {
    super('quiz_results');
  }

  /**
   * Sauvegarder les résultats d'un quiz
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @param {Object} results - Résultats du quiz
   * @returns {Promise<Object>} Résultats sauvegardés
   */
  async saveQuizResults(lessonId, profileId, results) {
    try {
      const result = await sql`
        INSERT INTO quiz_results (
          lesson_id, profile_id, score, total_questions, 
          percentage, answers
        )
        VALUES (
          ${lessonId}, ${profileId}, ${results.score}, ${results.totalQuestions},
          ${results.percentage}, ${JSON.stringify(results.answers)}
        )
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats de quiz:', error);
      throw error;
    }
  }

  /**
   * Récupérer les résultats d'un profil pour une leçon
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Résultats du quiz
   */
  async getQuizResults(lessonId, profileId) {
    try {
      return await sql`
        SELECT * FROM quiz_results 
        WHERE lesson_id = ${lessonId} AND profile_id = ${profileId}
        ORDER BY completed_at DESC
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des quiz d'un enfant
   * @param {number} profileId - ID du profil enfant
   * @returns {Promise<Array>} Historique des quiz
   */
  async getChildQuizHistory(profileId) {
    try {
      const quizHistory = await sql`
        SELECT 
          qr.*,
          l.title as lesson_title,
          l.description as lesson_description,
          l.subject as lesson_subject
        FROM quiz_results qr
        LEFT JOIN lessons l ON qr.lesson_id = l.id
        WHERE qr.profile_id = ${profileId}
        ORDER BY qr.completed_at DESC
      `;
      
      return quizHistory.map(quiz => ({
        id: quiz.id,
        lessonId: quiz.lesson_id,
        lessonTitle: quiz.lesson_title,
        lessonDescription: quiz.lesson_description,
        lessonSubject: quiz.lesson_subject,
        score: quiz.score,
        totalQuestions: quiz.total_questions,
        percentage: quiz.percentage,
        completedAt: quiz.completed_at,
        duration: quiz.duration || 0,
        answers: quiz.answers
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des quiz:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques du profil
   */
  async getProfileStats(profileId) {
    try {
      const stats = await sql`
        SELECT 
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT qr.id) as total_quizzes_completed,
          AVG(qr.percentage) as average_score,
          MAX(qr.completed_at) as last_quiz_date
        FROM lessons l
        LEFT JOIN quiz_results qr ON l.id = qr.lesson_id AND qr.profile_id = ${profileId}
        WHERE l.profile_id = ${profileId} AND l.is_published = true
      `;
      
      return stats[0];
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques globales de tous les enfants
   * @returns {Promise<Object>} Statistiques globales
   */
  async getGlobalStats() {
    try {
      const stats = await sql`
        SELECT 
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT qr.id) as total_quizzes_completed,
          AVG(qr.percentage) as average_score
        FROM lessons l
        LEFT JOIN quiz_results qr ON l.id = qr.lesson_id
        WHERE l.is_published = true
      `;
      
      return stats[0];
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques globales:', error);
      throw error;
    }
  }

  /**
   * Récupérer les meilleurs scores d'un profil
   * @param {number} profileId - ID du profil
   * @param {number} limit - Nombre maximum de résultats
   * @returns {Promise<Array>} Meilleurs scores
   */
  async getBestScores(profileId, limit = 10) {
    try {
      return await sql`
        SELECT 
          qr.*,
          l.title as lesson_title,
          l.subject as lesson_subject
        FROM quiz_results qr
        LEFT JOIN lessons l ON qr.lesson_id = l.id
        WHERE qr.profile_id = ${profileId}
        ORDER BY qr.percentage DESC, qr.completed_at DESC
        LIMIT ${limit}
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des meilleurs scores:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques par sujet
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Statistiques par sujet
   */
  async getStatsBySubject(profileId) {
    try {
      return await sql`
        SELECT 
          l.subject,
          COUNT(qr.id) as quiz_count,
          AVG(qr.percentage) as average_score,
          MAX(qr.percentage) as best_score
        FROM lessons l
        LEFT JOIN quiz_results qr ON l.id = qr.lesson_id AND qr.profile_id = ${profileId}
        WHERE l.is_published = true
        GROUP BY l.subject
        ORDER BY quiz_count DESC
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques par sujet:', error);
      throw error;
    }
  }

  /**
   * Supprimer les résultats d'un quiz
   * @param {number} quizResultId - ID du résultat de quiz
   * @param {number} profileId - ID du profil (pour vérification)
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteQuizResult(quizResultId, profileId) {
    try {
      const result = await sql`
        DELETE FROM quiz_results 
        WHERE id = ${quizResultId} AND profile_id = ${profileId}
        RETURNING id
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression du résultat de quiz:', error);
      throw error;
    }
  }
}
