import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiService, buildQuery, formatWaitDelay } from '../../src/services/apiService.js'
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

    await apiService.request('/api/lessons')

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

    await expect(apiService.request('/api/profiles')).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' })

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

    await expect(apiService.request('/api/lessons')).rejects.toMatchObject({ status: 401 })

    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'family', endpoint: '/api/lessons' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })


  it('401 TOKEN_REVOKED avec le jeton parent : supprime le jeton et redemande le PIN', async () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, code: 'TOKEN_REVOKED' }))

    const error = await apiService.request('/api/lessons').catch(e => e)

    expect(error.code).toBe('SESSION_EXPIRED')
    expect(error.message).toMatch(/révoquée/)
    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
    expect(familyGateService.getToken()).toBe(family)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'profile', endpoint: '/api/lessons' })
  })


  it('401 TOKEN_REVOKED avec le jeton famille : retour au code familial', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, code: 'TOKEN_REVOKED' }))

    const error = await apiService.request('/api/lessons').catch(e => e)

    expect(error.message).toMatch(/code familial a changé/)
    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'family', endpoint: '/api/lessons' })
  })


  it('401 tardif d\'une requête partie avec l\'ancien jeton : la nouvelle session parent est conservée', async () => {
    storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    const newToken = profileToken({ profileId: 1, isAdmin: true, name: 'Parent (nouveau PIN)' })
    // Pendant que la requête est en cours, le parent ressaisit son PIN : nouveau jeton
    fetchMock.mockImplementation(async () => {
      localStorage.setItem(PROFILE_TOKEN_KEY, newToken)
      return jsonResponse(401, { success: false, code: 'TOKEN_REVOKED' })
    })

    const error = await apiService.request('/api/lessons').catch(e => e)

    expect(error.code).toBe('SESSION_EXPIRED')
    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBe(newToken)
    expect(authErrorHandler).not.toHaveBeenCalled()
  })


  it('503 SERVICE_UNAVAILABLE / FAMILY_GATE_NOT_CONFIGURED : message du serveur ou message clair', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { success: false, code: 'FAMILY_GATE_NOT_CONFIGURED', message: 'Code familial non configuré' }))
    const notConfigured = await apiService.request('/api/auth/family-gate', { method: 'POST', body: '{}' }).catch(e => e)
    expect(notConfigured.message).toBe('Code familial non configuré')
    expect(notConfigured.code).toBe('FAMILY_GATE_NOT_CONFIGURED')

    storeFamilySession()
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { success: false, code: 'SERVICE_UNAVAILABLE' }))
    const unavailable = await apiService.request('/api/lessons').catch(e => e)
    expect(unavailable.message).toMatch(/momentanément indisponible/)
  })


  it('400 VALIDATION_ERROR : premier message de errors[]', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(400, {
      success: false,
      code: 'VALIDATION_ERROR',
      errors: [{ path: 'pin', message: 'Le code PIN doit contenir au moins 4 chiffres' }]
    }))

    const error = await apiService.request('/api/auth/login', { method: 'POST', body: '{}' }).catch(e => e)

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Le code PIN doit contenir au moins 4 chiffres')
  })


  it('429 PIN_LOCKED : délai long affiché en heures', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(429, { success: false, code: 'PIN_LOCKED', retryAfterSeconds: 3600 }))

    const error = await apiService.request('/api/auth/login', { method: 'POST', body: '{}' }).catch(e => e)

    expect(error.message).toMatch(/Réessayez dans 1 h\./)
  })


  it('415 UNSUPPORTED_FILE_TYPE : erreur explicite avec son code', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(415, { success: false, code: 'UNSUPPORTED_FILE_TYPE' }))

    const error = await apiService.request('/api/ai/extract-text-from-documents', { method: 'POST', body: '{}' }).catch(e => e)

    expect(error.status).toBe(415)
    expect(error.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(error.message).toMatch(/Format de fichier non pris en charge/)
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

    const error = await apiService.request('/api/lessons', { method: 'POST', body: '{}' }).catch(e => e)

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

    await expect(apiService.request('/api/lessons/5', { method: 'DELETE' })).rejects.toMatchObject({ status: 403 })

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

    const error = await apiService.request('/api/auth/login', { method: 'POST', body: '{}' }).catch(e => e)

    expect(error.status).toBe(429)
    expect(error.code).toBe('PIN_LOCKED')
    expect(error.retryAfterSeconds).toBe(90)
    expect(error.message).toMatch(/temporairement bloqué/)
  })

})

describe('apiService - buildQuery', () => {
  it('ignore les valeurs absentes et encode les autres', () => {
    expect(buildQuery({ a: 1, b: null, c: undefined, d: '', e: 'x y' })).toBe('?a=1&e=x+y')
  })

  it('renvoie une chaîne vide sans paramètre', () => {
    expect(buildQuery({})).toBe('')
    expect(buildQuery()).toBe('')
  })
})

describe('apiService - formatWaitDelay', () => {
  it('formate secondes, minutes et heures (verrouillage progressif 15 min → 1 h → 24 h)', () => {
    expect(formatWaitDelay(45)).toBe('45 s')
    expect(formatWaitDelay(900)).toBe('15 min')
    expect(formatWaitDelay(3600)).toBe('1 h')
    expect(formatWaitDelay(5400)).toBe('1 h 30 min')
    expect(formatWaitDelay(86400)).toBe('24 h')
  })
})
