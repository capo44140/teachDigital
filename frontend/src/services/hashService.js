import { NativeHashService } from './nativeHashService.js'

/**
 * Service de hachage sécurisé pour les codes PIN
 * Utilise l'API Web Crypto native pour un hachage sécurisé avec salt
 */
export class HashService {
  // Service de hachage natif (plus léger et plus rapide)
  static nativeService = NativeHashService

  /**
   * Hache un code PIN de manière sécurisée
   * @param {string} pin - Le code PIN en clair
   * @returns {Promise<string>} - Le code PIN haché
   */
  static async hashPin (pin) {
    try {
      return await this.nativeService.hashPin(pin)
    } catch (error) {
      console.error('❌ Erreur lors du hachage du code PIN:', error)
      throw new Error('Impossible de hacher le code PIN')
    }
  }

  /**
   * Vérifie si un code PIN correspond au hachage stocké
   * @param {string} pin - Le code PIN en clair à vérifier
   * @param {string} hashedPin - Le code PIN haché stocké
   * @returns {Promise<boolean>} - True si le code PIN est correct
   */
  static async verifyPin (pin, hashedPin) {
    try {
      return await this.nativeService.verifyPin(pin, hashedPin)
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du code PIN:', error)
      return false
    }
  }

  /**
   * Valide le format d'un code PIN
   * @param {string} pin - Le code PIN à valider
   * @returns {Object} - { isValid: boolean, message: string }
   */
  static validatePinFormat (pin) {
    return this.nativeService.validatePinFormat(pin)
  }

  /**
   * Génère un code PIN aléatoire sécurisé
   * @param {number} length - Longueur du code PIN (défaut: 4)
   * @returns {string} - Code PIN aléatoire
   */
  static generateSecurePin (length = 4) {
    return this.nativeService.generateSecurePin(length)
  }

  /**
   * Obtient des informations sur la force d'un code PIN
   * @param {string} pin - Le code PIN à analyser
   * @returns {Object} - Informations sur la force du code PIN
   */
  static getPinStrength (pin) {
    return this.nativeService.getPinStrength(pin)
  }
}

export default HashService
