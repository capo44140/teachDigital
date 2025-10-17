/**
 * Service d'API avec cache intelligent intégré
 * Wrapper autour des services existants avec mise en cache automatique
 */

import cacheService from './cacheService.js'

class CachedApiService {
  constructor() {
    this.cachePrefix = 'api_'
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes
    this.longTTL = 30 * 60 * 1000 // 30 minutes pour les données stables
    this.shortTTL = 1 * 60 * 1000 // 1 minute pour les données dynamiques
  }

  /**
   * Génère une clé de cache pour une requête API
   * @param {string} endpoint - Endpoint de l'API
   * @param {Object} params - Paramètres de la requête
   * @returns {string} - Clé de cache
   */
  generateCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {})
    
    return `${this.cachePrefix}${endpoint}_${JSON.stringify(sortedParams)}`
  }

  /**
   * Récupère des données avec cache
   * @param {string} endpoint - Endpoint de l'API
   * @param {Function} fetchFn - Fonction pour récupérer les données
   * @param {Object} options - Options de cache
   * @returns {Promise<any>} - Données mises en cache ou récupérées
   */
  async get(endpoint, fetchFn, options = {}) {
    const {
      ttl = this.defaultTTL,
      params = {},
      tags = [],
      persistent = false,
      priority = 'normal'
    } = options

    const cacheKey = this.generateCacheKey(endpoint, params)

    return cacheService.getOrSet(
      cacheKey,
      fetchFn,
      {
        ttl,
        persistent,
        tags: [...tags, 'api'],
        priority
      }
    )
  }

  /**
   * Récupère des profils avec cache
   * @param {Function} profileService - Service de profils
   * @param {Object} options - Options de cache
   * @returns {Promise<Array>} - Liste des profils
   */
  async getProfiles(profileService, options = {}) {
    return this.get(
      'profiles',
      () => profileService.getAllProfiles(),
      {
        ttl: this.longTTL,
        tags: ['profiles'],
        persistent: true,
        priority: 'high',
        ...options
      }
    )
  }

  /**
   * Récupère un profil par ID avec cache
   * @param {Function} profileService - Service de profils
   * @param {string|number} profileId - ID du profil
   * @param {Object} options - Options de cache
   * @returns {Promise<Object>} - Profil
   */
  async getProfileById(profileService, profileId, options = {}) {
    return this.get(
      `profile_${profileId}`,
      () => profileService.getProfileById(profileId),
      {
        ttl: this.longTTL,
        tags: ['profiles', `profile_${profileId}`],
        persistent: true,
        priority: 'high',
        ...options
      }
    )
  }

  /**
   * Récupère les statistiques de profils avec cache
   * @param {Function} profileService - Service de profils
   * @param {Object} options - Options de cache
   * @returns {Promise<Object>} - Statistiques
   */
  async getProfileStats(profileService, options = {}) {
    return this.get(
      'profile_stats',
      () => profileService.getProfileStats(),
      {
        ttl: this.shortTTL,
        tags: ['profiles', 'stats'],
        priority: 'normal',
        ...options
      }
    )
  }

  /**
   * Récupère les leçons avec cache
   * @param {Function} lessonService - Service de leçons
   * @param {Object} options - Options de cache
   * @returns {Promise<Array>} - Liste des leçons
   */
  async getLessons(lessonService, options = {}) {
    return this.get(
      'lessons',
      () => lessonService.getAllLessons(),
      {
        ttl: this.longTTL,
        tags: ['lessons'],
        persistent: true,
        priority: 'normal',
        ...options
      }
    )
  }

  /**
   * Récupère les vidéos YouTube avec cache
   * @param {Function} youtubeService - Service YouTube
   * @param {Object} options - Options de cache
   * @returns {Promise<Array>} - Liste des vidéos
   */
  async getYouTubeVideos(youtubeService, options = {}) {
    return this.get(
      'youtube_videos',
      () => youtubeService.getVideos(),
      {
        ttl: this.longTTL,
        tags: ['youtube', 'videos'],
        persistent: true,
        priority: 'normal',
        ...options
      }
    )
  }

  /**
   * Récupère les notifications avec cache
   * @param {Function} notificationService - Service de notifications
   * @param {Object} options - Options de cache
   * @returns {Promise<Array>} - Liste des notifications
   */
  async getNotifications(notificationService, options = {}) {
    return this.get(
      'notifications',
      () => notificationService.getNotifications(),
      {
        ttl: this.shortTTL,
        tags: ['notifications'],
        priority: 'high',
        ...options
      }
    )
  }

  /**
   * Récupère les logs d'audit avec cache
   * @param {Function} auditService - Service d'audit
   * @param {Object} filters - Filtres pour les logs
   * @param {Object} options - Options de cache
   * @returns {Promise<Array>} - Liste des logs
   */
  async getAuditLogs(auditService, filters = {}, options = {}) {
    return this.get(
      'audit_logs',
      () => auditService.getLogs(filters),
      {
        ttl: this.shortTTL,
        params: filters,
        tags: ['audit', 'logs'],
        priority: 'normal',
        ...options
      }
    )
  }

  /**
   * Invalide le cache pour un type de données
   * @param {string|Array} tags - Tags à invalider
   */
  invalidate(tags) {
    const tagsArray = Array.isArray(tags) ? tags : [tags]
    cacheService.deleteByTags(tagsArray)
    console.log(`🗑️ Cache invalidé pour les tags: ${tagsArray.join(', ')}`)
  }

  /**
   * Invalide le cache des profils
   */
  invalidateProfiles() {
    this.invalidate(['profiles'])
  }

  /**
   * Invalide le cache des leçons
   */
  invalidateLessons() {
    this.invalidate(['lessons'])
  }

  /**
   * Invalide le cache YouTube
   */
  invalidateYouTube() {
    this.invalidate(['youtube'])
  }

  /**
   * Invalide le cache des notifications
   */
  invalidateNotifications() {
    this.invalidate(['notifications'])
  }

  /**
   * Invalide le cache d'audit
   */
  invalidateAudit() {
    this.invalidate(['audit'])
  }

  /**
   * Invalide tout le cache API
   */
  invalidateAll() {
    this.invalidate(['api'])
  }

  /**
   * Met à jour une entrée en cache après modification
   * @param {string} endpoint - Endpoint modifié
   * @param {any} newData - Nouvelles données
   * @param {Object} options - Options de cache
   */
  updateCache(endpoint, newData, options = {}) {
    const cacheKey = this.generateCacheKey(endpoint)
    cacheService.set(cacheKey, newData, {
      ttl: this.defaultTTL,
      tags: ['api'],
      ...options
    })
  }

  /**
   * Précharge des données importantes
   * @param {Object} services - Services disponibles
   */
  async preloadCriticalData(services = {}) {
    const preloadPromises = []

    // Précharger les profils si le service est disponible
    if (services.profileService) {
      preloadPromises.push(
        this.getProfiles(services.profileService).catch(console.error)
      )
    }

    // Précharger les notifications si le service est disponible
    if (services.notificationService) {
      preloadPromises.push(
        this.getNotifications(services.notificationService).catch(console.error)
      )
    }

    try {
      await Promise.allSettled(preloadPromises)
      console.log('📦 Données critiques préchargées')
    } catch (error) {
      console.error('Erreur lors du préchargement:', error)
    }
  }

  /**
   * Récupère les statistiques du cache
   * @returns {Object} - Statistiques du cache
   */
  getCacheStats() {
    return cacheService.getStats()
  }

  /**
   * Nettoie le cache expiré
   * @returns {number} - Nombre d'entrées nettoyées
   */
  cleanupCache() {
    return cacheService.cleanup()
  }

  /**
   * Configure les TTL par défaut
   * @param {Object} ttlConfig - Configuration des TTL
   */
  configureTTL(ttlConfig) {
    if (ttlConfig.default) this.defaultTTL = ttlConfig.default
    if (ttlConfig.long) this.longTTL = ttlConfig.long
    if (ttlConfig.short) this.shortTTL = ttlConfig.short
  }

  /**
   * Méthode utilitaire pour les requêtes avec retry
   * @param {Function} fetchFn - Fonction à exécuter
   * @param {number} maxRetries - Nombre maximum de tentatives
   * @param {number} delay - Délai entre les tentatives
   * @returns {Promise<any>} - Résultat de la fonction
   */
  async withRetry(fetchFn, maxRetries = 3, delay = 1000) {
    let lastError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetchFn()
      } catch (error) {
        lastError = error
        console.warn(`Tentative ${attempt}/${maxRetries} échouée:`, error.message)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }

    throw lastError
  }

  /**
   * Récupère des données avec retry et cache
   * @param {string} endpoint - Endpoint de l'API
   * @param {Function} fetchFn - Fonction pour récupérer les données
   * @param {Object} options - Options
   * @returns {Promise<any>} - Données
   */
  async getWithRetry(endpoint, fetchFn, options = {}) {
    const { maxRetries = 3, delay = 1000, ...cacheOptions } = options

    return this.get(
      endpoint,
      () => this.withRetry(fetchFn, maxRetries, delay),
      cacheOptions
    )
  }
}

// Instance singleton
const cachedApiService = new CachedApiService()

export default cachedApiService
export { CachedApiService }
