/**
 * Service pour la gestion des badges - Délégation au backend
 * Toute la logique métier est gérée par le backend
 */

import { apiService } from './apiService.js'

export class BadgeService {
  /**
   * Récupérer tous les badges actifs
   */
  async getAllBadges() {
    try {
      const response = await apiService.request('/api/badges')
      return response.data || []
    } catch (error) {
      console.error('Erreur dans getAllBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer un badge par ID
   */
  async getBadgeById(badgeId) {
    try {
      const response = await apiService.request(`/api/badges/${badgeId}`)
      return response.data
    } catch (error) {
      console.error('Erreur dans getBadgeById:', error)
      throw error
    }
  }

  /**
   * Créer un nouveau badge personnalisé
   */
  async createCustomBadge(badgeData) {
    try {
      const response = await apiService.request('/api/badges', {
        method: 'POST',
        body: JSON.stringify(badgeData)
      })
      return response.data
    } catch (error) {
      console.error('Erreur dans createCustomBadge:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un badge
   */
  async updateBadge(badgeId, badgeData) {
    try {
      const response = await apiService.request(`/api/badges/${badgeId}`, {
        method: 'PUT',
        body: JSON.stringify(badgeData)
      })
      return response.data
    } catch (error) {
      console.error('Erreur dans updateBadge:', error)
      throw error
    }
  }

  /**
   * Supprimer un badge
   */
  async deleteBadge(badgeId) {
    try {
      const response = await apiService.request(`/api/badges/${badgeId}`, {
        method: 'DELETE'
      })
      return response.success
    } catch (error) {
      console.error('Erreur dans deleteBadge:', error)
      throw error
    }
  }

  /**
   * Récupérer tous les badges d'un profil avec leur progression
   */
  async getProfileBadges(profileId) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}`)
      return response.data || []
    } catch (error) {
      console.error('Erreur dans getProfileBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges débloqués d'un profil
   */
  async getUnlockedBadges(profileId) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}/unlocked`)
      return response.data || []
    } catch (error) {
      console.error('Erreur dans getUnlockedBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques de badges d'un profil
   */
  async getBadgeStats(profileId) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}/stats`)
      return response.data || {}
    } catch (error) {
      console.error('Erreur dans getBadgeStats:', error)
      throw error
    }
  }

  /**
   * Vérifier et débloquer automatiquement les badges après une action
   */
  async checkAndUnlockBadges(profileId, actionType, actionData = {}) {
    try {
      const response = await apiService.request(`/api/badges/check-unlock`, {
        method: 'POST',
        body: JSON.stringify({ profileId, actionType, actionData })
      })
      return response.data?.unlockedBadges || []
    } catch (error) {
      console.error('Erreur dans checkAndUnlockBadges:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges récemment débloqués
   */
  async getRecentlyUnlockedBadges(profileId, limit = 5) {
    try {
      const response = await apiService.request(`/api/badges/profile/${profileId}/recent?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('Erreur dans getRecentlyUnlockedBadges:', error)
      return []
    }
  }

  /**
   * Récupérer les badges par catégorie
   */
  async getBadgesByCategory(category) {
    try {
      const response = await apiService.request(`/api/badges/category/${category}`)
      return response.data || []
    } catch (error) {
      console.error('Erreur dans getBadgesByCategory:', error)
      return []
    }
  }
}

export default new BadgeService()
