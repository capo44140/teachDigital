import sql from '../../config/database.js';
import { HashService } from '../hashService.js';
import { EncryptionService } from '../encryptionService.js';
import { auditLogService } from '../auditLogService.js';

/**
 * Service principal pour la gestion des profils
 * Gère les opérations CRUD et les fonctionnalités de base des profils
 */
export class ProfileService {
  
  static encryptionService = new EncryptionService();
  
  // Récupérer tous les profils
  static async getAllProfiles() {
    try {
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        ORDER BY created_at DESC
      `;
      return profiles;
    } catch (error) {
      console.error('Erreur lors de la récupération des profils:', error);
      throw error;
    }
  }
  
  // Récupérer un profil par ID
  static async getProfileById(id) {
    try {
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        WHERE id = ${id}
      `;
      return profiles[0] || null;
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
      
      // Déterminer les flags selon le type
      const isAdmin = type === 'admin';
      const isChild = type === 'child';
      const isTeen = type === 'teen';
      
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
      
      const result = await sql`
        INSERT INTO profiles (
          name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content,
          image_url, image_data, image_type, level
        )
        VALUES (
          ${name}, ${encryptedDescription}, ${type}, ${isAdmin}, ${isChild}, ${isTeen},
          true, false, ${color}, ${avatarClass}, ${encryptedAvatarContent},
          ${imageUrl}, ${encryptedImageData}, ${imageType}, ${level}
        )
        RETURNING *
      `;
      
      // Enregistrer la création du profil dans les logs d'audit
      auditLogService.logProfileChange(
        result[0].id,
        'PROFILE_CREATED',
        {
          name: result[0].name,
          type: result[0].type,
          encrypted: !!masterPassword
        }
      );
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      auditLogService.logSystemError(
        'Profile creation failed',
        'ProfileService',
        { error: error.message, profileData: { name, type } }
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
      
      // Déterminer les flags selon le type
      const isAdmin = type === 'admin';
      const isChild = type === 'child';
      const isTeen = type === 'teen';
      
      const result = await sql`
        UPDATE profiles 
        SET 
          name = ${name},
          description = ${description},
          type = ${type},
          is_admin = ${isAdmin},
          is_child = ${isChild},
          is_teen = ${isTeen},
          color = ${color},
          avatar_class = ${avatarClass},
          avatar_content = ${avatarContent},
          image_url = ${imageUrl},
          image_data = ${imageData},
          image_type = ${imageType},
          is_active = ${isActive},
          is_locked = ${isLocked},
          level = ${level},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }
  
  // Supprimer un profil
  static async deleteProfile(id) {
    try {
      const result = await sql`
        DELETE FROM profiles 
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la suppression du profil:', error);
      throw error;
    }
  }
  
  // Basculer le statut actif d'un profil
  static async toggleProfileStatus(id) {
    try {
      const result = await sql`
        UPDATE profiles 
        SET 
          is_active = NOT is_active,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Erreur lors du basculement du statut:', error);
      throw error;
    }
  }
  
  // Basculer le verrouillage d'un profil
  static async toggleProfileLock(id) {
    try {
      const result = await sql`
        UPDATE profiles 
        SET 
          is_locked = NOT is_locked,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Erreur lors du basculement du verrouillage:', error);
      throw error;
    }
  }
  
  // Récupérer les statistiques des profils
  static async getProfileStats() {
    try {
      const stats = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_child = true THEN 1 END) as children,
          COUNT(CASE WHEN is_teen = true THEN 1 END) as teens,
          COUNT(CASE WHEN is_admin = true THEN 1 END) as admins
        FROM profiles
      `;
      return stats[0];
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  // Mettre à jour l'image d'un profil
  static async updateProfileImage(profileId, imageData, imageType) {
    try {
      const result = await sql`
        UPDATE profiles 
        SET 
          image_data = ${imageData},
          image_type = ${imageType},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${profileId}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      throw error;
    }
  }

  // Supprimer l'image d'un profil
  static async removeProfileImage(profileId) {
    try {
      const result = await sql`
        UPDATE profiles 
        SET 
          image_data = NULL,
          image_type = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${profileId}
        RETURNING *
      `;
      return result[0];
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
