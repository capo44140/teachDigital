/**
 * Verrouillage automatique de l'espace parent après inactivité (useParentIdleLock)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useParentIdleLock } from '../../src/composables/useParentIdleLock.js'
import { jsonResponse, storeFamilySession, storeParentSession, profileToken } from '../services/testUtils.js'

const MINUTE = 60 * 1000

function mountLock (route) {
  const router = {
    currentRoute: ref(route),
    replace: vi.fn(() => Promise.resolve())
  }
  const Host = defineComponent({
    setup () {
      useParentIdleLock(router)
      return () => h('div')
    }
  })
  return { wrapper: mount(Host), router }
}

const parentRoute = { path: '/dashboard', meta: { requiresAdmin: true }, query: { profile: '1' } }
const childRoute = { path: '/user-dashboard', meta: { requiresChildOrTeen: true }, query: { profile: '2' } }

describe('useParentIdleLock', () => {
  let wrapper

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    storeFamilySession()
    localStorage.setItem('auth_token', profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { success: true })))
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('quitte l\'espace parent après 15 min sans activité, même sans navigation', async () => {
    let router
    ({ wrapper, router } = mountLock(parentRoute))

    await vi.advanceTimersByTimeAsync(14 * MINUTE)
    expect(router.replace).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2 * MINUTE)
    expect(router.replace).toHaveBeenCalledWith('/')
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('teachdigital_session')).toBeNull()
  })

  it('l\'activité dans l\'espace parent prolonge la session', async () => {
    let router
    ({ wrapper, router } = mountLock(parentRoute))

    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    window.dispatchEvent(new Event('pointerdown'))
    await vi.advanceTimersByTimeAsync(10 * MINUTE)

    expect(router.replace).not.toHaveBeenCalled()
    expect(localStorage.getItem('auth_token')).not.toBeNull()
  })

  it('ne fait rien en dehors de l\'espace parent', async () => {
    let router
    ({ wrapper, router } = mountLock(childRoute))

    await vi.advanceTimersByTimeAsync(20 * MINUTE)

    expect(router.replace).not.toHaveBeenCalled()
  })

  it('vérifie dès le retour sur l\'application (onglet de nouveau visible)', async () => {
    let router
    ({ wrapper, router } = mountLock(parentRoute))
    // Session expirée pendant que l'application était en arrière-plan
    localStorage.setItem('teachdigital_session', JSON.stringify({
      profileId: '1', profileName: 'Parent', timestamp: Date.now() - 16 * MINUTE, isUnlocked: true
    }))

    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)

    expect(router.replace).toHaveBeenCalledWith('/')
  })
})
