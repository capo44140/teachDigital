/**
 * Service d'IA pour la génération d'interrogations - Délégation au backend
 * Toute la logique d'IA est gérée par le backend
 */

import { apiService } from './apiService.js'

class AIService {
  /**
   * Génère un quiz à partir d'une image de leçon (via backend)
   */
  async generateQuizFromImage (imageFile, childProfile) {
    try {
      // Convertir l'image en base64 pour l'envoyer en JSON
      const base64Image = await this.fileToBase64(imageFile)

      const response = await apiService.request('/api/ai/generate-quiz-from-image', {
        method: 'POST',
        body: JSON.stringify({
          image: base64Image,
          childProfile
        })
      })

      return response.data?.quiz || null
    } catch (error) {
      console.error('Erreur lors de la génération du quiz:', error)
      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Convertit un fichier en base64
   */
  fileToBase64 (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  /**
   * Extrait le texte des documents (OCR uniquement - étape 1)
   * Retourne les textes extraits et les analyses
   * @param {File[]} files - Fichiers à traiter
   * @param {boolean} useLLMOCR - Si true, utilise LLM Vision au lieu de Tesseract
   */
  async extractTextFromDocuments (files, useLLMOCR = true) {
    try {
      // Utiliser FormData au lieu de JSON pour éviter les erreurs 413
      const formData = new FormData()

      // Ajouter les fichiers directement (plus efficace que base64)
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file)
        formData.append(`file_${index}_name`, file.name)
        formData.append(`file_${index}_type`, file.type)
      })

      // Ajouter les métadonnées
      formData.append('fileCount', files.length.toString())
      formData.append('useLLMOCR', useLLMOCR.toString())

      const response = await apiService.request('/api/ai/extract-text-from-documents', {
        method: 'POST',
        body: formData
      })

      return response.data?.extractions || null
    } catch (error) {
      console.error('Erreur lors de l\'extraction OCR:', error)

      // Message d'erreur plus explicite pour 413
      if (error.message.includes('413') || error.message.includes('Content Too Large')) {
        throw new Error('Les fichiers sont trop volumineux. Veuillez réduire la taille des images ou utiliser moins de fichiers.')
      }

      throw new Error('Impossible d\'extraire le texte des documents. Veuillez réessayer.')
    }
  }

  /**
   * Génère un quiz à partir d'analyses déjà effectuées (étape 2)
   * Prend les extractions retournées par extractTextFromDocuments
   */
  async generateQuizFromAnalyses (extractions, childProfile, questionCount = 5) {
    try {
      const response = await apiService.request('/api/ai/generate-quiz-from-analyses', {
        method: 'POST',
        body: JSON.stringify({
          extractions,
          childProfile,
          questionCount
        })
      })

      return response.data?.quiz || null
    } catch (error) {
      console.error('Erreur lors de la génération du quiz depuis analyses:', error)

      // Si tous les services IA ont échoué
      if (error.message.includes('Tous les services IA ont échoué')) {
        throw new Error('Impossible de générer le quiz. Tous les services d\'intelligence artificielle ont échoué. Veuillez réessayer plus tard.')
      }

      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Génère un quiz à partir de plusieurs documents (images et PDF) (via backend)
   * Utilise FormData pour éviter les erreurs 413 (Content Too Large)
   * MÉTHODE LEGACY - Utilisez extractTextFromDocuments + generateQuizFromAnalyses pour éviter les timeouts
   */
  async generateQuizFromDocuments (files, childProfile, questionCount = 5) {
    try {
      // Utiliser FormData au lieu de JSON pour éviter les erreurs 413
      const formData = new FormData()

      // Ajouter les fichiers directement (plus efficace que base64)
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file)
        formData.append(`file_${index}_name`, file.name)
        formData.append(`file_${index}_type`, file.type)
      })

      // Ajouter les métadonnées
      formData.append('childProfile', JSON.stringify(childProfile))
      formData.append('questionCount', questionCount.toString())
      formData.append('fileCount', files.length.toString())

      const response = await apiService.request('/api/ai/generate-quiz-from-documents', {
        method: 'POST',
        body: formData
      })

      return response.data?.quiz || null
    } catch (error) {
      console.error('Erreur lors de la génération du quiz multi-documents:', error)

      // Message d'erreur plus explicite pour 413
      if (error.message.includes('413') || error.message.includes('Content Too Large')) {
        throw new Error('Les fichiers sont trop volumineux. Veuillez réduire la taille des images ou utiliser moins de fichiers.')
      }

      throw new Error('Impossible de générer le quiz. Veuillez réessayer.')
    }
  }

  /**
   * Génère un quiz personnalisé basé sur un texte (via backend)
   */
  async generateQuizFromText (inputText, childProfile, options = {}) {
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
  async isValidApiKey (apiType = 'openai') {
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
  async hasValidApiKey () {
    try {
      const response = await apiService.request('/api/ai/has-valid-key')
      return response.data?.hasValidKey || false
    } catch (error) {
      console.error('Erreur lors de la vérification des clés API:', error)
      return false
    }
  }

  // ==================== LM Studio / LocalLLM ====================

  /**
   * Récupère la liste des modèles disponibles dans LM Studio
   * @returns {Promise<Object>} { connected, baseUrl, activeModel, activeModelSource, envModel, models }
   */
  async getLocalLLMModels () {
    try {
      const response = await apiService.request('/api/ai/local-llm/models')
      return response.data || null
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles LM Studio:', error)
      throw error
    }
  }

  /**
   * Récupère le statut de connexion à LM Studio
   * @returns {Promise<Object>} { connected, baseUrl, activeModel, activeModelSource, envModel, ocrMode }
   */
  async getLocalLLMStatus () {
    try {
      const response = await apiService.request('/api/ai/local-llm/status')
      return response.data || null
    } catch (error) {
      console.error('Erreur lors de la récupération du statut LM Studio:', error)
      throw error
    }
  }

  /**
   * Change le modèle actif du LLM local
   * @param {string|null} modelId - ID du modèle, ou null pour restaurer le défaut
   * @returns {Promise<Object>} { activeModel, activeModelSource }
   */
  async setLocalLLMModel (modelId) {
    try {
      const response = await apiService.request('/api/ai/local-llm/model', {
        method: 'POST',
        body: JSON.stringify({ modelId })
      })
      return response.data || null
    } catch (error) {
      console.error('Erreur lors du changement de modèle:', error)
      throw error
    }
  }
}

export { AIService }
export default new AIService()
