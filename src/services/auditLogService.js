/**
 * Service de logs d'audit - Délégation au backend
 * Toute la logique de logging est gérée par le backend
 */

import { apiService } from './apiService.js'

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
   * Enregistre un événement d'audit (via backend)
   */
  async log (action, userId, category, level = this.levels.INFO, details = {}, ipAddress = null, userAgent = null) {
    try {
      await apiService.request('/api/audit/logs', {
        method: 'POST',
        body: JSON.stringify({
          action,
          userId,
          category,
          level,
          details,
          ipAddress,
          userAgent
        })
      })
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du log d\'audit:', error)
    }
  }

  /**
   * Enregistre une tentative de connexion (via backend)
   */
  async logAuthentication (userId, success, method = 'pin', details = {}) {
    const level = success ? this.levels.INFO : this.levels.WARNING
    const action = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED'

    await this.log(
      action,
      userId,
      this.categories.AUTHENTICATION,
      level,
      {
        method,
        success,
        ...details
      }
    )
  }

  /**
   * Enregistre un changement de profil (via backend)
   */
  async logProfileChange (userId, action, changes = {}) {
    await this.log(
      action,
      userId,
      this.categories.DATA_ACCESS,
      this.levels.INFO,
      {
        changes,
        timestamp: new Date().toISOString()
      }
    )
  }

  /**
   * Enregistre l'utilisation d'une API IA (via backend)
   */
  async logApiUsage (userId, apiType, success, details = {}) {
    const level = success ? this.levels.INFO : this.levels.ERROR
    const action = success ? 'API_REQUEST_SUCCESS' : 'API_REQUEST_FAILED'

    await this.log(
      action,
      userId,
      this.categories.API_USAGE,
      level,
      {
        apiType,
        success,
        ...details
      }
    )
  }

  /**
   * Enregistre une violation de sécurité (via backend)
   */
  async logSecurityViolation (userId, violation, details = {}) {
    await this.log(
      'SECURITY_VIOLATION',
      userId,
      this.categories.SECURITY,
      this.levels.CRITICAL,
      {
        violation,
        ...details
      }
    )
  }

  /**
   * Enregistre un accès aux données sensibles (via backend)
   */
  async logDataAccess (userId, dataType, action, details = {}) {
    await this.log(
      action,
      userId,
      this.categories.DATA_ACCESS,
      this.levels.INFO,
      {
        dataType,
        ...details
      }
    )
  }

  /**
   * Enregistre une erreur système (via backend)
   */
  async logSystemError (error, component, details = {}) {
    await this.log(
      'SYSTEM_ERROR',
      'system',
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
   * Récupère les logs d'audit (via backend)
   */
  async getLogs (filters = {}) {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value)
        }
      })

      const endpoint = params.toString() ? `/api/audit/logs?${params}` : '/api/audit/logs'
      const response = await apiService.request(endpoint)
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
      const response = await apiService.request(`/api/audit/stats?days=${days}`)
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
