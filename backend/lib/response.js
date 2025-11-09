// Utilitaires pour les réponses API standardisées

function successResponse(data, message = 'Succès', statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({
      success: true,
      message,
      data
    })
  };
}

function errorResponse(message = 'Erreur interne du serveur', statusCode = 500, details = null) {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      message,
      ...(details && { details })
    })
  };
}

function validationErrorResponse(errors) {
  return {
    statusCode: 400,
    body: JSON.stringify({
      success: false,
      message: 'Erreur de validation',
      errors
    })
  };
}

function unauthorizedResponse(message = 'Non autorisé') {
  return {
    statusCode: 401,
    body: JSON.stringify({
      success: false,
      message
    })
  };
}

function forbiddenResponse(message = 'Accès refusé') {
  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      message
    })
  };
}

function notFoundResponse(message = 'Ressource non trouvée') {
  return {
    statusCode: 404,
    body: JSON.stringify({
      success: false,
      message
    })
  };
}

// Middleware pour gérer les erreurs
function handleError(error, defaultMessage = 'Erreur interne du serveur') {
  console.error('Erreur API:', error);
  
  if (error.message === 'Token manquant' || error.message === 'Token invalide') {
    return unauthorizedResponse(error.message);
  }
  
  if (error.message.includes('validation')) {
    return validationErrorResponse([error.message]);
  }
  
  // Gérer les erreurs de base de données PostgreSQL
  // Les codes d'erreur PostgreSQL sont des chaînes de 5 caractères (ex: '23505', '42P01', 'ECONNREFUSED')
  if (error.code && (typeof error.code === 'string' || typeof error.code === 'number')) {
    console.error('Erreur PostgreSQL:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint
    });
    return errorResponse(
      error.message || defaultMessage,
      500,
      error.detail || error.hint
    );
  }
  
  // Gérer les erreurs de timeout
  if (error.message && error.message.includes('timeout') || error.message && error.message.includes('Timeout')) {
    console.error('Erreur de timeout:', error.message);
    return errorResponse('La requête a pris trop de temps. Veuillez réessayer.', 504);
  }
  
  return errorResponse(defaultMessage);
}

// Fonctions helper pour les réponses (format simplifié)
function createResponse(message, data) {
  return {
    success: true,
    message,
    data
  };
}

function createErrorResponse(message) {
  return {
    success: false,
    message
  };
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  handleError,
  createResponse,
  createErrorResponse
};

