import { BaseRepository } from './baseRepository.js';
import sql from '../config/database.js';

/**
 * Repository pour la gestion des profils
 * Centralise toutes les opérations de base de données liées aux profils
 */
export class ProfileRepository extends BaseRepository {
  constructor() {
    super('profiles');
  }

  /**
   * Récupérer tous les profils avec tri par date de création
   * @returns {Promise<Array>} Liste des profils
   */
  async findAllProfiles() {
    try {
      return await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des profils:', error);
      throw error;
    }
  }

  /**
   * Récupérer un profil par ID avec toutes les informations
   * @param {number} id - ID du profil
   * @returns {Promise<Object|null>} Profil trouvé ou null
   */
  async findProfileById(id) {
    try {
      const result = await sql`
        SELECT 
          id, name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content, 
          image_url, image_data, image_type, level, created_at, updated_at
        FROM profiles 
        WHERE id = ${id}
      `;
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau profil avec gestion du chiffrement
   * @param {Object} profileData - Données du profil
   * @param {string} masterPassword - Mot de passe maître pour le chiffrement (optionnel)
   * @returns {Promise<Object>} Profil créé
   */
  async createProfile(profileData, masterPassword = null) {
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
      
      // Note: Le chiffrement devrait être géré par le service, pas le repository
      // Le repository se contente de stocker les données telles qu'elles sont fournies
      
      const result = await sql`
        INSERT INTO profiles (
          name, description, type, is_admin, is_child, is_teen, 
          is_active, is_locked, color, avatar_class, avatar_content,
          image_url, image_data, image_type, level
        )
        VALUES (
          ${name}, ${description}, ${type}, ${isAdmin}, ${isChild}, ${isTeen},
          true, false, ${color}, ${avatarClass}, ${avatarContent},
          ${imageUrl}, ${imageData}, ${imageType}, ${level}
        )
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la création du profil:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un profil
   * @param {number} id - ID du profil
   * @param {Object} profileData - Données à mettre à jour
   * @returns {Promise<Object|null>} Profil mis à jour ou null
   */
  async updateProfile(id, profileData) {
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
      
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }

  /**
   * Basculer le statut actif d'un profil
   * @param {number} id - ID du profil
   * @returns {Promise<Object|null>} Profil mis à jour ou null
   */
  async toggleProfileStatus(id) {
    try {
      const result = await sql`
        UPDATE profiles 
        SET 
          is_active = NOT is_active,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors du basculement du statut:', error);
      throw error;
    }
  }

  /**
   * Basculer le verrouillage d'un profil
   * @param {number} id - ID du profil
   * @returns {Promise<Object|null>} Profil mis à jour ou null
   */
  async toggleProfileLock(id) {
    try {
      const result = await sql`
        UPDATE profiles 
        SET 
          is_locked = NOT is_locked,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors du basculement du verrouillage:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des profils
   * @returns {Promise<Object>} Statistiques des profils
   */
  async getProfileStats() {
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

  /**
   * Mettre à jour l'image d'un profil
   * @param {number} profileId - ID du profil
   * @param {string} imageData - Données de l'image
   * @param {string} imageType - Type de l'image
   * @returns {Promise<Object|null>} Profil mis à jour ou null
   */
  async updateProfileImage(profileId, imageData, imageType) {
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
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      throw error;
    }
  }

  /**
   * Supprimer l'image d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object|null>} Profil mis à jour ou null
   */
  async removeProfileImage(profileId) {
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
      return result[0] || null;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      throw error;
    }
  }

  /**
   * Récupérer les profils par type
   * @param {string} type - Type de profil (admin, child, teen)
   * @returns {Promise<Array>} Liste des profils du type spécifié
   */
  async findByType(type) {
    try {
      const result = await sql`
        SELECT * FROM profiles 
        WHERE type = ${type} AND is_active = true
        ORDER BY created_at DESC
      `;
      return result;
    } catch (error) {
      console.error(`Erreur lors de la récupération des profils de type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les profils actifs
   * @returns {Promise<Array>} Liste des profils actifs
   */
  async findActiveProfiles() {
    try {
      const result = await sql`
        SELECT * FROM profiles 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération des profils actifs:', error);
      throw error;
    }
  }
}
