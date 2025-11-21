import apiService from '../services/apiService.js'

/**
 * Proxy Repository - Utilise l'API backend au lieu d'accÃ¨s direct BD
 */
export class NotificationRepository {
  async createNotification (profileId, type, title, message, data = null) {
    try {
      // CrÃ©er via API
      return await apiService.request('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ profileId, type, title, message, data })
      })
    } catch (error) {
      console.error('Erreur lors de la crÃ©ation de la notification:', error)
      throw error
    }
  }

  async getNotifications (profileId, unreadOnly = false) {
    try {
      const notifications = await apiService.getNotifications({
        profileId,
        isRead: unreadOnly ? 'false' : undefined
      })
      return notifications || []
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration des notifications:', error)
      return []
    }
  }

  async markAsRead (notificationId) {
    try {
      return await apiService.markNotificationAsRead(notificationId)
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error)
      return null
    }
  }

  async markAllAsRead (profileId) {
    try {
      await apiService.markAllNotificationsAsRead(profileId)
      return 1
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error)
      return 0
    }
  }

  async deleteNotification (notificationId) {
    try {
      await apiService.request(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error)
      return false
    }
  }

  async deleteReadNotifications (profileId) {
    return 0
  }

  async getNotificationStats (profileId) {
    return {
      total: 0,
      unread: 0,
      quiz_notifications: 0
    }
  }

  async getNotificationsByType (profileId, type) {
    const notifications = await this.getNotifications(profileId)
    return notifications.filter(n => n.type === type)
  }

  async getRecentNotifications (profileId, limit = 10) {
    const notifications = await this.getNotifications(profileId)
    return notifications.slice(0, limit)
  }
}
