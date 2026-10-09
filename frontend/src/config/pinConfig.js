// Configuration du code PIN pour l'application
// ⚠️ Aucun code PIN par défaut côté client : la vérification se fait uniquement sur le serveur.
export const PIN_CONFIG = {
  // Nombre maximum de tentatives avant verrouillage temporaire (côté client)
  MAX_ATTEMPTS: 3,

  // Durées successives de verrouillage côté client (en secondes)
  LOCKOUT_DURATIONS: [30, 60, 120],

  // Messages d'erreur
  MESSAGES: {
    INCORRECT_PIN: 'Code PIN incorrect',
    TOO_MANY_ATTEMPTS: 'Trop de tentatives. Veuillez réessayer plus tard.',
    LOCKED_OUT: 'Profil verrouillé temporairement',
    FORGOT_PIN: 'Code PIN oublié ? Demandez à un parent : il peut le réinitialiser depuis le serveur (commande « pnpm update-parent-pin »).'
  }
}
