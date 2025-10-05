/**
 * Service de logs d'audit pour la sécurité
 * Enregistre toutes les actions sensibles et les événements de sécurité
 */

class AuditLogService {
  constructor() {
    this.logs = []
    this.maxLogs = 10000 // Limite de logs en mémoire
    this.retentionDays = 90 // Rétention des logs
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
   * Enregistre un événement d'audit
   * @param {string} action - Action effectuée
   * @param {string} userId - ID de l'utilisateur
   * @param {string} category - Catégorie de l'événement
   * @param {string} level - Niveau de criticité
   * @param {Object} details - Détails supplémentaires
   * @param {string} ipAddress - Adresse IP
   * @param {string} userAgent - User Agent
   */
  log(action, userId, category, level = this.levels.INFO, details = {}, ipAddress = null, userAgent = null) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      action,
      userId,
      category,
      level,
      details: this.sanitizeDetails(details),
      ipAddress: ipAddress || this.getClientIP(),
      userAgent: userAgent || this.getUserAgent(),
      sessionId: this.getSessionId()
    }

    this.logs.push(logEntry)
    
    // Nettoyer les anciens logs si nécessaire
    this.cleanupOldLogs()
    
    // Afficher dans la console en mode développement
    if (import.meta.env.DEV) {
      console.log('🔍 Audit Log:', logEntry)
    }
    
    // Déclencher des alertes pour les événements critiques
    this.checkForAlerts(logEntry)
  }

  /**
   * Enregistre une tentative de connexion
   * @param {string} userId - ID de l'utilisateur
   * @param {boolean} success - Succès de la connexion
   * @param {string} method - Méthode de connexion
   * @param {Object} details - Détails supplémentaires
   */
  logAuthentication(userId, success, method = 'pin', details = {}) {
    const level = success ? this.levels.INFO : this.levels.WARNING
    const action = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED'
    
    this.log(
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
   * Enregistre un changement de profil
   * @param {string} userId - ID de l'utilisateur
   * @param {string} action - Action effectuée
   * @param {Object} changes - Changements effectués
   */
  logProfileChange(userId, action, changes = {}) {
    this.log(
      action,
      userId,
      this.categories.DATA_ACCESS,
      this.levels.INFO,
      {
        changes: this.sanitizeChanges(changes),
        timestamp: new Date().toISOString()
      }
    )
  }

  /**
   * Enregistre l'utilisation d'une API IA
   * @param {string} userId - ID de l'utilisateur
   * @param {string} apiType - Type d'API (openai, gemini)
   * @param {boolean} success - Succès de la requête
   * @param {Object} details - Détails de la requête
   */
  logApiUsage(userId, apiType, success, details = {}) {
    const level = success ? this.levels.INFO : this.levels.ERROR
    const action = success ? 'API_REQUEST_SUCCESS' : 'API_REQUEST_FAILED'
    
    this.log(
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
   * Enregistre une violation de sécurité
   * @param {string} userId - ID de l'utilisateur
   * @param {string} violation - Type de violation
   * @param {Object} details - Détails de la violation
   */
  logSecurityViolation(userId, violation, details = {}) {
    this.log(
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
   * Enregistre un accès aux données sensibles
   * @param {string} userId - ID de l'utilisateur
   * @param {string} dataType - Type de données
   * @param {string} action - Action effectuée
   * @param {Object} details - Détails supplémentaires
   */
  logDataAccess(userId, dataType, action, details = {}) {
    this.log(
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
   * Enregistre une erreur système
   * @param {string} error - Message d'erreur
   * @param {string} component - Composant concerné
   * @param {Object} details - Détails de l'erreur
   */
  logSystemError(error, component, details = {}) {
    this.log(
      'SYSTEM_ERROR',
      'system',
      this.categories.SYSTEM,
      this.levels.ERROR,
      {
        error,
        component,
        ...details
      }
    )
  }

  /**
   * Récupère les logs d'audit
   * @param {Object} filters - Filtres de recherche
   * @returns {Array} Logs filtrés
   */
  getLogs(filters = {}) {
    let filteredLogs = [...this.logs]

    // Filtrer par utilisateur
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
    }

    // Filtrer par catégorie
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category)
    }

    // Filtrer par niveau
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level)
    }

    // Filtrer par date
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= new Date(filters.startDate)
      )
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= new Date(filters.endDate)
      )
    }

    // Trier par date (plus récent en premier)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Limiter le nombre de résultats
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit)
    }

    return filteredLogs
  }

  /**
   * Récupère les statistiques de sécurité
   * @param {number} days - Nombre de jours à analyser
   * @returns {Object} Statistiques
   */
  getSecurityStats(days = 7) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    )

    const stats = {
      totalEvents: recentLogs.length,
      criticalEvents: recentLogs.filter(log => log.level === this.levels.CRITICAL).length,
      errorEvents: recentLogs.filter(log => log.level === this.levels.ERROR).length,
      warningEvents: recentLogs.filter(log => log.level === this.levels.WARNING).length,
      failedLogins: recentLogs.filter(log => log.action === 'LOGIN_FAILED').length,
      securityViolations: recentLogs.filter(log => log.action === 'SECURITY_VIOLATION').length,
      apiFailures: recentLogs.filter(log => log.action === 'API_REQUEST_FAILED').length,
      categories: {},
      levels: {},
      topUsers: {},
      topActions: {}
    }

    // Statistiques par catégorie
    recentLogs.forEach(log => {
      stats.categories[log.category] = (stats.categories[log.category] || 0) + 1
      stats.levels[log.level] = (stats.levels[log.level] || 0) + 1
      stats.topUsers[log.userId] = (stats.topUsers[log.userId] || 0) + 1
      stats.topActions[log.action] = (stats.topActions[log.action] || 0) + 1
    })

    return stats
  }

  /**
   * Exporte les logs d'audit
   * @param {Object} filters - Filtres d'export
   * @returns {string} Logs au format JSON
   */
  exportLogs(filters = {}) {
    const logs = this.getLogs(filters)
    return JSON.stringify(logs, null, 2)
  }

  /**
   * Nettoie les anciens logs
   */
  cleanupOldLogs() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)

    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    )

    // Limiter le nombre de logs en mémoire
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * Vérifie les alertes de sécurité
   * @param {Object} logEntry - Entrée de log
   */
  checkForAlerts(logEntry) {
    // Alerte pour les violations de sécurité
    if (logEntry.action === 'SECURITY_VIOLATION') {
      this.triggerSecurityAlert(logEntry)
    }

    // Alerte pour les échecs de connexion répétés
    if (logEntry.action === 'LOGIN_FAILED') {
      const recentFailures = this.logs.filter(log => 
        log.userId === logEntry.userId && 
        log.action === 'LOGIN_FAILED' &&
        new Date(log.timestamp) > new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
      )

      if (recentFailures.length >= 5) {
        this.triggerBruteForceAlert(logEntry)
      }
    }

    // Alerte pour les erreurs API répétées
    if (logEntry.action === 'API_REQUEST_FAILED') {
      const recentFailures = this.logs.filter(log => 
        log.action === 'API_REQUEST_FAILED' &&
        new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
      )

      if (recentFailures.length >= 10) {
        this.triggerApiFailureAlert(logEntry)
      }
    }
  }

  /**
   * Déclenche une alerte de sécurité
   * @param {Object} logEntry - Entrée de log
   */
  triggerSecurityAlert(logEntry) {
    console.warn('🚨 ALERTE SÉCURITÉ:', logEntry)
    // Ici, vous pourriez envoyer une notification, un email, etc.
  }

  /**
   * Déclenche une alerte de force brute
   * @param {Object} logEntry - Entrée de log
   */
  triggerBruteForceAlert(logEntry) {
    console.warn('🚨 ALERTE FORCE BRUTE:', logEntry)
    // Ici, vous pourriez bloquer temporairement l'utilisateur
  }

  /**
   * Déclenche une alerte d'échec API
   * @param {Object} logEntry - Entrée de log
   */
  triggerApiFailureAlert(logEntry) {
    console.warn('🚨 ALERTE ÉCHEC API:', logEntry)
    // Ici, vous pourriez basculer vers un mode dégradé
  }

  /**
   * Génère un ID unique pour le log
   * @returns {string} ID du log
   */
  generateLogId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Nettoie les détails sensibles
   * @param {Object} details - Détails à nettoyer
   * @returns {Object} Détails nettoyés
   */
  sanitizeDetails(details) {
    const sensitiveFields = ['password', 'pin', 'token', 'key', 'secret']
    const sanitized = { ...details }

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })

    return sanitized
  }

  /**
   * Nettoie les changements sensibles
   * @param {Object} changes - Changements à nettoyer
   * @returns {Object} Changements nettoyés
   */
  sanitizeChanges(changes) {
    return this.sanitizeDetails(changes)
  }

  /**
   * Récupère l'adresse IP du client
   * @returns {string} Adresse IP
   */
  getClientIP() {
    // En production, récupérer depuis les headers
    return '127.0.0.1'
  }

  /**
   * Récupère le User Agent
   * @returns {string} User Agent
   */
  getUserAgent() {
    return navigator.userAgent
  }

  /**
   * Récupère l'ID de session
   * @returns {string} ID de session
   */
  getSessionId() {
    return sessionStorage.getItem('sessionId') || 'unknown'
  }
}

// Instance singleton
export const auditLogService = new AuditLogService()
export { AuditLogService }
