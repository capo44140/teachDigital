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
  
  return errorResponse(defaultMessage);
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  handleError
};

