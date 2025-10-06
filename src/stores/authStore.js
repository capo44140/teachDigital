import { defineStore } from 'pinia';
import { PinService, SessionService } from '../services/profile/index.js';

/**
 * Store pour la gestion de l'authentification
 * Gère les sessions, codes PIN et état d'authentification
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentProfile: null,
    isAuthenticated: false,
    sessionToken: null,
    isLoading: false,
    error: null,
    pinAttempts: 0,
    maxPinAttempts: 3,
    isLocked: false
  }),

  getters: {
    // Vérifier si l'utilisateur est authentifié
    isLoggedIn: (state) => state.isAuthenticated && state.currentProfile !== null,
    
    // Vérifier si le profil est un administrateur
    isAdmin: (state) => state.currentProfile?.is_admin || false,
    
    // Vérifier si le profil est un enfant
    isChild: (state) => state.currentProfile?.is_child || false,
    
    // Vérifier si le profil est un adolescent
    isTeen: (state) => state.currentProfile?.is_teen || false,
    
    // Vérifier si le compte est verrouillé
    isAccountLocked: (state) => state.isLocked || state.pinAttempts >= state.maxPinAttempts,
    
    // Récupérer le nom du profil actuel
    profileName: (state) => state.currentProfile?.name || 'Utilisateur',
    
    // Récupérer le type de profil
    profileType: (state) => state.currentProfile?.type || 'unknown'
  },

  actions: {
    /**
     * Vérifier un code PIN
     * @param {number} profileId - ID du profil
     * @param {string} pin - Code PIN à vérifier
     * @returns {Promise<boolean>} Succès de la vérification
     */
    async verifyPin(profileId, pin) {
      this.isLoading = true;
      this.error = null;
      
      try {
        // Vérifier si le compte est verrouillé
        if (this.isAccountLocked) {
          throw new Error('Compte verrouillé. Trop de tentatives incorrectes.');
        }
        
        const isValid = await PinService.verifyPin(profileId, pin);
        
        if (isValid) {
          this.pinAttempts = 0;
          this.isLocked = false;
          console.log('✅ Code PIN vérifié avec succès');
        } else {
          this.pinAttempts++;
          if (this.pinAttempts >= this.maxPinAttempts) {
            this.isLocked = true;
            throw new Error('Compte verrouillé. Trop de tentatives incorrectes.');
          }
          throw new Error('Code PIN incorrect');
        }
        
        return isValid;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la vérification du code PIN:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Mettre à jour le code PIN
     * @param {number} profileId - ID du profil
     * @param {string} newPin - Nouveau code PIN
     */
    async updatePin(profileId, newPin) {
      this.isLoading = true;
      this.error = null;
      
      try {
        // Valider le format du code PIN
        const validation = PinService.validatePin(newPin);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }
        
        await PinService.updatePin(profileId, newPin);
        console.log('✅ Code PIN mis à jour avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la mise à jour du code PIN:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Créer une session
     * @param {number} profileId - ID du profil
     * @param {Object} profile - Données du profil
     */
    async createSession(profileId, profile) {
      try {
        // Générer un token de session
        const sessionToken = this.generateSessionToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Session de 24h
        
        // Créer la session en base
        await SessionService.createSession(profileId, sessionToken, expiresAt);
        
        // Mettre à jour l'état local
        this.currentProfile = profile;
        this.isAuthenticated = true;
        this.sessionToken = sessionToken;
        this.pinAttempts = 0;
        this.isLocked = false;
        
        // Stocker en sessionStorage
        sessionStorage.setItem('authToken', sessionToken);
        sessionStorage.setItem('profileId', profileId.toString());
        
        console.log('✅ Session créée avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la création de la session:', error);
        throw error;
      }
    },

    /**
     * Vérifier une session existante
     * @param {string} token - Token de session
     */
    async verifySession(token) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const session = await SessionService.verifySession(token);
        
        if (session) {
          this.currentProfile = {
            id: session.profile_id,
            name: session.name,
            type: session.type,
            is_admin: session.is_admin,
            is_child: session.is_child,
            is_teen: session.is_teen
          };
          this.isAuthenticated = true;
          this.sessionToken = token;
          console.log('✅ Session vérifiée avec succès');
        } else {
          this.logout();
        }
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la vérification de la session:', error);
        this.logout();
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Déconnexion
     */
    async logout() {
      try {
        if (this.sessionToken) {
          await SessionService.deleteSession(this.sessionToken);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la suppression de la session:', error);
      } finally {
        // Nettoyer l'état local
        this.currentProfile = null;
        this.isAuthenticated = false;
        this.sessionToken = null;
        this.pinAttempts = 0;
        this.isLocked = false;
        this.error = null;
        
        // Nettoyer le sessionStorage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('profileId');
        
        console.log('✅ Déconnexion réussie');
      }
    },

    /**
     * Initialiser l'authentification depuis le sessionStorage
     */
    async initializeAuth() {
      const token = sessionStorage.getItem('authToken');
      const profileId = sessionStorage.getItem('profileId');
      
      if (token && profileId) {
        await this.verifySession(token);
      }
    },

    /**
     * Générer un token de session sécurisé
     * @returns {string} Token de session
     */
    generateSessionToken() {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2);
      return btoa(`${timestamp}-${random}`).replace(/[^a-zA-Z0-9]/g, '');
    },

    /**
     * Déverrouiller le compte (pour les administrateurs)
     */
    unlockAccount() {
      this.isLocked = false;
      this.pinAttempts = 0;
      console.log('✅ Compte déverrouillé');
    },

    /**
     * Nettoyer les erreurs
     */
    clearError() {
      this.error = null;
    },

    /**
     * Réinitialiser l'état
     */
    reset() {
      this.currentProfile = null;
      this.isAuthenticated = false;
      this.sessionToken = null;
      this.isLoading = false;
      this.error = null;
      this.pinAttempts = 0;
      this.isLocked = false;
    }
  }
});
