/**
 * Présentation des erreurs à l'utilisateur (message + référence de requête discrète)
 */

/**
 * @param {unknown} error
 * @param {string} fallback - message si l'erreur n'en contient pas
 * @returns {{ message: string, requestId: string|null }}
 */
export function describeError (error, fallback = 'Une erreur inattendue est survenue.') {
  const message = (error && typeof error.message === 'string' && error.message.trim()) || fallback
  const requestId = (error && typeof error.requestId === 'string' && error.requestId) ||
    (error && typeof error.data?.requestId === 'string' && error.data.requestId) ||
    null
  return { message, requestId }
}

/**
 * Libellé court de la référence de requête (« Réf. abc123 »), ou null
 * @param {unknown} error
 * @returns {string|null}
 */
export function requestRef (error) {
  const { requestId } = describeError(error)
  return requestId ? `Réf. ${requestId}` : null
}

/**
 * Options de toast pour une erreur (référence affichée discrètement)
 * Usage : toast.error(message, errorToastOptions(error))
 */
export function errorToastOptions (error, options = {}) {
  const meta = requestRef(error)
  return meta ? { ...options, meta } : options
}
