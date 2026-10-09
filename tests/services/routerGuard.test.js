import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { profileToken, storeFamilySession, storeParentSession } from './testUtils.js'

// Profils renvoyés par l'API : le profil 1 est administrateur
const mockProfiles = vi.hoisted(() => [
  { id: 1, name: 'Parent', is_admin: true, is_child: false, is_teen: false, is_active: true },
  { id: 2, name: 'Enfant', is_admin: false, is_child: true, is_teen: false, is_active: true }
])

const mockProfileService = vi.hoisted(() => ({
  getAllProfiles: vi.fn(),
  getProfileStats: vi.fn()
}))

vi.mock('../../src/services/profile/index.js', () => ({
  ProfileService: mockProfileService,
  PinService: {}
}))

const { navigationGuard } = await import('../../src/router/index.js')

const PROFILE_TOKEN_KEY = 'auth_token'

function route (path, query = {}, meta = {}) {
  const search = new URLSearchParams(query).toString()
  return { path, query, meta, fullPath: search ? `${path}?${search}` : path }
}

const adminRoute = (query) => route('/dashboard', query, { requiresAdmin: true })

describe('router - guard de navigation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    mockProfileService.getAllProfiles.mockResolvedValue(mockProfiles)
    mockProfileService.getProfileStats.mockResolvedValue(null)
  })

  describe('code familial', () => {
    it('renvoie au code familial au démarrage à froid sur / (from.path vaut aussi /)', async () => {
      const result = await navigationGuard(route('/'), route('/'))
      expect(result).toEqual({ path: '/family-gate', query: {} })
    })

    it('protège toutes les pages, en mémorisant la page demandée', async () => {
      const result = await navigationGuard(route('/user-dashboard', { profile: '2' }, { requiresChildOrTeen: true }))
      expect(result).toEqual({ path: '/family-gate', query: { redirect: '/user-dashboard?profile=2' } })
    })

    it('laisse passer la page du code familial', async () => {
      const result = await navigationGuard(route('/family-gate', {}, { public: true }))
      expect(result).toBe(true)
    })

    it('laisse passer avec une session famille valide', async () => {
      storeFamilySession()
      expect(await navigationGuard(route('/'))).toBe(true)
    })
  })

  describe('pages parent (requiresAdmin)', () => {
    beforeEach(() => {
      storeFamilySession()
    })

    it('refuse ?profile=<id admin> seul et ne consulte pas la liste des profils', async () => {
      const result = await navigationGuard(adminRoute({ profile: '1' }))

      expect(result).toEqual({ path: '/pin-lock', query: { profile: '1' } })
      expect(mockProfileService.getAllProfiles).not.toHaveBeenCalled()
    })

    it('ignore ?unlocked=true', async () => {
      const result = await navigationGuard(adminRoute({ profile: '1', unlocked: 'true' }))
      expect(result).toEqual({ path: '/pin-lock', query: { profile: '1' } })
    })

    it('refuse une session parent sans jeton admin', async () => {
      storeParentSession(1)
      const result = await navigationGuard(adminRoute({ profile: '1' }))
      expect(result).toEqual({ path: '/pin-lock', query: { profile: '1' } })
    })

    it('refuse un jeton admin sans session parent', async () => {
      localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
      const result = await navigationGuard(adminRoute({ profile: '1' }))
      expect(result).toEqual({ path: '/pin-lock', query: { profile: '1' } })
    })

    it('refuse un jeton non administrateur', async () => {
      localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: false }))
      storeParentSession(1)
      const result = await navigationGuard(adminRoute({ profile: '1' }))
      expect(result).toEqual({ path: '/pin-lock', query: { profile: '1' } })
    })

    it('refuse un jeton admin d\'un autre profil que celui demandé', async () => {
      localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 3, isAdmin: true }))
      storeParentSession(3)
      const result = await navigationGuard(adminRoute({ profile: '1' }))
      expect(result).toEqual({ path: '/pin-lock', query: { profile: '1' } })
    })

    it('autorise session parent + jeton admin du même profil', async () => {
      localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
      storeParentSession(1)

      expect(await navigationGuard(adminRoute({ profile: '1' }))).toBe(true)
      // Sans ?profile=, le profil de la session parent est utilisé
      expect(await navigationGuard(adminRoute({}))).toBe(true)
    })

    it('renvoie au choix des profils sans profil identifiable', async () => {
      expect(await navigationGuard(adminRoute({}))).toEqual({ path: '/' })
    })
  })

  describe('pages enfant (requiresChildOrTeen)', () => {
    beforeEach(() => {
      storeFamilySession()
    })

    it('autorise un profil enfant (?profile= ou ?childId=)', async () => {
      expect(await navigationGuard(route('/badge-manager', { profile: '2' }, { requiresChildOrTeen: true }))).toBe(true)
      expect(await navigationGuard(route('/progress-tracking', { childId: '2' }, { requiresChildOrTeen: true }))).toBe(true)
    })

    it('refuse un profil administrateur ou inconnu', async () => {
      expect(await navigationGuard(route('/badge-manager', { profile: '1' }, { requiresChildOrTeen: true })))
        .toEqual({ path: '/' })
      expect(await navigationGuard(route('/user-dashboard', { profile: '99' }, { requiresChildOrTeen: true })))
        .toEqual({ path: '/' })
    })
  })
})
