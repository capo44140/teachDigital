import { defineStore } from 'pinia';
import { ProfileService, PinService, SessionService } from '../services/profileService.js';

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profiles: [],
    currentProfile: null,
    isLoading: false,
    error: null,
    stats: {
      total: 0,
      active: 0,
      children: 0,
      teens: 0,
      admins: 0
    }
  }),

  getters: {
    // Récupérer les profils actifs
    activeProfiles: (state) => state.profiles.filter(profile => profile.is_active),
    
    // Récupérer les profils enfants
    childProfiles: (state) => state.profiles.filter(profile => profile.is_child),
    
    // Récupérer les profils adolescents
    teenProfiles: (state) => state.profiles.filter(profile => profile.is_teen),
    
    // Récupérer les profils administrateurs
    adminProfiles: (state) => state.profiles.filter(profile => profile.is_admin),
    
    // Récupérer un profil par ID
    getProfileById: (state) => (id) => state.profiles.find(profile => profile.id === id),
    
    // Vérifier si un profil est verrouillé
    isProfileLocked: (state) => (id) => {
      const profile = state.profiles.find(profile => profile.id === id);
      return profile ? profile.is_locked : false;
    }
  },

  actions: {
    // Charger tous les profils
    async loadProfiles() {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.profiles = await ProfileService.getAllProfiles();
        await this.loadStats();
        console.log('✅ Profils chargés avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement des profils:', error);
      } finally {
        this.isLoading = false;
      }
    },

    // Charger les statistiques
    async loadStats() {
      try {
        this.stats = await ProfileService.getProfileStats();
      } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques:', error);
      }
    },

    // Charger un profil spécifique
    async loadProfile(id) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.currentProfile = await ProfileService.getProfileById(id);
        if (!this.currentProfile) {
          throw new Error('Profil non trouvé');
        }
        console.log('✅ Profil chargé avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement du profil:', error);
      } finally {
        this.isLoading = false;
      }
    },

    // Créer un nouveau profil
    async createProfile(profileData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const newProfile = await ProfileService.createProfile(profileData);
        this.profiles.unshift(newProfile);
        await this.loadStats();
        console.log('✅ Profil créé avec succès');
        return newProfile;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la création du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Mettre à jour un profil
    async updateProfile(id, profileData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const updatedProfile = await ProfileService.updateProfile(id, profileData);
        
        // Mettre à jour dans la liste
        const index = this.profiles.findIndex(profile => profile.id === id);
        if (index !== -1) {
          this.profiles[index] = updatedProfile;
        }
        
        // Mettre à jour le profil actuel si c'est le même
        if (this.currentProfile && this.currentProfile.id === id) {
          this.currentProfile = updatedProfile;
        }
        
        await this.loadStats();
        console.log('✅ Profil mis à jour avec succès');
        return updatedProfile;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la mise à jour du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Supprimer un profil
    async deleteProfile(id) {
      this.isLoading = true;
      this.error = null;
      
      try {
        await ProfileService.deleteProfile(id);
        
        // Retirer de la liste
        this.profiles = this.profiles.filter(profile => profile.id !== id);
        
        // Nettoyer le profil actuel si c'est le même
        if (this.currentProfile && this.currentProfile.id === id) {
          this.currentProfile = null;
        }
        
        await this.loadStats();
        console.log('✅ Profil supprimé avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la suppression du profil:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // Basculer le statut actif d'un profil
    async toggleProfileStatus(id) {
      try {
        const updatedProfile = await ProfileService.toggleProfileStatus(id);
        
        // Mettre à jour dans la liste
        const index = this.profiles.findIndex(profile => profile.id === id);
        if (index !== -1) {
          this.profiles[index] = updatedProfile;
        }
        
        await this.loadStats();
        console.log('✅ Statut du profil basculé avec succès');
        return updatedProfile;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du basculement du statut:', error);
        throw error;
      }
    },

    // Basculer le verrouillage d'un profil
    async toggleProfileLock(id) {
      try {
        const updatedProfile = await ProfileService.toggleProfileLock(id);
        
        // Mettre à jour dans la liste
        const index = this.profiles.findIndex(profile => profile.id === id);
        if (index !== -1) {
          this.profiles[index] = updatedProfile;
        }
        
        console.log('✅ Verrouillage du profil basculé avec succès');
        return updatedProfile;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du basculement du verrouillage:', error);
        throw error;
      }
    },

    // Vérifier un code PIN
    async verifyPin(profileId, pin) {
      try {
        const isValid = await PinService.verifyPin(profileId, pin);
        console.log(isValid ? '✅ Code PIN valide' : '❌ Code PIN invalide');
        return isValid;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la vérification du code PIN:', error);
        return false;
      }
    },

    // Mettre à jour le code PIN
    async updatePin(profileId, newPin) {
      try {
        await PinService.updatePin(profileId, newPin);
        console.log('✅ Code PIN mis à jour avec succès');
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors de la mise à jour du code PIN:', error);
        throw error;
      }
    },

    // Récupérer le code PIN par défaut
    async getDefaultPin() {
      try {
        return await PinService.getDefaultPin();
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du code PIN par défaut:', error);
        return '1234';
      }
    },

    // Nettoyer les erreurs
    clearError() {
      this.error = null;
    },

    // Réinitialiser l'état
    reset() {
      this.profiles = [];
      this.currentProfile = null;
      this.isLoading = false;
      this.error = null;
      this.stats = {
        total: 0,
        active: 0,
        children: 0,
        teens: 0,
        admins: 0
      };
    }
  }
});
