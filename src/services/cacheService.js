/**
 * Service de cache intelligent avec TTL (Time To Live)
 * Gestion du cache en mémoire et localStorage avec stratégies avancées
 */

class CacheService {
  constructor() {
    this.memoryCache = new Map()
    this.storageKey = 'teachdigital_cache'
    this.maxMemorySize = 50 // Nombre maximum d'éléments en mémoire
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes par défaut
    this.cleanupInterval = 60 * 1000 // Nettoyage toutes les minutes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    }

    // Démarrer le nettoyage automatique
    this.startCleanup()
    
    // Charger le cache depuis localStorage au démarrage
    this.loadFromStorage()
  }

  /**
   * Définit une valeur dans le cache
   * @param {string} key - Clé du cache
   * @param {any} value - Valeur à mettre en cache
   * @param {Object} options - Options de cache
   */
  set(key, value, options = {}) {
    const {
      ttl = this.defaultTTL,
      persistent = false,
      tags = [],
      priority = 'normal' // 'low', 'normal', 'high'
    } = options

    const cacheEntry = {
      value,
      timestamp: Date.now(),
      ttl,
      persistent,
      tags,
      priority,
      accessCount: 0,
      lastAccess: Date.now()
    }

    // Mettre en cache mémoire
    this.memoryCache.set(key, cacheEntry)
    this.stats.sets++

    // Mettre en cache persistant si demandé
    if (persistent) {
      this.setPersistent(key, cacheEntry)
    }

    // Nettoyer si nécessaire
    this.cleanupIfNeeded()

    return true
  }

  /**
   * Récupère une valeur du cache
   * @param {string} key - Clé du cache
   * @param {any} defaultValue - Valeur par défaut si non trouvée
   * @returns {any} - Valeur mise en cache ou valeur par défaut
   */
  get(key, defaultValue = null) {
    // Vérifier d'abord le cache mémoire
    let entry = this.memoryCache.get(key)
    
    if (!entry && this.isPersistentKey(key)) {
      // Essayer de charger depuis le cache persistant
      entry = this.getPersistent(key)
      if (entry) {
        this.memoryCache.set(key, entry)
      }
    }

    if (!entry) {
      this.stats.misses++
      return defaultValue
    }

    // Vérifier si l'entrée a expiré
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.misses++
      return defaultValue
    }

    // Mettre à jour les statistiques d'accès
    entry.accessCount++
    entry.lastAccess = Date.now()
    this.stats.hits++

    return entry.value
  }

  /**
   * Vérifie si une clé existe dans le cache
   * @param {string} key - Clé à vérifier
   * @returns {boolean} - True si la clé existe et n'est pas expirée
   */
  has(key) {
    const entry = this.memoryCache.get(key)
    if (!entry) return false
    return !this.isExpired(entry)
  }

  /**
   * Supprime une entrée du cache
   * @param {string} key - Clé à supprimer
   * @returns {boolean} - True si supprimée avec succès
   */
  delete(key) {
    const deleted = this.memoryCache.delete(key)
    if (deleted) {
      this.stats.deletes++
    }
    
    // Supprimer aussi du cache persistant
    this.deletePersistent(key)
    
    return deleted
  }

  /**
   * Vide tout le cache
   * @param {boolean} includePersistent - Inclure le cache persistant
   */
  clear(includePersistent = false) {
    this.memoryCache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0
    }

    if (includePersistent) {
      localStorage.removeItem(this.storageKey)
    }
  }

  /**
   * Supprime les entrées par tags
   * @param {string|Array} tags - Tags à supprimer
   */
  deleteByTags(tags) {
    const tagsArray = Array.isArray(tags) ? tags : [tags]
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags && entry.tags.some(tag => tagsArray.includes(tag))) {
        this.delete(key)
      }
    }
  }

  /**
   * Met à jour le TTL d'une entrée
   * @param {string} key - Clé à mettre à jour
   * @param {number} ttl - Nouveau TTL en millisecondes
   */
  updateTTL(key, ttl) {
    const entry = this.memoryCache.get(key)
    if (entry) {
      entry.ttl = ttl
      entry.timestamp = Date.now()
    }
  }

  /**
   * Récupère plusieurs valeurs en une fois
   * @param {Array} keys - Clés à récupérer
   * @returns {Object} - Objet avec les clés et valeurs
   */
  getMany(keys) {
    const result = {}
    for (const key of keys) {
      result[key] = this.get(key)
    }
    return result
  }

  /**
   * Définit plusieurs valeurs en une fois
   * @param {Object} entries - Objet avec clés et valeurs
   * @param {Object} options - Options pour toutes les entrées
   */
  setMany(entries, options = {}) {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, options)
    }
  }

  /**
   * Vérifie si une entrée a expiré
   * @param {Object} entry - Entrée du cache
   * @returns {boolean} - True si expirée
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup() {
    let cleaned = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key)
        this.deletePersistent(key)
        cleaned++
      }
    }

    this.stats.cleanups++
    
    if (cleaned > 0) {
      console.log(`🧹 Cache nettoyé: ${cleaned} entrées expirées supprimées`)
    }

    return cleaned
  }

  /**
   * Nettoie si nécessaire (basé sur la taille)
   */
  cleanupIfNeeded() {
    if (this.memoryCache.size > this.maxMemorySize) {
      this.evictLeastUsed()
    }
  }

  /**
   * Supprime les entrées les moins utilisées (LRU)
   */
  evictLeastUsed() {
    const entries = Array.from(this.memoryCache.entries())
    
    // Trier par priorité puis par dernière utilisation
    entries.sort((a, b) => {
      const priorityOrder = { low: 0, normal: 1, high: 2 }
      const priorityDiff = priorityOrder[b[1].priority] - priorityOrder[a[1].priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      return a[1].lastAccess - b[1].lastAccess
    })

    // Supprimer les 25% les moins utilisées
    const toRemove = Math.ceil(entries.length * 0.25)
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i][0])
    }

    console.log(`🗑️ Cache: ${toRemove} entrées supprimées (LRU)`)
  }

  /**
   * Démarre le nettoyage automatique
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  /**
   * Sauvegarde le cache persistant
   */
  saveToStorage() {
    try {
      const persistentEntries = {}
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.persistent && !this.isExpired(entry)) {
          persistentEntries[key] = entry
        }
      }

      localStorage.setItem(this.storageKey, JSON.stringify(persistentEntries))
    } catch (error) {
      console.warn('Impossible de sauvegarder le cache:', error)
    }
  }

  /**
   * Charge le cache depuis localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const persistentEntries = JSON.parse(stored)
        
        for (const [key, entry] of Object.entries(persistentEntries)) {
          if (!this.isExpired(entry)) {
            this.memoryCache.set(key, entry)
          }
        }

        console.log(`📦 Cache chargé: ${Object.keys(persistentEntries).length} entrées persistantes`)
      }
    } catch (error) {
      console.warn('Impossible de charger le cache:', error)
    }
  }

  /**
   * Gestion du cache persistant
   */
  setPersistent(key, entry) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const persistentEntries = stored ? JSON.parse(stored) : {}
      persistentEntries[key] = entry
      localStorage.setItem(this.storageKey, JSON.stringify(persistentEntries))
    } catch (error) {
      console.warn('Impossible de sauvegarder en cache persistant:', error)
    }
  }

  getPersistent(key) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const persistentEntries = JSON.parse(stored)
        return persistentEntries[key]
      }
    } catch (error) {
      console.warn('Impossible de charger depuis le cache persistant:', error)
    }
    return null
  }

  deletePersistent(key) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const persistentEntries = JSON.parse(stored)
        delete persistentEntries[key]
        localStorage.setItem(this.storageKey, JSON.stringify(persistentEntries))
      }
    } catch (error) {
      console.warn('Impossible de supprimer du cache persistant:', error)
    }
  }

  isPersistentKey(key) {
    const entry = this.memoryCache.get(key)
    return entry && entry.persistent
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
      : 0

    return {
      ...this.stats,
      hitRate,
      size: this.memoryCache.size,
      maxSize: this.maxMemorySize,
      memoryUsage: this.getMemoryUsage()
    }
  }

  /**
   * Estimation de l'utilisation mémoire
   */
  getMemoryUsage() {
    let totalSize = 0
    
    for (const [key, entry] of this.memoryCache.entries()) {
      totalSize += key.length * 2 // UTF-16
      totalSize += JSON.stringify(entry).length * 2
    }

    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024 * 100) / 100,
      mb: Math.round(totalSize / 1024 / 1024 * 100) / 100
    }
  }

  /**
   * Méthodes utilitaires pour les cas d'usage courants
   */

  /**
   * Cache avec fonction de fallback
   * @param {string} key - Clé du cache
   * @param {Function} fetchFn - Fonction pour récupérer la donnée
   * @param {Object} options - Options de cache
   */
  async getOrSet(key, fetchFn, options = {}) {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    try {
      const value = await fetchFn()
      this.set(key, value, options)
      return value
    } catch (error) {
      console.error(`Erreur lors de la récupération de ${key}:`, error)
      throw error
    }
  }

  /**
   * Cache avec invalidation automatique
   * @param {string} key - Clé du cache
   * @param {Function} fetchFn - Fonction pour récupérer la donnée
   * @param {number} ttl - TTL en millisecondes
   */
  async getOrFetch(key, fetchFn, ttl = this.defaultTTL) {
    return this.getOrSet(key, fetchFn, { ttl, persistent: false })
  }

  /**
   * Cache persistant pour les données importantes
   * @param {string} key - Clé du cache
   * @param {Function} fetchFn - Fonction pour récupérer la donnée
   * @param {number} ttl - TTL en millisecondes
   */
  async getOrFetchPersistent(key, fetchFn, ttl = this.defaultTTL) {
    return this.getOrSet(key, fetchFn, { ttl, persistent: true })
  }

  /**
   * Cache avec tags pour invalidation groupée
   * @param {string} key - Clé du cache
   * @param {Function} fetchFn - Fonction pour récupérer la donnée
   * @param {Array} tags - Tags pour l'invalidation
   * @param {Object} options - Options de cache
   */
  async getOrFetchWithTags(key, fetchFn, tags = [], options = {}) {
    return this.getOrSet(key, fetchFn, { ...options, tags })
  }
}

// Instance singleton
const cacheService = new CacheService()

// Sauvegarder le cache avant de quitter la page
window.addEventListener('beforeunload', () => {
  cacheService.saveToStorage()
})

// Sauvegarder périodiquement
setInterval(() => {
  cacheService.saveToStorage()
}, 30 * 1000) // Toutes les 30 secondes

export default cacheService
export { CacheService }