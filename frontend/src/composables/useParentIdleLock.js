import { onMounted, onBeforeUnmount } from 'vue'
import sessionService from '../services/sessionService.js'
import { hasParentAccess, leaveParentSpace } from '../services/parentAccessService.js'

/**
 * Verrouillage automatique de l'espace parent après inactivité.
 *
 * Dans une page parent (meta.requiresAdmin), l'activité (toucher, clavier, molette) prolonge
 * la session parent (sessionService, 15 min). Sans activité, la session expire : la page est
 * quittée et le jeton parent supprimé, même si personne ne navigue. Une tablette laissée
 * ouverte sur l'espace parent ne reste donc pas accessible à un enfant.
 */

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart']
// Prolonger au plus une fois par période (écriture localStorage)
const ACTIVITY_THROTTLE_MS = 30 * 1000
const CHECK_INTERVAL_MS = 15 * 1000

/**
 * @param {import('vue-router').Router} router
 */
export function useParentIdleLock (router) {
  let lastExtendAt = 0
  let timer = null

  const currentRoute = () => router?.currentRoute?.value
  const isParentRoute = () => !!currentRoute()?.meta?.requiresAdmin

  function onActivity () {
    if (!isParentRoute()) return
    const now = Date.now()
    if (now - lastExtendAt < ACTIVITY_THROTTLE_MS) return
    lastExtendAt = now
    sessionService.extendSession()
  }

  // Même règle que le guard du router : session parent valide + jeton admin du même profil
  function lockIfExpired () {
    if (!isParentRoute()) return
    const profileId = currentRoute().query?.profile || sessionService.getValidSession()?.profileId || null
    if (hasParentAccess(profileId)) return
    leaveParentSpace()
    router.replace('/').catch(() => {})
  }

  function onVisibilityChange () {
    if (document.visibilityState === 'visible') lockIfExpired()
  }

  onMounted(() => {
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, onActivity, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', onVisibilityChange)
    timer = setInterval(lockIfExpired, CHECK_INTERVAL_MS)
  })

  onBeforeUnmount(() => {
    ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, onActivity, { capture: true }))
    document.removeEventListener('visibilitychange', onVisibilityChange)
    clearInterval(timer)
  })

  return { lockIfExpired }
}
