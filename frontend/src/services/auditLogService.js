/**
 * Service de logs d'audit - Délégation au backend
 *
 * POST /api/audit/logs exige un jeton : l'auteur (userId), l'adresse IP et le User-Agent
 * sont déduits par le serveur. Le client n'envoie donc que l'action, la catégorie, le niveau
 * et des détails courts. Sans jeton (avant le code familial), rien n'est envoyé : le serveur
 * journalise lui-même les événements du code familial et de connexion.
 */

import { apiService, buildQuery } from './apiService.js'

// Actions acceptées par POST /api/audit/logs (les autres sont refusées en 400 :
// LOGIN_* et QUIZ_COMPLETED sont journalisés par le serveur lui-même)
export const CLIENT_AUDIT_ACTIONS = new Set([
  'CLIENT_ERROR',
  'SYSTEM_ERROR',
  'SECURITY_VIOLATION',
  'PROFILE_CREATED',
  'PROFILE_UPDATED',
  'LESSON_CREATED',
  'LESSON_DELETED',
  'NOTIFICATION_CREATED',
  'IMAGE_UPLOADED',
  'QUIZ_GENERATION_START',
  'QUIZ_GENERATION_SUCCESS',
  'QUIZ_GENERATION_FAILED',
  'API_REQUEST_SUCCESS',
  'API_REQUEST_FAILED'
])

// Taille maximale des détails (JSON) : 4000 caractères, 2000 pour CLIENT_ERROR (limites serveur,
// avec une marge pour l'enveloppe { truncated, excerpt })
const MAX_DETAILS_LENGTH = 3800
const MAX_CLIENT_ERROR_DETAILS_LENGTH = 1800

function compactDetails (details, maxLength = MAX_DETAILS_LENGTH) {
  try {
    const json = JSON.stringify(details ?? {})
    if (json.length <= maxLength) return details ?? {}
    return { truncated: true, excerpt: json.slice(0, maxLength) }
  } catch {
    return { unserializable: true }
  }
}

// Le profil concerné (enfant, leçon…) n'est pas l'auteur : il voyage dans les détails
function withTargetProfile (profileId, details = {}) {
  if (profileId === undefined || profileId === null || profileId === '' || profileId === 'unknown') {
    return details
  }
  return { targetProfileId: profileId, ...details }
}

class AuditLogService {
  constructor () {
    this.levels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical'
    }
    this.categories = {
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      DATA_ACCESS: 'data_access',
      SECURITY: 'security',
      API_USAGE: 'api_usage',
      SYSTEM: 'system'
    }
  }

  /**
   * Enregistre un événement d'audit (via backend), uniquement avec un jeton.
   * @returns {Promise<boolean>} true si l'événement a été envoyé
   */
  async log (action, category, level = this.levels.INFO, details = {}) {
    if (!CLIENT_AUDIT_ACTIONS.has(action)) {
      console.warn('Action d\'audit non acceptée par le serveur, ignorée :', action)
      return false
    }
    if (!apiService.hasToken()) return false
    try {
      const maxLength = action === 'CLIENT_ERROR' ? MAX_CLIENT_ERROR_DETAILS_LENGTH : MAX_DETAILS_LENGTH
      await apiService.request('/api/audit/logs', {
        method: 'POST',
        body: JSON.stringify({
          action,
          category,
          level,
          details: compactDetails(details, maxLength)
        })
      })
      return true
    } catch (error) {
      console.warn('Log d\'audit non enregistré:', error?.message || error)
      return false
    }
  }

  /**
   * Enregistre un changement de profil (via backend)
   */
  async logProfileChange (profileId, action, changes = {}) {
    return this.log(
      action,
      this.categories.DATA_ACCESS,
      this.levels.INFO,
      withTargetProfile(profileId, { changes })
    )
  }

  /**
   * Enregistre un accès aux données (via backend)
   */
  async logDataAccess (profileId, dataType, action, details = {}) {
    return this.log(
      action,
      this.categories.DATA_ACCESS,
      this.levels.INFO,
      withTargetProfile(profileId, { dataType, ...details })
    )
  }

  /**
   * Étape d'une génération de quiz par l'IA
   * @param {'START'|'SUCCESS'|'FAILED'} phase
   * @param {string|number} profileId - enfant ciblé
   * @param {Object} details - source (scanner / texte), nombre de questions…
   */
  async logQuizGeneration (phase, profileId, details = {}) {
    return this.log(
      `QUIZ_GENERATION_${phase}`,
      this.categories.API_USAGE,
      phase === 'FAILED' ? this.levels.ERROR : this.levels.INFO,
      withTargetProfile(profileId, details)
    )
  }

  /**
   * Enregistre une erreur système (via backend)
   */
  async logSystemError (error, component, details = {}) {
    return this.log(
      'SYSTEM_ERROR',
      this.categories.SYSTEM,
      this.levels.ERROR,
      {
        error: error?.message || error,
        component,
        ...details
      }
    )
  }

  /**
   * Erreur JavaScript non interceptée côté client (action CLIENT_ERROR, détails courts)
   */
  async logClientError (details = {}) {
    return this.log('CLIENT_ERROR', this.categories.SYSTEM, this.levels.ERROR, details)
  }

  /**
   * Récupère les logs d'audit (via backend)
   */
  async getLogs (filters = {}) {
    try {
      const response = await apiService.request(`/api/audit/logs${buildQuery(filters)}`)
      return response.data?.logs || []
    } catch (error) {
      console.error('Erreur lors de la récupération des logs:', error)
      return []
    }
  }

  /**
   * Récupère les statistiques de sécurité (via backend)
   */
  async getSecurityStats (days = 7) {
    try {
      const response = await apiService.request(`/api/audit/stats${buildQuery({ days })}`)
      return response.data || {}
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error)
      return {}
    }
  }

  /**
   * Exporte les logs d'audit (via backend)
   */
  async exportLogs (filters = {}) {
    try {
      const response = await apiService.request('/api/audit/export', {
        method: 'POST',
        body: JSON.stringify({ filters })
      })
      return response.data?.export || ''
    } catch (error) {
      console.error('Erreur lors de l\'export des logs:', error)
      return ''
    }
  }
}

// Instance singleton
export const auditLogService = new AuditLogService()
export { AuditLogService }
