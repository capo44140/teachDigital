/**
 * Service de gestion des données offline-first
 * Gère le cache et la synchronisation des données critiques
 */

import cacheService from './cacheService.js'
import { ProfileService } from './profile/profileService.js'
import { LessonService } from './lessonService.js'
import { NotificationService } from './notificationService.js'

class OfflineDataService {
  constructor() {
    this.cachePrefix = 'offline_'
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
   * Cache les données critiques pour le mode offline
   * @param {string} dataType - Type de données (profiles, lessons, notifications)
   * @param {Array|Object} data - Données à mettre en cache
   * @param {Object} options - Options de cache
   */
  async cacheCriticalData(dataType, data, options = {}) {
    const {
      ttl = 24 * 60 * 60 * 1000, // 24 heures par défaut
      priority = 'high',
      tags = ['critical', 'offline']
    } = options

    const cacheKey = `${this.cachePrefix}${dataType}`
    
    try {
      await cacheService.set(cacheKey, data, {
        ttl,
        persistent: true,
        priority,
        tags
      })

      // Mettre à jour le timestamp de dernière synchronisation
      await cacheService.set(`${cacheKey}_last_sync`, Date.now(), {
        ttl: ttl * 2,
        persistent: true,
        priority: 'normal'
      })

      console.log(`📦 Données critiques mises en cache: ${dataType}`)
    } catch (error) {
      console.error(`Erreur lors de la mise en cache de ${dataType}:`, error)
    }
  }

  /**
   * Récupère les données critiques depuis le cache avec stratégie stale-while-revalidate
   * @param {string} dataType - Type de données
   * @param {Function} fetchFn - Fonction de récupération en ligne
   * @param {Object} options - Options
   */
  async getCriticalData(dataType, fetchFn, options = {}) {
    const cacheKey = `${this.cachePrefix}${dataType}`
    const lastSyncKey = `${cacheKey}_last_sync`
    const { staleWhileRevalidate = true } = options
    
    // Essayer de récupérer depuis le cache
    const cachedData = cacheService.get(cacheKey)
    const lastSync = cacheService.get(lastSyncKey, 0)
    const isFresh = cachedData && this.isDataFresh(lastSync, options.maxAge)
    
    // Stratégie stale-while-revalidate :
    // Retourner immédiatement les données en cache et revalider en arrière-plan
    if (cachedData && staleWhileRevalidate && this.isOnline && fetchFn) {
      console.log(`📱 Stale-while-revalidate: retour immédiat du cache pour ${dataType}`)
      
      // Si les données sont fraîches, les retourner immédiatement
      if (isFresh) {
        return cachedData
      }
      
      // Si les données sont périmées, les retourner quand même mais revalider en arrière-plan
      console.log(`🔄 Revalidation en arrière-plan pour ${dataType}`)
      this.revalidateInBackground(dataType, fetchFn, options)
      
      return cachedData
    }
    
    // Si pas de cache ou stratégie désactivée, comportement classique
    if (isFresh && cachedData) {
      console.log(`📱 Données fraîches récupérées depuis le cache: ${dataType}`)
      return cachedData
    }

    // Si en ligne, essayer de récupérer les données fraîches
    if (this.isOnline && fetchFn) {
      try {
        console.log(`🌐 Récupération des données en ligne: ${dataType}`)
        const freshData = await fetchFn()
        
        // Mettre en cache les nouvelles données
        await this.cacheCriticalData(dataType, freshData, options)
        
        return freshData
      } catch (error) {
        console.warn(`Erreur lors de la récupération en ligne de ${dataType}:`, error)
        
        // Retourner les données en cache si disponibles
        if (cachedData) {
          console.log(`📱 Fallback sur les données en cache: ${dataType}`)
          return cachedData
        }
        
        throw error
      }
    }

    // Mode offline ou erreur - retourner les données en cache
    if (cachedData) {
      console.log(`📱 Mode offline - données depuis le cache: ${dataType}`)
      return cachedData
    }

    throw new Error(`Aucune donnée disponible pour ${dataType} en mode offline`)
  }

  /**
   * Revalide les données en arrière-plan sans bloquer
   * @param {string} dataType - Type de données
   * @param {Function} fetchFn - Fonction de récupération
   * @param {Object} options - Options
   */
  revalidateInBackground(dataType, fetchFn, options = {}) {
    // Utiliser setTimeout pour ne pas bloquer le thread principal
    setTimeout(async () => {
      try {
        console.log(`🔄 Début de revalidation pour ${dataType}`)
        const freshData = await fetchFn()
        await this.cacheCriticalData(dataType, freshData, options)
        console.log(`✅ Revalidation terminée pour ${dataType}`)
        
        // Émettre un événement pour notifier de la mise à jour
        window.dispatchEvent(new CustomEvent('data-revalidated', {
          detail: { dataType, data: freshData }
        }))
      } catch (error) {
        console.warn(`⚠️ Échec de revalidation pour ${dataType}:`, error)
      }
    }, 100) // Délai court pour éviter de bloquer
  }

  /**
   * Vérifie si les données sont fraîches
   * @param {number} lastSync - Timestamp de dernière synchronisation
   * @param {number} maxAge - Âge maximum en millisecondes
   */
  isDataFresh(lastSync, maxAge = 60 * 60 * 1000) { // 1 heure par défaut
    return Date.now() - lastSync < maxAge
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
   */
  async preloadProfiles() {
    try {
      const profiles = await this.getCriticalData(
        'profiles',
        () => ProfileService.getAllProfiles(),
        { maxAge: 30 * 60 * 1000 } // 30 minutes
      )
      
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
      const lessons = await this.getCriticalData(
        'lessons',
        () => LessonService.getAllAvailableLessons(),
        { maxAge: 60 * 60 * 1000 } // 1 heure
      )
      
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
      // Récupérer les notifications pour tous les profils actifs
      const profiles = cacheService.get(`${this.cachePrefix}profiles`, [])
      
      if (profiles.length === 0) {
        console.log('🔔 Aucun profil trouvé pour précharger les notifications')
        return []
      }
      
      const notificationPromises = profiles.map(profile => 
        this.getCriticalData(
          `notifications_${profile.id}`,
          () => NotificationService.getNotifications(profile.id),
          { maxAge: 5 * 60 * 1000 } // 5 minutes
        )
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

    // Nettoyer le cache des données synchronisées
    if (successfulSyncs.length > 0) {
      await this.invalidateCacheForSyncs(successfulSyncs)
    }

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
   * Invalide le cache pour les actions synchronisées
   * @param {Array} syncs - Actions synchronisées
   */
  async invalidateCacheForSyncs(syncs) {
    const tagsToInvalidate = new Set()

    for (const sync of syncs) {
      switch (sync.action) {
        case 'create_profile':
        case 'update_profile':
          tagsToInvalidate.add('profiles')
          break
        case 'create_lesson':
        case 'save_quiz_result':
          tagsToInvalidate.add('lessons')
          break
        case 'create_notification':
          tagsToInvalidate.add('notifications')
          break
      }
    }

    // Invalider les caches concernés
    for (const tag of tagsToInvalidate) {
      cacheService.deleteByTags([tag])
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
      syncInProgress: this.syncInProgress,
      cacheStats: cacheService.getStats()
    }
  }

  /**
   * Force la synchronisation de toutes les données
   */
  async forceSync() {
    console.log('🔄 Synchronisation forcée des données...')
    
    // Vider le cache pour forcer le rechargement
    cacheService.deleteByTags(['critical'])
    
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
