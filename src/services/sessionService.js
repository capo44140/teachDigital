/**
 * Service de gestion de session pour éviter de ressaisir le code PIN
 */
class SessionService {
  constructor () {
    this.SESSION_KEY = 'teachdigital_session'
    this.SESSION_DURATION = 30 * 60 * 1000 // 30 minutes en millisecondes
  }

  /**
   * Créer une session après vérification du PIN
   * @param {string} profileId - ID du profil déverrouillé
   * @param {string} profileName - Nom du profil
   */
  createSession (profileId, profileName) {
    const sessionData = {
      profileId,
      profileName,
      timestamp: Date.now(),
      isUnlocked: true
    }

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
  }

  /**
   * Vérifier si une session valide existe
   * @returns {Object|null} - Données de session ou null si invalide
   */
  getValidSession () {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)

      if (!sessionData) {
        return null
      }

      const session = JSON.parse(sessionData)
      const now = Date.now()
      const sessionAge = now - session.timestamp

      // Vérifier si la session n'a pas expiré
      if (sessionAge > this.SESSION_DURATION) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error('Erreur lors de la lecture de la session:', error)
      this.clearSession()
      return null
    }
  }

  /**
   * Vérifier si l'accès est déverrouillé pour un profil spécifique
   * @param {string} profileId - ID du profil à vérifier
   * @returns {boolean} - True si l'accès est déverrouillé
   */
  isUnlocked (profileId) {
    const session = this.getValidSession()
    return session && String(session.profileId) === String(profileId) && session.isUnlocked
  }

  /**
   * Prolonger la session (remettre à jour le timestamp)
   */
  extendSession () {
    const session = this.getValidSession()
    if (session) {
      session.timestamp = Date.now()
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    }
  }

  /**
   * Effacer la session
   */
  clearSession () {
    localStorage.removeItem(this.SESSION_KEY)
  }

  /**
   * Obtenir les informations de la session actuelle
   * @returns {Object|null} - Informations de session ou null
   */
  getCurrentSession () {
    return this.getValidSession()
  }

  /**
   * Vérifier si une session existe (même expirée)
   * @returns {boolean} - True si une session existe
   */
  hasSession () {
    return localStorage.getItem(this.SESSION_KEY) !== null
  }
}

// Export d'une instance singleton
export default new SessionService()
