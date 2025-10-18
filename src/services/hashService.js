import { hashPin as cryptoHashPin, verifyPin as cryptoVerifyPin } from './cryptoWrapper.js';

/**
 * Service de hachage sécurisé pour les codes PIN
 * Utilise bcryptjs pour un hachage sécurisé avec salt
 */
export class HashService {
  
  // Nombre de rounds pour le hachage (plus élevé = plus sécurisé mais plus lent)
  static SALT_ROUNDS = 12;
  
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
      
      const hashedPin = await cryptoHashPin(pin, this.SALT_ROUNDS);
      console.log('✅ Code PIN haché avec succès');
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
      
      const isValid = await cryptoVerifyPin(pin, hashedPin);
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
   * @returns {Object} - { isValid: boolean, message: string }
   */
  static validatePinFormat(pin) {
    if (!pin) {
      return { isValid: false, message: 'Le code PIN est requis' };
    }
    
    if (typeof pin !== 'string') {
      return { isValid: false, message: 'Le code PIN doit être une chaîne de caractères' };
    }
    
    if (pin.length < 4) {
      return { isValid: false, message: 'Le code PIN doit contenir au moins 4 caractères' };
    }
    
    if (pin.length > 8) {
      return { isValid: false, message: 'Le code PIN ne peut pas dépasser 8 caractères' };
    }
    
    if (!/^\d+$/.test(pin)) {
      return { isValid: false, message: 'Le code PIN ne peut contenir que des chiffres' };
    }
    
    // Vérifier les codes PIN trop simples (seulement pour les codes de 4 chiffres)
    if (pin.length === 4) {
      const commonPins = ['0000', '1111', '1234', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
      if (commonPins.includes(pin)) {
        return { isValid: false, message: 'Ce code PIN est trop simple, veuillez en choisir un autre' };
      }
      
      // Vérifier les séquences
      if (this.isSequential(pin)) {
        return { isValid: false, message: 'Le code PIN ne peut pas être une séquence (ex: 1234, 4321)' };
      }
    }
    
    return { isValid: true, message: 'Code PIN valide' };
  }
  
  /**
   * Vérifie si un code PIN est une séquence
   * @param {string} pin - Le code PIN à vérifier
   * @returns {boolean} - True si c'est une séquence
   */
  static isSequential(pin) {
    const digits = pin.split('').map(Number);
    
    // Vérifier les séquences croissantes (1234, 2345, etc.)
    let isAscending = true;
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i-1] + 1) {
        isAscending = false;
        break;
      }
    }
    
    // Vérifier les séquences décroissantes (4321, 5432, etc.)
    let isDescending = true;
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i-1] - 1) {
        isDescending = false;
        break;
      }
    }
    
    return isAscending || isDescending;
  }
  
  /**
   * Génère un code PIN aléatoire sécurisé
   * @param {number} length - Longueur du code PIN (défaut: 4)
   * @returns {string} - Code PIN aléatoire
   */
  static generateSecurePin(length = 4) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    
    let pin;
    do {
      pin = Math.floor(Math.random() * (max - min + 1)) + min;
      pin = pin.toString();
    } while (this.isSequential(pin) || pin.length !== length);
    
    console.log('✅ Code PIN sécurisé généré');
    return pin;
  }
  
  /**
   * Obtient des informations sur la force d'un code PIN
   * @param {string} pin - Le code PIN à analyser
   * @returns {Object} - Informations sur la force du code PIN
   */
  static getPinStrength(pin) {
    // Validation basique
    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
      return { strength: 'invalid', message: 'Code PIN invalide' };
    }
    
    let score = 0;
    const reasons = [];
    
    // Longueur
    if (pin.length >= 6) {
      score += 2;
      reasons.push('Longueur suffisante');
    } else if (pin.length >= 5) {
      score += 1;
      reasons.push('Longueur correcte');
    } else {
      reasons.push('Longueur insuffisante');
    }
    
    // Diversité des chiffres
    const uniqueDigits = new Set(pin).size;
    if (uniqueDigits >= 4) {
      score += 2;
      reasons.push('Diversité des chiffres');
    } else if (uniqueDigits >= 3) {
      score += 1;
      reasons.push('Diversité correcte');
    } else {
      reasons.push('Manque de diversité');
    }
    
    // Pas de répétition excessive
    const maxRepeat = Math.max(...Object.values(pin.split('').reduce((acc, digit) => {
      acc[digit] = (acc[digit] || 0) + 1;
      return acc;
    }, {})));
    
    if (maxRepeat <= 2) {
      score += 1;
      reasons.push('Pas de répétition excessive');
    } else {
      reasons.push('Trop de répétitions');
    }
    
    let strength, message;
    if (score >= 4) {
      strength = 'strong';
      message = 'Code PIN très sécurisé';
    } else if (score >= 2) {
      strength = 'medium';
      message = 'Code PIN moyennement sécurisé';
    } else {
      strength = 'weak';
      message = 'Code PIN peu sécurisé';
    }
    
    return { strength, message, score, reasons };
  }
}

export default HashService;
