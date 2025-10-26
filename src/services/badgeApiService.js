/**
 * Service API pour la gestion des badges
 */
class BadgeApiService {
  constructor() {
    // URL du backend - adapter selon l'environnement
    const isDevelopment = import.meta.env.DEV;
    this.baseURL = isDevelopment 
      ? 'http://localhost:3000' 
      : 'https://teachdigital-backend.vercel.app';
  }

  /**
   * Obtenir le token d'authentification
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Effectuer une requête HTTP
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Ajouter le token d'authentification si disponible
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide
          localStorage.removeItem('auth_token');
          throw new Error('Session expirée - Veuillez vous reconnecter');
        }
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur API badges:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les badges
   */
  async getAllBadges() {
    try {
      const response = await this.request('/api/badges');
      return response.data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error);
      throw error;
    }
  }

  /**
   * Récupérer un badge par ID
   */
  async getBadgeById(badgeId) {
    try {
      const response = await this.request(`/api/badges/${badgeId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du badge:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau badge
   */
  async createBadge(badgeData) {
    try {
      const response = await this.request('/api/badges', {
        method: 'POST',
        body: JSON.stringify(badgeData)
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du badge:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un badge
   */
  async updateBadge(badgeId, badgeData) {
    try {
      const response = await this.request(`/api/badges/${badgeId}`, {
        method: 'PUT',
        body: JSON.stringify(badgeData)
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du badge:', error);
      throw error;
    }
  }

  /**
   * Supprimer un badge
   */
  async deleteBadge(badgeId) {
    try {
      const response = await this.request(`/api/badges/${badgeId}`, {
        method: 'DELETE'
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression du badge:', error);
      throw error;
    }
  }

  /**
   * Récupérer les badges par catégorie
   */
  async getBadgesByCategory(category) {
    try {
      const allBadges = await this.getAllBadges();
      return allBadges.filter(badge => badge.category === category);
    } catch (error) {
      console.error('Erreur lors de la récupération des badges par catégorie:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des badges
   */
  async getBadgeStats() {
    try {
      const badges = await this.getAllBadges();
      const activeBadges = badges.filter(badge => badge.is_active);
      
      return {
        total: badges.length,
        active: activeBadges.length,
        inactive: badges.length - activeBadges.length,
        categories: [...new Set(badges.map(b => b.category))].length
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}

export default new BadgeApiService();
