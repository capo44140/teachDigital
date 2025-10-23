import { apiService } from '../apiService.js';
import { EncryptionService } from '../encryptionService.js';
import { auditLogService } from '../auditLogService.js';

/**
 * Service principal pour la gestion des profils
 * Gère les opérations CRUD et les fonctionnalités de base des profils
 * 
 * ⚠️ IMPORTANT: Ce service communique via l'API backend, pas d'accès direct DB
 */
export class ProfileService {
  
  static encryptionService = new EncryptionService();
  
  // Récupérer tous les profils
  static async getAllProfiles() {
    try {
      const profiles = await apiService.getProfiles();
      return profiles;
    } catch (error) {
      console.error('Erreur lors de la récupération des profils:', error);
      throw error;
    }
  }
  
  // Récupérer un profil par ID
  static async getProfileById(id) {
    try {
      const profile = await apiService.getProfile(id);
      return profile || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      throw error;
    }
  }
  
  // Créer un nouveau profil
  static async createProfile(profileData, masterPassword = null) {
    try {
      const {
        name,
        description,
        type,
        color = 'purple',
        avatarClass,
        avatarContent,
        imageUrl,
        imageData,
        imageType,
        level
      } = profileData;
      
      // Chiffrer les données sensibles si un mot de passe maître est fourni
      let encryptedDescription = description;
      let encryptedAvatarContent = avatarContent;
      let encryptedImageData = imageData;
      
      if (masterPassword) {
        try {
          if (description) {
            encryptedDescription = await this.encryptionService.encryptWithPassword(description, masterPassword);
          }
          if (avatarContent) {
            encryptedAvatarContent = await this.encryptionService.encryptWithPassword(avatarContent, masterPassword);
          }
          if (imageData) {
            encryptedImageData = await this.encryptionService.encryptWithPassword(imageData, masterPassword);
          }
        } catch (encryptionError) {
          console.warn('Erreur lors du chiffrement des données sensibles:', encryptionError);
          // Continuer sans chiffrement en cas d'erreur
        }
      }
      
      const result = await apiService.createProfile({
        name,
        description: encryptedDescription,
        type,
        color,
        avatar_class: avatarClass,
        avatar_content: encryptedAvatarContent,
        image_url: imageUrl,
        image_data: encryptedImageData,
        image_type: imageType,
        level
      });
      
      // Enregistrer la création du profil dans les logs d'audit
      auditLogService.logProfileChange(
        result.id,
        'PROFILE_CREATED',
        {
          name: result.name,
          type: result.type,
          encrypted: !!masterPassword
        }
      );
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      auditLogService.logSystemError(
        'Profile creation failed',
        'ProfileService',
        { error: error.message, profileData: { name: profileData.name, type: profileData.type } }
      );
      throw error;
    }
  }
  
  // Mettre à jour un profil
  static async updateProfile(id, profileData) {
    try {
      const {
        name,
        description,
        type,
        color,
        avatarClass,
        avatarContent,
        imageUrl,
        imageData,
        imageType,
        isActive,
        isLocked,
        level
      } = profileData;
      
      const result = await apiService.updateProfile(id, {
        name,
        description,
        type,
        color,
        avatar_class: avatarClass,
        avatar_content: avatarContent,
        image_url: imageUrl,
        image_data: imageData,
        image_type: imageType,
        is_active: isActive,
        is_locked: isLocked,
        level
      });
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }
  
  // Supprimer un profil
  static async deleteProfile(id) {
    try {
      const result = await apiService.deleteProfile(id);
      return result;
    } catch (error) {
      console.error('Erreur lors de la suppression du profil:', error);
      throw error;
    }
  }
  
  // Basculer le statut actif d'un profil
  static async toggleProfileStatus(id) {
    try {
      const profile = await this.getProfileById(id);
      if (!profile) throw new Error('Profil non trouvé');
      
      const result = await this.updateProfile(id, {
        ...profile,
        isActive: !profile.is_active
      });
      return result;
    } catch (error) {
      console.error('Erreur lors du basculement du statut:', error);
      throw error;
    }
  }
  
  // Basculer le verrouillage d'un profil
  static async toggleProfileLock(id) {
    try {
      const profile = await this.getProfileById(id);
      if (!profile) throw new Error('Profil non trouvé');
      
      const result = await this.updateProfile(id, {
        ...profile,
        isLocked: !profile.is_locked
      });
      return result;
    } catch (error) {
      console.error('Erreur lors du basculement du verrouillage:', error);
      throw error;
    }
  }
  
  // Récupérer les statistiques des profils
  static async getProfileStats() {
    try {
      const stats = await apiService.getProfileStats();
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  // Mettre à jour l'image d'un profil
  static async updateProfileImage(profileId, imageData, imageType) {
    try {
      const result = await this.updateProfile(profileId, {
        imageData,
        imageType
      });
      return result;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      throw error;
    }
  }

  // Supprimer l'image d'un profil
  static async removeProfileImage(profileId) {
    try {
      const result = await this.updateProfile(profileId, {
        imageData: null,
        imageType: null
      });
      return result;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      throw error;
    }
  }

  // Convertir un fichier en base64
  static async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Valider le type de fichier image
  static validateImageType(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type);
  }

  // Valider la taille du fichier (max 5MB)
  static validateImageSize(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return file.size <= maxSize;
  }
}
