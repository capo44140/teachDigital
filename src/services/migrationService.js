/**
 * Service de migration pour faciliter la transition vers les nouvelles APIs
 * Permet de migrer progressivement les composants vers le backend
 */

import { apiService } from './apiService.js'

class MigrationService {
  constructor () {
    this.apiService = apiService
    this.useNewAPI = true // Bascule pour activer/désactiver les nouvelles APIs
  }

  /**
   * Migrer les profils vers la nouvelle API
   */
  async getProfiles () {
    if (this.useNewAPI) {
      try {
        const response = await this.apiService.getProfiles()
        return response.data.profiles
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const { ProfileService } = await import('./profile/profileService.js')
        return await ProfileService.getAllProfiles()
      }
    } else {
      // Ancien service
      const { ProfileService } = await import('./profile/profileService.js')
      return await ProfileService.getAllProfiles()
    }
  }

  /**
   * Migrer les leçons vers la nouvelle API
   */
  async getLessons () {
    if (this.useNewAPI) {
      try {
        const response = await this.apiService.getLessons()
        return response.data.lessons
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const { LessonService } = await import('./lessonService.js')
        return await LessonService.getAllLessons()
      }
    } else {
      // Ancien service
      const { LessonService } = await import('./lessonService.js')
      return await LessonService.getAllLessons()
    }
  }

  /**
   * Migrer les notifications vers la nouvelle API
   */
  async getNotifications () {
    if (this.useNewAPI) {
      try {
        const response = await this.apiService.getNotifications()
        return response.data.notifications
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const { NotificationService } = await import('./notificationService.js')
        return await NotificationService.getAllNotifications()
      }
    } else {
      // Ancien service
      const { NotificationService } = await import('./notificationService.js')
      return await NotificationService.getAllNotifications()
    }
  }

  /**
   * Migrer les vidéos YouTube vers la nouvelle API
   */
  async getYouTubeVideos () {
    if (this.useNewAPI) {
      try {
        return await this.apiService.getYouTubeVideos()
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const youtubeVideoService = await import('./youtubeVideoService.js')
        return await youtubeVideoService.default.getAllVideos()
      }
    } else {
      // Ancien service
      const youtubeVideoService = await import('./youtubeVideoService.js')
      return await youtubeVideoService.default.getAllVideos()
    }
  }

  /**
   * Sauvegarder une leçon via la nouvelle API
   */
  async saveLesson (lessonData, profileId, files = null) {
    if (this.useNewAPI) {
      try {
        // Transmettre l'ID du profil cible (enfant) pour que le quiz lui soit attribué
        const dataWithTarget = { ...lessonData, targetProfileId: profileId }
        const lesson = await this.apiService.createLesson(dataWithTarget)
        return lesson
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const { LessonService } = await import('./lessonService.js')
        return await LessonService.saveLesson(lessonData, profileId, files)
      }
    } else {
      // Ancien service
      const { LessonService } = await import('./lessonService.js')
      return await LessonService.saveLesson(lessonData, profileId, files)
    }
  }

  /**
   * Récupérer les statistiques d'un enfant
   */
  async getChildStats (childId) {
    if (this.useNewAPI) {
      try {
        const response = await this.apiService.request(`/api/profiles/${childId}/learning-stats`, { method: 'GET' })
        return response?.data?.detailedStats || null
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const { LessonService } = await import('./lessonService.js')
        return await LessonService.getDetailedChildStats(childId)
      }
    } else {
      // Ancien service
      const { LessonService } = await import('./lessonService.js')
      return await LessonService.getDetailedChildStats(childId)
    }
  }

  /**
   * Récupérer les activités via la nouvelle API
   */
  async getActivities () {
    if (this.useNewAPI) {
      try {
        return await this.apiService.getActivities()
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const activityService = await import('./activityService.js')
        return await activityService.default.getActivities()
      }
    } else {
      // Ancien service
      const activityService = await import('./activityService.js')
      return await activityService.default.getActivities()
    }
  }

  /**
   * Récupérer les statistiques des activités
   */
  async getActivityStats () {
    if (this.useNewAPI) {
      try {
        return await this.apiService.getActivityStats()
      } catch (error) {
        console.warn('⚠️ Erreur API, fallback vers l\'ancien service:', error)
        // Fallback vers l'ancien service si nécessaire
        const activityService = await import('./activityService.js')
        return await activityService.default.getActivityStats()
      }
    } else {
      // Ancien service
      const activityService = await import('./activityService.js')
      return await activityService.default.getActivityStats()
    }
  }

  /**
   * Activer/désactiver les nouvelles APIs
   */
  setUseNewAPI (useNew) {
    this.useNewAPI = useNew
    console.log(`🔄 Migration Service: ${useNew ? 'Nouvelles APIs activées' : 'Ancien service activé'}`)
  }

  /**
   * Obtenir le statut de migration
   */
  getMigrationStatus () {
    return {
      useNewAPI: this.useNewAPI,
      apiService: this.apiService.isAuthenticated(),
      timestamp: new Date().toISOString()
    }
  }
}

// Instance singleton
export const migrationService = new MigrationService()
export default migrationService
