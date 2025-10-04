// Configuration du code PIN pour l'application
export const PIN_CONFIG = {
  // Code PIN par défaut
  DEFAULT_PIN: '1234',
  
  // Nombre maximum de tentatives
  MAX_ATTEMPTS: 3,
  
  // Délai de verrouillage après échec (en millisecondes)
  LOCKOUT_DELAY: 30000, // 30 secondes
  
  // Profils qui nécessitent un PIN
  LOCKED_PROFILES: ['parent', 'admin'],
  
  // Messages d'erreur
  MESSAGES: {
    INCORRECT_PIN: 'Code PIN incorrect',
    TOO_MANY_ATTEMPTS: 'Trop de tentatives. Veuillez réessayer plus tard.',
    LOCKED_OUT: 'Profil verrouillé temporairement',
    FORGOT_PIN: 'Code PIN par défaut : {pin}\n\nVous pouvez modifier ce code dans les paramètres de l\'application.'
  }
}

// Fonction pour récupérer le code PIN actuel
export function getCurrentPin() {
  // Essayer de récupérer depuis le localStorage
  const storedPin = localStorage.getItem('app_pin_code')
  return storedPin || PIN_CONFIG.DEFAULT_PIN
}

// Fonction pour définir un nouveau code PIN
export function setPin(newPin) {
  if (newPin && newPin.length === 4 && /^\d{4}$/.test(newPin)) {
    localStorage.setItem('app_pin_code', newPin)
    return true
  }
  return false
}

// Fonction pour vérifier si un profil nécessite un PIN
export function requiresPin(profileName) {
  return PIN_CONFIG.LOCKED_PROFILES.includes(profileName.toLowerCase())
}

// Fonction pour réinitialiser le PIN à la valeur par défaut
export function resetPin() {
  localStorage.removeItem('app_pin_code')
  return PIN_CONFIG.DEFAULT_PIN
}
