import sql from '../config/database.js'

/**
 * Repository pour la gestion des badges
 */
export class BadgeRepository {
  /**
   * Récupérer tous les badges
   * @returns {Promise<Array>} Liste des badges
   */
  async getAllBadges () {
    try {
      const badges = await sql`
        SELECT * FROM badges 
        WHERE is_active = true
        ORDER BY category, condition_value ASC
      `
      return badges
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error)
      throw error
    }
  }

  /**
   * Récupérer un badge par ID
   * @param {number} badgeId - ID du badge
   * @returns {Promise<Object>} Badge
   */
  async getBadgeById (badgeId) {
    try {
      const result = await sql`
        SELECT * FROM badges 
        WHERE id = ${badgeId}
      `
      return result[0] || null
    } catch (error) {
      console.error('Erreur lors de la récupération du badge:', error)
      throw error
    }
  }

  /**
   * Créer un nouveau badge
   * @param {Object} badgeData - Données du badge
   * @returns {Promise<Object>} Badge créé
   */
  async createBadge (badgeData) {
    try {
      const { name, description, icon, category, condition_type, condition_value, points, color } = badgeData

      const result = await sql`
        INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color)
        VALUES (${name}, ${description}, ${icon}, ${category}, ${condition_type}, ${condition_value}, ${points}, ${color})
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Erreur lors de la création du badge:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un badge
   * @param {number} badgeId - ID du badge
   * @param {Object} badgeData - Nouvelles données du badge
   * @returns {Promise<Object>} Badge mis à jour
   */
  async updateBadge (badgeId, badgeData) {
    try {
      const { name, description, icon, category, condition_type, condition_value, points, color, is_active } = badgeData

      const result = await sql`
        UPDATE badges 
        SET 
          name = ${name},
          description = ${description},
          icon = ${icon},
          category = ${category},
          condition_type = ${condition_type},
          condition_value = ${condition_value},
          points = ${points},
          color = ${color},
          is_active = ${is_active},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${badgeId}
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Erreur lors de la mise à jour du badge:', error)
      throw error
    }
  }

  /**
   * Supprimer un badge
   * @param {number} badgeId - ID du badge
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteBadge (badgeId) {
    try {
      await sql`
        DELETE FROM badges 
        WHERE id = ${badgeId}
      `
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du badge:', error)
      throw error
    }
  }

  /**
   * Récupérer tous les badges d'un profil avec leur progression
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des badges avec progression
   */
  async getProfileBadges (profileId) {
    try {
      const badges = await sql`
        SELECT 
          b.*,
          COALESCE(pb.progress, 0) as progress,
          COALESCE(pb.is_unlocked, false) as is_unlocked,
          pb.unlocked_at
        FROM badges b
        LEFT JOIN profile_badges pb ON b.id = pb.badge_id AND pb.profile_id = ${profileId}
        WHERE b.is_active = true
        ORDER BY 
          pb.is_unlocked DESC NULLS LAST,
          b.category,
          b.condition_value ASC
      `
      return badges
    } catch (error) {
      console.error('Erreur lors de la récupération des badges du profil:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges débloqués d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Array>} Liste des badges débloqués
   */
  async getUnlockedBadges (profileId) {
    try {
      const badges = await sql`
        SELECT b.*, pb.unlocked_at
        FROM badges b
        INNER JOIN profile_badges pb ON b.id = pb.badge_id
        WHERE pb.profile_id = ${profileId} AND pb.is_unlocked = true
        ORDER BY pb.unlocked_at DESC
      `
      return badges
    } catch (error) {
      console.error('Erreur lors de la récupération des badges débloqués:', error)
      throw error
    }
  }

  /**
   * Mettre à jour la progression d'un badge pour un profil
   * @param {number} profileId - ID du profil
   * @param {number} badgeId - ID du badge
   * @param {number} progress - Progression (0-100)
   * @returns {Promise<Object>} Badge mis à jour
   */
  async updateBadgeProgress (profileId, badgeId, progress) {
    try {
      const result = await sql`
        INSERT INTO profile_badges (profile_id, badge_id, progress, updated_at)
        VALUES (${profileId}, ${badgeId}, ${progress}, CURRENT_TIMESTAMP)
        ON CONFLICT (profile_id, badge_id) 
        DO UPDATE SET 
          progress = ${progress},
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression du badge:', error)
      throw error
    }
  }

  /**
   * Débloquer un badge pour un profil
   * @param {number} profileId - ID du profil
   * @param {number} badgeId - ID du badge
   * @returns {Promise<Object>} Badge débloqué
   */
  async unlockBadge (profileId, badgeId) {
    try {
      const result = await sql`
        INSERT INTO profile_badges (profile_id, badge_id, progress, is_unlocked, unlocked_at, updated_at)
        VALUES (${profileId}, ${badgeId}, 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (profile_id, badge_id) 
        DO UPDATE SET 
          progress = 100,
          is_unlocked = true,
          unlocked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `
      return result[0]
    } catch (error) {
      console.error('Erreur lors du déblocage du badge:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques de badges d'un profil
   * @param {number} profileId - ID du profil
   * @returns {Promise<Object>} Statistiques
   */
  async getBadgeStats (profileId) {
    try {
      const stats = await sql`
        SELECT 
          COUNT(DISTINCT b.id) as total_badges,
          COUNT(DISTINCT CASE WHEN pb.is_unlocked = true THEN b.id END) as unlocked_badges,
          COALESCE(SUM(CASE WHEN pb.is_unlocked = true THEN b.points ELSE 0 END), 0) as total_points
        FROM badges b
        LEFT JOIN profile_badges pb ON b.id = pb.badge_id AND pb.profile_id = ${profileId}
        WHERE b.is_active = true
      `

      const result = stats[0]
      return {
        total: parseInt(result.total_badges) || 0,
        unlocked: parseInt(result.unlocked_badges) || 0,
        locked: (parseInt(result.total_badges) || 0) - (parseInt(result.unlocked_badges) || 0),
        points: parseInt(result.total_points) || 0,
        percentage: result.total_badges > 0
          ? Math.round((result.unlocked_badges / result.total_badges) * 100)
          : 0
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges par catégorie
   * @param {string} category - Catégorie du badge
   * @returns {Promise<Array>} Liste des badges
   */
  async getBadgesByCategory (category) {
    try {
      const badges = await sql`
        SELECT * FROM badges 
        WHERE category = ${category} AND is_active = true
        ORDER BY condition_value ASC
      `
      return badges
    } catch (error) {
      console.error('Erreur lors de la récupération des badges par catégorie:', error)
      throw error
    }
  }

  /**
   * Récupérer les badges récemment débloqués d'un profil
   * @param {number} profileId - ID du profil
   * @param {number} limit - Nombre de badges à récupérer (par défaut 5)
   * @returns {Promise<Array>} Liste des badges récents
   */
  async getRecentlyUnlockedBadges (profileId, limit = 5) {
    try {
      const badges = await sql`
        SELECT b.*, pb.unlocked_at
        FROM badges b
        INNER JOIN profile_badges pb ON b.id = pb.badge_id
        WHERE pb.profile_id = ${profileId} AND pb.is_unlocked = true
        ORDER BY pb.unlocked_at DESC
        LIMIT ${limit}
      `
      return badges
    } catch (error) {
      console.error('Erreur lors de la récupération des badges récents:', error)
      throw error
    }
  }
}

export default new BadgeRepository()
