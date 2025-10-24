import { apiService } from '../apiService.js';
import { HashService } from '../hashService.js';

/**
 * Service pour la gestion des codes PIN
 * Gère la création, validation et vérification des codes PIN
 */
export class PinService {
  
  // Récupérer le code PIN haché d'un profil
  static async getPinByProfileId(profileId) {
    try {
      const response = await apiService.request(`/api/profiles/${profileId}/pin`, {
        method: 'GET'
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du code PIN:', error);
      throw error;
    }
  }
  
  // Mettre à jour le code PIN d'un profil avec hachage sécurisé
  static async updatePin(profileId, newPin, currentPin = null) {
    try {
      // Valider le format du code PIN
      const validation = HashService.validatePinFormat(newPin);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
      
      const response = await apiService.request(`/api/profiles/${profileId}/pin`, {
        method: 'PUT',
        body: JSON.stringify({ newPin, currentPin })
      });
      
      if (response.success) {
        console.log('✅ Code PIN mis à jour avec succès');
        return response.data.pin;
      } else {
        throw new Error(response.message || 'Erreur lors de la mise à jour du code PIN');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du code PIN:', error);
      throw error;
    }
  }
  
  // Vérifier un code PIN avec hachage sécurisé
  static async verifyPin(profileId, inputPin) {
    try {
      const response = await apiService.request(`/api/profiles/${profileId}/pin`, {
        method: 'POST',
        body: JSON.stringify({ pin: inputPin })
      });
      
      if (response.success) {
        const isValid = response.data.isValid;
        if (isValid) {
          console.log('✅ Code PIN vérifié avec succès');
        } else {
          console.log('❌ Code PIN incorrect');
        }
        return isValid;
      } else {
        console.log('❌ Aucun code PIN trouvé pour ce profil');
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du code PIN:', error);
      return false;
    }
  }
  
  // Récupérer le code PIN par défaut (pour les admins) - NON HACHÉ pour l'affichage
  static async getDefaultPin() {
    try {
      // Note: Cette méthode ne devrait être utilisée que pour l'affichage initial
      // Le code PIN par défaut sera haché lors de la première utilisation
      return '1234';
    } catch (error) {
      console.error('Erreur lors de la récupération du code PIN par défaut:', error);
      return '1234';
    }
  }
  
  // Initialiser le code PIN par défaut avec hachage
  static async initializeDefaultPin(profileId = 1) {
    try {
      const defaultPin = '1234';
      
      // Vérifier si un code PIN existe déjà
      const existingPin = await this.getPinByProfileId(profileId);
      
      if (!existingPin) {
        await this.updatePin(profileId, defaultPin);
        console.log('✅ Code PIN par défaut initialisé avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du code PIN par défaut:', error);
      throw error;
    }
  }
  
  // Générer un code PIN sécurisé
  static generateSecurePin(length = 4) {
    return HashService.generateSecurePin(length);
  }
  
  // Analyser la force d'un code PIN
  static analyzePinStrength(pin) {
    return HashService.getPinStrength(pin);
  }
  
  // Valider le format d'un code PIN
  static validatePin(pin) {
    return HashService.validatePinFormat(pin);
  }
}
