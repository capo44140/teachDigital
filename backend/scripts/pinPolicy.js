// Règles pour les PIN initialisés par script : 4 à 8 chiffres, pas de code trivial
const TRIVIAL_PINS = new Set(['1234', '12345', '123456', '1234567', '12345678', '4321', '0123', '2580', '1212', '1004', '2000', '6969']);

function isTrivialPin(pin) {
  if (TRIVIAL_PINS.has(pin)) return true;
  // Tous les chiffres identiques (0000, 1111...)
  if (/^(\d)\1+$/.test(pin)) return true;
  return false;
}

function assertStrongPin(pin) {
  const value = typeof pin === 'string' ? pin.trim() : '';
  if (!/^\d{4,8}$/.test(value)) {
    throw new Error('PIN requis : 4 à 8 chiffres');
  }
  if (isTrivialPin(value)) {
    throw new Error('PIN trop facile à deviner, choisissez-en un autre');
  }
  return value;
}

module.exports = { assertStrongPin, isTrivialPin };
