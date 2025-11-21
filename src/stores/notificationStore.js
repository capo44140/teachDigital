import { defineStore } from 'pinia'
import { NotificationService } from '../services/notificationService.js'
import { NotificationRepository } from '../repositories/notificationRepository.js'

/**
 * Store pour la gestion des notifications
 * Gère l'état des notifications et leurs interactions
 */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    notificationRepository: new NotificationRepository()
  }),

  getters: {
    // Récupérer les notifications non lues
    unreadNotifications: (state) => state.notifications.filter(notification => !notification.is_read),

    // Récupérer les notifications lues
    readNotifications: (state) => state.notifications.filter(notification => notification.is_read),

    // Récupérer les notifications par type
    notificationsByType: (state) => (type) =>
      state.notifications.filter(notification => notification.type === type),

    // Récupérer les notifications récentes
    recentNotifications: (state) =>
      state.notifications
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10),

    // Récupérer les notifications de quiz
    quizNotifications: (state) =>
      state.notifications.filter(notification => notification.type === 'quiz_completed'),

    // Vérifier s'il y a des notifications non lues
    hasUnreadNotifications: (state) => state.unreadCount > 0,

    // Récupérer le nombre de notifications par type
    getNotificationCountByType: (state) => (type) =>
      state.notifications.filter(notification => notification.type === type).length
  },

  actions: {
    /**
     * Charger les notifications d'un profil
     * @param {number} profileId - ID du profil
     * @param {boolean} unreadOnly - Charger seulement les non lues
     */
    async loadNotifications (profileId, unreadOnly = false) {
      this.isLoading = true
      this.error = null

      try {
        this.notifications = await this.notificationRepository.getNotifications(profileId, unreadOnly)
        this.updateUnreadCount()
        console.log('✅ Notifications chargées avec succès')
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors du chargement des notifications:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Charger les notifications récentes
     * @param {number} profileId - ID du profil
     * @param {number} limit - Nombre maximum de notifications
     */
    async loadRecentNotifications (profileId, limit = 10) {
      this.isLoading = true
      this.error = null

      try {
        this.notifications = await this.notificationRepository.getRecentNotifications(profileId, limit)
        this.updateUnreadCount()
        console.log('✅ Notifications récentes chargées avec succès')
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors du chargement des notifications récentes:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Créer une notification
     * @param {number} profileId - ID du profil
     * @param {string} type - Type de notification
     * @param {string} title - Titre de la notification
     * @param {string} message - Message de la notification
     * @param {Object} data - Données supplémentaires (optionnel)
     */
    async createNotification (profileId, type, title, message, data = null) {
      this.isLoading = true
      this.error = null

      try {
        const notification = await this.notificationRepository.createNotification(
          profileId,
          type,
          title,
          message,
          data
        )

        this.notifications.unshift(notification)
        this.updateUnreadCount()
        console.log('✅ Notification créée avec succès')
        return notification
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors de la création de la notification:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Créer une notification de quiz terminé
     * @param {number} profileId - ID du profil
     * @param {Object} quizData - Données du quiz
     */
    async createQuizCompletionNotification (profileId, quizData) {
      try {
        const notification = await NotificationService.createQuizCompletionNotification(
          profileId,
          quizData
        )

        this.notifications.unshift(notification)
        this.updateUnreadCount()
        console.log('✅ Notification de quiz créée avec succès')
        return notification
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors de la création de la notification de quiz:', error)
        throw error
      }
    },

    /**
     * Marquer une notification comme lue
     * @param {number} notificationId - ID de la notification
     */
    async markAsRead (notificationId) {
      this.isLoading = true
      this.error = null

      try {
        const updatedNotification = await this.notificationRepository.markAsRead(notificationId)

        if (updatedNotification) {
          // Mettre à jour dans la liste locale
          const index = this.notifications.findIndex(n => n.id === notificationId)
          if (index !== -1) {
            this.notifications[index] = updatedNotification
          }
          this.updateUnreadCount()
          console.log('✅ Notification marquée comme lue')
        }
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors du marquage de la notification:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Marquer toutes les notifications comme lues
     * @param {number} profileId - ID du profil
     */
    async markAllAsRead (profileId) {
      this.isLoading = true
      this.error = null

      try {
        const updatedCount = await this.notificationRepository.markAllAsRead(profileId)

        // Mettre à jour toutes les notifications locales
        this.notifications = this.notifications.map(notification => ({
          ...notification,
          is_read: true
        }))

        this.updateUnreadCount()
        console.log(`✅ ${updatedCount} notifications marquées comme lues`)
        return updatedCount
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors du marquage des notifications:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Supprimer une notification
     * @param {number} notificationId - ID de la notification
     */
    async deleteNotification (notificationId) {
      this.isLoading = true
      this.error = null

      try {
        const success = await this.notificationRepository.deleteNotification(notificationId)

        if (success) {
          this.notifications = this.notifications.filter(n => n.id !== notificationId)
          this.updateUnreadCount()
          console.log('✅ Notification supprimée')
        }
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors de la suppression de la notification:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Supprimer toutes les notifications lues
     * @param {number} profileId - ID du profil
     */
    async deleteReadNotifications (profileId) {
      this.isLoading = true
      this.error = null

      try {
        const deletedCount = await this.notificationRepository.deleteReadNotifications(profileId)

        // Retirer les notifications lues de la liste locale
        this.notifications = this.notifications.filter(notification => !notification.is_read)
        this.updateUnreadCount()

        console.log(`✅ ${deletedCount} notifications supprimées`)
        return deletedCount
      } catch (error) {
        this.error = error.message
        console.error('❌ Erreur lors de la suppression des notifications:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Charger les statistiques des notifications
     * @param {number} profileId - ID du profil
     */
    async loadNotificationStats (profileId) {
      try {
        const stats = await this.notificationRepository.getNotificationStats(profileId)
        this.unreadCount = stats.unread
        console.log('✅ Statistiques des notifications chargées')
        return stats
      } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques:', error)
      }
    },

    /**
     * Filtrer les notifications par type
     * @param {string} type - Type de notification
     */
    filterByType (type) {
      this.notifications = this.notifications.filter(notification => notification.type === type)
    },

    /**
     * Rechercher dans les notifications
     * @param {string} searchTerm - Terme de recherche
     */
    searchNotifications (searchTerm) {
      const term = searchTerm.toLowerCase()
      this.notifications = this.notifications.filter(notification =>
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term)
      )
    },

    /**
     * Mettre à jour le compteur de notifications non lues
     */
    updateUnreadCount () {
      this.unreadCount = this.notifications.filter(notification => !notification.is_read).length
    },

    /**
     * Nettoyer les erreurs
     */
    clearError () {
      this.error = null
    },

    /**
     * Réinitialiser l'état
     */
    reset () {
      this.notifications = []
      this.unreadCount = 0
      this.isLoading = false
      this.error = null
    }
  }
})
