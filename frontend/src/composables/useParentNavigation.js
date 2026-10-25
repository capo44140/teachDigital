import { useRouter } from 'vue-router'
import sessionService from '../services/sessionService.js'
import { hasParentAccess } from '../services/parentAccessService.js'

/**
 * Navigation dans l'espace parent, fondée sur la session parent réelle
 * (sessionService.getValidSession().profileId) et non sur un identifiant codé en dur.
 *
 * Le paramètre `?profile=` ne donne aucun droit : le guard du router vérifie la session
 * parent et le jeton admin du même profil. Il sert seulement à garder l'URL explicite.
 */

/**
 * Identifiant du profil parent de la session (15 min d'inactivité), ou null
 * @returns {string|null}
 */
export function getParentProfileId () {
  const session = sessionService.getValidSession()
  if (!session || !session.isUnlocked) return null
  const id = session.profileId
  return id === undefined || id === null || id === '' ? null : String(id)
}

/**
 * Nom du profil parent de la session, ou ''
 * @returns {string}
 */
export function getParentProfileName () {
  return sessionService.getValidSession()?.profileName || ''
}

/**
 * L'utilisateur courant est-il dans une session parent valide (PIN + jeton admin) ?
 * @returns {boolean}
 */
export function isParentSession () {
  return hasParentAccess(getParentProfileId())
}

/**
 * Emplacement d'une page parent (query `profile` = parent de la session)
 * @param {string} path
 * @param {Object} query - paramètres supplémentaires
 */
export function parentLocation (path, query = {}) {
  const profile = getParentProfileId()
  return { path, query: profile ? { ...query, profile } : { ...query } }
}

export function useParentNavigation () {
  const router = useRouter()

  const goToParent = (path, query = {}) => router.push(parentLocation(path, query))

  return {
    getParentProfileId,
    getParentProfileName,
    isParentSession,
    parentLocation,
    goToParent,
    goToDashboard: () => goToParent('/dashboard'),
    goToSettings: () => goToParent('/parent-settings')
  }
}
