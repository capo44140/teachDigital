/**
 * Service de progression - Délégation au backend
 * ⚠️ Aucune logique métier ici, uniquement des appels API.
 */

import { apiService } from './apiService.js'

export class ProgressService {
  /**
   * Récupérer le résumé de progression d'un profil (streak, objectifs, compétences, etc.)
   * @param {number} profileId
   * @returns {Promise<Object>} summary
   */
  static async getProfileProgressSummary (profileId) {
    const response = await apiService.request(`/api/profiles/${profileId}/progress-summary`, {
      method: 'GET'
    })

    if (!response?.success) {
      throw new Error(response?.message || 'Erreur lors du chargement de la progression')
    }

    return response.data?.summary || null
  }
}

