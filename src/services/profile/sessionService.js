/**
 * Service pour la gestion des sessions - Délégation au backend
 * Toute la logique de session est gérée par le backend
 */

import { apiService } from '../apiService.js'

/**
 * Service pour la gestion des sessions
 * Gère la création, vérification et suppression des sessions utilisateur
 */
export class SessionService {
  /**
   * Créer une session (via backend)
   */
  static async createSession (profileId, sessionToken, expiresAt) {
    try {
      const response = await apiService.request('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ profileId, sessionToken, expiresAt })
      })
      return response.data?.session || null
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error)
      throw error
    }
  }

  /**
   * Vérifier une session (via backend)
   */
  static async verifySession (sessionToken) {
    try {
      const response = await apiService.request('/api/sessions/verify', {
        method: 'POST',
        body: JSON.stringify({ sessionToken })
      })
      return response.data?.session || null
    } catch (error) {
      console.error('Erreur lors de la vérification de la session:', error)
      throw error
    }
  }

  /**
   * Supprimer une session (via backend)
   */
  static async deleteSession (sessionToken) {
    try {
      const response = await apiService.request(`/api/sessions/${sessionToken}`, {
        method: 'DELETE'
      })
      return response.success
    } catch (error) {
      console.error('Erreur lors de la suppression de la session:', error)
      throw error
    }
  }

  /**
   * Nettoyer les sessions expirées (via backend)
   */
  static async cleanExpiredSessions () {
    try {
      const response = await apiService.request('/api/sessions/clean', {
        method: 'POST'
      })
      return response.data?.cleaned || 0
    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions:', error)
      throw error
    }
  }
}
