// Utilitaires pour les réponses API standardisées

function buildErrorPayload(message, code = 'ERROR', data = null, extra = {}) {
  return {
    success: false,
    message: message || 'Erreur interne du serveur',
    code,
    data,
    ...extra
  };
}

function buildSuccessPayload(message, data) {
  return {
    success: true,
    message: message || 'Succès',
    data
  };
}

function successResponse(data, message = 'Succès', statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({
      ...buildSuccessPayload(message, data)
    })
  };
}

function errorResponse(message = 'Erreur interne du serveur', statusCode = 500, details = null, code = 'ERROR') {
  return {
    statusCode,
    body: JSON.stringify({
      ...buildErrorPayload(message, code, null, details ? { details } : {})
    })
  };
}

function validationErrorResponse(errors) {
  return {
    statusCode: 400,
    body: JSON.stringify({
      ...buildErrorPayload('Erreur de validation', 'VALIDATION_ERROR', null, { errors })
    })
  };
}

function unauthorizedResponse(message = 'Non autorisé') {
  return {
    statusCode: 401,
    body: JSON.stringify({
      ...buildErrorPayload(message, 'UNAUTHORIZED')
    })
  };
}

function forbiddenResponse(message = 'Accès refusé') {
  return {
    statusCode: 403,
    body: JSON.stringify({
      ...buildErrorPayload(message, 'FORBIDDEN')
    })
  };
}

function notFoundResponse(message = 'Ressource non trouvée') {
  return {
    statusCode: 404,
    body: JSON.stringify({
      ...buildErrorPayload(message, 'NOT_FOUND')
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
      error.detail || error.hint,
      'DB_ERROR'
    );
  }
  
  // Gérer les erreurs de timeout
  const isTimeout =
    error?.isTimeout === true ||
    error?.code === 'GATEWAY_TIMEOUT' ||
    ((error?.message && error.message.includes('timeout')) || (error?.message && error.message.includes('Timeout')));

  if (isTimeout) {
    console.error('Erreur de timeout:', error.message);
    return errorResponse('La requête a pris trop de temps. Veuillez réessayer.', 504, null, 'GATEWAY_TIMEOUT');
  }
  
  return errorResponse(defaultMessage, 500, null, 'INTERNAL_ERROR');
}

// Fonctions helper pour les réponses (format simplifié)
function createResponse(message, data) {
  return buildSuccessPayload(message, data);
}

function createErrorResponse(message, code = 'ERROR', extra = null) {
  // backward-compatible: ancien usage createErrorResponse(message)
  return buildErrorPayload(message, code, null, extra && typeof extra === 'object' ? extra : {});
}

module.exports = {
  buildErrorPayload,
  buildSuccessPayload,
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

