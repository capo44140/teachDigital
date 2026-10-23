// Règles pour les PIN initialisés par script : même politique que l'API (lib/pinPolicy.js),
// y compris le minimum de 6 chiffres pour un profil parent (isAdmin)
const { checkNewPin, isTrivialPin } = require('../lib/pinPolicy.js');

function assertStrongPin(pin, { isAdmin = false } = {}) {
  const value = typeof pin === 'string' ? pin.trim() : '';
  const check = checkNewPin(value, { isAdmin });
  if (!check.ok) {
    throw new Error(check.code === 'INVALID_PIN' ? 'PIN requis : 4 à 8 chiffres' : check.message);
  }
  return value;
}

module.exports = { assertStrongPin, isTrivialPin };
