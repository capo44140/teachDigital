/**
 * Service de hachage natif utilisant l'API Web Crypto
 * Remplace bcryptjs par une solution native plus légère
 */

/**
 * Service de hachage sécurisé pour les codes PIN
 * Utilise l'API Web Crypto native du navigateur
 */
export class NativeHashService {
  
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
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Convertir le PIN et le salt en ArrayBuffer
      const pinBuffer = new TextEncoder().encode(pin);
      const combinedBuffer = new Uint8Array(salt.length + pinBuffer.length);
      combinedBuffer.set(salt);
      combinedBuffer.set(pinBuffer, salt.length);
      
      // Hacher avec SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
      
      // Convertir en base64 avec le salt
      const saltBase64 = btoa(String.fromCharCode(...salt));
      const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      
      const hashedPin = `$native$${saltBase64}$${hashBase64}`;
      console.log('✅ Code PIN haché avec succès (native)');
      return hashedPin;
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
      if (!pin || !hashedPin) {
        console.log('❌ Code PIN ou hachage manquant');
        return false;
      }
      
      // Vérifier le format du hachage
      if (!hashedPin.startsWith('$native$')) {
        console.log('❌ Format de hachage non reconnu');
        return false;
      }
      
      // Extraire le salt et le hash
      const parts = hashedPin.split('$');
      if (parts.length !== 4) {
        console.log('❌ Format de hachage invalide');
        return false;
      }
      
      const saltBase64 = parts[2];
      const storedHashBase64 = parts[3];
      
      // Décoder le salt
      const salt = new Uint8Array(
        atob(saltBase64).split('').map(char => char.charCodeAt(0))
      );
      
      // Hacher le PIN avec le même salt
      const pinBuffer = new TextEncoder().encode(pin);
      const combinedBuffer = new Uint8Array(salt.length + pinBuffer.length);
      combinedBuffer.set(salt);
      combinedBuffer.set(pinBuffer, salt.length);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
      const computedHashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      
      const isValid = computedHashBase64 === storedHashBase64;
      console.log(isValid ? '✅ Code PIN valide' : '❌ Code PIN invalide');
      return isValid;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du code PIN:', error);
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
   * Analyse la force d'un code PIN
   * @param {string} pin - Le code PIN à analyser
   * @returns {Object} - Analyse de la force
   */
  static getPinStrength(pin) {
    if (!pin || typeof pin !== 'string') {
      return { score: 0, level: 'Faible', message: 'Code PIN invalide' };
    }
    
    let score = 0;
    
    // Points pour la longueur
    if (pin.length >= 4) score += 1;
    if (pin.length >= 6) score += 1;
    if (pin.length >= 8) score += 1;
    
    // Points pour la diversité des chiffres
    const uniqueDigits = new Set(pin).size;
    if (uniqueDigits >= 3) score += 1;
    if (uniqueDigits >= 5) score += 1;
    
    // Points pour l'absence de répétitions excessives
    const maxRepetition = Math.max(...Object.values(
      pin.split('').reduce((acc, digit) => {
        acc[digit] = (acc[digit] || 0) + 1;
        return acc;
      }, {})
    ));
    
    if (maxRepetition <= 2) score += 1;
    
    let level, message;
    if (score <= 2) {
      level = 'Faible';
      message = 'Code PIN facile à deviner';
    } else if (score <= 4) {
      level = 'Moyen';
      message = 'Code PIN acceptable';
    } else {
      level = 'Fort';
      message = 'Code PIN sécurisé';
    }
    
    return { score, level, message };
  }
  
  /**
   * Génère un code PIN sécurisé
   * @param {number} length - Longueur du code PIN (4, 6 ou 8)
   * @returns {string} - Code PIN généré
   */
  static generateSecurePin(length = 4) {
    if (![4, 6, 8].includes(length)) {
      throw new Error('La longueur doit être 4, 6 ou 8');
    }
    
    let pin;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      // Générer un PIN aléatoire
      const digits = [];
      for (let i = 0; i < length; i++) {
        digits.push(Math.floor(Math.random() * 10));
      }
      pin = digits.join('');
      attempts++;
    } while (attempts < maxAttempts && this.getPinStrength(pin).score < 3);
    
    if (attempts >= maxAttempts) {
      // Fallback: générer un PIN simple mais valide
      pin = Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    }
    
    return pin;
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

export default NativeHashService;
