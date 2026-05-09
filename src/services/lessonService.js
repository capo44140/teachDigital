/**
 * Service de gestion des leçons et quiz
 * Gère le stockage, la récupération et la publication des leçons
 *
 * ⚠️ IMPORTANT: Ce service communique via l'API backend, pas d'accès direct DB
 */

import { apiService } from './apiService.js'
import { auditLogService } from './auditLogService.js'
import { NotificationService } from './notificationService.js'

export class LessonService {
  /**
   * Sauvegarde une leçon générée en base de données
   * @param {Object} lessonData - Données de la leçon
   * @param {number} profileId - ID du profil
   * @param {File|Array<File>} files - Fichier(s) (optionnel)
   * @returns {Promise<Object>} Leçon sauvegardée
   */
  static async saveLesson (lessonData, profileId, files = null) {
    try {
      let imageFilename = null

      // Traiter les fichiers si fournis - on ne garde que le nom, pas les données (trop lourd)
      if (files) {
        if (Array.isArray(files)) {
          // Utiliser le premier fichier image comme image principale
          const firstImage = files.find(f => f.type.startsWith('image/'))
          if (firstImage) {
            imageFilename = firstImage.name
          }
        } else {
          // Un seul fichier
          imageFilename = files.name
        }
      }

      const result = await apiService.createLesson({
        title: lessonData.title,
        description: lessonData.description || '',
        subject: lessonData.subject || '',
        level: lessonData.level || '',
        imageFilename,
        // imageData non envoyé - trop lourd, le backend ne le stocke pas
        quizData: lessonData,
        isPublished: true
      })

      // Enregistrer la création de la leçon dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'lesson_creation',
        'LESSON_CREATED',
        {
          lessonId: result.id,
          title: lessonData.title,
          questionsCount: lessonData.questions?.length || 0,
          fileCount: Array.isArray(files) ? files.length : (files ? 1 : 0)
        }
      )

      return result
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la leçon:', error)
      auditLogService.logSystemError(
        'Lesson save failed',
        'LessonService',
        { error: error.message, profileId, lessonTitle: lessonData.title }
      )
      throw error
    }
  }

  /**
   * Récupère toutes les leçons d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des leçons
   */
  static async getLessonsByProfile (profileId) {
    try {
      // Utiliser targetProfileId pour récupérer les quiz destinés à ce profil
      const lessons = await apiService.getLessons({
        targetProfileId: profileId,
        published: true
      })

      return lessons
    } catch (error) {
      console.error('Erreur lors de la récupération des leçons:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les leçons disponibles (publiées)
   * @returns {Promise<Array>} Liste de toutes les leçons publiées
   */
  static async getAllAvailableLessons () {
    try {
      const lessons = await apiService.getLessons({
        published: true
      })

      return lessons
    } catch (error) {
      console.error('Erreur lors de la récupération des leçons disponibles:', error)
      throw error
    }
  }

  /**
   * Récupère une leçon par son ID
   * @param {number} lessonId - ID de la leçon
   * @returns {Promise<Object>} Données de la leçon
   */
  static async getLessonById (lessonId) {
    try {
      const result = await apiService.getLesson(lessonId)

      if (!result) {
        throw new Error('Leçon non trouvée')
      }

      return result
    } catch (error) {
      console.error('Erreur lors de la récupération de la leçon:', error)
      throw error
    }
  }

  /**
   * Sauvegarde les résultats d'un quiz
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @param {Object} results - Résultats du quiz
   * @returns {Promise<Object>} Résultats sauvegardés
   */
  static async saveQuizResults (lessonId, profileId, results) {
    try {
      const result = await apiService.saveQuizResult(lessonId, {
        profileId,
        score: results.score,
        totalQuestions: results.totalQuestions,
        percentage: results.percentage,
        answers: results.answers
      })

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
      )

      // Récupérer les informations de la leçon pour la notification
      const lesson = await this.getLessonById(lessonId)
      await NotificationService.createQuizCompletionNotification(profileId, {
        score: results.score,
        totalQuestions: results.totalQuestions,
        percentage: results.percentage,
        lessonTitle: lesson?.title || 'Quiz'
      })

      return result
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats:', error)
      throw error
    }
  }

  /**
   * Récupère les résultats d'un profil pour une leçon
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Résultats du quiz
   */
  static async getQuizResults (lessonId, profileId) {
    try {
      const results = await apiService.request(
        `/api/lessons/${lessonId}/quiz-results?profileId=${profileId}`,
        { method: 'GET' }
      )

      if (results.success) {
        return results.data.results || []
      } else {
        return []
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques du profil
   */
  static async getProfileStats (profileId) {
    try {
      const stats = await apiService.request(
        `/api/profiles/${profileId}/stats`,
        { method: 'GET' }
      )

      if (stats.success) {
        return stats.data.stats
      } else {
        return null
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      throw error
    }
  }

  /**
   * Récupère l'historique des quiz d'un enfant
   * @param {number} profileId - ID du profil enfant
   * @returns {Promise<Array>} Historique des quiz
   */
  static async getChildQuizHistory (profileId) {
    try {
      const allLessons = await this.getAllAvailableLessons()
      const quizHistory = []

      for (const lesson of allLessons) {
        const quizResults = await this.getQuizResults(lesson.id, profileId)

        for (const quiz of quizResults) {
          quizHistory.push({
            id: quiz.id,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonDescription: lesson.description,
            lessonSubject: lesson.subject,
            score: quiz.score,
            totalQuestions: quiz.total_questions,
            percentage: quiz.percentage,
            completedAt: quiz.completed_at,
            duration: quiz.duration || 0,
            answers: quiz.answers
          })
        }
      }

      // Trier par date décroissante
      quizHistory.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

      return quizHistory
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des quiz:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques globales de tous les enfants
   * @returns {Promise<Object>} Statistiques globales
   */
  static async getGlobalStats () {
    try {
      const stats = await apiService.request(
        '/api/lessons/stats/global',
        { method: 'GET' }
      )

      if (stats.success) {
        return stats.data.stats
      } else {
        return null
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques globales:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques détaillées d'un enfant avec historique
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques détaillées
   */
  static async getDetailedChildStats (profileId) {
    try {
      // Statistiques de base
      const basicStats = await this.getProfileStats(profileId)

      // Récupérer TOUTES les leçons disponibles
      const allLessons = await this.getAllAvailableLessons()

      const enrichedLessons = await Promise.all(
        allLessons.map(async (lesson) => {
          const quizResults = await this.getQuizResults(lesson.id, profileId)
          const bestResult = quizResults.length > 0
            ? quizResults.reduce((best, current) => current.percentage > best.percentage ? current : best)
            : null

          return {
            ...lesson,
            quizCompleted: quizResults.length > 0,
            bestScore: bestResult ? bestResult.percentage : 0,
            totalAttempts: quizResults.length,
            lastAttempt: quizResults.length > 0 ? quizResults[0].completed_at : null
          }
        })
      )

      // Historique des quiz (derniers 20)
      const quizHistory = []
      for (const lesson of allLessons) {
        const results = await this.getQuizResults(lesson.id, profileId)
        results.forEach(result => {
          quizHistory.push({
            id: result.id,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            score: result.percentage,
            correctAnswers: result.score,
            totalQuestions: result.total_questions,
            completedAt: result.completed_at
          })
        })
      }

      // Trier l'historique par date (plus récent en premier)
      quizHistory.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

      return {
        ...basicStats,
        lessons: enrichedLessons,
        quizHistory: quizHistory.slice(0, 20),
        totalLessons: basicStats?.total_lessons || 0,
        totalQuizzes: basicStats?.total_quizzes_completed || 0,
        averageScore: basicStats?.average_score || 0
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques détaillées:', error)
      throw error
    }
  }

  /**
   * Supprime une leçon
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil (pour vérification)
   * @returns {Promise<boolean>} Succès de la suppression
   */
  static async deleteLesson (lessonId, profileId) {
    try {
      const result = await apiService.deleteLesson(lessonId)

      if (!result) {
        throw new Error('Leçon non trouvée ou non autorisée')
      }

      // Enregistrer la suppression dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'lesson_deletion',
        'LESSON_DELETED',
        { lessonId }
      )

      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de la leçon:', error)
      throw error
    }
  }

  /**
   * Convertit un fichier en base64
   * @param {File} file - Fichier à convertir
   * @returns {Promise<string>} Base64 du fichier
   */
  static fileToBase64 (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = error => reject(error)
    })
  }
}
