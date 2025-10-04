import sql from '../config/database.js';
import { HashService } from './hashService.js';

// Service pour la gestion des profils
export class ProfileService {
  
  // Récupérer tous les profils
  static async getAllProfiles() {
    try {
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, created_at, updated_at
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
          image_url, image_data, image_type, created_at, updated_at
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
  static async createProfile(profileData) {
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
        imageType
      } = profileData;
      
      // Déterminer les flags selon le type
      const isAdmin = type === 'admin';
      const isChild = type === 'child';
      const isTeen = type === 'teen';
      
      const result = await sql`
        INSERT INTO profiles (
          name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content,
          image_url, image_data, image_type
        )
        VALUES (
          ${name}, ${description}, ${type}, ${isAdmin}, ${isChild}, ${isTeen},
          true, false, ${color}, ${avatarClass}, ${avatarContent},
          ${imageUrl}, ${imageData}, ${imageType}
        )
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
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
        isLocked
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
          COUNT(*) as total_profiles,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_profiles,
          COUNT(CASE WHEN is_child = true THEN 1 END) as child_profiles,
          COUNT(CASE WHEN is_teen = true THEN 1 END) as teen_profiles,
          COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_profiles
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

// Service pour la gestion des codes PIN
export class PinService {
  
  // Récupérer le code PIN haché d'un profil
  static async getPinByProfileId(profileId) {
    try {
      const pins = await sql`
        SELECT pin_code, created_at, updated_at
        FROM pin_codes 
        WHERE profile_id = ${profileId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      return pins[0] || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du code PIN:', error);
      throw error;
    }
  }
  
  // Mettre à jour le code PIN d'un profil avec hachage sécurisé
  static async updatePin(profileId, newPin) {
    try {
      // Valider le format du code PIN
      const validation = HashService.validatePinFormat(newPin);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
      
      // Hacher le code PIN
      const hashedPin = await HashService.hashPin(newPin);
      
      // Vérifier si un code PIN existe déjà
      const existingPin = await this.getPinByProfileId(profileId);
      
      if (existingPin) {
        // Mettre à jour le code PIN existant
        const result = await sql`
          UPDATE pin_codes 
          SET 
            pin_code = ${hashedPin},
            updated_at = CURRENT_TIMESTAMP
          WHERE profile_id = ${profileId}
          RETURNING *
        `;
        console.log('✅ Code PIN mis à jour avec succès');
        return result[0];
      } else {
        // Créer un nouveau code PIN
        const result = await sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
          RETURNING *
        `;
        console.log('✅ Code PIN créé avec succès');
        return result[0];
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du code PIN:', error);
      throw error;
    }
  }
  
  // Vérifier un code PIN avec hachage sécurisé
  static async verifyPin(profileId, inputPin) {
    try {
      const pinRecord = await this.getPinByProfileId(profileId);
      if (!pinRecord) {
        console.log('❌ Aucun code PIN trouvé pour ce profil');
        return false;
      }
      
      // Vérifier le code PIN avec le hachage
      const isValid = await HashService.verifyPin(inputPin, pinRecord.pin_code);
      
      if (isValid) {
        console.log('✅ Code PIN vérifié avec succès');
      } else {
        console.log('❌ Code PIN incorrect');
      }
      
      return isValid;
    } catch (error) {
      console.error('Erreur lors de la vérification du code PIN:', error);
      return false;
    }
  }
  
  // Récupérer le code PIN par défaut (pour les admins) - NON HACHÉ pour l'affichage
  static async getDefaultPin() {
    try {
      // Note: Cette méthode ne devrait être utilisée que pour l'affichage initial
      // Le code PIN par défaut sera haché lors de la première utilisation
      return '1234';
    } catch (error) {
      console.error('Erreur lors de la récupération du code PIN par défaut:', error);
      return '1234';
    }
  }
  
  // Initialiser le code PIN par défaut avec hachage
  static async initializeDefaultPin(profileId = 1) {
    try {
      const defaultPin = '1234';
      const hashedPin = await HashService.hashPin(defaultPin);
      
      // Vérifier si un code PIN existe déjà
      const existingPin = await this.getPinByProfileId(profileId);
      
      if (!existingPin) {
        await sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
        `;
        console.log('✅ Code PIN par défaut initialisé avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du code PIN par défaut:', error);
      throw error;
    }
  }
  
  // Générer un code PIN sécurisé
  static generateSecurePin(length = 4) {
    return HashService.generateSecurePin(length);
  }
  
  // Analyser la force d'un code PIN
  static analyzePinStrength(pin) {
    return HashService.getPinStrength(pin);
  }
  
  // Valider le format d'un code PIN
  static validatePin(pin) {
    return HashService.validatePinFormat(pin);
  }
}

// Service pour la gestion des sessions
export class SessionService {
  
  // Créer une session
  static async createSession(profileId, sessionToken, expiresAt) {
    try {
      const result = await sql`
        INSERT INTO sessions (profile_id, session_token, expires_at)
        VALUES (${profileId}, ${sessionToken}, ${expiresAt})
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error);
      throw error;
    }
  }
  
  // Vérifier une session
  static async verifySession(sessionToken) {
    try {
      const sessions = await sql`
        SELECT s.*, p.name, p.type, p.is_admin, p.is_child, p.is_teen
        FROM sessions s
        JOIN profiles p ON s.profile_id = p.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > CURRENT_TIMESTAMP
      `;
      return sessions[0] || null;
    } catch (error) {
      console.error('Erreur lors de la vérification de la session:', error);
      throw error;
    }
  }
  
  // Supprimer une session
  static async deleteSession(sessionToken) {
    try {
      const result = await sql`
        DELETE FROM sessions 
        WHERE session_token = ${sessionToken}
        RETURNING *
      `;
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la suppression de la session:', error);
      throw error;
    }
  }
  
  // Nettoyer les sessions expirées
  static async cleanExpiredSessions() {
    try {
      const result = await sql`
        DELETE FROM sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
      `;
      return result;
    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions:', error);
      throw error;
    }
  }
}
