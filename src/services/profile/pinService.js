import sql from '../../config/database.js';
import { HashService } from '../hashService.js';

/**
 * Service pour la gestion des codes PIN
 * Gère la création, validation et vérification des codes PIN
 */
export class PinService {
  
  // Récupérer le code PIN haché d'un profil
  static async getPinByProfileId(profileId) {
    try {
      const pins = await sql`
        SELECT pin_code, created_at, updated_at
        FROM pin_codes 
        WHERE profile_id = ${profileId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      return pins[0] || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du code PIN:', error);
      throw error;
    }
  }
  
  // Mettre à jour le code PIN d'un profil avec hachage sécurisé
  static async updatePin(profileId, newPin) {
    try {
      // Valider le format du code PIN
      const validation = HashService.validatePinFormat(newPin);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
      
      // Hacher le code PIN
      const hashedPin = await HashService.hashPin(newPin);
      
      // Vérifier si un code PIN existe déjà
      const existingPin = await this.getPinByProfileId(profileId);
      
      if (existingPin) {
        // Mettre à jour le code PIN existant
        const result = await sql`
          UPDATE pin_codes 
          SET 
            pin_code = ${hashedPin},
            updated_at = CURRENT_TIMESTAMP
          WHERE profile_id = ${profileId}
          RETURNING *
        `;
        console.log('✅ Code PIN mis à jour avec succès');
        return result[0];
      } else {
        // Créer un nouveau code PIN
        const result = await sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
          RETURNING *
        `;
        console.log('✅ Code PIN créé avec succès');
        return result[0];
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du code PIN:', error);
      throw error;
    }
  }
  
  // Vérifier un code PIN avec hachage sécurisé
  static async verifyPin(profileId, inputPin) {
    try {
      const pinRecord = await this.getPinByProfileId(profileId);
      if (!pinRecord) {
        console.log('❌ Aucun code PIN trouvé pour ce profil');
        return false;
      }
      
      // Vérifier le code PIN avec le hachage
      const isValid = await HashService.verifyPin(inputPin, pinRecord.pin_code);
      
      if (isValid) {
        console.log('✅ Code PIN vérifié avec succès');
      } else {
        console.log('❌ Code PIN incorrect');
      }
      
      return isValid;
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
      const hashedPin = await HashService.hashPin(defaultPin);
      
      // Vérifier si un code PIN existe déjà
      const existingPin = await this.getPinByProfileId(profileId);
      
      if (!existingPin) {
        await sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
        `;
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
