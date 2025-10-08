// Utilitaires pour les réponses API standardisées

export function successResponse(data, message = 'Succès', statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({
      success: true,
      message,
      data
    })
  };
}

export function errorResponse(message = 'Erreur interne du serveur', statusCode = 500, details = null) {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      message,
      ...(details && { details })
    })
  };
}

export function validationErrorResponse(errors) {
  return {
    statusCode: 400,
    body: JSON.stringify({
      success: false,
      message: 'Erreur de validation',
      errors
    })
  };
}

export function unauthorizedResponse(message = 'Non autorisé') {
  return {
    statusCode: 401,
    body: JSON.stringify({
      success: false,
      message
    })
  };
}

export function forbiddenResponse(message = 'Accès refusé') {
  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      message
    })
  };
}

export function notFoundResponse(message = 'Ressource non trouvée') {
  return {
    statusCode: 404,
    body: JSON.stringify({
      success: false,
      message
    })
  };
}

// Middleware pour gérer les erreurs
export function handleError(error, defaultMessage = 'Erreur interne du serveur') {
  console.error('Erreur API:', error);
  
  if (error.message === 'Token manquant' || error.message === 'Token invalide') {
    return unauthorizedResponse(error.message);
  }
  
  if (error.message.includes('validation')) {
    return validationErrorResponse([error.message]);
  }
  
  return errorResponse(defaultMessage);
}

