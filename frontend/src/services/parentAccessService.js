/**
 * Accès à l'espace parent.
 * Exige une session parent déverrouillée (PIN, 30 min) pour ce profil ET un jeton
 * profil administrateur du même profil. Ni `?profile=` ni `?unlocked=true` ne suffisent.
 */

import sessionService from './sessionService.js'
import { apiService } from './apiService.js'

/**
 * @param {string|number} profileId
 * @returns {boolean}
 */
export function hasParentAccess (profileId) {
  if (profileId === undefined || profileId === null || profileId === '') return false
  return sessionService.isUnlocked(profileId) && apiService.hasAdminTokenFor(profileId)
}

/**
 * Quitter l'espace parent : supprime le jeton profil et la session parent
 * (la session famille est conservée).
 */
export function leaveParentSpace () {
  return apiService.logout()
}
