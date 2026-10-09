/**
 * Stockage local des jetons d'authentification et purge des caches API.
 * Module sans dépendance pour éviter les imports circulaires entre
 * apiService, sessionService et familyGateService.
 */

export const PROFILE_TOKEN_KEY = 'auth_token'
export const PROFILE_USER_KEY = 'user_profile'

/**
 * Lire le jeton profil brut (sans validation)
 * @returns {string|null}
 */
export function readProfileToken () {
  try {
    return localStorage.getItem(PROFILE_TOKEN_KEY) || null
  } catch {
    return null
  }
}

/**
 * Enregistrer le jeton profil et le profil connecté
 */
export function storeProfileToken (token, profile = null) {
  localStorage.setItem(PROFILE_TOKEN_KEY, token)
  if (profile) {
    localStorage.setItem(PROFILE_USER_KEY, JSON.stringify(profile))
  } else {
    localStorage.removeItem(PROFILE_USER_KEY)
  }
}

/**
 * Supprimer le jeton profil (droits parent) et le profil associé
 */
export function clearProfileToken () {
  try {
    const hadToken = !!localStorage.getItem(PROFILE_TOKEN_KEY)
    localStorage.removeItem(PROFILE_TOKEN_KEY)
    localStorage.removeItem(PROFILE_USER_KEY)
    if (hadToken) purgeApiCaches()
  } catch {
    // localStorage indisponible (mode privé) : rien à nettoyer
  }
}

/**
 * Purger les réponses API éventuellement conservées par le Service Worker
 * (anciennes versions du SW qui mettaient /api/* en cache).
 * Sans effet si le Service Worker ou l'API Cache ne sont pas disponibles.
 */
export function purgeApiCaches () {
  try {
    const controller = typeof navigator !== 'undefined' && navigator.serviceWorker?.controller
    if (controller && typeof controller.postMessage === 'function') {
      controller.postMessage({ type: 'PURGE_API_CACHE' })
    }
  } catch {
    // Ignorer : la purge directe ci-dessous prend le relais
  }

  if (typeof caches === 'undefined' || typeof caches.keys !== 'function') return Promise.resolve()

  return caches.keys()
    .then(names => Promise.all(names.map(async name => {
      if (/api|critical/i.test(name)) {
        await caches.delete(name)
        return
      }
      const cache = await caches.open(name)
      const requests = await cache.keys()
      await Promise.all(requests
        .filter(request => new URL(request.url).pathname.startsWith('/api/'))
        .map(request => cache.delete(request)))
    })))
    .catch(() => {})
}
