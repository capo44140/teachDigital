/**
 * Service de rate limiting pour les APIs IA
 * Limite le nombre de requêtes par utilisateur et par période
 */

class RateLimitService {
  constructor () {
    // Stockage en mémoire des requêtes (en production, utiliser Redis)
    this.requests = new Map()
    this.limits = {
      openai: {
        requests: 10, // 10 requêtes
        window: 60 * 60 * 1000, // par heure
        burst: 3 // 3 requêtes en rafale
      },
      gemini: {
        requests: 15, // 15 requêtes
        window: 60 * 60 * 1000, // par heure
        burst: 5 // 5 requêtes en rafale
      }
    }
  }

  /**
   * Vérifie si une requête est autorisée
   * @param {string} userId - ID de l'utilisateur
   * @param {string} apiType - Type d'API (openai, gemini)
   * @returns {Object} Résultat de la vérification
   */
  checkRateLimit (userId, apiType = 'openai') {
    const now = Date.now()
    const limit = this.limits[apiType]

    if (!limit) {
      return { allowed: false, reason: 'API type not supported' }
    }

    // Nettoyer les anciennes requêtes
    this.cleanOldRequests(userId, now, limit.window)

    // Récupérer les requêtes de l'utilisateur
    const userRequests = this.requests.get(userId) || { [apiType]: [] }
    const apiRequests = userRequests[apiType] || []

    // Vérifier la limite de rafale
    const recentRequests = apiRequests.filter(time => now - time < 60000) // 1 minute
    if (recentRequests.length >= limit.burst) {
      return {
        allowed: false,
        reason: 'Burst limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + 60000 - now) / 1000)
      }
    }

    // Vérifier la limite de fenêtre
    if (apiRequests.length >= limit.requests) {
      const oldestRequest = Math.min(...apiRequests)
      return {
        allowed: false,
        reason: 'Window limit exceeded',
        retryAfter: Math.ceil((oldestRequest + limit.window - now) / 1000)
      }
    }

    return { allowed: true }
  }

  /**
   * Enregistre une nouvelle requête
   * @param {string} userId - ID de l'utilisateur
   * @param {string} apiType - Type d'API
   */
  recordRequest (userId, apiType = 'openai') {
    const now = Date.now()
    const userRequests = this.requests.get(userId) || { [apiType]: [] }

    if (!userRequests[apiType]) {
      userRequests[apiType] = []
    }

    userRequests[apiType].push(now)
    this.requests.set(userId, userRequests)
  }

  /**
   * Nettoie les anciennes requêtes
   * @param {string} userId - ID de l'utilisateur
   * @param {number} now - Timestamp actuel
   * @param {number} window - Fenêtre de temps
   */
  cleanOldRequests (userId, now, window) {
    const userRequests = this.requests.get(userId)
    if (!userRequests) return

    Object.keys(userRequests).forEach(apiType => {
      userRequests[apiType] = userRequests[apiType].filter(
        time => now - time < window
      )
    })

    this.requests.set(userId, userRequests)
  }

  /**
   * Obtient les statistiques de rate limiting pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object} Statistiques
   */
  getUserStats (userId) {
    const userRequests = this.requests.get(userId) || {}
    const now = Date.now()

    return Object.keys(this.limits).reduce((stats, apiType) => {
      const requests = userRequests[apiType] || []
      const limit = this.limits[apiType]

      stats[apiType] = {
        used: requests.length,
        limit: limit.requests,
        remaining: Math.max(0, limit.requests - requests.length),
        resetTime: requests.length > 0
          ? Math.min(...requests) + limit.window
          : now
      }

      return stats
    }, {})
  }

  /**
   * Réinitialise le rate limiting pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   */
  resetUserLimit (userId) {
    this.requests.delete(userId)
  }

  /**
   * Vérifie si un utilisateur est en mode "rate limited"
   * @param {string} userId - ID de l'utilisateur
   * @returns {boolean} True si l'utilisateur est limité
   */
  isUserRateLimited (userId) {
    const stats = this.getUserStats(userId)
    return Object.values(stats).some(stat => stat.remaining === 0)
  }
}

// Instance singleton
export const rateLimitService = new RateLimitService()
export { RateLimitService }
