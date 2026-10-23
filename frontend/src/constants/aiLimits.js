/**
 * Limites des routes IA (identiques aux contrôles du serveur, cf. backend/api/ai/utils/schemas.js) :
 * l'interface les applique avant l'envoi pour éviter un aller-retour refusé en 400.
 */

// Nombre de questions d'un quiz généré (questionCount : entier de 1 à 40)
export const AI_MIN_QUESTION_COUNT = 1
export const AI_MAX_QUESTION_COUNT = 40

// Texte d'une leçon envoyé à l'IA (caractères)
export const AI_MAX_TEXT_LENGTH = 50000

// Documents (images) par requête
export const AI_MAX_DOCUMENTS = 10

// 504 AI_TIMEOUT : délai global de la génération dépassé
export const AI_TIMEOUT_MESSAGE = 'La génération a pris trop de temps. Réessayez avec moins de documents ou de questions.'

// 503 AI_UNAVAILABLE : aucun service d'IA n'a pu répondre
export const AI_UNAVAILABLE_MESSAGE = 'Aucun service d\'intelligence artificielle n\'a pu répondre. Vérifiez la configuration IA ou réessayez plus tard.'

/**
 * Ramener un nombre de questions dans les bornes acceptées par le serveur
 * @param {number|string} value
 * @param {number} fallback - valeur si la saisie n'est pas un nombre
 * @returns {number}
 */
export function boundQuestionCount (value, fallback = 5) {
  const count = Number.parseInt(value, 10)
  if (!Number.isFinite(count)) return fallback
  return Math.min(Math.max(count, AI_MIN_QUESTION_COUNT), AI_MAX_QUESTION_COUNT)
}
