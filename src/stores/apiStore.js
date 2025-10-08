import { defineStore } from 'pinia';
import { apiService } from '../services/apiService.js';

export const useApiStore = defineStore('api', {
  state: () => ({
    // État d'authentification
    isAuthenticated: false,
    user: null,
    token: null,
    
    // État de chargement
    loading: false,
    error: null,
    
    // Données mises en cache
    profiles: [],
    lessons: [],
    notifications: []
  }),

  getters: {
    isAdmin: (state) => state.user?.isAdmin || false,
    isChild: (state) => state.user?.isChild || false,
    isTeen: (state) => state.user?.isTeen || false,
    currentProfile: (state) => state.user,
    
    // Notifications non lues
    unreadNotifications: (state) => state.notifications.filter(n => !n.is_read),
    unreadCount: (state) => state.notifications.filter(n => !n.is_read).length
  },

  actions: {
    /**
     * Initialiser l'état depuis le localStorage
     */
    async initialize() {
      try {
        const token = localStorage.getItem('auth_token');
        const userProfile = localStorage.getItem('user_profile');
        
        if (token && userProfile) {
          this.token = token;
          this.user = JSON.parse(userProfile);
          
          // Vérifier que le token est toujours valide
          const verifiedUser = await apiService.verifyToken();
          if (verifiedUser) {
            this.isAuthenticated = true;
            this.user = verifiedUser;
          } else {
            this.logout();
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        this.logout();
      }
    },

    /**
     * Connexion
     */
    async login(profileId, pin) {
      this.loading = true;
      this.error = null;
      
      try {
        const result = await apiService.login(profileId, pin);
        
        this.isAuthenticated = true;
        this.user = result.profile;
        this.token = result.token;
        
        // Charger les données initiales
        await this.loadInitialData();
        
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Déconnexion
     */
    async logout() {
      try {
        await apiService.logout();
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      } finally {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        this.profiles = [];
        this.lessons = [];
        this.notifications = [];
        this.error = null;
      }
    },

    /**
     * Charger les données initiales
     */
    async loadInitialData() {
      try {
        await Promise.all([
          this.loadProfiles(),
          this.loadLessons(),
          this.loadNotifications()
        ]);
      } catch (error) {
        console.error('Erreur lors du chargement des données initiales:', error);
      }
    },

    /**
     * Charger les profils
     */
    async loadProfiles() {
      try {
        this.profiles = await apiService.getProfiles();
      } catch (error) {
        console.error('Erreur lors du chargement des profils:', error);
        this.error = 'Erreur lors du chargement des profils';
      }
    },

    /**
     * Charger les leçons
     */
    async loadLessons(filters = {}) {
      try {
        this.lessons = await apiService.getLessons(filters);
      } catch (error) {
        console.error('Erreur lors du chargement des leçons:', error);
        this.error = 'Erreur lors du chargement des leçons';
      }
    },

    /**
     * Charger les notifications
     */
    async loadNotifications(filters = {}) {
      try {
        this.notifications = await apiService.getNotifications(filters);
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        this.error = 'Erreur lors du chargement des notifications';
      }
    },

    /**
     * Créer un profil
     */
    async createProfile(profileData) {
      try {
        const newProfile = await apiService.createProfile(profileData);
        if (newProfile) {
          this.profiles.push(newProfile);
        }
        return newProfile;
      } catch (error) {
        console.error('Erreur lors de la création du profil:', error);
        this.error = 'Erreur lors de la création du profil';
        throw error;
      }
    },

    /**
     * Modifier un profil
     */
    async updateProfile(id, profileData) {
      try {
        const updatedProfile = await apiService.updateProfile(id, profileData);
        if (updatedProfile) {
          const index = this.profiles.findIndex(p => p.id === id);
          if (index !== -1) {
            this.profiles[index] = updatedProfile;
          }
        }
        return updatedProfile;
      } catch (error) {
        console.error('Erreur lors de la modification du profil:', error);
        this.error = 'Erreur lors de la modification du profil';
        throw error;
      }
    },

    /**
     * Supprimer un profil
     */
    async deleteProfile(id) {
      try {
        const success = await apiService.deleteProfile(id);
        if (success) {
          this.profiles = this.profiles.filter(p => p.id !== id);
        }
        return success;
      } catch (error) {
        console.error('Erreur lors de la suppression du profil:', error);
        this.error = 'Erreur lors de la suppression du profil';
        throw error;
      }
    },

    /**
     * Créer une leçon
     */
    async createLesson(lessonData) {
      try {
        const newLesson = await apiService.createLesson(lessonData);
        if (newLesson) {
          this.lessons.unshift(newLesson);
        }
        return newLesson;
      } catch (error) {
        console.error('Erreur lors de la création de la leçon:', error);
        this.error = 'Erreur lors de la création de la leçon';
        throw error;
      }
    },

    /**
     * Modifier une leçon
     */
    async updateLesson(id, lessonData) {
      try {
        const updatedLesson = await apiService.updateLesson(id, lessonData);
        if (updatedLesson) {
          const index = this.lessons.findIndex(l => l.id === id);
          if (index !== -1) {
            this.lessons[index] = updatedLesson;
          }
        }
        return updatedLesson;
      } catch (error) {
        console.error('Erreur lors de la modification de la leçon:', error);
        this.error = 'Erreur lors de la modification de la leçon';
        throw error;
      }
    },

    /**
     * Supprimer une leçon
     */
    async deleteLesson(id) {
      try {
        const success = await apiService.deleteLesson(id);
        if (success) {
          this.lessons = this.lessons.filter(l => l.id !== id);
        }
        return success;
      } catch (error) {
        console.error('Erreur lors de la suppression de la leçon:', error);
        this.error = 'Erreur lors de la suppression de la leçon';
        throw error;
      }
    },

    /**
     * Marquer une notification comme lue
     */
    async markNotificationAsRead(id) {
      try {
        const success = await apiService.markNotificationAsRead(id);
        if (success) {
          const notification = this.notifications.find(n => n.id === id);
          if (notification) {
            notification.is_read = true;
          }
        }
        return success;
      } catch (error) {
        console.error('Erreur lors du marquage de la notification:', error);
        throw error;
      }
    },

    /**
     * Marquer toutes les notifications comme lues
     */
    async markAllNotificationsAsRead() {
      try {
        const success = await apiService.markAllNotificationsAsRead();
        if (success) {
          this.notifications.forEach(n => n.is_read = true);
        }
        return success;
      } catch (error) {
        console.error('Erreur lors du marquage des notifications:', error);
        throw error;
      }
    },

    /**
     * Effacer l'erreur
     */
    clearError() {
      this.error = null;
    }
  }
});
