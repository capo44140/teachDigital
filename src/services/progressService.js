/**
 * Service de progression - Délégation au backend
 * ⚠️ Aucune logique métier ici, uniquement des appels API.
 */

import { apiService } from './apiService.js'

// Taille d'historique (recentHistory) : 50 par défaut côté serveur, 500 au maximum
export const DEFAULT_HISTORY_LIMIT = 50
export const MAX_HISTORY_LIMIT = 500

export class ProgressService {
  /**
   * Récupérer le résumé de progression d'un profil (streak, objectifs, compétences, etc.)
   * @param {number} profileId
   * @param {{ historyLimit?: number }} options - Taille de recentHistory (1 à 500)
   * @returns {Promise<Object>} summary
   */
  static async getProfileProgressSummary (profileId, { historyLimit = DEFAULT_HISTORY_LIMIT } = {}) {
    const limit = Math.min(Math.max(1, Number(historyLimit) || DEFAULT_HISTORY_LIMIT), MAX_HISTORY_LIMIT)
    const response = await apiService.request(`/api/profiles/${profileId}/progress-summary?historyLimit=${limit}`, {
      method: 'GET'
    })

    if (!response?.success) {
      throw new Error(response?.message || 'Erreur lors du chargement de la progression')
    }

    return response.data?.summary || null
  }
}

