/**
 * Service API pour communiquer avec le backend
 */

class ApiService {
  constructor() {
    // URL du backend - adapter selon l'environnement
    const isDevelopment = import.meta.env.DEV
    // En développement, utiliser le proxy Vite (chemin relatif)
    // En production, utiliser l'URL complète du backend
    this.baseURL = isDevelopment
      ? (import.meta.env.VITE_API_URL || '') // Proxy Vite utilise des chemins relatifs
      : (import.meta.env.VITE_API_URL_PROD || 'https://www.teach-digital.fr')
  }

  /**
   * Obtenir le token d'authentification depuis le localStorage
   * @returns {string|null} Le token JWT ou null si absent
   */
  getToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('authToken')
  }

  /**
   * Vérifier si un token est présent et valide
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
        throw new Error('Timeout: Le serveur a pris trop de temps à répondre. Veuillez réessayer.')
      }
      throw error
    }
  }

  /**
   * Effectuer une requête HTTP
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getToken()

    // Endpoints qui ne nécessitent pas de token
    // POST /api/auth/family-gate ne nécessite pas de token ; PUT (config) si (admin)
    const method = String(options.method || 'GET').toUpperCase()
    const publicEndpoints = ['/api/auth/login', '/api/auth/logout']
    const isPublicEndpoint =
      publicEndpoints.includes(endpoint) ||
      (endpoint === '/api/auth/family-gate' && method === 'POST')

    // Endpoints qui nécessitent un timeout plus long
    const longTimeoutEndpoints = [
      '/api/ai/generate-quiz-from-documents',
      '/api/ai/extract-text-from-documents',
      '/api/ai/generate-quiz-from-analyses'
    ]
    const isLongTimeoutEndpoint = longTimeoutEndpoints.includes(endpoint)

    // Timeout plus long pour le login (peut prendre du temps avec la vérification du PIN)
    // Timeout de 180s pour la génération de quiz depuis documents (traitement LLM long avec plusieurs documents)
    const timeout = isPublicEndpoint ? 60000 : (isLongTimeoutEndpoint ? 180000 : 30000) // 60s pour login, 180s pour génération quiz documents, 30s pour les autres

    // Ne pas définir Content-Type si le body est FormData (le navigateur le fait automatiquement)
    const isFormData = options.body instanceof FormData

    const config = {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers
      },
      ...options
    }

    // Ajouter le token d'authentification si disponible
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else if (!isPublicEndpoint) {
      // Afficher un avertissement uniquement en développement
      if (import.meta.env.DEV) {
        console.warn('⚠️ Aucun token d\'authentification trouvé pour:', endpoint)
      }
      // Ne pas bloquer la requête, laisser le backend gérer l'erreur 401
    }

    try {
      const response = await this.fetchWithTimeout(url, config, timeout)

      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401) {
          // Code familial incorrect (pas de logout)
          if (endpoint === '/api/auth/family-gate') {
            throw new Error('Code incorrect')
          }
          // Token expiré ou invalide (pour les autres endpoints)
          localStorage.removeItem('auth_token')
          this.logout()
          throw new Error('Session expirée - Veuillez vous reconnecter')
        }
        if (response.status === 413) {
          throw new Error('Erreur HTTP: 413 - Les fichiers sont trop volumineux. Veuillez réduire la taille des images ou utiliser moins de fichiers.')
        }
        if (response.status === 504) {
          throw new Error('Timeout: Le serveur a pris trop de temps à répondre. Veuillez réessayer.')
        }

        // Pour les erreurs 500, essayer de récupérer le message d'erreur du backend
        if (response.status === 500) {
          try {
            const errorData = await response.json()
            const errorMessage = errorData.message || errorData.error || 'Erreur interne du serveur'
            console.error('Erreur 500 du serveur:', errorMessage)
            throw new Error(`Erreur serveur: ${errorMessage}`)
          } catch (parseError) {
            // Si on ne peut pas parser la réponse, utiliser le message par défaut
            throw new Error('Erreur HTTP 500: Le serveur a rencontré une erreur interne')
          }
        }

        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erreur API:', error)
      throw error
    }
  }

  /**
   * Connexion avec profil et code PIN
   */
  async login(profileId, pin) {
    try {
      const response = await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ profileId, pin })
      })

      if (response.success) {
        const token = response.data.token
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_profile', JSON.stringify(response.data.profile))
        return response.data
      } else {
        throw new Error(response.message || 'Erreur de connexion')
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      throw error
    }
  }

  /**
   * Déconnexion
   */
  async logout() {
    try {
      const token = this.getToken()
      if (token) {
        await this.request('/api/auth/logout', {
          method: 'POST'
        })
      }
    } catch (error) {
      console.error('Erreur de déconnexion:', error)
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_profile')
    }
  }

  /**
   * Vérifier le token
   */
  async verifyToken() {
    try {
      const response = await this.request('/api/auth/verify')
      return response.success ? response.data.user : null
    } catch (_error) {
      this.logout()
      return null
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return !!this.getToken()
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
   * Vérifier un code PIN
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
