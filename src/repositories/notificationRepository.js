import { BaseRepository } from './baseRepository.js';
import sql from '../config/database.js';

/**
 * Repository pour la gestion des notifications
 * Centralise toutes les opérations de base de données liées aux notifications
 */
export class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  /**
   * Créer une notification
   * @param {number} profileId - ID du profil
   * @param {string} type - Type de notification
   * @param {string} title - Titre de la notification
   * @param {string} message - Message de la notification
   * @param {Object} data - Données supplémentaires (optionnel)
   * @returns {Promise<Object>} Notification créée
   */
  async createNotification(profileId, type, title, message, data = null) {
    try {
      const result = await sql`
        INSERT INTO notifications (profile_id, type, title, message, data)
        VALUES (${profileId}, ${type}, ${title}, ${message}, ${data ? JSON.stringify(data) : null})
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications d'un profil
   * @param {number} profileId - ID du profil
   * @param {boolean} unreadOnly - Récupérer seulement les non lues
   * @returns {Promise<Array>} Liste des notifications
   */
  async getNotifications(profileId, unreadOnly = false) {
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
      
      return await query;
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<Object|null>} Notification mise à jour ou null
   */
  async markAsRead(notificationId) {
    try {
      const result = await sql`
        UPDATE notifications 
        SET is_read = true 
        WHERE id = ${notificationId}
        RETURNING *
      `;
      
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      throw error;
    }
  }

  /**
   * Marquer toutes les notifications d'un profil comme lues
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de notifications mises à jour
   */
  async markAllAsRead(profileId) {
    try {
      const result = await sql`
        UPDATE notifications 
        SET is_read = true 
        WHERE profile_id = ${profileId} AND is_read = false
      `;
      
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error);
      throw error;
    }
  }

  /**
   * Supprimer une notification
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteNotification(notificationId) {
    try {
      const result = await sql`
        DELETE FROM notifications 
        WHERE id = ${notificationId}
        RETURNING id
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      throw error;
    }
  }

  /**
   * Supprimer toutes les notifications lues d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<number>} Nombre de notifications supprimées
   */
  async deleteReadNotifications(profileId) {
    try {
      const result = await sql`
        DELETE FROM notifications 
        WHERE profile_id = ${profileId} AND is_read = true
      `;
      
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors de la suppression des notifications:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des notifications
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques des notifications
   */
  async getNotificationStats(profileId) {
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
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications par type
   * @param {number} profileId - ID du profil
   * @param {string} type - Type de notification
   * @returns {Promise<Array>} Liste des notifications du type
   */
  async getNotificationsByType(profileId, type) {
    try {
      return await sql`
        SELECT * FROM notifications 
        WHERE profile_id = ${profileId} AND type = ${type}
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error(`Erreur lors de la récupération des notifications de type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications récentes
   * @param {number} profileId - ID du profil
   * @param {number} limit - Nombre maximum de notifications
   * @returns {Promise<Array>} Liste des notifications récentes
   */
  async getRecentNotifications(profileId, limit = 10) {
    try {
      return await sql`
        SELECT * FROM notifications 
        WHERE profile_id = ${profileId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications récentes:', error);
      throw error;
    }
  }
}
