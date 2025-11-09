/**
 * Service de hachage natif pour Node.js
 * Utilise l'API crypto native de Node.js
 */
const crypto = require('crypto');

/**
 * Service de hachage sécurisé pour les codes PIN
 * Utilise l'API crypto native de Node.js
 */
class NativeHashService {
  
  /**
   * Hache un code PIN de manière sécurisée
   * @param {string} pin - Le code PIN en clair
   * @returns {Promise<string>} - Le code PIN haché
   */
  static async hashPin(pin) {
    try {
      if (!pin || typeof pin !== 'string') {
        throw new Error('Le code PIN doit être une chaîne de caractères valide');
      }
      
      if (pin.length < 4 || pin.length > 8) {
        throw new Error('Le code PIN doit contenir entre 4 et 8 caractères');
      }
      
      // Créer un salt aléatoire
      const salt = crypto.randomBytes(16);
      
      // Hacher avec SHA-256
      const hash = crypto.createHash('sha256');
      hash.update(salt);
      hash.update(pin);
      const hashedPin = hash.digest('base64');
      
      // Convertir le salt en base64
      const saltBase64 = salt.toString('base64');
      
      const result = `$native$${saltBase64}$${hashedPin}`;
      console.log('✅ Code PIN haché avec succès (native)');
      return result;
    } catch (error) {
      console.error('❌ Erreur lors du hachage du code PIN:', error);
      throw new Error('Impossible de hacher le code PIN');
    }
  }
  
  /**
   * Vérifie si un code PIN correspond au hachage stocké
   * @param {string} pin - Le code PIN en clair à vérifier
   * @param {string} hashedPin - Le code PIN haché stocké
   * @returns {Promise<boolean>} - True si le code PIN est correct
   */
  static async verifyPin(pin, hashedPin) {
    try {
      console.log('🔍 Début de la vérification du code PIN');
      console.log('📝 PIN fourni:', pin ? `${pin.length} caractères` : 'null/undefined');
      console.log('📝 Hachage fourni:', hashedPin ? `${hashedPin.length} caractères` : 'null/undefined');
      
      if (!pin || !hashedPin) {
        console.log('❌ Code PIN ou hachage manquant');
        console.log('   - PIN présent:', !!pin);
        console.log('   - Hachage présent:', !!hashedPin);
        return false;
      }
      
      // Vérifier le format du hachage
      console.log('🔍 Vérification du format du hachage...');
      if (!hashedPin.startsWith('$native$')) {
        console.log('❌ Format de hachage non reconnu');
        console.log('   - Préfixe attendu: $native$');
        console.log('   - Préfixe reçu:', hashedPin.substring(0, Math.min(20, hashedPin.length)));
        return false;
      }
      console.log('✅ Format de hachage reconnu ($native$)');
      
      // Extraire le salt et le hash
      console.log('🔍 Extraction des composants du hachage...');
      const parts = hashedPin.split('$');
      console.log('   - Nombre de parties:', parts.length);
      if (parts.length !== 4) {
        console.log('❌ Format de hachage invalide');
        console.log('   - Format attendu: $native$<salt>$<hash>');
        console.log('   - Format reçu:', parts.length, 'parties');
        return false;
      }
      
      const saltBase64 = parts[2];
      const storedHashBase64 = parts[3];
      console.log('✅ Composants extraits');
      console.log('   - Salt (base64):', saltBase64 ? `${saltBase64.length} caractères` : 'vide');
      console.log('   - Hash stocké (base64):', storedHashBase64 ? `${storedHashBase64.length} caractères` : 'vide');
      
      // Décoder le salt
      console.log('🔍 Décodage du salt...');
      const salt = Buffer.from(saltBase64, 'base64');
      console.log('   - Salt décodé:', salt.length, 'octets');
      
      // Hacher le PIN avec le même salt
      console.log('🔍 Calcul du hash du PIN avec le salt...');
      const hash = crypto.createHash('sha256');
      hash.update(salt);
      hash.update(pin);
      const computedHashBase64 = hash.digest('base64');
      console.log('   - Hash calculé (base64):', computedHashBase64 ? `${computedHashBase64.length} caractères` : 'vide');
      
      // Comparaison
      console.log('🔍 Comparaison des hashs...');
      const isValid = computedHashBase64 === storedHashBase64;
      console.log('   - Hash stocké:', storedHashBase64.substring(0, 20) + '...');
      console.log('   - Hash calculé:', computedHashBase64.substring(0, 20) + '...');
      console.log('   - Correspondance:', isValid ? '✅ OUI' : '❌ NON');
      
      console.log(isValid ? '✅ Code PIN valide' : '❌ Code PIN invalide');
      return isValid;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du code PIN:', error);
      console.error('   - Message:', error.message);
      console.error('   - Stack:', error.stack);
      return false;
    }
  }
  
  /**
   * Valide le format d'un code PIN
   * @param {string} pin - Le code PIN à valider
   * @returns {Object} - Résultat de la validation
   */
  static validatePinFormat(pin) {
    if (!pin || typeof pin !== 'string') {
      return {
        isValid: false,
        error: 'Le code PIN doit être une chaîne de caractères'
      };
    }
    
    if (pin.length < 4 || pin.length > 8) {
      return {
        isValid: false,
        error: 'Le code PIN doit contenir entre 4 et 8 caractères'
      };
    }
    
    if (!/^\d+$/.test(pin)) {
      return {
        isValid: false,
        error: 'Le code PIN ne doit contenir que des chiffres'
      };
    }
    
    // Vérifier les codes PIN faibles
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    if (weakPins.includes(pin)) {
      return {
        isValid: false,
        error: 'Ce code PIN est trop simple, veuillez en choisir un autre'
      };
    }
    
    // Vérifier les séquences
    const sequences = ['1234', '4321', '12345', '54321', '123456', '654321'];
    if (sequences.includes(pin)) {
      return {
        isValid: false,
        error: 'Ce code PIN est une séquence, veuillez en choisir un autre'
      };
    }
    
    return {
      isValid: true,
      error: null
    };
  }
  
  /**
   * Test de fonctionnement du service
   * @returns {Promise<Object>} - Résultat du test
   */
  static async testService() {
    try {
      const testPin = '1234';
      const hashedPin = await this.hashPin(testPin);
      const isValid = await this.verifyPin(testPin, hashedPin);
      
      return {
        success: true,
        message: 'Service de hachage natif fonctionne correctement',
        test: {
          original: testPin,
          hashed: hashedPin,
          verified: isValid
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors du test du service de hachage: ' + error.message,
        error: error
      };
    }
  }
}

module.exports = {
  NativeHashService,
  default: NativeHashService
};
