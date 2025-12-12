import { apiService } from '../services/apiService.js'

/**
 * Proxy Repository pour la gestion des badges
 * Utilise l'API backend au lieu d'accès direct à la base de données
 */
export class BadgeRepository {
  /**
   * Récupérer tous les badges
   * @returns {Promise<Array>} Liste des badges
   */
  async getAllBadges () {
    try {
      const response = await apiService.request('/api/badges')
      // Filtrer pour ne garder que les badges actifs (si le backend ne le fait pas déjà)
      const badges = response.data || []
      return badges.filter(badge => badge.is_active !== false)
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error)
      throw error
    }
  }

  /**
   * Récupérer un badge par ID
   * @param {number} badgeId - ID du badge
   * @returns {Promise<Object>} Badge
   */
  async getBadgeById (badgeId) {
    try {
      const response = await apiService.request(`/api/badges/${badgeId}`)
      return response.data || null
    } catch (error) {
      console.error('Erreur lors de la récupération du badge:', error)
      throw error
    }
  }

  /**
   * Créer un nouveau badge
   * @param {Object} badgeData - Données du badge
   * @returns {Promise<Object>} Badge créé
   */
  async createBadge (badgeData) {
    try {
      const response = await apiService.request('/api/badges', {
        method: 'POST',
        body: JSON.stringify(badgeData)
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la création du badge:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un badge
   * @param {number} badgeId - ID du badge
   * @param {Object} badgeData - Nouvelles données du badge
   * @returns {Promise<Object>} Badge mis à jour
   */
  async updateBadge (badgeId, badgeData) {
    try {
      const response = await apiService.request(`/api/badges/${badgeId}`, {
        method: 'PUT',
        body: JSON.stringify(badgeData)
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du badge:', error)
      throw error
    }
  }

  /**
   * Supprimer un badge
   * @param {number} badgeId - ID du badge
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteBadge (badgeId) {
    try {
      const response = await apiService.request(`/api/badges/${badgeId}`, {
        method: 'DELETE'
      })
      return response.success || false
    } catch (error) {
      console.error('Erreur lors de la suppression du badge:', error)
      throw error
    }
  }

  /**
   * Récupérer tous les badges d'un profil avec leur progression
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des badges avec progression
   */
  async getProfileBadges (profileId) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}`)
      return response.data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des badges du profil:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges débloqués d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des badges débloqués
   */
  async getUnlockedBadges (profileId) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}/unlocked`)
      return response.data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des badges débloqués:', error)
      throw error
    }
  }

  /**
   * Mettre à jour la progression d'un badge pour un profil
   * ATTENTION: Cette méthode nécessite un endpoint backend spécifique
   * Pour l'instant, on utilise checkAndUnlockBadges qui gère automatiquement la progression
   * @param {number} profileId - ID du profil
   * @param {number} badgeId - ID du badge
   * @param {number} progress - Progression (0-100)
   * @returns {Promise<Object>} Badge mis à jour
   */
  async updateBadgeProgress (profileId, badgeId, progress) {
    try {
      // Utiliser l'endpoint check-unlock qui gère automatiquement la progression
      const response = await apiService.request('/api/badges/check-unlock', {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          actionType: 'progress_update',
          actionData: { badgeId, progress }
        })
      })
      // Retourner le badge mis à jour si disponible
      const unlockedBadges = response.data?.unlockedBadges || []
      return unlockedBadges.find(b => b.id === badgeId) || { profileId, badgeId, progress }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression du badge:', error)
      throw error
    }
  }

  /**
   * Débloquer un badge pour un profil
   * ATTENTION: Cette méthode nécessite un endpoint backend spécifique
   * Pour l'instant, on utilise checkAndUnlockBadges
   * @param {number} profileId - ID du profil
   * @param {number} badgeId - ID du badge
   * @returns {Promise<Object>} Badge débloqué
   */
  async unlockBadge (profileId, badgeId) {
    try {
      // Utiliser l'endpoint check-unlock qui gère automatiquement le déblocage
      const response = await apiService.request('/api/badges/check-unlock', {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          actionType: 'unlock',
          actionData: { badgeId }
        })
      })
      const unlockedBadges = response.data?.unlockedBadges || []
      return unlockedBadges.find(b => b.id === badgeId) || null
    } catch (error) {
      console.error('Erreur lors du déblocage du badge:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques de badges d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques
   */
  async getBadgeStats (profileId) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}/stats`)
      return response.data || {
        total: 0,
        unlocked: 0,
        locked: 0,
        points: 0,
        percentage: 0
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges par catégorie
   * @param {string} category - Catégorie du badge
   * @returns {Promise<Array>} Liste des badges
   */
  async getBadgesByCategory (category) {
    try {
      // Récupérer tous les badges et filtrer par catégorie côté client
      // (ou utiliser un endpoint spécifique si disponible)
      const badges = await this.getAllBadges()
      return badges.filter(badge => badge.category === category && badge.is_active !== false)
    } catch (error) {
      console.error('Erreur lors de la récupération des badges par catégorie:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges récemment débloqués d'un profil
   * @param {number} profileId - ID du profil
   * @param {number} limit - Nombre de badges à récupérer (par défaut 5)
   * @returns {Promise<Array>} Liste des badges récents
   */
  async getRecentlyUnlockedBadges (profileId, limit = 5) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}/recent?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('Erreur lors de la récupération des badges récents:', error)
      throw error
    }
  }
}

export default new BadgeRepository()
