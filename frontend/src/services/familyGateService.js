import { getJwtExpiry, isJwtExpired } from '../utils/jwt.js'
import { purgeApiCaches } from './authStorage.js'

/**
 * Service de gestion de la session "famille" (code d'entrée avant la sélection de profils).
 * Option B : code familial dédié.
 * Le backend délivre un jeton famille (JWT scope « family », ~24 h) qui donne
 * l'accès « enfant » à l'API. Sans jeton valide, l'application renvoie au code familial.
 */
class FamilyGateService {
  constructor () {
    this.SESSION_KEY = 'teachdigital_family_session'
  }

  /**
   * Enregistrer la session famille après vérification du code d'entrée
   * @param {{ token: string, expiresAt?: string }} data - Réponse de POST /api/auth/family-gate
   * @returns {boolean} true si la session a pu être créée
   */
  createFamilySession ({ token, expiresAt } = {}) {
    if (typeof token !== 'string' || !token) {
      this.clearFamilySession()
      return false
    }
    const parsedExpiresAt = expiresAt ? Date.parse(expiresAt) : NaN
    const sessionData = {
      token,
      expiresAt: Number.isFinite(parsedExpiresAt) ? parsedExpiresAt : getJwtExpiry(token),
      createdAt: Date.now()
    }
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
    return this.hasValidFamilySession()
  }

  /**
   * Vérifier si une session famille valide existe
   * @returns {Object|null} Données de session ou null si absente/expirée
   */
  getValidFamilySession () {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY)
      if (!raw) return null
      const session = JSON.parse(raw)
      const now = Date.now()
      const hasToken = session && typeof session.token === 'string' && session.token.length > 0
      const expiredByDate = typeof session?.expiresAt === 'number' && session.expiresAt <= now
      if (!hasToken || expiredByDate || isJwtExpired(session.token, { now })) {
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
   * Jeton famille à envoyer à l'API (null si absent ou expiré)
   * @returns {string|null}
   */
  getToken () {
    return this.getValidFamilySession()?.token || null
  }

  /**
   * Vérifier si l'accès "famille" est valide (utilisé par le guard du router)
   * @returns {boolean}
   */
  hasValidFamilySession () {
    return !!this.getValidFamilySession()
  }

  /**
   * Effacer la session famille (ex. "Verrouiller l'app" depuis les paramètres Parent)
   */
  clearFamilySession () {
    try {
      const hadSession = localStorage.getItem(this.SESSION_KEY) !== null
      localStorage.removeItem(this.SESSION_KEY)
      if (hadSession) purgeApiCaches()
    } catch {
      // localStorage indisponible : rien à effacer
    }
  }
}

export default new FamilyGateService()
