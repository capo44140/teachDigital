import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiService } from '../../src/services/apiService.js'
import sessionService from '../../src/services/sessionService.js'
import familyGateService from '../../src/services/familyGateService.js'
import {
  familyToken,
  profileToken,
  jsonResponse,
  storeFamilySession,
  storeParentSession
} from './testUtils.js'

const PROFILE_TOKEN_KEY = 'auth_token'

function lastAuthorizationHeader (fetchMock) {
  const [, options] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  return options.headers.Authorization
}

describe('apiService - choix du jeton', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('envoie le jeton famille quand aucun parent n\'est connecté', () => {
    const family = storeFamilySession()
    expect(apiService.getToken()).toBe(family)
    expect(apiService.isAuthenticated()).toBe(false)
  })

  it('envoie le jeton parent tant que la session parent est active', () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem(PROFILE_TOKEN_KEY, parent)
    storeParentSession(1)

    expect(apiService.getToken()).toBe(parent)
    expect(apiService.hasAdminTokenFor(1)).toBe(true)
    expect(apiService.hasAdminTokenFor('1')).toBe(true)
    expect(apiService.hasAdminTokenFor(2)).toBe(false)
  })

  it('jette le jeton parent quand la session parent (30 min) a expiré', () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    localStorage.setItem('teachdigital_session', JSON.stringify({
      profileId: '1',
      profileName: 'Parent',
      timestamp: Date.now() - 31 * 60 * 1000,
      isUnlocked: true
    }))

    expect(apiService.getToken()).toBe(family)
    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
  })

  it('jette un jeton parent sans session parent (pas de fuite vers l\'enfant)', () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))

    expect(apiService.getToken()).toBe(family)
    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
  })

  it('jette un jeton profil expiré', () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }, -10))
    storeParentSession(1)

    expect(apiService.getToken()).toBe(family)
    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
  })

  it('ne prend jamais un jeton famille pour un jeton profil', () => {
    storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, familyToken())

    expect(apiService.getProfileToken()).toBeNull()
    expect(apiService.isAuthenticated()).toBe(false)
  })
})

describe('apiService - requêtes et erreurs', () => {
  let fetchMock
  let authErrorHandler

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    authErrorHandler = vi.fn()
    apiService.setAuthErrorHandler(authErrorHandler)
  })

  afterEach(() => {
    apiService.setAuthErrorHandler(null)
    vi.unstubAllGlobals()
  })

  it('ajoute l\'en-tête Authorization avec le jeton choisi', async () => {
    const family = storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { lessons: [] } }))

    await apiService.getLessons()

    expect(lastAuthorizationHeader(fetchMock)).toBe(`Bearer ${family}`)
  })

  it('n\'envoie pas de jeton au code familial (POST public)', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { valid: true, token: familyToken() } }))

    await apiService.request('/api/auth/family-gate', { method: 'POST', body: '{}' })

    expect(lastAuthorizationHeader(fetchMock)).toBeUndefined()
  })

  it('401 avec le jeton parent : supprime jeton et session parent, garde la session famille', async () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Token invalide', code: 'UNAUTHORIZED' }))

    await expect(apiService.getProfiles()).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' })

    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
    expect(sessionService.getValidSession()).toBeNull()
    expect(familyGateService.getToken()).toBe(family)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'profile', endpoint: '/api/profiles' })
    // Aucun appel de déconnexion en cascade
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('401 avec le jeton famille : efface la session famille et demande le code familial', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, code: 'UNAUTHORIZED' }))

    await expect(apiService.getLessons()).rejects.toMatchObject({ status: 401 })

    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'family', endpoint: '/api/lessons' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('401 sur /api/auth/login = code PIN incorrect, pas une expiration de session', async () => {
    const family = storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Code PIN incorrect' }))

    await expect(apiService.login(1, '0000')).rejects.toMatchObject({ status: 401, message: 'Code PIN incorrect' })

    expect(authErrorHandler).not.toHaveBeenCalled()
    expect(familyGateService.getToken()).toBe(family)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('401 « code actuel incorrect » sur PUT family-gate ne déconnecte pas le parent', async () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem(PROFILE_TOKEN_KEY, parent)
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Code actuel incorrect' }))

    await expect(apiService.request('/api/auth/family-gate', { method: 'PUT', body: '{}' }))
      .rejects.toMatchObject({ message: 'Code actuel incorrect' })

    expect(authErrorHandler).not.toHaveBeenCalled()
    expect(apiService.getProfileToken()).toBe(parent)
  })

  it('403 avec le jeton famille : message clair et demande du PIN parent', async () => {
    const family = storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(403, { success: false, message: 'Forbidden', code: 'FORBIDDEN' }))

    const error = await apiService.createLesson({}).catch(e => e)

    expect(error.status).toBe(403)
    expect(error.message).toMatch(/Accès refusé/)
    // Rien n'est effacé : seul le router décide de redemander le PIN (pages parent)
    expect(familyGateService.getToken()).toBe(family)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'profile', endpoint: '/api/lessons' })
  })

  it('403 avec le jeton parent : simple refus, la session parent est conservée', async () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem(PROFILE_TOKEN_KEY, parent)
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(403, { success: false, code: 'FORBIDDEN' }))

    await expect(apiService.deleteLesson(5)).rejects.toMatchObject({ status: 403 })

    expect(authErrorHandler).not.toHaveBeenCalled()
    expect(apiService.getProfileToken()).toBe(parent)
  })

  it('429 PIN_LOCKED : message de blocage avec délai', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(
      429,
      { success: false, message: 'Too many', code: 'PIN_LOCKED', retryAfterSeconds: 90 },
      { 'retry-after': '90' }
    ))

    const error = await apiService.login(1, '0000').catch(e => e)

    expect(error.status).toBe(429)
    expect(error.code).toBe('PIN_LOCKED')
    expect(error.retryAfterSeconds).toBe(90)
    expect(error.message).toMatch(/temporairement bloqué/)
  })

  it('login admin : enregistre le jeton et ouvre la session parent', async () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    fetchMock.mockResolvedValue(jsonResponse(200, {
      success: true,
      data: { token: parent, profile: { id: 1, name: 'Parent', isAdmin: true } }
    }))

    await apiService.login(1, '4321')

    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBe(parent)
    expect(sessionService.isUnlocked(1)).toBe(true)
    expect(apiService.hasAdminTokenFor(1)).toBe(true)
  })

  it('logout : supprime jeton et session parent sans boucle', async () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false }))

    await apiService.logout()

    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
    expect(sessionService.getValidSession()).toBeNull()
    expect(familyGateService.getToken()).toBe(family)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(authErrorHandler).not.toHaveBeenCalled()
  })

  it('verifyToken ignore le jeton famille (pas d\'utilisateur connecté)', async () => {
    storeFamilySession()

    expect(await apiService.verifyToken()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('verifyToken envoie le jeton parent et renvoie l\'utilisateur', async () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem(PROFILE_TOKEN_KEY, parent)
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(200, {
      success: true,
      data: { scope: 'profile', user: { id: 1, name: 'Parent', isAdmin: true } }
    }))

    const user = await apiService.verifyToken()

    expect(user).toMatchObject({ id: 1, isAdmin: true })
    expect(lastAuthorizationHeader(fetchMock)).toBe(`Bearer ${parent}`)
  })
})
