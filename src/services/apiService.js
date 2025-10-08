/**
 * Service API pour communiquer avec le backend Vercel Functions
 */

class ApiService {
  constructor() {
    // URL du backend - à adapter selon votre déploiement
    this.baseURL = import.meta.env.VITE_API_URL || 'https://backend-sepia-mu.vercel.app';
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Effectuer une requête HTTP
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Ajouter le token d'authentification si disponible
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide
          this.logout();
          throw new Error('Session expirée');
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
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
      });

      if (response.success) {
        this.token = response.data.token;
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('user_profile', JSON.stringify(response.data.profile));
        return response.data;
      } else {
        throw new Error(response.message || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  /**
   * Déconnexion
   */
  async logout() {
    try {
      if (this.token) {
        await this.request('/api/auth/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_profile');
    }
  }

  /**
   * Vérifier le token
   */
  async verifyToken() {
    try {
      const response = await this.request('/api/auth/verify');
      return response.success ? response.data.user : null;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Obtenir le token d'authentification
   */
  getToken() {
    return this.token;
  }

  /**
   * Récupérer tous les profils
   */
  async getProfiles() {
    const response = await this.request('/api/profiles');
    return response.success ? response.data.profiles : [];
  }

  /**
   * Récupérer un profil par ID
   */
  async getProfile(id) {
    const response = await this.request(`/api/profiles/${id}`);
    return response.success ? response.data.profile : null;
  }

  /**
   * Créer un profil
   */
  async createProfile(profileData) {
    const response = await this.request('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
    return response.success ? response.data.profile : null;
  }

  /**
   * Modifier un profil
   */
  async updateProfile(id, profileData) {
    const response = await this.request(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return response.success ? response.data.profile : null;
  }

  /**
   * Supprimer un profil
   */
  async deleteProfile(id) {
    const response = await this.request(`/api/profiles/${id}`, {
      method: 'DELETE'
    });
    return response.success;
  }

  /**
   * Mettre à jour le code PIN
   */
  async updatePin(profileId, newPin, currentPin = null) {
    const response = await this.request(`/api/profiles/${profileId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ newPin, currentPin })
    });
    return response.success;
  }

  /**
   * Récupérer les leçons
   */
  async getLessons(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    
    const endpoint = params.toString() ? `/api/lessons?${params}` : '/api/lessons';
    const response = await this.request(endpoint);
    return response.success ? response.data.lessons : [];
  }

  /**
   * Récupérer une leçon par ID
   */
  async getLesson(id) {
    const response = await this.request(`/api/lessons/${id}`);
    return response.success ? response.data.lesson : null;
  }

  /**
   * Créer une leçon
   */
  async createLesson(lessonData) {
    const response = await this.request('/api/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });
    return response.success ? response.data.lesson : null;
  }

  /**
   * Modifier une leçon
   */
  async updateLesson(id, lessonData) {
    const response = await this.request(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData)
    });
    return response.success ? response.data.lesson : null;
  }

  /**
   * Supprimer une leçon
   */
  async deleteLesson(id) {
    const response = await this.request(`/api/lessons/${id}`, {
      method: 'DELETE'
    });
    return response.success;
  }

  /**
   * Sauvegarder un résultat de quiz
   */
  async saveQuizResult(lessonId, resultData) {
    const response = await this.request(`/api/lessons/${lessonId}/quiz-results`, {
      method: 'POST',
      body: JSON.stringify(resultData)
    });
    return response.success ? response.data.result : null;
  }

  /**
   * Récupérer les notifications
   */
  async getNotifications(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    
    const endpoint = params.toString() ? `/api/notifications?${params}` : '/api/notifications';
    const response = await this.request(endpoint);
    return response.success ? response.data.notifications : [];
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(id) {
    const response = await this.request(`/api/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isRead: true })
    });
    return response.success;
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(profileId = null) {
    const response = await this.request('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ profileId })
    });
    return response.success;
  }

  /**
   * Récupérer toutes les activités
   */
  async getActivities() {
    const response = await this.request('/api/activities');
    return response.success ? response.data.activities : [];
  }

  /**
   * Récupérer les statistiques des activités
   */
  async getActivityStats() {
    const response = await this.request('/api/activities/stats');
    return response.success ? response.data.stats : null;
  }

  /**
   * Récupérer toutes les vidéos YouTube
   */
  async getYouTubeVideos() {
    const response = await this.request('/api/youtube-videos');
    return response.success ? response.data.videos : [];
  }

  /**
   * Récupérer les statistiques détaillées d'un profil
   */
  async getProfileStats(profileId) {
    const response = await this.request(`/api/profiles/${profileId}/stats`);
    return response.success ? response.data.stats : null;
  }
}

// Instance singleton
export const apiService = new ApiService();
export default apiService;
