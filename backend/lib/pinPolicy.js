/**
 * Politique des codes PIN (profils et code d'entrée familial).
 *
 * Appliquée uniquement lors d'un CHANGEMENT de code (PUT /profiles/:id/pin,
 * PUT /auth/family-gate, scripts d'initialisation) : la connexion accepte toujours
 * les codes existants, même s'ils ne respectent plus la politique.
 */

const PIN_FORMAT = /^\d{4,8}$/;

// Longueur minimale du PIN d'un profil parent (accès à toutes les données de la famille)
const ADMIN_MIN_PIN_LENGTH = 6;

// Codes très répandus qui ne sont ni des suites ni des répétitions
const COMMON_PINS = new Set([
  '2580', '0852', '1004', '2000', '6969', '1122', '1313', '4444', '5683', '1478',
  '0007', '1010', '7777', '1998', '1999', '2001', '2010', '2020', '1379', '1397'
]);

// 1234, 0123, 456789, 4321, 9876...
function isSequence(pin) {
  const step = Number(pin[1]) - Number(pin[0]);
  if (step !== 1 && step !== -1) return false;
  for (let i = 1; i < pin.length; i++) {
    if (Number(pin[i]) - Number(pin[i - 1]) !== step) return false;
  }
  return true;
}

// 0000, 1212, 123123, 121212...
function isRepeatedBlock(pin) {
  for (let size = 1; size <= pin.length / 2; size++) {
    if (pin.length % size === 0 && pin.slice(0, size).repeat(pin.length / size) === pin) {
      return true;
    }
  }
  return false;
}

// Code trop facile à deviner (le format 4-8 chiffres est vérifié séparément)
function isTrivialPin(pin) {
  const value = typeof pin === 'string' ? pin : String(pin ?? '');
  if (!/^\d+$/.test(value)) return false;
  return isRepeatedBlock(value) || isSequence(value) || COMMON_PINS.has(value);
}

/**
 * Vérifie un nouveau code. Renvoie { ok: true } ou { ok: false, code, message }.
 * - INVALID_PIN : pas 4 à 8 chiffres
 * - PIN_TOO_SHORT : profil parent avec moins de 6 chiffres
 * - WEAK_PIN : suite, répétition ou code courant
 */
function checkNewPin(pin, { isAdmin = false } = {}) {
  const value = typeof pin === 'string' ? pin : '';
  if (!PIN_FORMAT.test(value)) {
    return { ok: false, code: 'INVALID_PIN', message: 'Le code PIN doit contenir 4 à 8 chiffres.' };
  }
  if (isAdmin && value.length < ADMIN_MIN_PIN_LENGTH) {
    return {
      ok: false,
      code: 'PIN_TOO_SHORT',
      message: `Le code PIN d'un profil parent doit contenir au moins ${ADMIN_MIN_PIN_LENGTH} chiffres.`
    };
  }
  if (isTrivialPin(value)) {
    return {
      ok: false,
      code: 'WEAK_PIN',
      message: 'Ce code PIN est trop facile à deviner (suite, chiffres répétés ou code courant). Choisissez-en un autre.'
    };
  }
  return { ok: true, code: null, message: null };
}

module.exports = {
  ADMIN_MIN_PIN_LENGTH,
  isTrivialPin,
  checkNewPin
};
