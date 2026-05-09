/**
 * Service de hachage sécurisé pour les codes PIN.
 *
 * - Nouveaux PIN : bcrypt (cost factor 10) — KDF dédié, résistant GPU.
 * - Anciens PIN au format `$native$<salt>$<sha256>` : toujours vérifiables
 *   pour permettre une migration transparente. À la prochaine vérification
 *   réussie, l'appelant peut re-hacher avec hashPin() pour mettre à jour la BDD.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const LEGACY_PREFIX = '$native$';

class NativeHashService {
  static async hashPin(pin) {
    if (!pin || typeof pin !== 'string') {
      throw new Error('Le code PIN doit être une chaîne de caractères valide');
    }
    if (pin.length < 4 || pin.length > 8) {
      throw new Error('Le code PIN doit contenir entre 4 et 8 caractères');
    }
    return bcrypt.hash(pin, BCRYPT_ROUNDS);
  }

  static async verifyPin(pin, hashedPin) {
    if (!pin || !hashedPin) return false;

    if (hashedPin.startsWith(LEGACY_PREFIX)) {
      return verifyLegacy(pin, hashedPin);
    }

    try {
      return await bcrypt.compare(pin, hashedPin);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification bcrypt:', error.message);
      return false;
    }
  }

  /**
   * Indique si le hash stocké utilise un format obsolète et devrait être re-haché.
   * Permet à l'appelant de faire une migration transparente après un login réussi.
   */
  static needsRehash(hashedPin) {
    if (!hashedPin || typeof hashedPin !== 'string') return false;
    return hashedPin.startsWith(LEGACY_PREFIX);
  }

  static validatePinFormat(pin) {
    if (!pin || typeof pin !== 'string') {
      return { isValid: false, error: 'Le code PIN doit être une chaîne de caractères' };
    }
    if (pin.length < 4 || pin.length > 8) {
      return { isValid: false, error: 'Le code PIN doit contenir entre 4 et 8 caractères' };
    }
    if (!/^\d+$/.test(pin)) {
      return { isValid: false, error: 'Le code PIN ne doit contenir que des chiffres' };
    }
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    if (weakPins.includes(pin)) {
      return { isValid: false, error: 'Ce code PIN est trop simple, veuillez en choisir un autre' };
    }
    const sequences = ['1234', '4321', '12345', '54321', '123456', '654321'];
    if (sequences.includes(pin)) {
      return { isValid: false, error: 'Ce code PIN est une séquence, veuillez en choisir un autre' };
    }
    return { isValid: true, error: null };
  }

  static async testService() {
    try {
      const testPin = '1357';
      const hashedPin = await this.hashPin(testPin);
      const isValid = await this.verifyPin(testPin, hashedPin);
      return {
        success: true,
        message: 'Service de hachage (bcrypt) fonctionne correctement',
        test: { original: testPin, hashed: hashedPin, verified: isValid }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors du test du service de hachage: ' + error.message,
        error
      };
    }
  }
}

function verifyLegacy(pin, hashedPin) {
  const parts = hashedPin.split('$');
  if (parts.length !== 4) return false;
  const [, , saltBase64, storedHashBase64] = parts;
  const salt = Buffer.from(saltBase64, 'base64');
  const hash = crypto.createHash('sha256');
  hash.update(salt);
  hash.update(pin);
  const computedHashBase64 = hash.digest('base64');
  if (computedHashBase64.length !== storedHashBase64.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(computedHashBase64),
    Buffer.from(storedHashBase64)
  );
}

module.exports = {
  NativeHashService,
  default: NativeHashService
};
