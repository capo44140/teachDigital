import apiService from '../services/apiService.js'

/**
 * Proxy Repository - Utilise l'API backend au lieu d'accÃ¨s direct BD
 */
export class LessonRepository {
  async findByProfileId (profileId) {
    try {
      return await apiService.getLessons({ profileId, published: true })
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration des leÃ§ons:', error)
      return []
    }
  }

  async findAvailableLessons () {
    try {
      return await apiService.getLessons({ published: true })
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration des leÃ§ons disponibles:', error)
      return []
    }
  }

  async findLessonById (lessonId) {
    try {
      return await apiService.getLesson(lessonId)
    } catch (error) {
      console.error('Erreur lors de la rÃ©cupÃ©ration de la leÃ§on:', error)
      return null
    }
  }

  async createLesson (lessonData, profileId, imageFilename, imageData) {
    try {
      return await apiService.createLesson({
        title: lessonData.title,
        description: lessonData.description,
        subject: lessonData.subject,
        level: lessonData.level,
        imageFilename,
        // imageData non envoyé - trop lourd, le backend ne le stocke pas
        quizData: lessonData,
        isPublished: true
      })
    } catch (error) {
      console.error('Erreur lors de la crÃ©ation de la leÃ§on:', error)
      throw error
    }
  }

  async deleteLesson (lessonId, profileId) {
    try {
      await apiService.deleteLesson(lessonId)
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de la leÃ§on:', error)
      return false
    }
  }

  async getProfileLessonStats (profileId) {
    return { total_lessons: 0, published_lessons: 0, lessons_with_images: 0 }
  }

  async findBySubject (subject) {
    const lessons = await this.findAvailableLessons()
    return lessons.filter(l => l.subject === subject)
  }

  async findByLevel (level) {
    const lessons = await this.findAvailableLessons()
    return lessons.filter(l => l.level === level)
  }

  async searchLessons (searchTerm) {
    const lessons = await this.findAvailableLessons()
    const term = searchTerm.toLowerCase()
    return lessons.filter(l =>
      (l.title && l.title.toLowerCase().includes(term)) ||
      (l.description && l.description.toLowerCase().includes(term))
    )
  }
}
