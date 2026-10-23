import { apiService } from './apiService.js'

/**
 * Service pour gérer les vidéos YouTube
 *
 * ⚠️ IMPORTANT: Ce service communique via l'API backend, pas d'accès direct DB.
 * Aucune donnée de démonstration : en cas d'échec, l'erreur remonte à l'interface.
 */

// Identifiant YouTube : 11 caractères [A-Za-z0-9_-]
const VIDEO_ID = '([a-zA-Z0-9_-]{11})'
const VIDEO_ID_PATTERNS = [
  new RegExp(`youtube\\.com/watch\\?(?:.*&)?v=${VIDEO_ID}`),
  new RegExp(`youtu\\.be/${VIDEO_ID}`),
  new RegExp(`youtube\\.com/embed/${VIDEO_ID}`),
  new RegExp(`youtube\\.com/v/${VIDEO_ID}`),
  new RegExp(`youtube\\.com/shorts/${VIDEO_ID}`),
  new RegExp(`youtube\\.com/live/${VIDEO_ID}`),
  new RegExp(`youtubekids\\.com/watch\\?(?:.*&)?v=${VIDEO_ID}`),
  new RegExp(`[?&]v=${VIDEO_ID}`)
]

/**
 * Extraire l'identifiant d'une vidéo YouTube (watch, youtu.be, embed, Shorts, live, YouTube Kids)
 * @param {string} url
 * @returns {string|null} null si l'URL n'est pas reconnue
 */
export function extractVideoId (url) {
  if (!url || typeof url !== 'string') return null
  const cleanUrl = url.trim()
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = cleanUrl.match(pattern)
    if (match && match[1]) return match[1]
  }
  return null
}

/**
 * URL de la miniature d'une vidéo (null si l'identifiant est inconnu)
 */
export function getThumbnailUrl (videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
}

/**
 * URL d'intégration d'une vidéo (null si l'identifiant est inconnu)
 */
export function getEmbedUrl (videoId) {
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

class YouTubeVideoService {
  /**
   * Récupérer toutes les vidéos YouTube, désactivées comprises (gestion parent :
   * le serveur ne les renvoie qu'avec un jeton parent)
   * @returns {Promise<Array>} Liste des vidéos
   */
  async getAllVideos () {
    return this.fetchVideos('/api/youtube-videos?includeInactive=true')
  }

  /**
   * Récupérer les vidéos actives (affichées aux enfants)
   */
  async getActiveVideos () {
    const videos = await this.fetchVideos('/api/youtube-videos')
    return videos.filter(video => video.is_active)
  }

  async fetchVideos (endpoint) {
    const response = await apiService.request(endpoint)
    const videos = response.success ? response.data?.videos : []
    return Array.isArray(videos) ? videos : []
  }

  /**
   * Récupérer une vidéo par son ID
   * @param {number} id - ID de la vidéo
   */
  async getVideoById (id) {
    const data = await apiService.request(`/api/youtube-videos/${id}`)
    if (!data?.success) {
      throw new Error('Vidéo non trouvée')
    }
    return data.data.video
  }

  /**
   * Créer une nouvelle vidéo
   * @param {Object} videoData - { url, title, description, category, ageGroup, isActive }
   */
  async createVideo (videoData) {
    if (!videoData.url || !videoData.title || !videoData.category) {
      throw new Error('URL, titre et catégorie sont requis')
    }

    const videoId = extractVideoId(videoData.url)
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

    if (!result?.success) {
      throw new Error(result?.message || 'Erreur lors de la création')
    }
    return result.data.video
  }

  /**
   * Mettre à jour une vidéo
   * @param {number} id - ID de la vidéo
   * @param {Object} videoData - Nouvelles données de la vidéo
   */
  async updateVideo (id, videoData) {
    const updateData = { ...videoData }

    // Si l'URL est mise à jour, extraire le nouvel ID vidéo
    if (videoData.url) {
      const videoId = extractVideoId(videoData.url)
      if (!videoId) {
        throw new Error('URL YouTube invalide')
      }
      updateData.video_id = videoId
    }

    const result = await apiService.request(`/api/youtube-videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })

    if (!result?.success) {
      throw new Error(result?.message || 'Vidéo non trouvée')
    }
    return result.data.video
  }

  /**
   * Supprimer une vidéo
   * @param {number} id - ID de la vidéo
   */
  async deleteVideo (id) {
    const result = await apiService.request(`/api/youtube-videos/${id}`, {
      method: 'DELETE'
    })

    if (!result?.success) {
      throw new Error(result?.message || 'Vidéo non trouvée')
    }
    return true
  }

  extractVideoId (url) {
    return extractVideoId(url)
  }

  getThumbnailUrl (videoId) {
    return getThumbnailUrl(videoId)
  }

  getEmbedUrl (videoId) {
    return getEmbedUrl(videoId)
  }
}

// Export d'une instance unique du service
const youtubeVideoService = new YouTubeVideoService()
export default youtubeVideoService
