/**
 * Service de gestion des leçons et quiz
 * Gère le stockage, la récupération et la publication des leçons
 */

import sql from '../config/database.js'
import { auditLogService } from './auditLogService.js'

export class LessonService {
  
  /**
   * Sauvegarde une leçon générée en base de données
   * @param {Object} lessonData - Données de la leçon
   * @param {number} profileId - ID du profil
   * @param {File} imageFile - Fichier image (optionnel)
   * @returns {Promise<Object>} Leçon sauvegardée
   */
  static async saveLesson(lessonData, profileId, imageFile = null) {
    try {
      let imageData = null
      let imageFilename = null
      
      // Traiter l'image si fournie
      if (imageFile) {
        imageData = await this.fileToBase64(imageFile)
        imageFilename = imageFile.name
      }
      
      const result = await sql`
        INSERT INTO lessons (
          profile_id, title, description, subject, level, 
          image_filename, image_data, quiz_data, is_published
        )
        VALUES (
          ${profileId}, ${lessonData.title}, ${lessonData.description || ''}, 
          ${lessonData.subject || ''}, ${lessonData.level || ''},
          ${imageFilename}, ${imageData}, ${JSON.stringify(lessonData)}, true
        )
        RETURNING *
      `;
      
      // Enregistrer la création de la leçon dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'lesson_creation',
        'LESSON_CREATED',
        {
          lessonId: result[0].id,
          title: lessonData.title,
          questionsCount: lessonData.questions?.length || 0
        }
      );
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la leçon:', error);
      auditLogService.logSystemError(
        'Lesson save failed',
        'LessonService',
        { error: error.message, profileId, lessonTitle: lessonData.title }
      );
      throw error;
    }
  }
  
  /**
   * Récupère toutes les leçons d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des leçons
   */
  static async getLessonsByProfile(profileId) {
    try {
      const lessons = await sql`
        SELECT id, title, description, subject, level, 
               image_filename, created_at, updated_at
        FROM lessons 
        WHERE profile_id = ${profileId} AND is_published = true
        ORDER BY created_at DESC
      `;
      
      return lessons;
    } catch (error) {
      console.error('Erreur lors de la récupération des leçons:', error);
      throw error;
    }
  }
  
  /**
   * Récupère une leçon par son ID
   * @param {number} lessonId - ID de la leçon
   * @returns {Promise<Object>} Données de la leçon
   */
  static async getLessonById(lessonId) {
    try {
      const result = await sql`
        SELECT * FROM lessons WHERE id = ${lessonId}
      `;
      
      if (result.length === 0) {
        throw new Error('Leçon non trouvée');
      }
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la récupération de la leçon:', error);
      throw error;
    }
  }
  
  /**
   * Sauvegarde les résultats d'un quiz
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @param {Object} results - Résultats du quiz
   * @returns {Promise<Object>} Résultats sauvegardés
   */
  static async saveQuizResults(lessonId, profileId, results) {
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
      
      // Enregistrer les résultats dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'quiz_completion',
        'QUIZ_COMPLETED',
        {
          lessonId,
          score: results.score,
          percentage: results.percentage
        }
      );
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les résultats d'un profil pour une leçon
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Résultats du quiz
   */
  static async getQuizResults(lessonId, profileId) {
    try {
      const results = await sql`
        SELECT * FROM quiz_results 
        WHERE lesson_id = ${lessonId} AND profile_id = ${profileId}
        ORDER BY completed_at DESC
      `;
      
      return results;
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les statistiques d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques du profil
   */
  static async getProfileStats(profileId) {
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
   * Récupère les statistiques globales de tous les enfants
   * @returns {Promise<Object>} Statistiques globales
   */
  static async getGlobalStats() {
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
   * Récupère les statistiques détaillées d'un enfant avec historique
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques détaillées
   */
  static async getDetailedChildStats(profileId) {
    try {
      // Statistiques de base
      const basicStats = await this.getProfileStats(profileId);
      
      // Leçons avec informations de quiz
      const lessons = await this.getLessonsByProfile(profileId);
      const enrichedLessons = await Promise.all(
        lessons.map(async (lesson) => {
          const quizResults = await this.getQuizResults(lesson.id, profileId);
          const bestResult = quizResults.length > 0 
            ? quizResults.reduce((best, current) => current.percentage > best.percentage ? current : best)
            : null;
          
          return {
            ...lesson,
            quizCompleted: quizResults.length > 0,
            bestScore: bestResult ? bestResult.percentage : 0,
            totalAttempts: quizResults.length,
            lastAttempt: quizResults.length > 0 ? quizResults[0].completed_at : null
          };
        })
      );
      
      // Historique des quiz (derniers 20)
      const quizHistory = [];
      for (const lesson of lessons) {
        const results = await this.getQuizResults(lesson.id, profileId);
        results.forEach(result => {
          quizHistory.push({
            id: result.id,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            score: result.percentage,
            correctAnswers: result.score,
            totalQuestions: result.total_questions,
            completedAt: result.completed_at
          });
        });
      }
      
      // Trier l'historique par date (plus récent en premier)
      quizHistory.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      
      return {
        ...basicStats,
        lessons: enrichedLessons,
        quizHistory: quizHistory.slice(0, 20), // Limiter à 20 derniers quiz
        totalLessons: basicStats.total_lessons || 0,
        totalQuizzes: basicStats.total_quizzes_completed || 0,
        averageScore: basicStats.average_score || 0
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques détaillées:', error);
      throw error;
    }
  }
  
  /**
   * Supprime une leçon
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil (pour vérification)
   * @returns {Promise<boolean>} Succès de la suppression
   */
  static async deleteLesson(lessonId, profileId) {
    try {
      const result = await sql`
        DELETE FROM lessons 
        WHERE id = ${lessonId} AND profile_id = ${profileId}
        RETURNING id
      `;
      
      if (result.length === 0) {
        throw new Error('Leçon non trouvée ou non autorisée');
      }
      
      // Enregistrer la suppression dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'lesson_deletion',
        'LESSON_DELETED',
        { lessonId }
      );
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la leçon:', error);
      throw error;
    }
  }
  
  /**
   * Convertit un fichier en base64
   * @param {File} file - Fichier à convertir
   * @returns {Promise<string>} Base64 du fichier
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }
}
