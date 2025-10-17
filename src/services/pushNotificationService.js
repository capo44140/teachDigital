/**
 * Service de notifications push avancées
 * Gère l'inscription, l'envoi et la réception des notifications push
 */

import { NotificationService } from './notificationService.js'

class PushNotificationService {
  constructor() {
    this.registration = null
    this.subscription = null
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    this.vapidPublicKey = null
    this.serverUrl = process.env.VITE_API_URL || 'https://teachdigital.vercel.app'
    
    // Types de notifications supportées
    this.notificationTypes = {
      QUIZ_REMINDER: 'quiz_reminder',
      ACHIEVEMENT: 'achievement',
      PROGRESS_UPDATE: 'progress_update',
      SYSTEM_ALERT: 'system_alert',
      LESSON_AVAILABLE: 'lesson_available',
      PARENT_NOTIFICATION: 'parent_notification'
    }
    
    // Configuration des notifications
    this.notificationConfig = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false
    }
  }

  /**
   * Initialise le service de notifications push
   */
  async initialize() {
    if (!this.isSupported) {
      console.warn('Les notifications push ne sont pas supportées par ce navigateur')
      return false
    }

    try {
      // Enregistrer le service worker
      this.registration = await navigator.serviceWorker.ready
      
      // Récupérer la clé publique VAPID
      await this.loadVapidKey()
      
      // Vérifier l'état actuel de l'abonnement
      this.subscription = await this.registration.pushManager.getSubscription()
      
      console.log('🔔 Service de notifications push initialisé')
      return true
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des notifications push:', error)
      return false
    }
  }

  /**
   * Charge la clé publique VAPID depuis le serveur
   */
  async loadVapidKey() {
    try {
      const response = await fetch(`${this.serverUrl}/api/vapid-public-key`)
      if (response.ok) {
        const data = await response.json()
        this.vapidPublicKey = data.publicKey
      }
    } catch (error) {
      console.warn('Impossible de charger la clé VAPID:', error)
    }
  }

  /**
   * Demande la permission pour les notifications
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Les notifications push ne sont pas supportées')
    }

    try {
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        console.log('✅ Permission accordée pour les notifications')
        return true
      } else if (permission === 'denied') {
        console.warn('❌ Permission refusée pour les notifications')
        return false
      } else {
        console.log('⏳ Permission en attente pour les notifications')
        return false
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error)
      throw error
    }
  }

  /**
   * S'abonne aux notifications push
   * @param {Object} options - Options d'abonnement
   */
  async subscribe(options = {}) {
    if (!this.registration) {
      throw new Error('Service worker non enregistré')
    }

    try {
      // Vérifier la permission
      const permission = await this.requestPermission()
      if (!permission) {
        throw new Error('Permission refusée pour les notifications')
      }

      // Configuration de l'abonnement
      const subscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      }

      // Créer l'abonnement
      this.subscription = await this.registration.pushManager.subscribe(subscriptionOptions)
      
      // Envoyer l'abonnement au serveur
      await this.sendSubscriptionToServer(this.subscription, options)
      
      console.log('🔔 Abonnement aux notifications push créé')
      return this.subscription
    } catch (error) {
      console.error('Erreur lors de l\'abonnement:', error)
      throw error
    }
  }

  /**
   * Se désabonne des notifications push
   */
  async unsubscribe() {
    if (!this.subscription) {
      return false
    }

    try {
      const success = await this.subscription.unsubscribe()
      
      if (success) {
        // Notifier le serveur de la désinscription
        await this.removeSubscriptionFromServer(this.subscription)
        
        this.subscription = null
        console.log('🔕 Désabonnement des notifications push réussi')
      }
      
      return success
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error)
      throw error
    }
  }

  /**
   * Envoie l'abonnement au serveur
   * @param {PushSubscription} subscription - Abonnement push
   * @param {Object} options - Options supplémentaires
   */
  async sendSubscriptionToServer(subscription, options = {}) {
    try {
      const subscriptionData = {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        ...options
      }

      const response = await fetch(`${this.serverUrl}/api/push-subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`)
      }

      console.log('📤 Abonnement envoyé au serveur')
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'abonnement:', error)
      throw error
    }
  }

  /**
   * Supprime l'abonnement du serveur
   * @param {PushSubscription} subscription - Abonnement à supprimer
   */
  async removeSubscriptionFromServer(subscription) {
    try {
      const response = await fetch(`${this.serverUrl}/api/push-unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`)
      }

      console.log('🗑️ Abonnement supprimé du serveur')
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'abonnement:', error)
    }
  }

  /**
   * Vérifie si l'utilisateur est abonné
   */
  async isSubscribed() {
    if (!this.registration) {
      return false
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription()
      return this.subscription !== null
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'abonnement:', error)
      return false
    }
  }

  /**
   * Envoie une notification push locale (pour les tests)
   * @param {Object} notificationData - Données de la notification
   */
  async sendLocalNotification(notificationData) {
    if (!this.registration) {
      throw new Error('Service worker non enregistré')
    }

    const { title, body, icon, data, actions } = notificationData

    const options = {
      body,
      icon: icon || this.notificationConfig.icon,
      badge: this.notificationConfig.badge,
      vibrate: this.notificationConfig.vibrate,
      data: {
        timestamp: Date.now(),
        ...data
      },
      actions: actions || [
        {
          action: 'open',
          title: 'Ouvrir',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Ignorer',
          icon: '/icons/icon-72x72.png'
        }
      ],
      requireInteraction: this.notificationConfig.requireInteraction,
      silent: this.notificationConfig.silent
    }

    try {
      await this.registration.showNotification(title, options)
      console.log('📱 Notification locale envoyée:', title)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification locale:', error)
      throw error
    }
  }

  /**
   * Programme une notification de rappel
   * @param {Object} reminderData - Données du rappel
   */
  async scheduleReminder(reminderData) {
    const {
      profileId,
      type,
      title,
      message,
      scheduledTime,
      data = {}
    } = reminderData

    try {
      // Créer une notification en base pour le rappel
      await NotificationService.createNotification(
        profileId,
        type,
        title,
        message,
        {
          ...data,
          scheduledTime,
          isReminder: true
        }
      )

      // Programmer la notification push
      const delay = scheduledTime - Date.now()
      if (delay > 0) {
        setTimeout(async () => {
          await this.sendLocalNotification({
            title,
            body: message,
            data: {
              profileId,
              type,
              ...data
            }
          })
        }, delay)
      }

      console.log(`⏰ Rappel programmé: ${title} à ${new Date(scheduledTime).toLocaleString()}`)
    } catch (error) {
      console.error('Erreur lors de la programmation du rappel:', error)
      throw error
    }
  }

  /**
   * Programme des rappels de quiz
   * @param {number} profileId - ID du profil
   * @param {Object} quizData - Données du quiz
   */
  async scheduleQuizReminders(profileId, quizData) {
    const { lessonTitle, scheduledTime, reminderIntervals = [1, 24] } = quizData

    for (const interval of reminderIntervals) {
      const reminderTime = scheduledTime - (interval * 60 * 60 * 1000) // Heures en millisecondes
      
      if (reminderTime > Date.now()) {
        await this.scheduleReminder({
          profileId,
          type: this.notificationTypes.QUIZ_REMINDER,
          title: 'Rappel de Quiz',
          message: `N'oubliez pas votre quiz "${lessonTitle}" dans ${interval}h !`,
          scheduledTime: reminderTime,
          data: {
            lessonTitle,
            interval
          }
        })
      }
    }
  }

  /**
   * Envoie une notification d'achievement
   * @param {number} profileId - ID du profil
   * @param {Object} achievementData - Données de l'achievement
   */
  async sendAchievementNotification(profileId, achievementData) {
    const { title, description, badge, level } = achievementData

    try {
      // Créer la notification en base
      await NotificationService.createNotification(
        profileId,
        this.notificationTypes.ACHIEVEMENT,
        title,
        description,
        {
          badge,
          level,
          achievement: true
        }
      )

      // Envoyer la notification push
      await this.sendLocalNotification({
        title: '🏆 Nouveau Badge !',
        body: `${title} - ${description}`,
        data: {
          profileId,
          type: this.notificationTypes.ACHIEVEMENT,
          badge,
          level
        }
      })

      console.log(`🏆 Notification d'achievement envoyée: ${title}`)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification d\'achievement:', error)
      throw error
    }
  }

  /**
   * Envoie une notification de progression
   * @param {number} profileId - ID du profil
   * @param {Object} progressData - Données de progression
   */
  async sendProgressNotification(profileId, progressData) {
    const { milestone, percentage, subject, message } = progressData

    try {
      await NotificationService.createNotification(
        profileId,
        this.notificationTypes.PROGRESS_UPDATE,
        'Progression mise à jour',
        message || `Félicitations ! Vous avez atteint ${percentage}% en ${subject}`,
        {
          milestone,
          percentage,
          subject
        }
      )

      await this.sendLocalNotification({
        title: '📈 Progression',
        body: message || `Félicitations ! Vous avez atteint ${percentage}% en ${subject}`,
        data: {
          profileId,
          type: this.notificationTypes.PROGRESS_UPDATE,
          milestone,
          percentage,
          subject
        }
      })

      console.log(`📈 Notification de progression envoyée: ${percentage}%`)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de progression:', error)
      throw error
    }
  }

  /**
   * Gère les clics sur les notifications
   * @param {NotificationEvent} event - Événement de clic
   */
  handleNotificationClick(event) {
    const { action, notification } = event
    const data = notification.data

    // Fermer la notification
    notification.close()

    switch (action) {
      case 'open':
        // Ouvrir l'application ou une page spécifique
        this.openApplication(data)
        break
      case 'dismiss':
        // Marquer comme lue
        this.markNotificationAsRead(data)
        break
      default:
        // Action par défaut
        this.openApplication(data)
    }
  }

  /**
   * Ouvre l'application ou une page spécifique
   * @param {Object} data - Données de la notification
   */
  openApplication(data) {
    const { type, profileId, lessonId } = data
    let url = '/'

    // Déterminer l'URL en fonction du type de notification
    switch (type) {
      case this.notificationTypes.QUIZ_REMINDER:
        url = `/quiz/${lessonId}?profile=${profileId}`
        break
      case this.notificationTypes.ACHIEVEMENT:
        url = `/profile/${profileId}?tab=achievements`
        break
      case this.notificationTypes.PROGRESS_UPDATE:
        url = `/profile/${profileId}?tab=progress`
        break
      default:
        url = `/?profile=${profileId}`
    }

    // Ouvrir ou focuser l'application
    if (window.clients) {
      window.clients.openWindow(url)
    } else {
      window.location.href = url
    }
  }

  /**
   * Marque une notification comme lue
   * @param {Object} data - Données de la notification
   */
  async markNotificationAsRead(data) {
    try {
      if (data.notificationId) {
        await NotificationService.markAsRead(data.notificationId)
      }
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error)
    }
  }

  /**
   * Convertit une clé VAPID en Uint8Array
   * @param {string} base64String - Clé en base64
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Obtient les statistiques du service
   */
  getStats() {
    return {
      isSupported: this.isSupported,
      isSubscribed: this.subscription !== null,
      hasPermission: Notification.permission === 'granted',
      permission: Notification.permission,
      serverUrl: this.serverUrl
    }
  }
}

// Instance singleton
const pushNotificationService = new PushNotificationService()

export default pushNotificationService
export { PushNotificationService }
