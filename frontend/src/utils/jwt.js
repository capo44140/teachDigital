/**
 * Lecture côté client des jetons JWT émis par le backend.
 * ⚠️ Aucune vérification de signature ici : le serveur reste seul juge.
 * Ces fonctions servent uniquement à savoir quel jeton envoyer et quand le jeter.
 */

// Marge de sécurité : un jeton qui expire dans moins de 30 s est considéré comme expiré
const DEFAULT_EXPIRY_SKEW_MS = 30 * 1000

function base64UrlDecode (segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  // Décodage UTF-8 (noms de profil accentués)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Décoder la charge utile d'un JWT
 * @param {string} token
 * @returns {Object|null} payload, ou null si le jeton est illisible
 */
export function decodeJwtPayload (token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return null
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

/**
 * Date d'expiration d'un JWT
 * @param {string} token
 * @returns {number|null} timestamp en millisecondes, ou null si absent
 */
export function getJwtExpiry (token) {
  const payload = decodeJwtPayload(token)
  return payload && typeof payload.exp === 'number' ? payload.exp * 1000 : null
}

/**
 * Le jeton est-il illisible ou expiré ?
 * @param {string} token
 * @param {{ now?: number, skewMs?: number }} options
 * @returns {boolean}
 */
export function isJwtExpired (token, { now = Date.now(), skewMs = DEFAULT_EXPIRY_SKEW_MS } = {}) {
  const payload = decodeJwtPayload(token)
  if (!payload) return true
  // Sans « exp », on laisse le serveur décider
  if (typeof payload.exp !== 'number') return false
  return payload.exp * 1000 <= now + skewMs
}
