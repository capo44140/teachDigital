/**
 * Service d'IA pour la génération d'interrogations - Délégation au backend
 * Toute la logique d'IA est gérée par le backend
 */

import { apiService } from './apiService.js'

class AIService {
  /**
   * Génère un quiz à partir d'une image de leçon (via backend)
   */
  async generateQuizFromImage(imageFile, childProfile) {
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('childProfile', JSON.stringify(childProfile))

      const response = await apiService.request('/api/ai/generate-quiz-from-image', {
        method: 'POST',
        body: formData
      })

      return response.data?.quiz || null
    } catch (error) {
      console.error('Erreur lors de la génération du quiz:', error)
      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Génère un quiz à partir de plusieurs documents (images et PDF) (via backend)
   */
  async generateQuizFromDocuments(files, childProfile, questionCount = 5) {
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('documents', file))
      formData.append('childProfile', JSON.stringify(childProfile))
      formData.append('questionCount', questionCount.toString())

      const response = await apiService.request('/api/ai/generate-quiz-from-documents', {
        method: 'POST',
        body: formData
      })

      return response.data?.quiz || null
    } catch (error) {
      console.error('Erreur lors de la génération du quiz multi-documents:', error)
      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Génère un quiz personnalisé basé sur un texte (via backend)
   */
  async generateQuizFromText(inputText, childProfile, options = {}) {
    try {
      const response = await apiService.request('/api/ai/generate-quiz-from-text', {
        method: 'POST',
        body: JSON.stringify({
          text: inputText,
          childProfile,
          options
        })
      })

      return response.data?.quiz || null
    } catch (error) {
      console.error('Erreur lors de la génération du quiz depuis le texte:', error)
      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Vérifie si une clé API est valide (via backend)
   */
  async isValidApiKey(apiType = 'openai') {
    try {
      const response = await apiService.request(`/api/ai/validate-key?type=${apiType}`)
      return response.data?.isValid || false
    } catch (error) {
      console.error('Erreur lors de la validation de la clé API:', error)
      return false
    }
  }

  /**
   * Vérifie si au moins une clé API est valide (via backend)
   */
  async hasValidApiKey() {
    try {
      const response = await apiService.request('/api/ai/has-valid-key')
      return response.data?.hasValidKey || false
    } catch (error) {
      console.error('Erreur lors de la vérification des clés API:', error)
      return false
    }
  }
}

export { AIService }
export default new AIService()
