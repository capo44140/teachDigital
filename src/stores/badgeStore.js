import { defineStore } from 'pinia'
import badgeService from '../services/badgeService.js'

/**
 * Store pour la gestion des badges
 */
export const useBadgeStore = defineStore('badge', {
  state: () => ({
    // Tous les badges disponibles
    allBadges: [],
    
    // Badges du profil actuel
    profileBadges: [],
    
    // Badges débloqués du profil actuel
    unlockedBadges: [],
    
    // Statistiques du profil actuel
    badgeStats: {
      total: 0,
      unlocked: 0,
      locked: 0,
      points: 0,
      percentage: 0
    },
    
    // Badges récemment débloqués
    recentBadges: [],
    
    // État de chargement
    loading: false,
    error: null,
    
    // Profil actuel
    currentProfileId: null
  }),

  getters: {
    /**
     * Obtenir les badges verrouillés
     */
    lockedBadges: (state) => {
      return state.profileBadges.filter(badge => !badge.is_unlocked)
    },

    /**
     * Obtenir les badges débloqués triés par date
     */
    sortedUnlockedBadges: (state) => {
      return [...state.unlockedBadges].sort((a, b) => 
        new Date(b.unlocked_at) - new Date(a.unlocked_at)
      )
    },

    /**
     * Obtenir les badges par catégorie
     */
    badgesByCategory: (state) => {
      const categories = {}
      
      state.profileBadges.forEach(badge => {
        if (!categories[badge.category]) {
          categories[badge.category] = []
        }
        categories[badge.category].push(badge)
      })
      
      return categories
    },

    /**
     * Obtenir le pourcentage de progression global
     */
    overallProgress: (state) => {
      if (state.badgeStats.total === 0) return 0
      return Math.round((state.badgeStats.unlocked / state.badgeStats.total) * 100)
    },

    /**
     * Obtenir les badges en cours (avec progression > 0 mais non débloqués)
     */
    inProgressBadges: (state) => {
      return state.profileBadges.filter(badge => 
        !badge.is_unlocked && badge.progress > 0
      )
    },

    /**
     * Obtenir le nombre total de points gagnés
     */
    totalPoints: (state) => state.badgeStats.points,

    /**
     * Vérifier si un badge est débloqué
     */
    isBadgeUnlocked: (state) => (badgeId) => {
      const badge = state.profileBadges.find(b => b.id === badgeId)
      return badge ? badge.is_unlocked : false
    },

    /**
     * Obtenir la progression d'un badge
     */
    getBadgeProgress: (state) => (badgeId) => {
      const badge = state.profileBadges.find(b => b.id === badgeId)
      return badge ? badge.progress : 0
    }
  },

  actions: {
    /**
     * Charger tous les badges
     */
    async loadAllBadges() {
      this.loading = true
      this.error = null
      
      try {
        this.allBadges = await badgeService.getAllBadges()
      } catch (error) {
        console.error('Erreur lors du chargement des badges:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Charger les badges d'un profil
     * @param {number} profileId - ID du profil
     */
    async loadProfileBadges(profileId) {
      this.loading = true
      this.error = null
      this.currentProfileId = profileId
      
      try {
        // Charger les badges avec progression
        this.profileBadges = await badgeService.getProfileBadges(profileId)
        
        // Charger les badges débloqués
        this.unlockedBadges = await badgeService.getUnlockedBadges(profileId)
        
        // Charger les statistiques
        this.badgeStats = await badgeService.getBadgeStats(profileId)
        
        // Charger les badges récents
        this.recentBadges = await badgeService.getRecentlyUnlockedBadges(profileId, 5)
        
      } catch (error) {
        console.error('Erreur lors du chargement des badges du profil:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Actualiser les statistiques d'un profil
     * @param {number} profileId - ID du profil
     */
    async refreshBadgeStats(profileId) {
      try {
        this.badgeStats = await badgeService.getBadgeStats(profileId || this.currentProfileId)
      } catch (error) {
        console.error('Erreur lors de l\'actualisation des statistiques:', error)
        throw error
      }
    },

    /**
     * Créer un nouveau badge personnalisé
     * @param {Object} badgeData - Données du badge
     */
    async createBadge(badgeData) {
      this.loading = true
      this.error = null
      
      try {
        const newBadge = await badgeService.createCustomBadge(badgeData)
        this.allBadges.push(newBadge)
        return newBadge
      } catch (error) {
        console.error('Erreur lors de la création du badge:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Mettre à jour un badge
     * @param {number} badgeId - ID du badge
     * @param {Object} badgeData - Nouvelles données
     */
    async updateBadge(badgeId, badgeData) {
      this.loading = true
      this.error = null
      
      try {
        const updatedBadge = await badgeService.updateBadge(badgeId, badgeData)
        
        // Mettre à jour dans la liste
        const index = this.allBadges.findIndex(b => b.id === badgeId)
        if (index !== -1) {
          this.allBadges[index] = updatedBadge
        }
        
        return updatedBadge
      } catch (error) {
        console.error('Erreur lors de la mise à jour du badge:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Supprimer un badge
     * @param {number} badgeId - ID du badge
     */
    async deleteBadge(badgeId) {
      this.loading = true
      this.error = null
      
      try {
        await badgeService.deleteBadge(badgeId)
        
        // Retirer de la liste
        this.allBadges = this.allBadges.filter(b => b.id !== badgeId)
        this.profileBadges = this.profileBadges.filter(b => b.id !== badgeId)
        
        return true
      } catch (error) {
        console.error('Erreur lors de la suppression du badge:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Vérifier et débloquer automatiquement les badges
     * @param {number} profileId - ID du profil
     * @param {string} actionType - Type d'action
     * @param {Object} actionData - Données de l'action
     */
    async checkAndUnlockBadges(profileId, actionType, actionData = {}) {
      try {
        const newlyUnlockedBadges = await badgeService.checkAndUnlockBadges(
          profileId, 
          actionType, 
          actionData
        )
        
        if (newlyUnlockedBadges.length > 0) {
          // Actualiser les données du profil
          await this.loadProfileBadges(profileId)
          
          // Retourner les badges débloqués pour notification
          return newlyUnlockedBadges
        }
        
        // Même si aucun badge n'est débloqué, actualiser la progression
        if (this.currentProfileId === profileId) {
          await this.loadProfileBadges(profileId)
        }
        
        return []
      } catch (error) {
        console.error('Erreur lors de la vérification des badges:', error)
        throw error
      }
    },

    /**
     * Charger les badges par catégorie
     * @param {string} category - Catégorie
     */
    async loadBadgesByCategory(category) {
      this.loading = true
      this.error = null
      
      try {
        const badges = await badgeService.getBadgesByCategory(category)
        return badges
      } catch (error) {
        console.error('Erreur lors du chargement des badges par catégorie:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Réinitialiser l'état du store
     */
    reset() {
      this.allBadges = []
      this.profileBadges = []
      this.unlockedBadges = []
      this.badgeStats = {
        total: 0,
        unlocked: 0,
        locked: 0,
        points: 0,
        percentage: 0
      }
      this.recentBadges = []
      this.loading = false
      this.error = null
      this.currentProfileId = null
    },

    /**
     * Obtenir un badge par ID
     * @param {number} badgeId - ID du badge
     */
    async getBadge(badgeId) {
      try {
        // Vérifier d'abord dans le cache
        let badge = this.allBadges.find(b => b.id === badgeId)
        
        if (!badge) {
          badge = await badgeService.getBadgeById(badgeId)
        }
        
        return badge
      } catch (error) {
        console.error('Erreur lors de la récupération du badge:', error)
        throw error
      }
    },

    /**
     * Obtenir les badges récents d'un profil
     * @param {number} profileId - ID du profil
     * @param {number} limit - Limite de résultats
     */
    async getRecentBadges(profileId, limit = 5) {
      try {
        this.recentBadges = await badgeService.getRecentlyUnlockedBadges(profileId, limit)
        return this.recentBadges
      } catch (error) {
        console.error('Erreur lors de la récupération des badges récents:', error)
        throw error
      }
    }
  }
})

