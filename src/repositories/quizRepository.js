import apiService from '../services/apiService.js'

/**
 * Proxy Repository - Utilise l'API backend au lieu d'accÃ¨s direct BD
 */
export class QuizRepository {
  async saveQuizResults (lessonId, profileId, results) {
    try {
      return await apiService.saveQuizResult(lessonId, {
        score: results.score,
        totalQuestions: results.totalQuestions,
        percentage: results.percentage,
        answers: results.answers
      })
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des rÃ©sultats:', error)
      throw error
    }
  }

  async getQuizResults (lessonId, profileId) {
    return []
  }

  async getChildQuizHistory (profileId) {
    return []
  }

  async getProfileStats (profileId) {
    return {
      total_lessons: 0,
      total_quizzes_completed: 0,
      average_score: 0,
      last_quiz_date: null
    }
  }

  async getGlobalStats () {
    return {
      total_lessons: 0,
      total_quizzes_completed: 0,
      average_score: 0
    }
  }

  async getBestScores (profileId, limit = 10) {
    return []
  }

  async getStatsBySubject (profileId) {
    return []
  }

  async deleteQuizResult (quizResultId, profileId) {
    return false
  }
}
