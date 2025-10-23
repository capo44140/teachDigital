import { apiService } from './apiService.js'

/**
 * Service pour gérer les vidéos YouTube
 * 
 * ⚠️ IMPORTANT: Ce service communique via l'API backend, pas d'accès direct DB
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
      
      const data = await apiService.getYouTubeVideos()
      console.log('✅ [YOUTUBE_SERVICE] Vidéos récupérées depuis l\'API:', data?.length || 0)
      return data || []
    } catch (error) {
      console.warn('⚠️ [YOUTUBE_SERVICE] Erreur API, utilisation des données de démonstration:', error.message)
      
      // Données de démonstration en cas d'erreur
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
  }

  /**
   * Récupérer une vidéo par son ID
   * @param {number} id - ID de la vidéo
   * @returns {Promise<Object>} Vidéo trouvée
   */
  async getVideoById(id) {
    try {
      console.log('📺 [YOUTUBE_SERVICE] Récupération de la vidéo ID:', id)
      
      const data = await apiService.request(`/api/youtube-videos/${id}`)
      
      if (!data.success) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [YOUTUBE_SERVICE] Vidéo récupérée:', data.data.video)
      return data.data.video
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
      
      const videos = await this.getAllVideos()
      const activeVideos = videos.filter(v => v.is_active)

      console.log('✅ [YOUTUBE_SERVICE] Vidéos actives récupérées:', activeVideos?.length || 0)
      return activeVideos || []
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
      
      const videos = await this.getActiveVideos()
      const categoryVideos = videos.filter(v => v.category === category)

      console.log('✅ [YOUTUBE_SERVICE] Vidéos de la catégorie récupérées:', categoryVideos?.length || 0)
      return categoryVideos || []
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
      
      const videos = await this.getActiveVideos()
      const ageGroupVideos = videos.filter(v => v.age_group === ageGroup)

      console.log('✅ [YOUTUBE_SERVICE] Vidéos du groupe d\'âge récupérées:', ageGroupVideos?.length || 0)
      return ageGroupVideos || []
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

      const result = await apiService.request('/api/youtube-videos', {
        method: 'POST',
        body: JSON.stringify({
          url: videoData.url,
          video_id: videoId,
          title: videoData.title,
          description: videoData.description || '',
          category: videoData.category,
          age_group: videoData.ageGroup || null,
          is_active: videoData.isActive !== undefined ? videoData.isActive : true
        })
      })

      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de la création')
      }

      console.log('✅ [YOUTUBE_SERVICE] Vidéo créée avec succès:', result.data.video)
      return result.data.video
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
      
      const updateData = { ...videoData }

      // Si l'URL est mise à jour, extraire le nouvel ID vidéo
      if (videoData.url) {
        const videoId = this.extractVideoId(videoData.url)
        if (videoId) {
          updateData.video_id = videoId
        }
      }

      const result = await apiService.request(`/api/youtube-videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      if (!result.success) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [YOUTUBE_SERVICE] Vidéo mise à jour avec succès:', result.data.video)
      return result.data.video
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
      
      const result = await apiService.request(`/api/youtube-videos/${id}`, {
        method: 'DELETE'
      })

      if (!result.success) {
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
      
      const video = await this.getVideoById(id)
      const result = await this.updateVideo(id, {
        is_active: !video.is_active
      })

      console.log('✅ [YOUTUBE_SERVICE] Statut basculé avec succès:', result)
      return result
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
      
      const videos = await this.getAllVideos()
      const results = videos.filter(v => 
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.description.toLowerCase().includes(query.toLowerCase())
      )

      console.log('✅ [YOUTUBE_SERVICE] Résultats de recherche:', results?.length || 0)
      return results || []
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
      
      const videos = await this.getActiveVideos()
      const categories = [...new Set(videos.map(v => v.category))].sort()

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
      
      const videos = await this.getAllVideos()
      const activeVideos = videos.filter(v => v.is_active)
      const categories = new Set(videos.map(v => v.category))
      const ageGroups = new Set(videos.map(v => v.age_group))

      const stats = {
        total: videos.length,
        active: activeVideos.length,
        inactive: videos.length - activeVideos.length,
        categories: categories.size,
        ageGroups: ageGroups.size
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
    
    const cleanUrl = url.trim()
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
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
    
    const flexiblePattern = /[?&]v=([a-zA-Z0-9_-]{11})/
    const flexibleMatch = cleanUrl.match(flexiblePattern)
    if (flexibleMatch && flexibleMatch[1]) {
      const videoId = flexibleMatch[1]
      console.log('✅ [YOUTUBE_SERVICE] ID vidéo extrait (pattern flexible):', videoId)
      return videoId
    }
    
    console.error('❌ [YOUTUBE_SERVICE] Impossible d\'extraire l\'ID vidéo de l\'URL:', cleanUrl)
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