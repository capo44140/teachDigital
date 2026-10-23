// Configuration du code PIN pour l'application
// ⚠️ Aucun code PIN par défaut côté client : la vérification se fait uniquement sur le serveur.
// Le nombre d'essais et le verrouillage (progressif : 15 min → 1 h → 24 h) sont gérés par le serveur.
export const PIN_CONFIG = {
  // Messages d'erreur
  MESSAGES: {
    INCORRECT_PIN: 'Code PIN incorrect',
    FORGOT_PIN: 'Code PIN oublié ? Demandez à un parent : il peut le réinitialiser depuis le serveur (commande « docker exec -it teachdigital-backend node scripts/reset-pin.js <id> <PIN> », qui ferme aussi les sessions du profil).'
  }
}
