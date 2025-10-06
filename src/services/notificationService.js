import sql from '../config/database.js';
import { auditLogService } from './auditLogService.js';

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
  static async createNotification(profileId, type, title, message, data = null) {
    try {
      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message, data)
        VALUES (${profileId}, ${type}, ${title}, ${message}, ${data ? JSON.stringify(data) : null})
        RETURNING *
      `;
      
      // Enregistrer dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'notification_created',
        'NOTIFICATION_CREATED',
        {
          notificationId: result[0].id,
          type,
          title
        }
      );
      
      console.log('✅ Notification créée avec succès');
      return result[0];
    } catch (error) {
      console.error('❌ Erreur lors de la création de la notification:', error);
      throw error;
    }
  }
  
  /**
   * Récupérer les notifications d'un profil
   * @param {number} profileId - ID du profil
   * @param {boolean} unreadOnly - Récupérer seulement les non lues
   * @returns {Promise<Array>} Liste des notifications
   */
  static async getNotifications(profileId, unreadOnly = false) {
    try {
      let query = sql`
        SELECT * FROM notifications 
        WHERE profile_id = ${profileId}
      `;
      
      if (unreadOnly) {
        query = sql`
          SELECT * FROM notifications 
          WHERE profile_id = ${profileId} AND is_read = false
        `;
      }
      
      const notifications = await query;
      return notifications;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  }
  
  /**
   * Marquer une notification comme lue
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<Object>} Notification mise à jour
   */
  static async markAsRead(notificationId) {
    try {
      const result = await sql`
        UPDATE notifications 
        SET is_read = true 
        WHERE id = ${notificationId}
        RETURNING *
      `;
      
      console.log('✅ Notification marquée comme lue');
      return result[0];
    } catch (error) {
      console.error('❌ Erreur lors du marquage de la notification:', error);
      throw error;
    }
  }
  
  /**
   * Marquer toutes les notifications d'un profil comme lues
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de notifications mises à jour
   */
  static async markAllAsRead(profileId) {
    try {
      const result = await sql`
        UPDATE notifications 
        SET is_read = true 
        WHERE profile_id = ${profileId} AND is_read = false
      `;
      
      console.log(`✅ ${result.count} notifications marquées comme lues`);
      return result.count;
    } catch (error) {
      console.error('❌ Erreur lors du marquage des notifications:', error);
      throw error;
    }
  }
  
  /**
   * Supprimer une notification
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<boolean>} Succès de la suppression
   */
  static async deleteNotification(notificationId) {
    try {
      await sql`
        DELETE FROM notifications 
        WHERE id = ${notificationId}
      `;
      
      console.log('✅ Notification supprimée');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la notification:', error);
      throw error;
    }
  }
  
  /**
   * Supprimer toutes les notifications lues d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de notifications supprimées
   */
  static async deleteReadNotifications(profileId) {
    try {
      const result = await sql`
        DELETE FROM notifications 
        WHERE profile_id = ${profileId} AND is_read = true
      `;
      
      console.log(`✅ ${result.count} notifications supprimées`);
      return result.count;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des notifications:', error);
      throw error;
    }
  }
  
  /**
   * Créer une notification de quiz terminé
   * @param {number} profileId - ID du profil
   * @param {Object} quizData - Données du quiz
   * @returns {Promise<Object>} Notification créée
   */
  static async createQuizCompletionNotification(profileId, quizData) {
    const { score, totalQuestions, percentage, lessonTitle } = quizData;
    
    let title, message;
    
    if (percentage >= 80) {
      title = "🎉 Excellent travail !";
      message = `Félicitations ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à votre quiz "${lessonTitle}". Continuez comme ça !`;
    } else if (percentage >= 60) {
      title = "👍 Bon travail !";
      message = `Bravo ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à votre quiz "${lessonTitle}". Vous progressez bien !`;
    } else {
      title = "💪 Continuez vos efforts !";
      message = `Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à votre quiz "${lessonTitle}". N'hésitez pas à réviser et réessayer !`;
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
    );
  }
  
  /**
   * Récupérer les statistiques des notifications
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques des notifications
   */
  static async getNotificationStats(profileId) {
    try {
      const stats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN type = 'quiz_completed' THEN 1 END) as quiz_notifications
        FROM notifications 
        WHERE profile_id = ${profileId}
      `;
      
      return stats[0];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}
