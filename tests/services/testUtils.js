/**
 * Utilitaires partagés par les tests d'authentification
 */

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

/**
 * Fabriquer un JWT (signature factice : le client ne la vérifie pas)
 * @param {Object} payload
 * @param {number} expiresInSeconds - durée de validité (négatif = expiré)
 */
export function makeJwt (payload, expiresInSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000)
  const body = { iat: now, exp: now + expiresInSeconds, ...payload }
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(body)}.signature`
}

/**
 * JWT sans champ « exp »
 */
export function makeJwtWithoutExp (payload) {
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

export const familyToken = (expiresInSeconds = 24 * 3600) =>
  makeJwt({ scope: 'family' }, expiresInSeconds)

export const profileToken = ({ profileId = 1, isAdmin = true, name = 'Parent' } = {}, expiresInSeconds = 24 * 3600) =>
  makeJwt({ scope: 'profile', profileId, name, type: isAdmin ? 'parent' : 'child', isAdmin }, expiresInSeconds)

/**
 * Réponse fetch JSON
 */
export function jsonResponse (status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}

/**
 * Ouvrir une session parent (30 min) pour un profil, comme après la saisie du PIN
 */
export function storeParentSession (profileId, profileName = 'Parent') {
  localStorage.setItem('teachdigital_session', JSON.stringify({
    profileId: String(profileId),
    profileName,
    timestamp: Date.now(),
    isUnlocked: true
  }))
}

/**
 * Ouvrir une session famille valide (jeton famille)
 */
export function storeFamilySession (token = familyToken()) {
  localStorage.setItem('teachdigital_family_session', JSON.stringify({
    token,
    expiresAt: Date.now() + 24 * 3600 * 1000,
    createdAt: Date.now()
  }))
  return token
}
