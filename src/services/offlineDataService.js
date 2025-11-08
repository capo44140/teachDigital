/**
 * Service de gestion des données offline-first
 * Gère la synchronisation des données critiques sans cache
 */

import { ProfileService } from './profile/profileService.js'
import { LessonService } from './lessonService.js'
import { NotificationService } from './notificationService.js'

class OfflineDataService {
  constructor() {
    this.syncQueue = []
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    
    // Écouter les changements de connectivité
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Démarrer la synchronisation périodique
    this.startPeriodicSync()
  }

  /**
   * Gestion de la connexion en ligne
   */
  handleOnline() {
    console.log('🌐 Connexion rétablie - Synchronisation des données')
    this.isOnline = true
    this.syncPendingChanges()
  }

  /**
   * Gestion de la déconnexion
   */
  handleOffline() {
    console.log('📴 Mode hors ligne activé')
    this.isOnline = false
  }

  /**
   * Récupère les données critiques (sans cache)
   * @param {string} dataType - Type de données
   * @param {Function} fetchFn - Fonction de récupération en ligne
   * @param {Object} options - Options
   */
  async getCriticalData(dataType, fetchFn, options = {}) {
    // Si en ligne, récupérer directement depuis l'API
    if (this.isOnline && fetchFn) {
      try {
        console.log(`🌐 Récupération des données en ligne: ${dataType}`)
        const freshData = await fetchFn()
        return freshData
      } catch (error) {
        console.warn(`Erreur lors de la récupération en ligne de ${dataType}:`, error)
        throw error
      }
    }

    // Mode offline - essayer de récupérer depuis localStorage
    try {
      const stored = localStorage.getItem(`teachdigital_${dataType}`)
      if (stored) {
        console.log(`📱 Mode offline - données depuis localStorage: ${dataType}`)
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn(`Erreur lors de la récupération depuis localStorage: ${dataType}`, error)
    }

    throw new Error(`Aucune donnée disponible pour ${dataType} en mode offline`)
  }

  /**
   * Sauvegarde les données dans localStorage pour le mode offline
   * @param {string} dataType - Type de données
   * @param {Array|Object} data - Données à sauvegarder
   */
  saveToLocalStorage(dataType, data) {
    try {
      localStorage.setItem(`teachdigital_${dataType}`, JSON.stringify(data))
      console.log(`📦 Données sauvegardées dans localStorage: ${dataType}`)
    } catch (error) {
      console.warn(`Erreur lors de la sauvegarde dans localStorage: ${dataType}`, error)
    }
  }

  /**
   * Précharge les données critiques au démarrage
   */
  async preloadCriticalData() {
    console.log('🚀 Préchargement des données critiques...')
    
    const preloadPromises = [
      this.preloadProfiles(),
      this.preloadLessons(),
      this.preloadNotifications()
    ]

    try {
      const results = await Promise.allSettled(preloadPromises)
      
      // Analyser les résultats
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length
      
      if (failed > 0) {
        console.warn(`⚠️ Préchargement partiel: ${successful} réussis, ${failed} échoués`)
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const serviceNames = ['profiles', 'lessons', 'notifications']
            console.warn(`❌ Échec du préchargement ${serviceNames[index]}:`, result.reason)
          }
        })
      } else {
        console.log('✅ Préchargement des données critiques terminé avec succès')
      }
    } catch (error) {
      console.error('Erreur lors du préchargement:', error)
    }
  }

  /**
   * Précharge les profils
   * Utilise le store pour éviter les appels multiples
   */
  async preloadProfiles() {
    try {
      // Utiliser le store pour bénéficier de la protection contre les appels multiples
      const { useProfileStore } = await import('../stores/profileStore.js')
      const profileStore = useProfileStore()
      
      // Si les profils sont déjà chargés récemment, ne pas recharger
      if (profileStore.profiles.length > 0 && profileStore.lastLoadTime) {
        const timeSinceLastLoad = Date.now() - profileStore.lastLoadTime
        if (timeSinceLastLoad < profileStore.loadCacheTimeout) {
          console.log('✅ Profils déjà chargés, pas besoin de préchargement')
          return profileStore.profiles
        }
      }
      
      // Charger via le store (qui gère les appels multiples)
      const profiles = await profileStore.loadProfiles()
      console.log(`👥 ${profiles.length} profils préchargés`)
      return profiles
    } catch (error) {
      console.error('Erreur lors du préchargement des profils:', error)
      return []
    }
  }

  /**
   * Précharge les leçons
   */
  async preloadLessons() {
    try {
      const lessons = await LessonService.getAllAvailableLessons()
      this.saveToLocalStorage('lessons', lessons)
      console.log(`📚 ${lessons.length} leçons préchargées`)
      return lessons
    } catch (error) {
      console.error('Erreur lors du préchargement des leçons:', error)
      return []
    }
  }

  /**
   * Précharge les notifications
   */
  async preloadNotifications() {
    try {
      // Récupérer les profils depuis localStorage
      const storedProfiles = localStorage.getItem('teachdigital_profiles')
      const profiles = storedProfiles ? JSON.parse(storedProfiles) : []
      
      if (profiles.length === 0) {
        console.log('🔔 Aucun profil trouvé pour précharger les notifications')
        return []
      }
      
      const notificationPromises = profiles.map(profile => 
        NotificationService.getNotifications(profile.id)
      )

      const notifications = await Promise.allSettled(notificationPromises)
      const totalNotifications = notifications
        .filter(result => result.status === 'fulfilled')
        .reduce((total, result) => total + (result.value?.length || 0), 0)
      
      console.log(`🔔 ${totalNotifications} notifications préchargées pour ${profiles.length} profils`)
      return notifications
    } catch (error) {
      console.error('Erreur lors du préchargement des notifications:', error)
      return []
    }
  }

  /**
   * Met en file d'attente une modification pour synchronisation
   * @param {string} action - Action à synchroniser
   * @param {Object} data - Données de l'action
   */
  queueForSync(action, data) {
    const syncItem = {
      id: Date.now() + Math.random(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0
    }

    this.syncQueue.push(syncItem)
    console.log(`📝 Action mise en file d'attente: ${action}`)

    // Sauvegarder la file d'attente
    this.saveSyncQueue()

    // Essayer de synchroniser immédiatement si en ligne
    if (this.isOnline) {
      this.syncPendingChanges()
    }
  }

  /**
   * Synchronise les modifications en attente
   */
  async syncPendingChanges() {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return
    }

    this.syncInProgress = true
    console.log(`🔄 Synchronisation de ${this.syncQueue.length} actions en attente`)

    const itemsToSync = [...this.syncQueue]
    const successfulSyncs = []
    const failedSyncs = []

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item)
        successfulSyncs.push(item)
        console.log(`✅ Synchronisation réussie: ${item.action}`)
      } catch (error) {
        console.error(`❌ Échec de la synchronisation: ${item.action}`, error)
        
        item.retries++
        if (item.retries < 3) {
          failedSyncs.push(item)
        } else {
          console.warn(`🗑️ Abandon de la synchronisation après 3 tentatives: ${item.action}`)
        }
      }
    }

    // Mettre à jour la file d'attente
    this.syncQueue = failedSyncs
    this.saveSyncQueue()

    this.syncInProgress = false
    console.log(`🎯 Synchronisation terminée: ${successfulSyncs.length} réussies, ${failedSyncs.length} en attente`)
  }

  /**
   * Synchronise un élément spécifique
   * @param {Object} item - Élément à synchroniser
   */
  async syncItem(item) {
    const { action, data } = item

    switch (action) {
      case 'create_profile':
        await ProfileService.createProfile(data)
        break
      case 'update_profile':
        await ProfileService.updateProfile(data.id, data)
        break
      case 'create_lesson':
        await LessonService.saveLesson(data.lessonData, data.profileId, data.files)
        break
      case 'save_quiz_result':
        await LessonService.saveQuizResults(data.lessonId, data.profileId, data.results)
        break
      case 'create_notification':
        await NotificationService.createNotification(
          data.profileId,
          data.type,
          data.title,
          data.message,
          data.data
        )
        break
      default:
        throw new Error(`Action de synchronisation non supportée: ${action}`)
    }
  }

  /**
   * Sauvegarde la file d'attente de synchronisation
   */
  saveSyncQueue() {
    try {
      localStorage.setItem('teachdigital_sync_queue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.warn('Impossible de sauvegarder la file d\'attente de synchronisation:', error)
    }
  }

  /**
   * Charge la file d'attente de synchronisation
   */
  loadSyncQueue() {
    try {
      const stored = localStorage.getItem('teachdigital_sync_queue')
      if (stored) {
        this.syncQueue = JSON.parse(stored)
        console.log(`📋 File d'attente chargée: ${this.syncQueue.length} actions`)
      }
    } catch (error) {
      console.warn('Impossible de charger la file d\'attente de synchronisation:', error)
    }
  }

  /**
   * Démarre la synchronisation périodique
   */
  startPeriodicSync() {
    // Charger la file d'attente existante
    this.loadSyncQueue()

    // Synchroniser toutes les 5 minutes si en ligne
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncPendingChanges()
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Obtient les statistiques du service offline
   */
  getStats() {
    return {
      isOnline: this.isOnline,
      syncQueueLength: this.syncQueue.length,
      syncInProgress: this.syncInProgress
    }
  }

  /**
   * Force la synchronisation de toutes les données
   */
  async forceSync() {
    console.log('🔄 Synchronisation forcée des données...')
    
    // Précharger les données fraîches
    await this.preloadCriticalData()
    
    // Synchroniser les modifications en attente
    await this.syncPendingChanges()
    
    console.log('✅ Synchronisation forcée terminée')
  }
}

// Instance singleton
const offlineDataService = new OfflineDataService()

export default offlineDataService
export { OfflineDataService }
