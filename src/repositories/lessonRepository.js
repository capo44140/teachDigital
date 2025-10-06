import { BaseRepository } from './baseRepository.js';
import sql from '../config/database.js';

/**
 * Repository pour la gestion des leçons
 * Centralise toutes les opérations de base de données liées aux leçons
 */
export class LessonRepository extends BaseRepository {
  constructor() {
    super('lessons');
  }

  /**
   * Récupérer toutes les leçons d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des leçons
   */
  async findByProfileId(profileId) {
    try {
      return await sql`
        SELECT id, title, description, subject, level, 
               image_filename, created_at, updated_at
        FROM lessons 
        WHERE profile_id = ${profileId} AND is_published = true
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des leçons du profil:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les leçons disponibles (publiées)
   * @returns {Promise<Array>} Liste de toutes les leçons publiées
   */
  async findAvailableLessons() {
    try {
      return await sql`
        SELECT id, title, description, subject, level, 
               image_filename, created_at, updated_at, profile_id
        FROM lessons 
        WHERE is_published = true
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération des leçons disponibles:', error);
      throw error;
    }
  }

  /**
   * Récupérer une leçon par ID avec toutes les données
   * @param {number} lessonId - ID de la leçon
   * @returns {Promise<Object|null>} Leçon trouvée ou null
   */
  async findLessonById(lessonId) {
    try {
      const result = await sql`
        SELECT * FROM lessons WHERE id = ${lessonId}
      `;
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la récupération de la leçon:', error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle leçon
   * @param {Object} lessonData - Données de la leçon
   * @param {number} profileId - ID du profil
   * @param {string} imageFilename - Nom du fichier image (optionnel)
   * @param {string} imageData - Données de l'image (optionnel)
   * @returns {Promise<Object>} Leçon créée
   */
  async createLesson(lessonData, profileId, imageFilename = null, imageData = null) {
    try {
      const result = await sql`
        INSERT INTO lessons (
          profile_id, title, description, subject, level, 
          image_filename, image_data, quiz_data, is_published
        )
        VALUES (
          ${profileId}, ${lessonData.title}, ${lessonData.description || ''}, 
          ${lessonData.subject || ''}, ${lessonData.level || ''},
          ${imageFilename}, ${imageData}, ${JSON.stringify(lessonData)}, true
        )
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error('Erreur lors de la création de la leçon:', error);
      throw error;
    }
  }

  /**
   * Supprimer une leçon
   * @param {number} lessonId - ID de la leçon
   * @param {number} profileId - ID du profil (pour vérification)
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteLesson(lessonId, profileId) {
    try {
      const result = await sql`
        DELETE FROM lessons 
        WHERE id = ${lessonId} AND profile_id = ${profileId}
        RETURNING id
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error('Erreur lors de la suppression de la leçon:', error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des leçons d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques des leçons
   */
  async getProfileLessonStats(profileId) {
    try {
      const stats = await sql`
        SELECT 
          COUNT(*) as total_lessons,
          COUNT(CASE WHEN is_published = true THEN 1 END) as published_lessons,
          COUNT(CASE WHEN image_filename IS NOT NULL THEN 1 END) as lessons_with_images
        FROM lessons 
        WHERE profile_id = ${profileId}
      `;
      
      return stats[0];
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques des leçons:', error);
      throw error;
    }
  }

  /**
   * Récupérer les leçons par sujet
   * @param {string} subject - Sujet des leçons
   * @returns {Promise<Array>} Liste des leçons du sujet
   */
  async findBySubject(subject) {
    try {
      return await sql`
        SELECT * FROM lessons 
        WHERE subject = ${subject} AND is_published = true
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error(`Erreur lors de la récupération des leçons du sujet ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les leçons par niveau
   * @param {string} level - Niveau des leçons
   * @returns {Promise<Array>} Liste des leçons du niveau
   */
  async findByLevel(level) {
    try {
      return await sql`
        SELECT * FROM lessons 
        WHERE level = ${level} AND is_published = true
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error(`Erreur lors de la récupération des leçons du niveau ${level}:`, error);
      throw error;
    }
  }

  /**
   * Rechercher des leçons par titre ou description
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Array>} Liste des leçons correspondantes
   */
  async searchLessons(searchTerm) {
    try {
      const searchPattern = `%${searchTerm}%`;
      return await sql`
        SELECT * FROM lessons 
        WHERE (title ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        AND is_published = true
        ORDER BY created_at DESC
      `;
    } catch (error) {
      console.error('Erreur lors de la recherche de leçons:', error);
      throw error;
    }
  }
}
