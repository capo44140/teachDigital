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
// Les détails techniques (message PostgreSQL, detail, hint, stack) restent dans les logs serveur :
// les renvoyer au client permet d'extraire des données par messages d'erreur.
function handleError(error, defaultMessage = 'Erreur interne du serveur') {
  console.error('Erreur API:', error);

  const message = typeof error?.message === 'string' ? error.message : '';

  if (message === 'Token manquant' || message === 'Token invalide') {
    return unauthorizedResponse(message);
  }

  // Erreurs de timeout (à tester avant les erreurs base : elles portent aussi un code)
  const isTimeout =
    error?.isTimeout === true ||
    error?.code === 'GATEWAY_TIMEOUT' ||
    /timeout/i.test(message);

  if (isTimeout) {
    return errorResponse('La requête a pris trop de temps. Veuillez réessayer.', 504, null, 'GATEWAY_TIMEOUT');
  }

  // Erreurs PostgreSQL (codes SQLSTATE à 5 caractères) ou réseau (ECONNREFUSED...)
  if (error?.code && (typeof error.code === 'string' || typeof error.code === 'number')) {
    console.error('Erreur PostgreSQL:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint
    });
    // Contraintes : message générique mais statut utile au client
    if (error.code === '23505') {
      return errorResponse('Cette ressource existe déjà', 409, null, 'CONFLICT');
    }
    if (error.code === '23503' || error.code === '23502' || error.code === '22P02' || error.code === '22003') {
      return errorResponse('Données invalides', 400, null, 'BAD_REQUEST');
    }
    return errorResponse(defaultMessage, 500, null, 'DB_ERROR');
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

