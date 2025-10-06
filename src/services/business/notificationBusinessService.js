import { NotificationService } from '../notificationService.js';
import { NotificationRepository } from '../../repositories/notificationRepository.js';
import { auditLogService } from '../auditLogService.js';

/**
 * Service de logique métier pour les notifications
 * Contient la logique complexe et les règles métier
 */
export class NotificationBusinessService {
  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  /**
   * Créer une notification intelligente basée sur le contexte
   * @param {number} profileId - ID du profil
   * @param {string} type - Type de notification
   * @param {Object} context - Contexte de la notification
   * @returns {Promise<Object>} Notification créée
   */
  async createSmartNotification(profileId, type, context) {
    try {
      let title, message, data;
      
      switch (type) {
        case 'quiz_completed':
          ({ title, message, data } = this.generateQuizCompletionNotification(context));
          break;
        case 'achievement_unlocked':
          ({ title, message, data } = this.generateAchievementNotification(context));
          break;
        case 'progress_milestone':
          ({ title, message, data } = this.generateProgressMilestoneNotification(context));
          break;
        case 'system_alert':
          ({ title, message, data } = this.generateSystemAlertNotification(context));
          break;
        default:
          throw new Error('Type de notification non supporté');
      }
      
      // Créer la notification
      const notification = await this.notificationRepository.createNotification(
        profileId,
        type,
        title,
        message,
        data
      );
      
      // Enregistrer dans les logs d'audit
      auditLogService.logDataAccess(
        profileId,
        'notification_created',
        'NOTIFICATION_CREATED',
        {
          notificationId: notification.id,
          type,
          title
        }
      );
      
      return notification;
    } catch (error) {
      console.error('Erreur lors de la création de la notification intelligente:', error);
      throw error;
    }
  }

  /**
   * Traiter les notifications en lot avec optimisation
   * @param {Array} notificationData - Données des notifications
   * @returns {Promise<Array>} Notifications créées
   */
  async processBatchNotifications(notificationData) {
    try {
      const notifications = [];
      
      // Grouper par profil pour optimiser les requêtes
      const groupedByProfile = notificationData.reduce((acc, data) => {
        if (!acc[data.profileId]) {
          acc[data.profileId] = [];
        }
        acc[data.profileId].push(data);
        return acc;
      }, {});
      
      // Créer les notifications par lot
      for (const [profileId, profileNotifications] of Object.entries(groupedByProfile)) {
        for (const data of profileNotifications) {
          const notification = await this.createSmartNotification(
            profileId,
            data.type,
            data.context
          );
          notifications.push(notification);
        }
      }
      
      return notifications;
    } catch (error) {
      console.error('Erreur lors du traitement des notifications en lot:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les notifications anciennes avec stratégie intelligente
   * @param {number} profileId - ID du profil
   * @param {Object} options - Options de nettoyage
   * @returns {Promise<Object>} Résultats du nettoyage
   */
  async smartCleanup(profileId, options = {}) {
    try {
      const {
        keepReadDays = 7,
        keepUnreadDays = 30,
        maxNotifications = 100
      } = options;
      
      const notifications = await this.notificationRepository.getNotifications(profileId);
      
      const now = new Date();
      const readThreshold = new Date(now.getTime() - (keepReadDays * 24 * 60 * 60 * 1000));
      const unreadThreshold = new Date(now.getTime() - (keepUnreadDays * 24 * 60 * 60 * 1000));
      
      let deletedCount = 0;
      const toDelete = [];
      
      // Identifier les notifications à supprimer
      notifications.forEach(notification => {
        const notificationDate = new Date(notification.created_at);
        
        if (notification.is_read && notificationDate < readThreshold) {
          toDelete.push(notification.id);
        } else if (!notification.is_read && notificationDate < unreadThreshold) {
          toDelete.push(notification.id);
        }
      });
      
      // Si on dépasse le nombre maximum, supprimer les plus anciennes
      if (notifications.length > maxNotifications) {
        const sortedNotifications = notifications
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        const excessCount = notifications.length - maxNotifications;
        for (let i = 0; i < excessCount; i++) {
          toDelete.push(sortedNotifications[i].id);
        }
      }
      
      // Supprimer les notifications identifiées
      for (const notificationId of toDelete) {
        await this.notificationRepository.deleteNotification(notificationId);
        deletedCount++;
      }
      
      return {
        deletedCount,
        remainingCount: notifications.length - deletedCount
      };
    } catch (error) {
      console.error('Erreur lors du nettoyage intelligent:', error);
      throw error;
    }
  }

  /**
   * Analyser les préférences de notification d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Préférences analysées
   */
  async analyzeNotificationPreferences(profileId) {
    try {
      const notifications = await this.notificationRepository.getNotifications(profileId);
      
      // Analyser les types de notifications les plus/moins lues
      const typeAnalysis = {};
      notifications.forEach(notification => {
        if (!typeAnalysis[notification.type]) {
          typeAnalysis[notification.type] = {
            total: 0,
            read: 0,
            unread: 0
          };
        }
        
        typeAnalysis[notification.type].total++;
        if (notification.is_read) {
          typeAnalysis[notification.type].read++;
        } else {
          typeAnalysis[notification.type].unread++;
        }
      });
      
      // Calculer les taux de lecture
      Object.keys(typeAnalysis).forEach(type => {
        const analysis = typeAnalysis[type];
        analysis.readRate = analysis.total > 0 ? (analysis.read / analysis.total) * 100 : 0;
      });
      
      // Identifier les préférences
      const preferences = {
        favoriteTypes: Object.entries(typeAnalysis)
          .sort((a, b) => b[1].readRate - a[1].readRate)
          .slice(0, 3)
          .map(([type]) => type),
        leastFavoriteTypes: Object.entries(typeAnalysis)
          .sort((a, b) => a[1].readRate - b[1].readRate)
          .slice(0, 3)
          .map(([type]) => type),
        totalNotifications: notifications.length,
        readRate: notifications.length > 0 
          ? (notifications.filter(n => n.is_read).length / notifications.length) * 100 
          : 0
      };
      
      return preferences;
    } catch (error) {
      console.error('Erreur lors de l\'analyse des préférences:', error);
      throw error;
    }
  }

  /**
   * Générer une notification de quiz terminé
   * @param {Object} context - Contexte du quiz
   * @returns {Object} Données de la notification
   */
  generateQuizCompletionNotification(context) {
    const { score, totalQuestions, percentage, lessonTitle } = context;
    
    let title, message;
    
    if (percentage >= 90) {
      title = "🌟 Performance exceptionnelle !";
      message = `Incroyable ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à "${lessonTitle}". Vous êtes un vrai génie !`;
    } else if (percentage >= 80) {
      title = "🎉 Excellent travail !";
      message = `Félicitations ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à "${lessonTitle}". Continuez comme ça !`;
    } else if (percentage >= 60) {
      title = "👍 Bon travail !";
      message = `Bravo ! Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à "${lessonTitle}". Vous progressez bien !`;
    } else {
      title = "💪 Continuez vos efforts !";
      message = `Vous avez obtenu ${score}/${totalQuestions} (${percentage}%) à "${lessonTitle}". N'hésitez pas à réviser et réessayer !`;
    }
    
    return {
      title,
      message,
      data: {
        score,
        totalQuestions,
        percentage,
        lessonTitle,
        completedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Générer une notification d'achievement
   * @param {Object} context - Contexte de l'achievement
   * @returns {Object} Données de la notification
   */
  generateAchievementNotification(context) {
    const { achievement, description } = context;
    
    return {
      title: `🏆 Achievement débloqué : ${achievement}`,
      message: description,
      data: {
        achievement,
        unlockedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Générer une notification de milestone de progression
   * @param {Object} context - Contexte du milestone
   * @returns {Object} Données de la notification
   */
  generateProgressMilestoneNotification(context) {
    const { milestone, progress } = context;
    
    return {
      title: `🎯 Milestone atteint : ${milestone}`,
      message: `Vous avez atteint ${progress}% de votre objectif !`,
      data: {
        milestone,
        progress,
        achievedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Générer une notification d'alerte système
   * @param {Object} context - Contexte de l'alerte
   * @returns {Object} Données de la notification
   */
  generateSystemAlertNotification(context) {
    const { alert, severity = 'info' } = context;
    
    const severityEmojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };
    
    return {
      title: `${severityEmojis[severity]} ${alert.title}`,
      message: alert.message,
      data: {
        alert,
        severity,
        createdAt: new Date().toISOString()
      }
    };
  }
}
