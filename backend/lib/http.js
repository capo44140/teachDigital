/**
 * Petits utilitaires partagés par les contrôleurs Express.
 */
const { handleError, createErrorResponse } = require('./response.js');

// Identifiant entier strictement positif (nombre ou chaîne de chiffres), sinon null
function parseId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const id = Number(value.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Réponse d'erreur standard { success: false, message, code, data: null }
function sendFailure(res, status, message, code, extra) {
  return res.status(status).json(createErrorResponse(message, code, extra));
}

// Réponse d'erreur à partir d'une exception (timeouts, contraintes SQL...) : voir handleError
function sendError(res, error, defaultMessage) {
  const { statusCode, body } = handleError(error, defaultMessage);
  return res.status(statusCode).json(JSON.parse(body));
}

module.exports = {
  parseId,
  sendFailure,
  sendError
};
