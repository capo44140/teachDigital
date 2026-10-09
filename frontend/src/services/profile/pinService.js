import ApiService from '../apiService.js'
import { HashService } from '../hashService.js'

/**
 * Service pour la gestion des codes PIN
 * Gère la création, la validation de format et la mise à jour des codes PIN.
 * La vérification d'un PIN passe par apiService.login (déverrouillage parent)
 * ou apiService.verifyPin : il n'y a plus de vérification dupliquée ici.
 * IMPORTANT: Ce service communique avec l'API backend, pas directement avec la BD
 */
export class PinService {
  /**
   * Mettre à jour le code PIN via l'API backend
   * @param {number} profileId - ID du profil
   * @param {string} newPin - Nouveau code PIN
   * @param {string} currentPin - Code PIN actuel (optionnel mais recommandé)
   * @returns {Promise<Object>} - Résultat de la mise à jour
   */
  static async updatePin (profileId, newPin, currentPin = null) {
    try {
      // Valider le format du code PIN
      const validation = HashService.validatePinFormat(newPin)
      if (!validation.isValid) {
        throw new Error(validation.message)
      }

      // Appeler l'endpoint API backend: PUT /api/profiles/:id/pin
      const response = await ApiService.request(`/api/profiles/${profileId}/pin`, {
        method: 'PUT',
        body: JSON.stringify({ newPin, currentPin })
      })

      if (response.success) {
        console.log('✅ Code PIN mis à jour avec succès')
        return response.data || {}
      } else {
        throw new Error(response.message || 'Impossible de mettre à jour le code PIN')
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du code PIN:', error)
      throw error
    }
  }

  /**
   * Valider le format d'un code PIN
   * @param {string} pin - Code PIN à valider
   * @returns {Object} - { isValid: boolean, message: string }
   */
  static validatePin (pin) {
    return HashService.validatePinFormat(pin)
  }

  /**
   * Analyser la force d'un code PIN
   * @param {string} pin - Code PIN à analyser
   * @returns {Object} - Informations sur la force du PIN
   */
  static analyzePinStrength (pin) {
    return HashService.getPinStrength(pin)
  }

  /**
   * Générer un code PIN sécurisé
   * @param {number} length - Longueur du PIN (défaut: 4)
   * @returns {string} - Code PIN aléatoire
   */
  static generateSecurePin (length = 4) {
    return HashService.generateSecurePin(length)
  }
}
