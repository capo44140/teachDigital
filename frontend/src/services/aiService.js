/**
 * Service d'IA pour la génération d'interrogations - Délégation au backend
 * Toute la logique d'IA est gérée par le backend
 */

import { apiService, ApiError } from './apiService.js'
import { AI_TIMEOUT_MESSAGE, AI_UNAVAILABLE_MESSAGE } from '../constants/aiLimits.js'

// Erreurs à transmettre telles quelles : leur message (serveur ou apiService) est déjà parlant,
// et le statut sert à l'interface (429 + retryAfterSeconds, 415 format refusé, session expirée…)
const MEANINGFUL_STATUSES = new Set([400, 401, 403, 404, 413, 415, 429])
const MEANINGFUL_CODES = new Set(['TIMEOUT', 'NETWORK_ERROR', 'SESSION_EXPIRED', 'OFFLINE', 'UNSUPPORTED_FILE_TYPE'])

/**
 * Conserver les erreurs utiles, remplacer les autres par un message générique
 * (en gardant statut, code et référence de requête)
 * - 504 AI_TIMEOUT : délai global de génération dépassé ;
 * - 503 AI_UNAVAILABLE : aucun service d'IA n'a répondu (y compris quand aucun document n'a pu être
 *   analysé) — le serveur ne détaille plus la cause (plus de champ « reason »).
 */
function toAiError (error, fallbackMessage) {
  if (error instanceof ApiError) {
    const keep = { status: error.status, code: error.code, data: error.data, requestId: error.requestId, cause: error }
    if (error.code === 'AI_TIMEOUT' || (error.status === 504 && !error.code)) {
      return new ApiError(AI_TIMEOUT_MESSAGE, { ...keep, code: 'AI_TIMEOUT' })
    }
    if (error.code === 'AI_UNAVAILABLE') {
      return new ApiError(error.message || AI_UNAVAILABLE_MESSAGE, keep)
    }
    if (MEANINGFUL_STATUSES.has(error.status) || MEANINGFUL_CODES.has(error.code)) {
      return error
    }
    return new ApiError(fallbackMessage, keep)
  }
  return new Error(fallbackMessage)
}

function appendFiles (formData, files) {
  files.forEach((file, index) => {
    formData.append(`file_${index}`, file)
    formData.append(`file_${index}_name`, file.name)
    formData.append(`file_${index}_type`, file.type)
  })
}

class AIService {
  /**
   * Extrait le texte des documents (OCR uniquement - étape 1)
   * Les routes IA n'acceptent que des images (PDF refusés : 415 UNSUPPORTED_FILE_TYPE).
   * @param {File[]} files - Images à traiter
   * @param {boolean} useLLMOCR - Si true, utilise LLM Vision au lieu de Tesseract
   */
  async extractTextFromDocuments (files, useLLMOCR = true) {
    try {
      // FormData plutôt que JSON/base64 pour éviter les erreurs 413
      const formData = new FormData()
      appendFiles(formData, files)
      formData.append('fileCount', files.length.toString())
      formData.append('useLLMOCR', useLLMOCR.toString())

      const response = await apiService.request('/api/ai/extract-text-from-documents', {
        method: 'POST',
        body: formData
      })

      return response.data?.extractions || null
    } catch (error) {
      console.error('Erreur lors de l\'extraction OCR:', error)
      throw toAiError(error, 'Impossible d\'extraire le texte des documents. Veuillez réessayer.')
    }
  }

  /**
   * Génère une page HTML d'entraînement à partir des photos d'une leçon / d'un contrôle
   * La page n'est pas publiée : elle est renvoyée pour relecture avant publication
   * @param {File[]} files - Photos
   * @param {Object} childProfile - Profil de l'enfant (name, level)
   * @param {{subject?: string, topic?: string, instructions?: string}} options
   * @returns {Promise<{html: string, summary: string, provider: string, model: string}>}
   */
  async generateCoursePage (files, childProfile, { subject = '', topic = '', instructions = '' } = {}) {
    const formData = new FormData()
    appendFiles(formData, files)
    formData.append('fileCount', files.length.toString())
    formData.append('childProfile', JSON.stringify({ name: childProfile.name, level: childProfile.level }))
    formData.append('subject', subject)
    formData.append('topic', topic)
    formData.append('instructions', instructions)

    try {
      const response = await apiService.request('/api/ai/generate-course-page', {
        method: 'POST',
        body: formData
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la génération de la page de cours:', error)
      if (error?.status === 413) {
        throw new ApiError('Les photos sont trop volumineuses (25 Mo au total maximum). Réduisez leur taille ou leur nombre.', {
          status: 413, code: error.code, requestId: error.requestId, cause: error
        })
      }
      throw toAiError(error, error?.message || 'Impossible de générer la page. Veuillez réessayer.')
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
      throw toAiError(error, 'Impossible de générer le quiz. Veuillez réessayer.')
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
      throw toAiError(error, 'Impossible de générer le quiz. Veuillez réessayer.')
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

  /**
   * Récupère le statut de tous les providers IA (clé configurée + joignable)
   * @returns {Promise<Array>} Liste des providers avec leur statut
   */
  async getProvidersStatus () {
    try {
      const response = await apiService.request('/api/ai/providers')
      return response.data?.providers || []
    } catch (error) {
      console.error('Erreur lors de la récupération des providers:', error)
      throw error
    }
  }

  /**
   * Change l'URL du LLM local
   * @param {string|null} baseUrl - URL de l'API compatible OpenAI, ou null pour revenir au .env
   * @returns {Promise<Object|null>} { baseUrl, baseUrlSource, envBaseUrl }
   */
  async setLocalLLMUrl (baseUrl) {
    try {
      const response = await apiService.request('/api/ai/local-llm/url', {
        method: 'POST',
        body: JSON.stringify({ baseUrl })
      })
      return response.data || null
    } catch (error) {
      console.error('Erreur lors du changement d\'URL LM Studio:', error)
      throw error
    }
  }

  /**
   * Récupère la configuration de chaque provider à clé API (clé masquée, modèle actif)
   * @returns {Promise<Array>} [{ name, label, keyConfigured, keySource, maskedKey, model, modelSource, defaultModel, ... }]
   */
  async getProvidersConfig () {
    try {
      const response = await apiService.request('/api/ai/providers/config')
      return response.data?.providers || []
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration des providers:', error)
      throw error
    }
  }

  /**
   * Enregistre la clé API et/ou le modèle d'un provider (la clé est vérifiée par le serveur)
   * @param {string} name - Nom du provider (ex: "OpenAI")
   * @param {Object} config - { apiKey?: string, model?: string|null } (model null = défaut)
   * @returns {Promise<Object|null>} Configuration du provider mise à jour
   */
  async saveProviderConfig (name, config) {
    try {
      const response = await apiService.request(`/api/ai/providers/${encodeURIComponent(name)}/config`, {
        method: 'POST',
        body: JSON.stringify(config)
      })
      return response.data || null
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement de la configuration ${name}:`, error)
      throw error
    }
  }

  /**
   * Supprime la clé enregistrée depuis l'interface (retour à la clé du .env)
   * @param {string} name - Nom du provider
   * @returns {Promise<Object|null>} Configuration du provider mise à jour
   */
  async deleteProviderKey (name) {
    try {
      const response = await apiService.request(`/api/ai/providers/${encodeURIComponent(name)}/key`, { method: 'DELETE' })
      return response.data || null
    } catch (error) {
      console.error(`Erreur lors de la suppression de la clé ${name}:`, error)
      throw error
    }
  }

  /**
   * Liste les modèles proposés par un provider (suggestions)
   * @param {string} name - Nom du provider
   * @returns {Promise<string[]>} Identifiants de modèles
   */
  async getProviderModels (name) {
    const response = await apiService.request(`/api/ai/providers/${encodeURIComponent(name)}/models`)
    return response.data?.models || []
  }

  /**
   * Récupère le provider IA utilisé pour la génération de pages de cours
   * @returns {Promise<Object|null>} { provider: string|null, options: [{ name, label, configured, model }] }
   */
  async getCoursePageProvider () {
    try {
      const response = await apiService.request('/api/ai/course-page/provider')
      return response.data || null
    } catch (error) {
      console.error('Erreur lors de la récupération du provider des pages de cours:', error)
      throw error
    }
  }

  /**
   * Enregistre le provider IA des pages de cours
   * @param {string|null} provider - Nom du provider (ex: "OpenRouter"), ou null pour le mode automatique
   * @returns {Promise<Object|null>} Configuration mise à jour
   */
  async setCoursePageProvider (provider) {
    try {
      const response = await apiService.request('/api/ai/course-page/provider', {
        method: 'POST',
        body: JSON.stringify({ provider })
      })
      return response.data || null
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du provider des pages de cours:', error)
      throw error
    }
  }
}

export { AIService }
export default new AIService()
