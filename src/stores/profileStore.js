import { defineStore } from 'pinia';
import { ProfileService, PinService } from '../services/profile/index.js';
import { ProfileRepository } from '../repositories/profileRepository.js';

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
    },
    
    profileRepository: new ProfileRepository(),
    // Protection contre les appels multiples simultanés
    loadingPromise: null,
    lastLoadTime: null,
    loadCacheTimeout: 5000 // Cache de 5 secondes
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
    
    // Récupérer tous les profils non-administrateurs (enfants et adolescents)
    nonAdminProfiles: (state) => state.profiles.filter(profile => 
      profile.is_active && !profile.is_admin && (profile.is_child || profile.is_teen)
    ),
    
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
    async loadProfiles(force = false) {
      // Si un chargement est déjà en cours, retourner la même promesse
      if (this.loadingPromise && !force) {
        console.log('⏳ Chargement déjà en cours, réutilisation de la promesse existante');
        return this.loadingPromise;
      }
      
      // Vérifier le cache : si les profils ont été chargés récemment, ne pas recharger
      const now = Date.now();
      if (!force && this.lastLoadTime && (now - this.lastLoadTime) < this.loadCacheTimeout && this.profiles.length > 0) {
        console.log('✅ Utilisation du cache des profils (chargés il y a moins de 5 secondes)');
        return Promise.resolve(this.profiles);
      }
      
      this.isLoading = true;
      this.error = null;
      
      // Créer une promesse unique pour ce chargement
      this.loadingPromise = (async () => {
        try {
          // Charger les profils directement depuis l'API
          this.profiles = await ProfileService.getAllProfiles();
          
          await this.loadStats();
          this.lastLoadTime = Date.now();
          console.log('✅ Profils chargés avec succès');
          return this.profiles;
        } catch (error) {
          this.error = error.message;
          console.error('❌ Erreur lors du chargement des profils:', error);
          throw error;
        } finally {
          this.isLoading = false;
          this.loadingPromise = null;
        }
      })();
      
      return this.loadingPromise;
    },

    // Charger les statistiques
    async loadStats() {
      try {
        const statsData = await ProfileService.getProfileStats();
        if (statsData) {
          this.stats = {
            total: statsData.total || 0,
            active: statsData.active || 0,
            children: statsData.children || 0,
            teens: statsData.teens || 0,
            admins: statsData.admins || 0
          };
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des statistiques:', error);
      }
    },

    // Charger un profil spécifique
    async loadProfile(id) {
      this.isLoading = true;
      this.error = null;
      
      try {
        // Convertir l'ID en nombre si nécessaire
        const profileId = typeof id === 'string' ? parseInt(id, 10) : id;
        
        // Essayer d'abord de charger depuis le store local (plus rapide)
        const localProfile = this.getProfileById(profileId);
        if (localProfile) {
          console.log('✅ Profil trouvé dans le store local');
          this.currentProfile = localProfile;
          this.isLoading = false;
          return localProfile;
        }
        
        // Si pas dans le store, charger depuis l'API
        console.log(`🔍 Chargement du profil ${profileId} depuis l'API...`);
        this.currentProfile = await ProfileService.getProfileById(profileId);
        
        if (!this.currentProfile) {
          // Dernier recours : chercher dans le store avec différents formats
          const fallbackProfile = this.getProfileById(String(profileId)) || 
                                  this.getProfileById(Number(profileId));
          if (fallbackProfile) {
            console.log('✅ Profil trouvé dans le store avec format alternatif');
            this.currentProfile = fallbackProfile;
            return fallbackProfile;
          }
          throw new Error('Profil non trouvé');
        }
        console.log('✅ Profil chargé avec succès depuis l\'API');
        return this.currentProfile;
      } catch (error) {
        this.error = error.message;
        console.error('❌ Erreur lors du chargement du profil:', error);
        
        // Fallback : essayer de trouver dans le store local même en cas d'erreur API
        const profileId = typeof id === 'string' ? parseInt(id, 10) : id;
        const fallbackProfile = this.getProfileById(profileId) || 
                                this.getProfileById(String(profileId)) ||
                                this.getProfileById(Number(profileId));
        if (fallbackProfile) {
          console.log('⚠️ Utilisation du profil du store local en fallback');
          this.currentProfile = fallbackProfile;
          return fallbackProfile;
        }
        
        throw error;
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

    // Mettre à jour le code PIN avec validation de sécurité
    async updatePin(profileId, newPin) {
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
      }
    },

    // Générer un code PIN sécurisé
    generateSecurePin(length = 4) {
      return PinService.generateSecurePin(length);
    },

    // Analyser la force d'un code PIN
    analyzePinStrength(pin) {
      return PinService.analyzePinStrength(pin);
    },

    // Valider un code PIN
    validatePin(pin) {
      return PinService.validatePin(pin);
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
      // Réinitialiser les protections
      this.loadingPromise = null;
      this.lastLoadTime = null;
    },

    // Forcer le rechargement des profils
    async refreshProfiles() {
      try {
        // Forcer le rechargement en ignorant le cache
        await this.loadProfiles(true);
        
        console.log('✅ Profils rechargés');
      } catch (error) {
        console.error('❌ Erreur lors du rechargement des profils:', error);
        throw error;
      }
    },

  }
});


