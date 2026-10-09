/**
 * Service API pour communiquer avec le backend
 *
 * Deux jetons possibles (cf. backend/lib/auth.js) :
 * - jeton famille (scope « family ») : délivré par le code d'entrée familial, accès « enfant » ;
 * - jeton profil (scope « profile ») : délivré par le PIN parent, requis pour l'espace parent.
 * Le jeton profil est envoyé en priorité ; il ne survit pas à la session parent de 30 min.
 */

import sessionService from './sessionService.js'
import familyGateService from './familyGateService.js'
import { readProfileToken, storeProfileToken, clearProfileToken } from './authStorage.js'
import { decodeJwtPayload, isJwtExpired } from '../utils/jwt.js'

/**
 * Erreur HTTP enrichie (statut, code backend, délai avant nouvel essai)
 */
export class ApiError extends Error {
  constructor (message, { status = 0, code = null, data = null, retryAfterSeconds = null, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
    this.retryAfterSeconds = retryAfterSeconds
    if (cause) this.cause = cause
  }
}

// Endpoints appelés sans jeton (le serveur ne l'exige pas)
const PUBLIC_ENDPOINTS = ['/api/auth/login', '/api/auth/logout', '/api/auth/verify']

// Endpoints qui vérifient un code : un 401 y signifie « code incorrect », pas « session expirée »
function isCredentialEndpoint (path) {
  return path === '/api/auth/login' ||
    path === '/api/auth/family-gate' ||
    /^\/api\/profiles\/[^/]+\/pin$/.test(path)
}

function formatWaitDelay (seconds) {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} min`
}

async function readJsonSafely (response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

class ApiService {
  constructor() {
    // URL du backend - adapter selon l'environnement
    const isDevelopment = import.meta.env.DEV
    // En développement, utiliser le proxy Vite (chemin relatif)
    // En production, utiliser l'URL complète du backend
    this.baseURL = isDevelopment
      ? (import.meta.env.VITE_API_URL || '') // Proxy Vite utilise des chemins relatifs
      : (import.meta.env.VITE_API_URL_PROD || 'https://www.teach-digital.fr')
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
  resolveAuth(auth, isPublicEndpoint) {
    if (auth === 'none') return { token: null, kind: null }
    if (auth === 'profile') {
      const token = this.getProfileToken()
      return { token, kind: token ? 'profile' : null }
    }
    if (isPublicEndpoint) return { token: null, kind: null }

    const profileToken = this.getProfileToken()
    if (profileToken) return { token: profileToken, kind: 'profile' }
    const familyToken = familyGateService.getToken()
    return { token: familyToken, kind: familyToken ? 'family' : null }
  }

  /**
   * Session refusée par le serveur : supprimer le jeton concerné, puis prévenir le router
   * (jamais d'appel réseau ici, pour éviter toute boucle de déconnexion)
   */
  handleUnauthorized(kind, endpoint) {
    const expiredKind = kind === 'profile' ? 'profile' : 'family'
    if (expiredKind === 'profile') {
      // Efface la session parent et le jeton profil
      sessionService.clearSession()
      clearProfileToken()
    } else {
      familyGateService.clearFamilySession()
    }
    this.notifyAuthError(expiredKind, endpoint)
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
  async buildHttpError(response, { path, method, tokenKind }) {
    const status = response.status
    const body = await readJsonSafely(response)
    const serverMessage = typeof body?.message === 'string' && body.message ? body.message : null
    const code = body?.code || null
    const details = { status, code, data: body }

    if (status === 401) {
      if (path === '/api/auth/login') {
        return new ApiError(serverMessage || 'Code PIN incorrect', { ...details, code: code || 'INVALID_PIN' })
      }
      if (path === '/api/auth/family-gate' && method === 'POST') {
        return new ApiError('Code incorrect', { ...details, code: code || 'INVALID_CODE' })
      }
      if (path === '/api/auth/logout') {
        return new ApiError(serverMessage || 'Déconnexion impossible', details)
      }
      if (isCredentialEndpoint(path) && code !== 'UNAUTHORIZED') {
        return new ApiError(serverMessage || 'Code incorrect', { ...details, code: code || 'INVALID_CODE' })
      }

      // Jeton absent, invalide ou expiré
      this.handleUnauthorized(tokenKind, path)
      const message = tokenKind === 'profile'
        ? 'Session parent expirée - Veuillez saisir à nouveau votre code PIN'
        : 'Session expirée - Veuillez saisir à nouveau le code familial'
      return new ApiError(message, { ...details, code: 'SESSION_EXPIRED' })
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
      const isPinLock = code === 'PIN_LOCKED' || code === 'RATE_LIMIT_PIN'
      const message = isPinLock
        ? `Trop de codes incorrects : l'accès est temporairement bloqué.${wait}`
        : `Trop de requêtes envoyées au serveur.${wait}`
      return new ApiError(message, { ...details, code: code || 'RATE_LIMITED', retryAfterSeconds })
    }

    if (status === 413) {
      return new ApiError('Erreur HTTP: 413 - Les fichiers sont trop volumineux. Veuillez réduire la taille des images ou utiliser moins de fichiers.', details)
    }
    if (status === 504) {
      return new ApiError('Timeout: Le serveur a pris trop de temps à répondre. Veuillez réessayer.', details)
    }
    if (code === 'OFFLINE' && serverMessage) {
      return new ApiError(serverMessage, details)
    }
    if (status >= 500) {
      if (serverMessage) console.error(`Erreur ${status} du serveur:`, serverMessage)
      return new ApiError(
        serverMessage ? `Erreur serveur: ${serverMessage}` : `Erreur HTTP ${status}: Le serveur a rencontré une erreur interne`,
        details
      )
    }

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

    // Endpoints qui nécessitent un timeout plus long
    const longTimeoutEndpoints = [
      '/api/ai/generate-quiz-from-documents',
      '/api/ai/extract-text-from-documents',
      '/api/ai/generate-quiz-from-analyses'
    ]
    const isLongTimeoutEndpoint = longTimeoutEndpoints.includes(path)

    // Timeout plus long pour le login (peut prendre du temps avec la vérification du PIN)
    // Timeout de 180s pour la génération de quiz depuis documents (traitement LLM long avec plusieurs documents)
    const timeout = isPublicEndpoint ? 60000 : (isLongTimeoutEndpoint ? 180000 : 30000) // 60s pour login, 180s pour génération quiz documents, 30s pour les autres

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
    const { token, kind: tokenKind } = this.resolveAuth(auth, isPublicEndpoint)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else if (!isPublicEndpoint && import.meta.env.DEV) {
      // Le backend répondra 401 : la redirection vers le code familial suivra
      console.warn('⚠️ Aucun token d\'authentification trouvé pour:', endpoint)
    }

    try {
      const response = await this.fetchWithTimeout(url, config, timeout)

      if (!response.ok) {
        throw await this.buildHttpError(response, { path, method, tokenKind })
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur API:', error)
      throw error
    }
  }

  /**
   * Connexion avec profil et code PIN.
   * Un 401 signifie « code PIN incorrect » (pas une expiration de session).
   * Pour un profil administrateur, la session parent (30 min) est ouverte ici.
   */
  async login(profileId, pin) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ profileId, pin })
    })

    if (!response?.success || !response.data?.token) {
      throw new ApiError(response?.message || 'Erreur de connexion', { status: 200, data: response })
    }

    const { token, profile } = response.data
    const payload = decodeJwtPayload(token)

    // Repartir d'un état propre : un seul jeton profil à la fois
    sessionService.clearSession()
    storeProfileToken(token, profile || null)

    if (payload?.isAdmin === true) {
      const id = payload.profileId ?? profile?.id ?? profileId
      sessionService.createSession(String(id), profile?.name || payload.name || '')
    }
    return response.data
  }

  /**
   * Supprimer localement le jeton profil et la session parent (sans appel réseau)
   */
  clearProfileSession() {
    sessionService.clearSession()
    clearProfileToken()
  }

  /**
   * Déconnexion de l'espace parent : supprime le jeton profil et la session parent.
   * La session famille est conservée (retour au choix des profils).
   */
  async logout() {
    const hadToken = !!readProfileToken()
    this.clearProfileSession()
    if (!hadToken) return

    try {
      // Jetons sans état côté serveur : appel informatif, ses erreurs sont ignorées
      await this.request('/api/auth/logout', { method: 'POST', auth: 'none' })
    } catch (error) {
      console.warn('Erreur de déconnexion (ignorée):', error?.message || error)
    }
  }

  /**
   * Vérifier le jeton profil auprès du serveur (le jeton famille n'est pas un utilisateur connecté)
   * @returns {Promise<Object|null>} Utilisateur du jeton profil, ou null
   */
  async verifyToken() {
    if (!this.getProfileToken()) return null
    try {
      const response = await this.request('/api/auth/verify', { auth: 'profile' })
      const data = response?.success ? response.data : null
      if (!data?.user) return null
      if (data.scope && data.scope !== 'profile') return null
      return data.user
    } catch {
      // 401 : jeton déjà supprimé par request() ; autre erreur : on réessaiera plus tard
      return null
    }
  }

  /**
   * Vérifier si un parent / profil est connecté (jeton profil valide)
   */
  isAuthenticated() {
    return !!this.getProfileToken()
  }

  /**
   * Récupérer tous les profils
   */
  async getProfiles() {
    const response = await this.request('/api/profiles')
    return response.success ? response.data.profiles : []
  }

  /**
   * Récupérer un profil par ID
   */
  async getProfile(id) {
    const response = await this.request(`/api/profiles/${id}`)
    return response.success ? response.data.profile : null
  }

  /**
   * Créer un profil
   */
  async createProfile(profileData) {
    const response = await this.request('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(profileData)
    })
    return response.success ? response.data.profile : null
  }

  /**
   * Modifier un profil
   */
  async updateProfile(id, profileData) {
    const response = await this.request(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
    return response.success ? response.data.profile : null
  }

  /**
   * Supprimer un profil
   */
  async deleteProfile(id) {
    const response = await this.request(`/api/profiles/${id}`, {
      method: 'DELETE'
    })
    return response.success
  }

  /**
   * Vérifier un code PIN (vérification unique côté client : PinService n'en a plus).
   * Le serveur verrouille le profil après trop d'échecs (429 PIN_LOCKED).
   * Pour déverrouiller l'espace parent, utiliser login() qui délivre aussi le jeton.
   */
  async verifyPin(profileId, pin) {
    if (!pin) return false

    const response = await this.request(`/api/profiles/${profileId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pin })
    })
    // Le backend retourne toujours success: true mais avec data.isValid qui indique la validité réelle
    return response.success && response.data && response.data.isValid === true
  }

  /**
   * Mettre à jour le code PIN
   */
  async updatePin(profileId, newPin, currentPin = null) {
    const response = await this.request(`/api/profiles/${profileId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ newPin, currentPin })
    })
    return response.success
  }

  /**
   * Récupérer les informations du code PIN
   */
  async getPinInfo(profileId) {
    const response = await this.request(`/api/profiles/${profileId}/pin`, {
      method: 'GET'
    })
    return response.success ? response.data : null
  }

  /**
   * Récupérer les leçons
   */
  async getLessons(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value)
      }
    })

    const endpoint = params.toString() ? `/api/lessons?${params}` : '/api/lessons'
    const response = await this.request(endpoint)
    return response.success ? response.data.lessons : []
  }

  /**
   * Récupérer une leçon par ID
   */
  async getLesson(id) {
    const response = await this.request(`/api/lessons/${id}`)
    return response.success ? response.data.lesson : null
  }

  /**
   * Créer une leçon
   */
  async createLesson(lessonData) {
    const response = await this.request('/api/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData)
    })
    return response.success ? response.data.lesson : null
  }

  /**
   * Modifier une leçon
   */
  async updateLesson(id, lessonData) {
    const response = await this.request(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData)
    })
    return response.success ? response.data.lesson : null
  }

  /**
   * Supprimer une leçon
   */
  async deleteLesson(id) {
    const response = await this.request(`/api/lessons/${id}`, {
      method: 'DELETE'
    })
    return response.success
  }

  /**
   * Sauvegarder un résultat de quiz
   */
  async saveQuizResult(lessonId, resultData) {
    const response = await this.request(`/api/lessons/${lessonId}/quiz-results`, {
      method: 'POST',
      body: JSON.stringify(resultData)
    })
    return response.success ? response.data.result : null
  }

  /**
   * Récupérer les pages de cours HTML (sans leur contenu)
   */
  async getCoursePages(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value)
      }
    })

    const endpoint = params.toString() ? `/api/course-pages?${params}` : '/api/course-pages'
    const response = await this.request(endpoint)
    return response.success ? response.data.coursePages : []
  }

  /**
   * Récupérer une page de cours avec son contenu HTML
   */
  async getCoursePage(id) {
    const response = await this.request(`/api/course-pages/${id}`)
    return response.success ? response.data.coursePage : null
  }

  /**
   * Publier une page de cours pour un enfant
   */
  async createCoursePage(coursePageData) {
    const response = await this.request('/api/course-pages', {
      method: 'POST',
      body: JSON.stringify(coursePageData)
    })
    return response.success ? response.data.coursePage : null
  }

  /**
   * Modifier une page de cours (titre, contenu, visibilité...)
   */
  async updateCoursePage(id, coursePageData) {
    const response = await this.request(`/api/course-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(coursePageData)
    })
    return response.success ? response.data.coursePage : null
  }

  /**
   * Enregistrer une session de révision sur une page de cours (première sauvegarde).
   * keepalive : la requête part même si la page se ferme.
   */
  async saveCoursePageResult(coursePageId, resultData, { keepalive = false } = {}) {
    const response = await this.request(`/api/course-pages/${coursePageId}/results`, {
      method: 'POST',
      body: JSON.stringify(resultData),
      keepalive
    })
    return response.success ? response.data : null
  }

  /**
   * Mettre à jour une session de révision en cours.
   * keepalive : la requête part même si la page se ferme.
   */
  async updateCoursePageResult(coursePageId, resultId, resultData, { keepalive = false } = {}) {
    const response = await this.request(`/api/course-pages/${coursePageId}/results/${resultId}`, {
      method: 'PUT',
      body: JSON.stringify(resultData),
      keepalive
    })
    return response.success ? response.data : null
  }

  /**
   * Supprimer une page de cours
   */
  async deleteCoursePage(id) {
    const response = await this.request(`/api/course-pages/${id}`, {
      method: 'DELETE'
    })
    return response.success
  }

  /**
   * Récupérer les notifications
   */
  async getNotifications(filters = {}) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value)
      }
    })

    const endpoint = params.toString() ? `/api/notifications?${params}` : '/api/notifications'
    const response = await this.request(endpoint)
    return response.success ? response.data.notifications : []
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(id) {
    const response = await this.request(`/api/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isRead: true })
    })
    return response.success
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(profileId = null) {
    const response = await this.request('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ profileId })
    })
    return response.success
  }

  /**
   * Récupérer toutes les activités
   */
  async getActivities() {
    const response = await this.request('/api/activities')
    return response.success ? response.data.activities : []
  }

  /**
   * Récupérer les statistiques des activités
   */
  async getActivityStats() {
    const response = await this.request('/api/activities/stats')
    return response.success ? response.data.stats : null
  }

  /**
   * Récupérer toutes les vidéos YouTube
   */
  async getYouTubeVideos() {
    const response = await this.request('/api/youtube-videos')
    return response.success ? response.data.videos : []
  }

  /**
   * Récupérer les statistiques globales des profils
   */
  async getProfileStats() {
    const response = await this.request('/api/profiles/stats')
    return response.success ? response.data : null
  }
}

// Instance singleton
export const apiService = new ApiService()
export default apiService
