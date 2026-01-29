/**
 * Service de gestion de la session "famille" (code d'entrée avant la sélection de profils).
 * Option B : code familial dédié.
 */
class FamilyGateService {
  constructor () {
    this.SESSION_KEY = 'teachdigital_family_session'
    // 24 h en millisecondes (configurable)
    this.SESSION_DURATION = 24 * 60 * 60 * 1000
  }

  /**
   * Créer une session famille après vérification du code d'entrée
   */
  createFamilySession () {
    const sessionData = {
      timestamp: Date.now(),
      valid: true
    }
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
  }

  /**
   * Vérifier si une session famille valide existe
   * @returns {Object|null} Données de session ou null si invalide/expirée
   */
  getValidFamilySession () {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY)
      if (!raw) return null
      const session = JSON.parse(raw)
      const age = Date.now() - session.timestamp
      if (age > this.SESSION_DURATION) {
        this.clearFamilySession()
        return null
      }
      return session
    } catch {
      this.clearFamilySession()
      return null
    }
  }

  /**
   * Vérifier si l'accès "famille" est valide (court-circuit pour le guard)
   * @returns {boolean}
   */
  hasValidFamilySession () {
    return !!this.getValidFamilySession()
  }

  /**
   * Effacer la session famille (ex. "Verrouiller l'app" depuis les paramètres Parent)
   */
  clearFamilySession () {
    localStorage.removeItem(this.SESSION_KEY)
  }
}

export default new FamilyGateService()
