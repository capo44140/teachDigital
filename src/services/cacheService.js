/**
 * Service de cache - Délégation au backend
 * Toute la logique de cache est gérée par le backend
 */

import { apiService } from './apiService.js'

class CacheService {
  /**
   * Définit une valeur dans le cache (via backend)
   */
  async set(key, value, options = {}) {
    try {
      await apiService.request('/api/cache', {
        method: 'POST',
        body: JSON.stringify({ key, value, options })
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la mise en cache:', error)
      return false
    }
  }

  /**
   * Récupère une valeur du cache (via backend)
   */
  async get(key, defaultValue = null) {
    try {
      const response = await apiService.request(`/api/cache/${encodeURIComponent(key)}`)
      return response.data?.value ?? defaultValue
    } catch (error) {
      console.error('Erreur lors de la récupération du cache:', error)
      return defaultValue
    }
  }

  /**
   * Vérifie si une clé existe dans le cache (via backend)
   */
  async has(key) {
    try {
      const response = await apiService.request(`/api/cache/${encodeURIComponent(key)}/exists`)
      return response.data?.exists ?? false
    } catch (error) {
      console.error('Erreur lors de la vérification du cache:', error)
      return false
    }
  }

  /**
   * Supprime une entrée du cache (via backend)
   */
  async delete(key) {
    try {
      await apiService.request(`/api/cache/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du cache:', error)
      return false
    }
  }

  /**
   * Vide tout le cache (via backend)
   */
  async clear(includePersistent = false) {
    try {
      await apiService.request('/api/cache/clear', {
        method: 'POST',
        body: JSON.stringify({ includePersistent })
      })
      return true
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error)
      return false
    }
  }

  /**
   * Supprime les entrées par tags (via backend)
   */
  async deleteByTags(tags) {
    try {
      await apiService.request('/api/cache/tags', {
        method: 'DELETE',
        body: JSON.stringify({ tags: Array.isArray(tags) ? tags : [tags] })
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression par tags:', error)
      return false
    }
  }

  /**
   * Récupère plusieurs valeurs en une fois (via backend)
   */
  async getMany(keys) {
    try {
      const response = await apiService.request('/api/cache/many', {
        method: 'POST',
        body: JSON.stringify({ keys })
      })
      return response.data ?? {}
    } catch (error) {
      console.error('Erreur lors de la récupération multiple:', error)
      return {}
    }
  }

  /**
   * Définit plusieurs valeurs en une fois (via backend)
   */
  async setMany(entries, options = {}) {
    try {
      await apiService.request('/api/cache/many', {
        method: 'POST',
        body: JSON.stringify({ entries, options })
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la mise en cache multiple:', error)
      return false
    }
  }

  /**
   * Cache avec fonction de fallback (via backend)
   */
  async getOrSet(key, fetchFn, options = {}) {
    const cached = await this.get(key)
    if (cached !== null) {
      return cached
    }

    try {
      const value = await fetchFn()
      await this.set(key, value, options)
      return value
    } catch (error) {
      console.error(`Erreur lors de la récupération de ${key}:`, error)
      throw error
    }
  }

  /**
   * Cache avec invalidation automatique (via backend)
   */
  async getOrFetch(key, fetchFn, ttl = 5 * 60 * 1000) {
    return this.getOrSet(key, fetchFn, { ttl, persistent: false })
  }

  /**
   * Cache persistant pour les données importantes (via backend)
   */
  async getOrFetchPersistent(key, fetchFn, ttl = 5 * 60 * 1000) {
    return this.getOrSet(key, fetchFn, { ttl, persistent: true })
  }

  /**
   * Cache avec tags pour invalidation groupée (via backend)
   */
  async getOrFetchWithTags(key, fetchFn, tags = [], options = {}) {
    return this.getOrSet(key, fetchFn, { ...options, tags })
  }

  /**
   * Statistiques du cache (via backend)
   */
  async getStats() {
    try {
      const response = await apiService.request('/api/cache/stats')
      return response.data ?? {}
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error)
      return {}
    }
  }
}

// Instance singleton
const cacheService = new CacheService()

export default cacheService
export { CacheService }
