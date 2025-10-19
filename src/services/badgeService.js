import { BadgeRepository } from '../repositories/badgeRepository.js'

/**
 * Service pour la gestion des badges et leur attribution automatique
 */
export class BadgeService {
  constructor() {
    this.badgeRepository = new BadgeRepository()
  }

  /**
   * Récupérer tous les badges actifs
   * @returns {Promise<Array>} Liste des badges
   */
  async getAllBadges() {
    try {
      return await this.badgeRepository.getAllBadges()
    } catch (error) {
      console.error('Erreur dans getAllBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer un badge par ID
   * @param {number} badgeId - ID du badge
   * @returns {Promise<Object>} Badge
   */
  async getBadgeById(badgeId) {
    try {
      return await this.badgeRepository.getBadgeById(badgeId)
    } catch (error) {
      console.error('Erreur dans getBadgeById:', error)
      throw error
    }
  }

  /**
   * Créer un nouveau badge personnalisé
   * @param {Object} badgeData - Données du badge
   * @returns {Promise<Object>} Badge créé
   */
  async createCustomBadge(badgeData) {
    try {
      // Validation des données
      this.validateBadgeData(badgeData)
      
      return await this.badgeRepository.createBadge(badgeData)
    } catch (error) {
      console.error('Erreur dans createCustomBadge:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un badge
   * @param {number} badgeId - ID du badge
   * @param {Object} badgeData - Nouvelles données
   * @returns {Promise<Object>} Badge mis à jour
   */
  async updateBadge(badgeId, badgeData) {
    try {
      this.validateBadgeData(badgeData)
      return await this.badgeRepository.updateBadge(badgeId, badgeData)
    } catch (error) {
      console.error('Erreur dans updateBadge:', error)
      throw error
    }
  }

  /**
   * Supprimer un badge
   * @param {number} badgeId - ID du badge
   * @returns {Promise<boolean>} Succès
   */
  async deleteBadge(badgeId) {
    try {
      return await this.badgeRepository.deleteBadge(badgeId)
    } catch (error) {
      console.error('Erreur dans deleteBadge:', error)
      throw error
    }
  }

  /**
   * Récupérer tous les badges d'un profil avec leur progression
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des badges
   */
  async getProfileBadges(profileId) {
    try {
      const badges = await this.badgeRepository.getProfileBadges(profileId)
      
      // Calculer le pourcentage de progression pour chaque badge
      return badges.map(badge => ({
        ...badge,
        progress_percentage: this.calculateProgressPercentage(badge)
      }))
    } catch (error) {
      console.error('Erreur dans getProfileBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges débloqués d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des badges débloqués
   */
  async getUnlockedBadges(profileId) {
    try {
      return await this.badgeRepository.getUnlockedBadges(profileId)
    } catch (error) {
      console.error('Erreur dans getUnlockedBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques de badges d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques
   */
  async getBadgeStats(profileId) {
    try {
      return await this.badgeRepository.getBadgeStats(profileId)
    } catch (error) {
      console.error('Erreur dans getBadgeStats:', error)
      throw error
    }
  }

  /**
   * Vérifier et débloquer automatiquement les badges après une action
   * @param {number} profileId - ID du profil
   * @param {string} actionType - Type d'action (quiz_completed, perfect_score, etc.)
   * @param {Object} actionData - Données de l'action
   * @returns {Promise<Array>} Liste des badges débloqués
   */
  async checkAndUnlockBadges(profileId, actionType, actionData = {}) {
    try {
      const unlockedBadges = []
      
      // Récupérer tous les badges correspondant au type d'action
      const allBadges = await this.badgeRepository.getAllBadges()
      const relevantBadges = allBadges.filter(badge => 
        this.isRelevantBadge(badge, actionType, actionData)
      )
      
      // Vérifier chaque badge pertinent
      for (const badge of relevantBadges) {
        const shouldUnlock = await this.shouldUnlockBadge(profileId, badge, actionData)
        
        if (shouldUnlock) {
          // Débloquer le badge
          await this.badgeRepository.unlockBadge(profileId, badge.id)
          unlockedBadges.push(badge)
        } else {
          // Mettre à jour la progression
          const progress = await this.calculateBadgeProgress(profileId, badge, actionData)
          await this.badgeRepository.updateBadgeProgress(profileId, badge.id, progress)
        }
      }
      
      return unlockedBadges
    } catch (error) {
      console.error('Erreur dans checkAndUnlockBadges:', error)
      throw error
    }
  }

  /**
   * Vérifier si un badge est pertinent pour un type d'action
   * @param {Object} badge - Badge à vérifier
   * @param {string} actionType - Type d'action
   * @param {Object} actionData - Données de l'action
   * @returns {boolean} Pertinence du badge
   */
  isRelevantBadge(badge, actionType, actionData) {
    // Mapper les types d'action aux types de condition de badge
    const actionMapping = {
      'quiz_completed': ['quiz_completed', 'subjects_variety', 'subject_specific', 'daily_streak'],
      'perfect_score': ['perfect_score'],
      'score_streak': ['score_streak'],
      'learning_time': ['learning_time']
    }
    
    const relevantConditions = actionMapping[actionType] || []
    
    // Vérifier si le badge correspond au type d'action
    if (!relevantConditions.includes(badge.condition_type)) {
      return false
    }
    
    // Vérifications supplémentaires pour les badges spécifiques à une matière
    if (badge.condition_type === 'subject_specific' && actionData.subject) {
      // Mapper le nom du badge à la matière
      const badgeSubject = this.extractSubjectFromBadge(badge)
      return badgeSubject === actionData.subject.toLowerCase()
    }
    
    return true
  }

  /**
   * Extraire la matière d'un badge
   * @param {Object} badge - Badge
   * @returns {string} Matière
   */
  extractSubjectFromBadge(badge) {
    const subjectMapping = {
      'mathématicien': 'mathématiques',
      'littéraire': 'français',
      'scientifique': 'sciences',
      'historien': 'histoire'
    }
    
    const badgeName = badge.name.toLowerCase()
    for (const [key, value] of Object.entries(subjectMapping)) {
      if (badgeName.includes(key)) {
        return value
      }
    }
    
    return null
  }

  /**
   * Vérifier si un badge doit être débloqué
   * @param {number} profileId - ID du profil
   * @param {Object} badge - Badge à vérifier
   * @param {Object} _actionData - Données de l'action (non utilisé pour le moment)
   * @returns {Promise<boolean>} Doit être débloqué
   */
  async shouldUnlockBadge(profileId, badge, _actionData) {
    try {
      // Récupérer les données nécessaires selon le type de condition
      let currentValue = 0
      
      switch (badge.condition_type) {
        case 'quiz_completed':
          currentValue = await this.getQuizCompletedCount(profileId)
          break
          
        case 'perfect_score':
          currentValue = await this.getPerfectScoreCount(profileId)
          break
          
        case 'score_streak':
          currentValue = await this.getCurrentScoreStreak(profileId)
          break
          
        case 'learning_time':
          currentValue = await this.getTotalLearningTime(profileId)
          break
          
        case 'daily_streak':
          currentValue = await this.getCurrentDailyStreak(profileId)
          break
          
        case 'subjects_variety':
          currentValue = await this.getSubjectsCount(profileId)
          break
          
        case 'subject_specific':
          const subject = this.extractSubjectFromBadge(badge)
          currentValue = await this.getSubjectQuizCount(profileId, subject)
          break
          
        default:
          return false
      }
      
      return currentValue >= badge.condition_value
    } catch (error) {
      console.error('Erreur dans shouldUnlockBadge:', error)
      return false
    }
  }

  /**
   * Calculer la progression d'un badge
   * @param {number} profileId - ID du profil
   * @param {Object} badge - Badge
   * @param {Object} _actionData - Données de l'action (non utilisé pour le moment)
   * @returns {Promise<number>} Progression (0-100)
   */
  async calculateBadgeProgress(profileId, badge, _actionData) {
    try {
      let currentValue = 0
      
      switch (badge.condition_type) {
        case 'quiz_completed':
          currentValue = await this.getQuizCompletedCount(profileId)
          break
        case 'perfect_score':
          currentValue = await this.getPerfectScoreCount(profileId)
          break
        case 'score_streak':
          currentValue = await this.getCurrentScoreStreak(profileId)
          break
        case 'learning_time':
          currentValue = await this.getTotalLearningTime(profileId)
          break
        case 'daily_streak':
          currentValue = await this.getCurrentDailyStreak(profileId)
          break
        case 'subjects_variety':
          currentValue = await this.getSubjectsCount(profileId)
          break
        case 'subject_specific':
          const subject = this.extractSubjectFromBadge(badge)
          currentValue = await this.getSubjectQuizCount(profileId, subject)
          break
        default:
          return 0
      }
      
      const progress = Math.min(100, Math.round((currentValue / badge.condition_value) * 100))
      return progress
    } catch (error) {
      console.error('Erreur dans calculateBadgeProgress:', error)
      return 0
    }
  }

  /**
   * Calculer le pourcentage de progression pour un badge
   * @param {Object} badge - Badge avec progression
   * @returns {number} Pourcentage
   */
  calculateProgressPercentage(badge) {
    if (badge.is_unlocked) return 100
    return Math.min(100, badge.progress || 0)
  }

  /**
   * Valider les données d'un badge
   * @param {Object} badgeData - Données à valider
   * @throws {Error} Si les données sont invalides
   */
  validateBadgeData(badgeData) {
    const requiredFields = ['name', 'description', 'icon', 'category', 'condition_type', 'condition_value']
    
    for (const field of requiredFields) {
      if (!badgeData[field]) {
        throw new Error(`Le champ ${field} est requis`)
      }
    }
    
    if (badgeData.condition_value < 0) {
      throw new Error('La valeur de condition doit être positive')
    }
    
    if (badgeData.points && badgeData.points < 0) {
      throw new Error('Les points doivent être positifs')
    }
  }

  // ===== Méthodes utilitaires pour calculer les statistiques =====

  /**
   * Récupérer le nombre de quiz complétés
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de quiz
   */
  async getQuizCompletedCount(profileId) {
    try {
      const result = await import('../config/database.js').then(m => m.default)`
        SELECT COUNT(*) as count
        FROM quiz_results
        WHERE profile_id = ${profileId}
      `
      return parseInt(result[0]?.count) || 0
    } catch (error) {
      console.error('Erreur dans getQuizCompletedCount:', error)
      return 0
    }
  }

  /**
   * Récupérer le nombre de scores parfaits
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de scores parfaits
   */
  async getPerfectScoreCount(profileId) {
    try {
      const result = await import('../config/database.js').then(m => m.default)`
        SELECT COUNT(*) as count
        FROM quiz_results
        WHERE profile_id = ${profileId} AND percentage = 100
      `
      return parseInt(result[0]?.count) || 0
    } catch (error) {
      console.error('Erreur dans getPerfectScoreCount:', error)
      return 0
    }
  }

  /**
   * Récupérer la série de scores élevés actuelle
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Longueur de la série
   */
  async getCurrentScoreStreak(profileId) {
    try {
      const results = await import('../config/database.js').then(m => m.default)`
        SELECT percentage
        FROM quiz_results
        WHERE profile_id = ${profileId}
        ORDER BY completed_at DESC
        LIMIT 10
      `
      
      let streak = 0
      for (const result of results) {
        if (parseFloat(result.percentage) >= 80) {
          streak++
        } else {
          break
        }
      }
      
      return streak
    } catch (error) {
      console.error('Erreur dans getCurrentScoreStreak:', error)
      return 0
    }
  }

  /**
   * Récupérer le temps total d'apprentissage (en minutes)
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Temps en minutes
   */
  async getTotalLearningTime(profileId) {
    try {
      // Estimation: 2 minutes par question
      const results = await import('../config/database.js').then(m => m.default)`
        SELECT SUM(total_questions) as total_questions
        FROM quiz_results
        WHERE profile_id = ${profileId}
      `
      
      const totalQuestions = parseInt(results[0]?.total_questions) || 0
      return Math.round(totalQuestions * 2) // 2 minutes par question
    } catch (error) {
      console.error('Erreur dans getTotalLearningTime:', error)
      return 0
    }
  }

  /**
   * Récupérer la série de jours consécutifs
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de jours
   */
  async getCurrentDailyStreak(profileId) {
    try {
      const results = await import('../config/database.js').then(m => m.default)`
        SELECT DATE(completed_at) as date
        FROM quiz_results
        WHERE profile_id = ${profileId}
        GROUP BY DATE(completed_at)
        ORDER BY date DESC
        LIMIT 30
      `
      
      if (results.length === 0) return 0
      
      let streak = 0
      let currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)
      
      for (const result of results) {
        const resultDate = new Date(result.date)
        resultDate.setHours(0, 0, 0, 0)
        
        const diffDays = Math.floor((currentDate - resultDate) / (1000 * 60 * 60 * 24))
        
        if (diffDays === streak) {
          streak++
          currentDate = resultDate
        } else {
          break
        }
      }
      
      return streak
    } catch (error) {
      console.error('Erreur dans getCurrentDailyStreak:', error)
      return 0
    }
  }

  /**
   * Récupérer le nombre de matières différentes
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de matières
   */
  async getSubjectsCount(profileId) {
    try {
      const results = await import('../config/database.js').then(m => m.default)`
        SELECT COUNT(DISTINCT l.subject) as count
        FROM quiz_results qr
        JOIN lessons l ON qr.lesson_id = l.id
        WHERE qr.profile_id = ${profileId} AND l.subject IS NOT NULL
      `
      return parseInt(results[0]?.count) || 0
    } catch (error) {
      console.error('Erreur dans getSubjectsCount:', error)
      return 0
    }
  }

  /**
   * Récupérer le nombre de quiz pour une matière spécifique
   * @param {number} profileId - ID du profil
   * @param {string} subject - Matière
   * @returns {Promise<number>} Nombre de quiz
   */
  async getSubjectQuizCount(profileId, subject) {
    try {
      if (!subject) return 0
      
      const results = await import('../config/database.js').then(m => m.default)`
        SELECT COUNT(*) as count
        FROM quiz_results qr
        JOIN lessons l ON qr.lesson_id = l.id
        WHERE qr.profile_id = ${profileId} 
        AND LOWER(l.subject) = LOWER(${subject})
      `
      return parseInt(results[0]?.count) || 0
    } catch (error) {
      console.error('Erreur dans getSubjectQuizCount:', error)
      return 0
    }
  }

  /**
   * Récupérer les badges récemment débloqués
   * @param {number} profileId - ID du profil
   * @param {number} limit - Limite de résultats
   * @returns {Promise<Array>} Liste des badges
   */
  async getRecentlyUnlockedBadges(profileId, limit = 5) {
    try {
      return await this.badgeRepository.getRecentlyUnlockedBadges(profileId, limit)
    } catch (error) {
      console.error('Erreur dans getRecentlyUnlockedBadges:', error)
      return []
    }
  }

  /**
   * Récupérer les badges par catégorie
   * @param {string} category - Catégorie
   * @returns {Promise<Array>} Liste des badges
   */
  async getBadgesByCategory(category) {
    try {
      return await this.badgeRepository.getBadgesByCategory(category)
    } catch (error) {
      console.error('Erreur dans getBadgesByCategory:', error)
      return []
    }
  }
}

export default new BadgeService()

