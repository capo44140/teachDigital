import sql from '../config/database.js';

// Service pour la gestion des profils
export class ProfileService {
  
  // Récupérer tous les profils
  static async getAllProfiles() {
    try {
      const profiles = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          created_at, updated_at
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
          created_at, updated_at
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
        avatarContent
      } = profileData;
      
      // Déterminer les flags selon le type
      const isAdmin = type === 'admin';
      const isChild = type === 'child';
      const isTeen = type === 'teen';
      
      const result = await sql`
        INSERT INTO profiles (
          name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content
        )
        VALUES (
          ${name}, ${description}, ${type}, ${isAdmin}, ${isChild}, ${isTeen},
          true, false, ${color}, ${avatarClass}, ${avatarContent}
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
}

// Service pour la gestion des codes PIN
export class PinService {
  
  // Récupérer le code PIN d'un profil
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
  
  // Mettre à jour le code PIN d'un profil
  static async updatePin(profileId, newPin) {
    try {
      // Vérifier si un code PIN existe déjà
      const existingPin = await this.getPinByProfileId(profileId);
      
      if (existingPin) {
        // Mettre à jour le code PIN existant
        const result = await sql`
          UPDATE pin_codes 
          SET 
            pin_code = ${newPin},
            updated_at = CURRENT_TIMESTAMP
          WHERE profile_id = ${profileId}
          RETURNING *
        `;
        return result[0];
      } else {
        // Créer un nouveau code PIN
        const result = await sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${newPin})
          RETURNING *
        `;
        return result[0];
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du code PIN:', error);
      throw error;
    }
  }
  
  // Vérifier un code PIN
  static async verifyPin(profileId, inputPin) {
    try {
      const pin = await this.getPinByProfileId(profileId);
      return pin && pin.pin_code === inputPin;
    } catch (error) {
      console.error('Erreur lors de la vérification du code PIN:', error);
      throw error;
    }
  }
  
  // Récupérer le code PIN par défaut (pour les admins)
  static async getDefaultPin() {
    try {
      const pins = await sql`
        SELECT pin_code 
        FROM pin_codes 
        WHERE profile_id = 1
        LIMIT 1
      `;
      return pins[0]?.pin_code || '1234';
    } catch (error) {
      console.error('Erreur lors de la récupération du code PIN par défaut:', error);
      return '1234';
    }
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
