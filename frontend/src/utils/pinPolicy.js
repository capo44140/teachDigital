/**
 * Règles de format des codes PIN (contrôle de confort côté client ;
 * le serveur reste seul juge : WEAK_PIN, PIN_TOO_SHORT…).
 *
 * - Saisie / connexion : 4 à 8 chiffres (les PIN existants à 4 chiffres restent valides).
 * - Nouveau PIN d'un profil parent : 6 chiffres minimum.
 * - PIN triviaux refusés : chiffres tous identiques (0000) ou suite (1234, 9876…).
 */

export const PIN_MIN_LENGTH = 4
export const PIN_MAX_LENGTH = 8
export const PARENT_PIN_MIN_LENGTH = 6

const DIGITS_ONLY = /^\d+$/

/**
 * Ne garder que les chiffres, dans la limite de la longueur maximale
 * @param {string} value
 * @returns {string}
 */
export function sanitizePinInput (value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, PIN_MAX_LENGTH)
}

/**
 * Le PIN a-t-il un format saisissable (4 à 8 chiffres) ?
 * @param {string} pin
 * @returns {boolean}
 */
export function isPinFormatValid (pin) {
  const value = String(pin ?? '')
  return DIGITS_ONLY.test(value) && value.length >= PIN_MIN_LENGTH && value.length <= PIN_MAX_LENGTH
}

/**
 * PIN trivial : un seul chiffre répété ou suite croissante / décroissante
 * @param {string} pin
 * @returns {boolean}
 */
export function isTrivialPin (pin) {
  const value = String(pin ?? '')
  if (!DIGITS_ONLY.test(value) || value.length < 2) return false
  if (new Set(value).size === 1) return true
  const digits = value.split('').map(Number)
  const isStep = (step) => digits.every((d, i) => i === 0 || d === (digits[i - 1] + step + 10) % 10)
  return isStep(1) || isStep(-1)
}

/**
 * Valider un nouveau PIN avant de l'envoyer au serveur
 * @param {string} pin
 * @param {{ isParent?: boolean }} options - PIN d'un profil parent : 6 chiffres minimum
 * @returns {{ isValid: boolean, message: string|null }}
 */
export function validateNewPin (pin, { isParent = false } = {}) {
  const value = String(pin ?? '')
  const minLength = isParent ? PARENT_PIN_MIN_LENGTH : PIN_MIN_LENGTH

  if (!DIGITS_ONLY.test(value)) {
    return { isValid: false, message: 'Le code PIN ne doit contenir que des chiffres.' }
  }
  if (value.length < minLength || value.length > PIN_MAX_LENGTH) {
    return {
      isValid: false,
      message: `Le code PIN doit contenir entre ${minLength} et ${PIN_MAX_LENGTH} chiffres.`
    }
  }
  if (isTrivialPin(value)) {
    return { isValid: false, message: 'Ce code PIN est trop simple (chiffres identiques ou suite) : choisissez-en un autre.' }
  }
  return { isValid: true, message: null }
}
