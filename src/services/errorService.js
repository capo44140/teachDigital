/**
 * Service centralisé pour la gestion des erreurs
 * Fournit une interface uniforme pour la gestion, le logging et l'affichage des erreurs
 */

export class ErrorService {
  static errorTypes = {
    VALIDATION: 'validation',
    NETWORK: 'network',
    DATABASE: 'database',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    BUSINESS_LOGIC: 'business_logic',
    SYSTEM: 'system',
    UNKNOWN: 'unknown'
  }

  static severityLevels = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }

  /**
   * Crée une erreur standardisée avec métadonnées
   * @param {string} message - Message d'erreur
   * @param {string} type - Type d'erreur
   * @param {string} severity - Niveau de gravité
   * @param {Object} context - Contexte additionnel
   * @param {Error} originalError - Erreur originale (optionnelle)
   * @returns {Object} Erreur standardisée
   */
  static createError(message, type = this.errorTypes.UNKNOWN, severity = this.severityLevels.MEDIUM, context = {}, originalError = null) {
    const error = {
      id: this.generateErrorId(),
      message,
      type,
      severity,
      context,
      timestamp: new Date().toISOString(),
      stack: originalError?.stack,
      originalError: originalError?.message
    }

    // Log l'erreur
    this.logError(error)

    return error
  }

  /**
   * Gère une erreur de validation
   * @param {string} field - Champ en erreur
   * @param {string} message - Message d'erreur
   * @param {Object} value - Valeur invalide
   * @returns {Object} Erreur de validation
   */
  static handleValidationError(field, message, value = null) {
    return this.createError(
      `Erreur de validation pour ${field}: ${message}`,
      this.errorTypes.VALIDATION,
      this.severityLevels.LOW,
      { field, value }
    )
  }

  /**
   * Gère une erreur de réseau
   * @param {string} operation - Opération qui a échoué
   * @param {Object} response - Réponse HTTP (optionnelle)
   * @param {Error} originalError - Erreur originale
   * @returns {Object} Erreur de réseau
   */
  static handleNetworkError(operation, response = null, originalError = null) {
    return this.createError(
      `Erreur de réseau lors de ${operation}`,
      this.errorTypes.NETWORK,
      this.severityLevels.MEDIUM,
      { operation, status: response?.status, statusText: response?.statusText },
      originalError
    )
  }

  /**
   * Gère une erreur de base de données
   * @param {string} operation - Opération DB qui a échoué
   * @param {string} table - Table concernée (optionnelle)
   * @param {Error} originalError - Erreur originale
   * @returns {Object} Erreur de base de données
   */
  static handleDatabaseError(operation, table = null, originalError = null) {
    return this.createError(
      `Erreur de base de données lors de ${operation}`,
      this.errorTypes.DATABASE,
      this.severityLevels.HIGH,
      { operation, table },
      originalError
    )
  }

  /**
   * Gère une erreur d'authentification
   * @param {string} reason - Raison de l'échec
   * @param {string} userId - ID utilisateur (optionnel)
   * @returns {Object} Erreur d'authentification
   */
  static handleAuthenticationError(reason, userId = null) {
    return this.createError(
      `Échec d'authentification: ${reason}`,
      this.errorTypes.AUTHENTICATION,
      this.severityLevels.HIGH,
      { reason, userId }
    )
  }

  /**
   * Gère une erreur d'autorisation
   * @param {string} resource - Ressource demandée
   * @param {string} userId - ID utilisateur
   * @param {string} action - Action tentée
   * @returns {Object} Erreur d'autorisation
   */
  static handleAuthorizationError(resource, userId, action) {
    return this.createError(
      `Accès refusé à ${resource} pour l'action ${action}`,
      this.errorTypes.AUTHORIZATION,
      this.severityLevels.HIGH,
      { resource, userId, action }
    )
  }

  /**
   * Gère une erreur de logique métier
   * @param {string} operation - Opération métier
   * @param {string} reason - Raison de l'échec
   * @param {Object} context - Contexte métier
   * @returns {Object} Erreur de logique métier
   */
  static handleBusinessLogicError(operation, reason, context = {}) {
    return this.createError(
      `Erreur de logique métier lors de ${operation}: ${reason}`,
      this.errorTypes.BUSINESS_LOGIC,
      this.severityLevels.MEDIUM,
      { operation, reason, ...context }
    )
  }

  /**
   * Gère une erreur système
   * @param {string} component - Composant système
   * @param {string} message - Message d'erreur
   * @param {Error} originalError - Erreur originale
   * @returns {Object} Erreur système
   */
  static handleSystemError(component, message, originalError = null) {
    return this.createError(
      `Erreur système dans ${component}: ${message}`,
      this.errorTypes.SYSTEM,
      this.severityLevels.CRITICAL,
      { component },
      originalError
    )
  }

  /**
   * Log une erreur avec le niveau approprié
   * @param {Object} error - Erreur à logger
   */
  static logError(error) {
    const logMessage = `[${error.type.toUpperCase()}] ${error.message}`
    const logData = {
      id: error.id,
      context: error.context,
      timestamp: error.timestamp
    }

    switch (error.severity) {
      case this.severityLevels.CRITICAL:
        console.error(logMessage, logData)
        // Ici on pourrait envoyer à un service de monitoring externe
        break
      case this.severityLevels.HIGH:
        console.error(logMessage, logData)
        break
      case this.severityLevels.MEDIUM:
        console.warn(logMessage, logData)
        break
      case this.severityLevels.LOW:
        console.info(logMessage, logData)
        break
      default:
        console.log(logMessage, logData)
    }
  }

  /**
   * Génère un ID unique pour l'erreur
   * @returns {string} ID unique
   */
  static generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Formate une erreur pour l'affichage utilisateur
   * @param {Object} error - Erreur à formater
   * @returns {string} Message formaté pour l'utilisateur
   */
  static formatForUser(error) {
    const userMessages = {
      [this.errorTypes.VALIDATION]: 'Veuillez vérifier les informations saisies.',
      [this.errorTypes.NETWORK]: 'Problème de connexion. Veuillez réessayer.',
      [this.errorTypes.DATABASE]: 'Erreur de données. Veuillez réessayer plus tard.',
      [this.errorTypes.AUTHENTICATION]: 'Problème d\'authentification. Veuillez vous reconnecter.',
      [this.errorTypes.AUTHORIZATION]: 'Vous n\'avez pas les permissions nécessaires.',
      [this.errorTypes.BUSINESS_LOGIC]: 'Opération impossible dans l\'état actuel.',
      [this.errorTypes.SYSTEM]: 'Erreur technique. Veuillez contacter le support.',
      [this.errorTypes.UNKNOWN]: 'Une erreur inattendue s\'est produite.'
    }

    return userMessages[error.type] || userMessages[this.errorTypes.UNKNOWN]
  }

  /**
   * Détermine si une erreur est récupérable
   * @param {Object} error - Erreur à analyser
   * @returns {boolean} True si l'erreur est récupérable
   */
  static isRecoverable(error) {
    const recoverableTypes = [
      this.errorTypes.NETWORK,
      this.errorTypes.VALIDATION
    ]

    return recoverableTypes.includes(error.type) && 
           error.severity !== this.severityLevels.CRITICAL
  }

  /**
   * Détermine si une erreur nécessite une action utilisateur
   * @param {Object} error - Erreur à analyser
   * @returns {boolean} True si l'utilisateur doit agir
   */
  static requiresUserAction(error) {
    const userActionTypes = [
      this.errorTypes.AUTHENTICATION,
      this.errorTypes.AUTHORIZATION,
      this.errorTypes.VALIDATION
    ]

    return userActionTypes.includes(error.type)
  }

  /**
   * Crée un wrapper pour les fonctions async avec gestion d'erreur automatique
   * @param {Function} asyncFunction - Fonction async à wrapper
   * @param {string} operationName - Nom de l'opération pour le contexte
   * @returns {Function} Fonction wrappée
   */
  static wrapAsyncFunction(asyncFunction, operationName) {
    return async (...args) => {
      try {
        return await asyncFunction(...args)
      } catch (error) {
        const standardizedError = this.createError(
          `Erreur lors de ${operationName}`,
          this.errorTypes.UNKNOWN,
          this.severityLevels.MEDIUM,
          { operation: operationName, args: args.length },
          error
        )
        throw standardizedError
      }
    }
  }
}

export default ErrorService
