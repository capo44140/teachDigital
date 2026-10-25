/**
 * Service de hachage sécurisé pour les codes PIN.
 *
 * - Nouveaux PIN : bcrypt (cost factor 12) — KDF dédié, résistant GPU.
 * - Hash bcrypt d'un coût inférieur : re-hachés de la même façon (needsRehash).
 * - Anciens PIN au format `$native$<salt>$<sha256>` : toujours vérifiables
 *   pour permettre une migration transparente. À la prochaine vérification
 *   réussie, l'appelant peut re-hacher avec hashPin() pour mettre à jour la BDD.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { checkNewPin } = require('./pinPolicy.js');

const BCRYPT_ROUNDS = 12;
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
   * Indique si le hash stocké utilise un format obsolète (SHA-256 ou bcrypt de coût inférieur)
   * et devrait être re-haché.
   * Permet à l'appelant de faire une migration transparente après un login réussi.
   */
  static needsRehash(hashedPin) {
    if (!hashedPin || typeof hashedPin !== 'string') return false;
    if (hashedPin.startsWith(LEGACY_PREFIX)) return true;
    try {
      return bcrypt.getRounds(hashedPin) < BCRYPT_ROUNDS;
    } catch (_) {
      return false;
    }
  }

  // Politique appliquée aux nouveaux codes (voir lib/pinPolicy.js)
  static validatePinFormat(pin, options = {}) {
    const check = checkNewPin(pin, options);
    return { isValid: check.ok, error: check.message, code: check.code };
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
