import { apiService } from './apiService.js'
import { auditLogService } from './auditLogService.js'

/**
 * Service de gestion des notifications
 *
 * ⚠️ IMPORTANT: Ce service communique via l'API backend, pas d'accès direct DB
 */
export class NotificationService {
  /**
   * Créer une notification
   * @param {number} profileId - ID du profil
   * @param {string} type - Type de notification
   * @param {string} title - Titre de la notification
   * @param {string} message - Message de la notification
   * @param {Object} data - Données supplémentaires (optionnel)
   * @returns {Promise<Object>} Notification créée
   */
  static async createNotification (profileId, type, title, message, data = null) {
    try {
      const result = await apiService.request('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          type,
          title,
          message,
          data
        })
      })

      if (result.success) {
        // Enregistrer dans les logs d'audit
        auditLogService.logDataAccess(
          profileId,
          'notification_created',
          'NOTIFICATION_CREATED',
          {
            notificationId: result.data.notification.id,
            type,
            title
          }
        )

        console.log('✅ Notification créée avec succès')
        return result.data.notification
      } else {
        throw new Error(result.message || 'Erreur lors de la création de la notification')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la notification:', error)
      throw error
    }
  }

  /**
   * Récupérer les notifications d'un profil
   * @param {number} profileId - ID du profil
   * @param {boolean} unreadOnly - Récupérer seulement les non lues
   * @returns {Promise<Array>} Liste des notifications
   */
  static async getNotifications (profileId, unreadOnly = false) {
    try {
      const notifications = await apiService.getNotifications({
        profileId,
        isRead: unreadOnly ? false : undefined
      })
      return notifications
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des notifications:', error)
      throw error
    }
  }

  /**
   * Marquer une notification comme lue
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<Object>} Notification mise à jour
   */
  static async markAsRead (notificationId) {
    try {
      const result = await apiService.markNotificationAsRead(notificationId)

      console.log('✅ Notification marquée comme lue')
      return result
    } catch (error) {
      console.error('❌ Erreur lors du marquage de la notification:', error)
      throw error
    }
  }

  /**
   * Marquer toutes les notifications d'un profil comme lues
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de notifications mises à jour
   */
  static async markAllAsRead (profileId) {
    try {
      const result = await apiService.markAllNotificationsAsRead(profileId)

      console.log('✅ Notifications marquées comme lues')
      return result
    } catch (error) {
      console.error('❌ Erreur lors du marquage des notifications:', error)
      throw error
    }
  }

  /**
   * Supprimer une notification
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<boolean>} Succès de la suppression
   */
  static async deleteNotification (notificationId) {
    try {
      const result = await apiService.request(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (result.success) {
        console.log('✅ Notification supprimée')
        return true
      } else {
        throw new Error(result.message || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la notification:', error)
      throw error
    }
  }

  /**
   * Supprimer toutes les notifications lues d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de notifications supprimées
   */
  static async deleteReadNotifications (profileId) {
    try {
      const notifications = await apiService.getNotifications({
        profileId,
        isRead: true
      })

      let deletedCount = 0
      for (const notification of notifications) {
        await this.deleteNotification(notification.id)
        deletedCount++
      }

      console.log(`✅ ${deletedCount} notifications supprimées`)
      return deletedCount
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des notifications:', error)
      throw error
    }
  }

  /**
   * Créer une notification de quiz terminé
   * @param {number} profileId - ID du profil
   * @param {Object} quizData - Données du quiz
   * @returns {Promise<Object>} Notification créée
   */
  static async createQuizCompletionNotification (profileId, quizData) {
    const { score, totalQuestions, percentage, lessonTitle } = quizData

    let title, message

    if (percentage >= 80) {
      title = '🎉 Excellent travail !'
      message = `Félicitations ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à votre quiz "${lessonTitle}". Continuez comme ça !`
    } else if (percentage >= 60) {
      title = '👍 Bon travail !'
      message = `Bravo ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à votre quiz "${lessonTitle}". Vous progressez bien !`
    } else {
      title = '💪 Continuez vos efforts !'
      message = `Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à votre quiz "${lessonTitle}". N'hésitez pas à réviser et réessayer !`
    }

    return await this.createNotification(
      profileId,
      'quiz_completed',
      title,
      message,
      {
        score,
        totalQuestions,
        percentage,
        lessonTitle,
        completedAt: new Date().toISOString()
      }
    )
  }

  /**
   * Récupérer les statistiques des notifications
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques des notifications
   */
  static async getNotificationStats (profileId) {
    try {
      const notifications = await apiService.getNotifications({ profileId })

      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        quiz_notifications: notifications.filter(n => n.type === 'quiz_completed').length
      }

      return stats
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error)
      throw error
    }
  }
}
