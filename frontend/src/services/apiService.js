/**
 * Client HTTP de l'API backend : URL de base, choix et nettoyage des jetons, délais,
 * construction des erreurs (ApiError) et chaîne de requête (buildQuery).
 * Aucun endpoint métier ici : chaque domaine a son service (authService, lessonService,
 * coursePageService, profile/profileService, activityService, badgeService, youtubeVideoService…).
 *
 * Deux jetons possibles (cf. backend/lib/auth.js) :
 * - jeton famille (scope « family ») : délivré par le code d'entrée familial, accès « enfant » ;
 * - jeton profil (scope « profile ») : délivré par le PIN parent, requis pour l'espace parent.
 * Le jeton profil est envoyé en priorité ; il ne survit pas à la session parent de 30 min.
 */

import sessionService from './sessionService.js'
import familyGateService from './familyGateService.js'
import { readProfileToken, clearProfileToken } from './authStorage.js'
import { decodeJwtPayload, isJwtExpired } from '../utils/jwt.js'

/**
 * Erreur HTTP enrichie (statut, code backend, délai avant nouvel essai)
 */
export class ApiError extends Error {
  constructor (message, { status = 0, code = null, data = null, retryAfterSeconds = null, requestId = null, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
    this.retryAfterSeconds = retryAfterSeconds
    // Identifiant de requête renvoyé par le serveur (à communiquer en cas de problème)
    this.requestId = requestId
    if (cause) this.cause = cause
  }
}

// Endpoints appelés sans jeton (le serveur ne l'exige pas)
const PUBLIC_ENDPOINTS = ['/api/auth/logout', '/api/auth/verify']

// Connexion par PIN : exige le jeton famille (ou, à défaut, le jeton profil)
const LOGIN_ENDPOINT = '/api/auth/login'

/**
 * Construire une chaîne de requête (« ?a=1&b=2 ») en ignorant les valeurs absentes
 * @param {Object} params
 * @returns {string} chaîne vide si aucun paramètre
 */
export function buildQuery (params = {}) {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value)
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

// Endpoints qui vérifient un code : un 401 y signifie « code incorrect », pas « session expirée »
function isCredentialEndpoint (path) {
  return path === LOGIN_ENDPOINT ||
    path === '/api/auth/family-gate' ||
    /^\/api\/profiles\/[^/]+\/pin$/.test(path)
}

/**
 * Délai lisible (« 45 s », « 15 min », « 2 h », « 1 h 30 min »)
 * Le verrouillage PIN est progressif côté serveur : 15 min → 1 h → 24 h.
 * @param {number} seconds
 */
export function formatWaitDelay (seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0))
  if (total < 60) return `${total} s`
  const minutes = Math.ceil(total / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${hours} h`
}

// 401 signifiant que le jeton présenté n'est plus accepté (absent, expiré ou révoqué)
const SESSION_REJECTED_CODES = new Set(['UNAUTHORIZED', 'TOKEN_REVOKED'])

// 429 liés à un code saisi (PIN parent, code familial) : verrouillage temporaire
const CODE_LOCK_CODES = new Set(['PIN_LOCKED', 'RATE_LIMIT_PIN', 'FAMILY_GATE_LOCKED'])

async function readJsonSafely (response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

class ApiService {
  constructor() {
    // URL du backend : chemins relatifs par défaut (même origine que la page).
    // En développement, le proxy Vite relaie /api ; en production, le nginx du frontend.
    // Une origine explicite (VITE_API_URL / VITE_API_URL_PROD) doit aussi être autorisée
    // par la CSP (connect-src) de frontend/nginx.conf.
    const isDevelopment = import.meta.env.DEV
    this.baseURL = isDevelopment
      ? (import.meta.env.VITE_API_URL || '')
      : (import.meta.env.VITE_API_URL_PROD || '')
    // Callback appelé quand une session expire (redirection gérée par le router)
    this.authErrorHandler = null
  }

  /**
   * Enregistrer le callback appelé quand le serveur refuse le jeton (401)
   * @param {Function|null} handler - ({ kind: 'profile'|'family', endpoint }) => void
   */
  setAuthErrorHandler(handler) {
    this.authErrorHandler = typeof handler === 'function' ? handler : null
  }

  /**
   * Jeton profil valide (droits parent), ou null.
   * Un jeton expiré, illisible, ou un jeton admin sans session parent active est supprimé.
   * @returns {string|null}
   */
  getProfileToken() {
    const token = readProfileToken()
    if (!token) return null

    const payload = decodeJwtPayload(token)
    const isProfileToken = !!payload &&
      (payload.scope === 'profile' || (!payload.scope && payload.profileId != null))
    if (!isProfileToken || isJwtExpired(token)) {
      clearProfileToken()
      return null
    }

    // Les droits parent ne survivent pas à la session parent (30 min)
    if (payload.isAdmin === true && !sessionService.isUnlocked(payload.profileId)) {
      clearProfileToken()
      return null
    }
    return token
  }

  /**
   * Charge utile du jeton profil valide, ou null
   * @returns {Object|null}
   */
  getProfileTokenPayload() {
    const token = this.getProfileToken()
    return token ? decodeJwtPayload(token) : null
  }

  /**
   * Le jeton profil courant donne-t-il les droits parent pour ce profil ?
   * @param {string|number} profileId
   * @returns {boolean}
   */
  hasAdminTokenFor(profileId) {
    if (profileId === undefined || profileId === null || profileId === '') return false
    const payload = this.getProfileTokenPayload()
    return !!payload && payload.isAdmin === true && String(payload.profileId) === String(profileId)
  }

  /**
   * Jeton à envoyer : jeton profil s'il existe, sinon jeton famille
   * @returns {string|null} Le token JWT ou null si absent
   */
  getToken() {
    return this.getProfileToken() || familyGateService.getToken()
  }

  /**
   * Vérifier si un token (profil ou famille) est présent
   * @returns {boolean} True si un token est présent
   */
  hasToken() {
    return !!this.getToken()
  }

  /**
   * Effectuer une requête fetch avec timeout
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new ApiError('Timeout: Le serveur a pris trop de temps à répondre. Veuillez réessayer.', { code: 'TIMEOUT' })
      }
      if (error instanceof TypeError) {
        throw new ApiError('Impossible de contacter le serveur. Vérifiez votre connexion internet.', { code: 'NETWORK_ERROR', cause: error })
      }
      throw error
    }
  }

  /**
   * Choisir le jeton à envoyer pour une requête
   * @returns {{ token: string|null, kind: 'profile'|'family'|null }}
   */
  resolveAuth(auth, isPublicEndpoint, path = '') {
    if (auth === 'none') return { token: null, kind: null }
    if (auth === 'profile') {
      const token = this.getProfileToken()
      return { token, kind: token ? 'profile' : null }
    }
    if (isPublicEndpoint) return { token: null, kind: null }

    // Connexion par PIN : le jeton famille prouve que l'appareil a passé le code familial
    if (path === LOGIN_ENDPOINT) {
      const familyToken = familyGateService.getToken()
      if (familyToken) return { token: familyToken, kind: 'family' }
      const profileToken = this.getProfileToken()
      return { token: profileToken, kind: profileToken ? 'profile' : null }
    }

    const profileToken = this.getProfileToken()
    if (profileToken) return { token: profileToken, kind: 'profile' }
    const familyToken = familyGateService.getToken()
    return { token: familyToken, kind: familyToken ? 'family' : null }
  }

  /**
   * Session refusée par le serveur : supprimer le jeton concerné, puis prévenir le router
   * (jamais d'appel réseau ici, pour éviter toute boucle de déconnexion).
   * sentToken : jeton envoyé avec la requête refusée. S'il a été remplacé entre-temps
   * (nouveau PIN ou code familial saisi pendant que la requête était en cours), la
   * nouvelle session est conservée.
   */
  handleUnauthorized(kind, endpoint, sentToken = null) {
    const expiredKind = kind === 'profile' ? 'profile' : 'family'
    if (this.clearRejectedToken(expiredKind, sentToken)) {
      this.notifyAuthError(expiredKind, endpoint)
    }
  }

  /**
   * Efface le jeton refusé (et la session parent pour un jeton profil), sauf s'il a déjà
   * été remplacé par un autre. Renvoie false si la session courante est conservée.
   */
  clearRejectedToken(kind, sentToken = null) {
    const currentToken = kind === 'profile' ? this.getProfileToken() : familyGateService.getToken()
    if (sentToken && currentToken && currentToken !== sentToken) return false
    if (kind === 'profile') {
      sessionService.clearSession()
      clearProfileToken()
    } else {
      familyGateService.clearFamilySession()
    }
    return true
  }

  /**
   * Prévenir le router (redirection vers le code familial ou le PIN parent)
   */
  notifyAuthError(kind, endpoint) {
    if (!this.authErrorHandler) return
    try {
      this.authErrorHandler({ kind, endpoint })
    } catch (error) {
      console.error('Erreur dans le gestionnaire de session expirée:', error)
    }
  }

  /**
   * Construire l'erreur correspondant à une réponse HTTP en échec
   */
  async buildHttpError(response, { path, method, tokenKind, sentToken = null }) {
    const status = response.status
    const body = await readJsonSafely(response)
    const code = body?.code || null
    // 400 VALIDATION_ERROR : body.errors[] porte les messages (français) de chaque champ
    const firstValidationMessage = Array.isArray(body?.errors) && typeof body.errors[0]?.message === 'string'
      ? body.errors[0].message
      : null
    const serverMessage = (typeof body?.message === 'string' && body.message) || firstValidationMessage || null
    const requestId = (typeof body?.requestId === 'string' && body.requestId) ||
      response.headers?.get?.('x-request-id') || null
    const details = { status, code, data: body, requestId }
    const isSessionRejected = SESSION_REJECTED_CODES.has(code)

    if (status === 401) {
      if (path === LOGIN_ENDPOINT) {
        // UNAUTHORIZED / TOKEN_REVOKED : la session famille n'est plus valable (code familial
        // modifié, jeton expiré…) → retour au code familial. Ce n'est pas un PIN faux.
        if (isSessionRejected) {
          if (tokenKind === 'profile') {
            this.clearRejectedToken('profile', sentToken)
          }
          this.handleUnauthorized('family', path, tokenKind === 'family' ? sentToken : null)
          return new ApiError(
            'Session expirée - Veuillez saisir à nouveau le code familial',
            { ...details, code: 'SESSION_EXPIRED' }
          )
        }
        // INVALID_CREDENTIALS : PIN incorrect ou profil inconnu
        return new ApiError(serverMessage || 'Code PIN incorrect', { ...details, code: code || 'INVALID_CREDENTIALS' })
      }
      if (path === '/api/auth/family-gate' && method === 'POST') {
        return new ApiError('Code incorrect', { ...details, code: code || 'INVALID_CREDENTIALS' })
      }
      if (path === '/api/auth/logout') {
        return new ApiError(serverMessage || 'Déconnexion impossible', details)
      }
      // INVALID_CURRENT_PIN (changement de PIN ou de code familial) : vrai 401, pas une déconnexion
      if (isCredentialEndpoint(path) && !isSessionRejected) {
        return new ApiError(serverMessage || 'Code incorrect', { ...details, code: code || 'INVALID_CURRENT_PIN' })
      }

      // Jeton absent, invalide, expiré ou révoqué (TOKEN_REVOKED : code ou PIN modifié,
      // profil désactivé…) → supprimer ce jeton et revenir au code familial / au PIN
      this.handleUnauthorized(tokenKind, path, sentToken)
      let message
      if (tokenKind === 'profile') {
        message = code === 'TOKEN_REVOKED'
          ? 'Session parent révoquée (code PIN ou profil modifié) - Veuillez saisir à nouveau votre code PIN'
          : 'Session parent expirée - Veuillez saisir à nouveau votre code PIN'
      } else {
        message = code === 'TOKEN_REVOKED'
          ? 'Le code familial a changé - Veuillez le saisir à nouveau'
          : 'Session expirée - Veuillez saisir à nouveau le code familial'
      }
      return new ApiError(message, { ...details, code: 'SESSION_EXPIRED', data: { ...(body || {}), serverCode: code } })
    }

    if (status === 403) {
      // Action parent envoyée sans jeton parent (session parent expirée entre-temps) :
      // le router redemande le PIN si l'on est dans l'espace parent
      if (tokenKind !== 'profile') {
        this.notifyAuthError('profile', path)
      }
      return new ApiError(
        'Accès refusé : vous n\'avez pas les droits nécessaires pour cette action.',
        { ...details, code: code || 'FORBIDDEN' }
      )
    }

    if (status === 429) {
      const headerDelay = Number(response.headers?.get?.('retry-after'))
      const retryAfterSeconds = Number(body?.retryAfterSeconds) || (Number.isFinite(headerDelay) && headerDelay > 0 ? headerDelay : null)
      const wait = retryAfterSeconds
        ? ` Réessayez dans ${formatWaitDelay(retryAfterSeconds)}.`
        : ' Réessayez dans quelques instants.'
      let message
      if (CODE_LOCK_CODES.has(code)) {
        message = `Trop de codes incorrects : l'accès est temporairement bloqué.${wait}`
      } else if (code === 'RATE_LIMIT_LOGIN') {
        message = `Trop de tentatives de connexion.${wait}`
      } else {
        message = `Trop de requêtes envoyées au serveur.${wait}`
      }
      return new ApiError(message, { ...details, code: code || 'RATE_LIMITED', retryAfterSeconds })
    }

    if (status === 413) {
      return new ApiError('Erreur HTTP: 413 - Les fichiers sont trop volumineux. Veuillez réduire la taille des images ou utiliser moins de fichiers.', details)
    }
    if (status === 415) {
      return new ApiError(
        serverMessage || 'Format de fichier non pris en charge : utilisez des images (JPG, PNG ou WebP).',
        { ...details, code: code || 'UNSUPPORTED_FILE_TYPE' }
      )
    }
    if (status === 504) {
      return new ApiError('Timeout: Le serveur a pris trop de temps à répondre. Veuillez réessayer.', details)
    }
    if (code === 'OFFLINE' && serverMessage) {
      return new ApiError(serverMessage, details)
    }
    // 503 SERVICE_UNAVAILABLE (base de données indisponible…) ou FAMILY_GATE_NOT_CONFIGURED
    if (status === 503) {
      return new ApiError(
        serverMessage || 'Service momentanément indisponible. Réessayez dans quelques instants.',
        { ...details, code: code || 'SERVICE_UNAVAILABLE' }
      )
    }
    if (status >= 500) {
      if (serverMessage) console.error(`Erreur ${status} du serveur:`, serverMessage)
      return new ApiError(
        serverMessage ? `Erreur serveur: ${serverMessage}` : `Erreur HTTP ${status}: Le serveur a rencontré une erreur interne`,
        details
      )
    }

    // 400 (VALIDATION_ERROR, WEAK_PIN, PIN_TOO_SHORT, CURRENT_PIN_REQUIRED…), 404… : message du serveur
    return new ApiError(serverMessage || `Erreur HTTP: ${status}`, details)
  }

  /**
   * Effectuer une requête HTTP
   * @param {string} endpoint - Chemin de l'API (ex: /api/profiles)
   * @param {Object} options - Options fetch + `auth` ('auto' | 'profile' | 'none')
   */
  async request(endpoint, options = {}) {
    const { auth = 'auto', ...fetchOptions } = options
    const url = `${this.baseURL}${endpoint}`
    const path = endpoint.split('?')[0]
    const method = String(fetchOptions.method || 'GET').toUpperCase()

    // POST /api/auth/family-gate ne nécessite pas de token ; PUT (config) exige un jeton parent
    const isPublicEndpoint =
      PUBLIC_ENDPOINTS.includes(path) ||
      (path === '/api/auth/family-gate' && method === 'POST')

    const isLogin = path === LOGIN_ENDPOINT

    // Appels aux modèles d'IA (génération, extraction de texte, analyse) : le serveur leur
    // accorde jusqu'à 170 s (AI_REQUEST_TIMEOUT_MS) et annule si le client se déconnecte,
    // le client attend donc 180 s
    const isLongTimeoutEndpoint = /^\/api\/ai\/(generate-|extract-|analyze)/.test(path)

    // Timeout plus long pour le login (peut prendre du temps avec la vérification du PIN)
    // Génération d'une page de cours complète par l'IA : jusqu'à ~9 min côté serveur
    const isCoursePageGeneration = path === '/api/ai/generate-course-page'
    const timeout = isCoursePageGeneration
      ? 600000
      : (isPublicEndpoint || isLogin) ? 60000 : (isLongTimeoutEndpoint ? 180000 : 30000) // 60s pour login, 180s pour génération quiz documents, 30s pour les autres

    // Ne pas définir Content-Type si le body est FormData (le navigateur le fait automatiquement)
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData

    const config = {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...fetchOptions.headers
      }
    }

    // Ajouter le token d'authentification si disponible
    const { token, kind: tokenKind } = this.resolveAuth(auth, isPublicEndpoint, path)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else if (!isPublicEndpoint && import.meta.env.DEV) {
      // Le backend répondra 401 : la redirection vers le code familial suivra
      console.warn('⚠️ Aucun token d\'authentification trouvé pour:', endpoint)
    }

    try {
      const response = await this.fetchWithTimeout(url, config, timeout)

      if (!response.ok) {
        throw await this.buildHttpError(response, { path, method, tokenKind, sentToken: token })
      }

      return await response.json()
    } catch (error) {
      // Les refus attendus (4xx : PIN incorrect, session expirée…) ne polluent pas la console
      if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500) {
        console.error('Erreur API:', endpoint, error)
      }
      throw error
    }
  }

  /**
   * Supprimer localement le jeton profil et la session parent (sans appel réseau)
   */
  clearProfileSession() {
    sessionService.clearSession()
    clearProfileToken()
  }

  /**
   * Un parent / profil est-il connecté (jeton profil valide) ?
   */
  isAuthenticated() {
    return !!this.getProfileToken()
  }
}

// Instance singleton
export const apiService = new ApiService()
export default apiService
