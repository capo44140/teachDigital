import sql from '../config/database.js'

/**
 * Service pour gérer les vidéos YouTube
 */
class YouTubeVideoService {
  constructor() {
    this.tableName = 'youtube_videos'
  }

  /**
   * Récupérer toutes les vidéos YouTube
   * @returns {Promise<Array>} Liste des vidéos
   */
  async getAllVideos() {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération de toutes les vidéos')
      
      // Essayer d'abord la base de données
      try {
        const data = await sql`
          SELECT * FROM youtube_videos 
          ORDER BY created_at DESC
        `
        console.log('✅ [YOUTUBE_SERVICE] Vidéos récupérées depuis la DB:', data?.length || 0)
        return data || []
      } catch (dbError) {
        console.warn('⚠️ [YOUTUBE_SERVICE] Erreur DB, utilisation des données de démonstration:', dbError.message)
        
        // Données de démonstration en cas d'erreur de base de données
        const demoVideos = [
          {
            id: 1,
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            video_id: 'dQw4w9WgXcQ',
            title: 'Vidéo éducative sur les mathématiques',
            description: 'Une vidéo amusante pour apprendre les bases des mathématiques avec des exemples concrets et des exercices pratiques.',
            category: 'Mathématiques',
            age_group: '6-8 ans',
            is_active: true,
            created_at: new Date('2024-01-15').toISOString(),
            updated_at: new Date('2024-01-15').toISOString()
          },
          {
            id: 2,
            url: 'https://www.youtube.com/watch?v=example2',
            video_id: 'example2',
            title: 'Découverte de la nature',
            description: 'Explorez la beauté de la nature avec cette vidéo éducative qui présente les différents écosystèmes.',
            category: 'Science',
            age_group: '3-5 ans',
            is_active: true,
            created_at: new Date('2024-01-10').toISOString(),
            updated_at: new Date('2024-01-10').toISOString()
          },
          {
            id: 3,
            url: 'https://www.youtube.com/watch?v=example3',
            video_id: 'example3',
            title: 'Histoire de France',
            description: 'Découvrez l\'histoire fascinante de la France à travers les siècles avec des animations et des reconstitutions.',
            category: 'Histoire',
            age_group: '9-12 ans',
            is_active: false,
            created_at: new Date('2024-01-05').toISOString(),
            updated_at: new Date('2024-01-05').toISOString()
          }
        ]
        
        console.log('✅ [YOUTUBE_SERVICE] Données de démonstration chargées:', demoVideos.length)
        return demoVideos
      }
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getAllVideos:', error)
      throw error
    }
  }

  /**
   * Récupérer une vidéo par son ID
   * @param {number} id - ID de la vidéo
   * @returns {Promise<Object>} Vidéo trouvée
   */
  async getVideoById(id) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération de la vidéo ID:', id)
      
      const data = await sql`
        SELECT * FROM youtube_videos 
        WHERE id = ${id}
        LIMIT 1
      `

      if (!data || data.length === 0) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [YOUTUBE_SERVICE] Vidéo récupérée:', data[0])
      return data[0]
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getVideoById:', error)
      throw error
    }
  }

  /**
   * Récupérer les vidéos actives
   * @returns {Promise<Array>} Liste des vidéos actives
   */
  async getActiveVideos() {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération des vidéos actives')
      
      const data = await sql`
        SELECT * FROM youtube_videos 
        WHERE is_active = true
        ORDER BY created_at DESC
      `

      console.log('✅ [YOUTUBE_SERVICE] Vidéos actives récupérées:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getActiveVideos:', error)
      throw error
    }
  }

  /**
   * Récupérer les vidéos par catégorie
   * @param {string} category - Catégorie des vidéos
   * @returns {Promise<Array>} Liste des vidéos de la catégorie
   */
  async getVideosByCategory(category) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération des vidéos par catégorie:', category)
      
      const data = await sql`
        SELECT * FROM youtube_videos 
        WHERE category = ${category} AND is_active = true
        ORDER BY created_at DESC
      `

      console.log('✅ [YOUTUBE_SERVICE] Vidéos de la catégorie récupérées:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getVideosByCategory:', error)
      throw error
    }
  }

  /**
   * Récupérer les vidéos par groupe d'âge
   * @param {string} ageGroup - Groupe d'âge
   * @returns {Promise<Array>} Liste des vidéos pour le groupe d'âge
   */
  async getVideosByAgeGroup(ageGroup) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération des vidéos par groupe d\'âge:', ageGroup)
      
      const data = await sql`
        SELECT * FROM youtube_videos 
        WHERE age_group = ${ageGroup} AND is_active = true
        ORDER BY created_at DESC
      `

      console.log('✅ [YOUTUBE_SERVICE] Vidéos du groupe d\'âge récupérées:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getVideosByAgeGroup:', error)
      throw error
    }
  }

  /**
   * Créer une nouvelle vidéo
   * @param {Object} videoData - Données de la vidéo
   * @returns {Promise<Object>} Vidéo créée
   */
  async createVideo(videoData) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Création d\'une nouvelle vidéo:', videoData)
      
      // Validation des données
      if (!videoData.url || !videoData.title || !videoData.category) {
        throw new Error('URL, titre et catégorie sont requis')
      }

      // Extraire l'ID vidéo YouTube de l'URL
      const videoId = this.extractVideoId(videoData.url)
      if (!videoId) {
        throw new Error('URL YouTube invalide')
      }

      const data = await sql`
        INSERT INTO youtube_videos (url, video_id, title, description, category, age_group, is_active)
        VALUES (${videoData.url}, ${videoId}, ${videoData.title}, ${videoData.description || ''}, ${videoData.category}, ${videoData.ageGroup || null}, ${videoData.isActive !== undefined ? videoData.isActive : true})
        RETURNING *
      `

      console.log('✅ [YOUTUBE_SERVICE] Vidéo créée avec succès:', data[0])
      return data[0]
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans createVideo:', error)
      throw error
    }
  }

  /**
   * Mettre à jour une vidéo
   * @param {number} id - ID de la vidéo
   * @param {Object} videoData - Nouvelles données de la vidéo
   * @returns {Promise<Object>} Vidéo mise à jour
   */
  async updateVideo(id, videoData) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Mise à jour de la vidéo ID:', id)
      
      const updateData = {
        ...videoData,
        updated_at: new Date().toISOString()
      }

      // Si l'URL est mise à jour, extraire le nouvel ID vidéo
      if (videoData.url) {
        const videoId = this.extractVideoId(videoData.url)
        if (videoId) {
          updateData.video_id = videoId
        }
      }

      const data = await sql`
        UPDATE youtube_videos 
        SET 
          url = ${updateData.url || videoData.url},
          video_id = ${updateData.video_id || videoData.video_id},
          title = ${updateData.title || videoData.title},
          description = ${updateData.description || videoData.description},
          category = ${updateData.category || videoData.category},
          age_group = ${updateData.ageGroup || videoData.ageGroup},
          is_active = ${updateData.isActive !== undefined ? updateData.isActive : videoData.isActive},
          updated_at = ${updateData.updated_at}
        WHERE id = ${id}
        RETURNING *
      `

      if (!data || data.length === 0) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [YOUTUBE_SERVICE] Vidéo mise à jour avec succès:', data[0])
      return data[0]
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans updateVideo:', error)
      throw error
    }
  }

  /**
   * Supprimer une vidéo
   * @param {number} id - ID de la vidéo
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteVideo(id) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Suppression de la vidéo ID:', id)
      
      const data = await sql`
        DELETE FROM youtube_videos 
        WHERE id = ${id}
        RETURNING id
      `

      if (!data || data.length === 0) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [YOUTUBE_SERVICE] Vidéo supprimée avec succès')
      return true
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans deleteVideo:', error)
      throw error
    }
  }

  /**
   * Basculer le statut actif d'une vidéo
   * @param {number} id - ID de la vidéo
   * @returns {Promise<Object>} Vidéo mise à jour
   */
  async toggleVideoStatus(id) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Basculement du statut de la vidéo ID:', id)
      
      const data = await sql`
        UPDATE youtube_videos 
        SET is_active = NOT is_active, updated_at = ${new Date().toISOString()}
        WHERE id = ${id}
        RETURNING *
      `

      if (!data || data.length === 0) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [YOUTUBE_SERVICE] Statut basculé avec succès:', data[0])
      return data[0]
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans toggleVideoStatus:', error)
      throw error
    }
  }

  /**
   * Rechercher des vidéos
   * @param {string} query - Terme de recherche
   * @returns {Promise<Array>} Liste des vidéos trouvées
   */
  async searchVideos(query) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Recherche de vidéos:', query)
      
      const data = await sql`
        SELECT * FROM youtube_videos 
        WHERE title ILIKE ${'%' + query + '%'} OR description ILIKE ${'%' + query + '%'}
        ORDER BY created_at DESC
      `

      console.log('✅ [YOUTUBE_SERVICE] Résultats de recherche:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans searchVideos:', error)
      throw error
    }
  }

  /**
   * Récupérer les catégories disponibles
   * @returns {Promise<Array>} Liste des catégories
   */
  async getCategories() {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération des catégories')
      
      const data = await sql`
        SELECT DISTINCT category FROM youtube_videos 
        WHERE is_active = true
        ORDER BY category
      `

      const categories = data.map(item => item.category)
      console.log('✅ [YOUTUBE_SERVICE] Catégories récupérées:', categories)
      return categories
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getCategories:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques des vidéos
   * @returns {Promise<Object>} Statistiques des vidéos
   */
  async getVideoStats() {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération des statistiques')
      
      const data = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
          COUNT(DISTINCT category) as categories,
          COUNT(DISTINCT age_group) as age_groups
        FROM youtube_videos
      `

      const stats = {
        total: parseInt(data[0].total),
        active: parseInt(data[0].active),
        inactive: parseInt(data[0].inactive),
        categories: parseInt(data[0].categories),
        ageGroups: parseInt(data[0].age_groups)
      }

      console.log('✅ [YOUTUBE_SERVICE] Statistiques récupérées:', stats)
      return stats
    } catch (error) {
      console.error('❌ [YOUTUBE_SERVICE] Erreur dans getVideoStats:', error)
      throw error
    }
  }

  /**
   * Extraire l'ID vidéo YouTube de l'URL
   * @param {string} url - URL YouTube
   * @returns {string|null} ID de la vidéo
   */
  extractVideoId(url) {
    if (!url) {
      console.warn('⚠️ [YOUTUBE_SERVICE] URL vide fournie')
      return null
    }
    
    console.log('🔍 [YOUTUBE_SERVICE] Extraction de l\'ID depuis l\'URL:', url)
    
    // Nettoyer l'URL
    const cleanUrl = url.trim()
    
    // Patterns pour différents formats d'URL YouTube
    const patterns = [
      // youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      // youtu.be/VIDEO_ID
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/embed/VIDEO_ID
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/v/VIDEO_ID
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/shorts/VIDEO_ID
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      // Format avec paramètres supplémentaires
      /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
      // Format avec & et autres paramètres
      /(?:youtube\.com\/watch\?[^&]*v=)([a-zA-Z0-9_-]{11})/
    ]
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = cleanUrl.match(pattern)
      if (match && match[1]) {
        const videoId = match[1]
        console.log('✅ [YOUTUBE_SERVICE] ID vidéo extrait:', videoId)
        return videoId
      }
    }
    
    // Si aucun pattern ne correspond, essayer une approche plus flexible
    const flexiblePattern = /[?&]v=([a-zA-Z0-9_-]{11})/
    const flexibleMatch = cleanUrl.match(flexiblePattern)
    if (flexibleMatch && flexibleMatch[1]) {
      const videoId = flexibleMatch[1]
      console.log('✅ [YOUTUBE_SERVICE] ID vidéo extrait (pattern flexible):', videoId)
      return videoId
    }
    
    console.error('❌ [YOUTUBE_SERVICE] Impossible d\'extraire l\'ID vidéo de l\'URL:', cleanUrl)
    console.log('💡 [YOUTUBE_SERVICE] Formats supportés:')
    console.log('  - https://www.youtube.com/watch?v=VIDEO_ID')
    console.log('  - https://youtu.be/VIDEO_ID')
    console.log('  - https://www.youtube.com/embed/VIDEO_ID')
    console.log('  - https://www.youtube.com/shorts/VIDEO_ID')
    
    return null
  }

  /**
   * Générer l'URL de la miniature YouTube
   * @param {string} videoId - ID de la vidéo YouTube
   * @returns {string} URL de la miniature
   */
  getThumbnailUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  /**
   * Générer l'URL d'embed YouTube
   * @param {string} videoId - ID de la vidéo YouTube
   * @returns {string} URL d'embed
   */
  getEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}`
  }
}

// Export d'une instance unique du service
const youtubeVideoService = new YouTubeVideoService()
export default youtubeVideoService