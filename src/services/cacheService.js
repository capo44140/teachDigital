/**
 * Service de cache intelligent avec TTL et invalidation
 * Améliore les performances en évitant les requêtes répétitives
 */

export class CacheService {
  constructor() {
    this.cache = new Map()
    this.timers = new Map()
    this.maxSize = 1000 // Taille maximale du cache
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes par défaut
  }

  /**
   * Stocke une valeur dans le cache avec TTL
   * @param {string} key - Clé de cache
   * @param {any} value - Valeur à stocker
   * @param {number} ttl - Durée de vie en millisecondes (optionnel)
   * @returns {boolean} True si stocké avec succès
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      // Nettoyer l'ancien timer s'il existe
      this.clearTimer(key)

      // Vérifier la taille du cache
      if (this.cache.size >= this.maxSize) {
        this.evictOldest()
      }

      // Stocker la valeur avec métadonnées
      const cacheEntry = {
        value: this.serialize(value),
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccess: Date.now()
      }

      this.cache.set(key, cacheEntry)

      // Programmer la suppression automatique
      const timer = setTimeout(() => {
        this.delete(key)
      }, ttl)

      this.timers.set(key, timer)

      return true
    } catch (error) {
      console.warn('Erreur lors du stockage en cache:', error)
      return false
    }
  }

  /**
   * Récupère une valeur du cache
   * @param {string} key - Clé de cache
   * @returns {any|null} Valeur ou null si non trouvée/expirée
   */
  get(key) {
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        return null
      }

      // Vérifier si l'entrée a expiré
      const now = Date.now()
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key)
        return null
      }

      // Mettre à jour les statistiques d'accès
      entry.accessCount++
      entry.lastAccess = now

      return this.deserialize(entry.value)
    } catch (error) {
      console.warn('Erreur lors de la récupération du cache:', error)
      return null
    }
  }

  /**
   * Vérifie si une clé existe dans le cache
   * @param {string} key - Clé à vérifier
   * @returns {boolean} True si la clé existe et n'est pas expirée
   */
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Supprime une entrée du cache
   * @param {string} key - Clé à supprimer
   * @returns {boolean} True si supprimée
   */
  delete(key) {
    this.clearTimer(key)
    return this.cache.delete(key)
  }

  /**
   * Vide complètement le cache
   */
  clear() {
    // Nettoyer tous les timers
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    
    // Vider le cache
    this.cache.clear()
  }

  /**
   * Récupère plusieurs valeurs en une fois
   * @param {string[]} keys - Clés à récupérer
   * @returns {Object} Objet avec les clés et valeurs trouvées
   */
  mget(keys) {
    const result = {}
    keys.forEach(key => {
      const value = this.get(key)
      if (value !== null) {
        result[key] = value
      }
    })
    return result
  }

  /**
   * Stocke plusieurs valeurs en une fois
   * @param {Object} entries - Objet clé-valeur à stocker
   * @param {number} ttl - TTL pour toutes les entrées
   * @returns {boolean} True si toutes stockées avec succès
   */
  mset(entries, ttl = this.defaultTTL) {
    try {
      Object.entries(entries).forEach(([key, value]) => {
        this.set(key, value, ttl)
      })
      return true
    } catch (error) {
      console.warn('Erreur lors du stockage multiple:', error)
      return false
    }
  }

  /**
   * Prolonge la durée de vie d'une entrée
   * @param {string} key - Clé à prolonger
   * @param {number} additionalTTL - TTL additionnel en millisecondes
   * @returns {boolean} True si prolongée
   */
  extend(key, additionalTTL) {
    const entry = this.cache.get(key)
    if (!entry) return false

    entry.ttl += additionalTTL
    this.clearTimer(key)

    const timer = setTimeout(() => {
      this.delete(key)
    }, entry.ttl)

    this.timers.set(key, timer)
    return true
  }

  /**
   * Récupère les statistiques du cache
   * @returns {Object} Statistiques du cache
   */
  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      averageAge: this.calculateAverageAge(entries, now),
      memoryUsage: this.estimateMemoryUsage(),
      expiredEntries: this.countExpiredEntries(entries, now)
    }
  }

  /**
   * Nettoie les entrées expirées
   * @returns {number} Nombre d'entrées nettoyées
   */
  cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Supprime les entrées les moins utilisées
   */
  evictOldest() {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess)
    
    // Supprimer les 10% les plus anciens
    const toRemove = Math.ceil(entries.length * 0.1)
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i][0])
    }
  }

  /**
   * Sériealise une valeur pour le stockage
   * @param {any} value - Valeur à sérialiser
   * @returns {string} Valeur sérialisée
   */
  serialize(value) {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.warn('Erreur de sérialisation:', error)
      return String(value)
    }
  }

  /**
   * Désérialise une valeur stockée
   * @param {string} serializedValue - Valeur sérialisée
   * @returns {any} Valeur désérialisée
   */
  deserialize(serializedValue) {
    try {
      return JSON.parse(serializedValue)
    } catch (error) {
      console.warn('Erreur de désérialisation:', error)
      return serializedValue
    }
  }

  /**
   * Nettoie le timer d'une clé
   * @param {string} key - Clé dont nettoyer le timer
   */
  clearTimer(key) {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /**
   * Calcule le taux de succès du cache
   * @returns {number} Taux de succès (0-1)
   */
  calculateHitRate() {
    const entries = Array.from(this.cache.values())
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0)
    return totalAccess > 0 ? entries.length / totalAccess : 0
  }

  /**
   * Calcule l'âge moyen des entrées
   * @param {Array} entries - Entrées du cache
   * @param {number} now - Timestamp actuel
   * @returns {number} Âge moyen en millisecondes
   */
  calculateAverageAge(entries, now) {
    if (entries.length === 0) return 0
    const totalAge = entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0)
    return totalAge / entries.length
  }

  /**
   * Estime l'utilisation mémoire
   * @returns {number} Estimation en bytes
   */
  estimateMemoryUsage() {
    let total = 0
    for (const [key, entry] of this.cache.entries()) {
      total += key.length * 2 // Unicode
      total += entry.value.length * 2
      total += 100 // Métadonnées approximatives
    }
    return total
  }

  /**
   * Compte les entrées expirées
   * @param {Array} entries - Entrées du cache
   * @param {number} now - Timestamp actuel
   * @returns {number} Nombre d'entrées expirées
   */
  countExpiredEntries(entries, now) {
    return entries.filter(entry => now - entry.timestamp > entry.ttl).length
  }
}

// Instance singleton
export const cacheService = new CacheService()

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  cacheService.cleanup()
}, 5 * 60 * 1000)

export default cacheService
