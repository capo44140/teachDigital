/**
 * authService : code familial, connexion par PIN, déconnexion, vérification du jeton parent,
 * modification du PIN et du code familial (le transport est testé dans apiService.test.js).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiService } from '../../src/services/apiService.js'
import { authService } from '../../src/services/authService.js'
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

describe('authService', () => {
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

  it('checkFamilyCode : POST public sans jeton, réponse brute renvoyée', async () => {
    storeFamilySession()
    const token = familyToken()
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { valid: true, token } }))

    const response = await authService.checkFamilyCode('482913')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/auth\/family-gate$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ pin: '482913' })
    expect(lastAuthorizationHeader(fetchMock)).toBeUndefined()
    expect(response.data.token).toBe(token)
  })

  it('401 sur /api/auth/login = code PIN incorrect, pas une expiration de session', async () => {
    const family = storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Code PIN incorrect' }))

    await expect(authService.login(1, '0000')).rejects.toMatchObject({ status: 401, message: 'Code PIN incorrect' })

    expect(authErrorHandler).not.toHaveBeenCalled()
    expect(familyGateService.getToken()).toBe(family)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })


  it('login envoie le jeton famille (le serveur l\'exige)', async () => {
    const family = storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Code PIN incorrect' }))

    await authService.login(1, '0000').catch(() => {})

    expect(lastAuthorizationHeader(fetchMock)).toBe(`Bearer ${family}`)
  })


  it('login sans jeton famille : envoie le jeton profil à défaut', async () => {
    const parent = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem(PROFILE_TOKEN_KEY, parent)
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Code PIN incorrect' }))

    await authService.login(1, '0000').catch(() => {})

    expect(lastAuthorizationHeader(fetchMock)).toBe(`Bearer ${parent}`)
  })


  it('401 UNAUTHORIZED sur /api/auth/login = session famille expirée (retour au code familial)', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, message: 'Token manquant', code: 'UNAUTHORIZED' }))

    const error = await authService.login(1, '123456').catch(e => e)

    expect(error.status).toBe(401)
    expect(error.code).toBe('SESSION_EXPIRED')
    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'family', endpoint: '/api/auth/login' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })


  it('400 WEAK_PIN : le message du serveur est conservé', async () => {
    storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(400, {
      success: false,
      code: 'WEAK_PIN',
      message: 'Ce code PIN est trop simple',
      requestId: 'req-42'
    }))

    const error = await authService.updatePin(1, '123456', '4321').catch(e => e)

    expect(error.status).toBe(400)
    expect(error.code).toBe('WEAK_PIN')
    expect(error.message).toBe('Ce code PIN est trop simple')
    expect(error.requestId).toBe('req-42')
    expect(authErrorHandler).not.toHaveBeenCalled()
  })


  it('updatePin n\'envoie currentPin que s\'il est fourni', async () => {
    storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: {} }))

    await authService.updatePin(2, '582913')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/profiles\/2\/pin$/)
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ newPin: '582913' })
  })


  it('401 TOKEN_REVOKED sur /api/auth/login : retour au code familial (pas un PIN faux)', async () => {
    storeFamilySession()
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, code: 'TOKEN_REVOKED' }))

    const error = await authService.login(1, '482913').catch(e => e)

    expect(error.code).toBe('SESSION_EXPIRED')
    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(authErrorHandler).toHaveBeenCalledWith({ kind: 'family', endpoint: '/api/auth/login' })
  })


  it('401 INVALID_CURRENT_PIN sur PUT /profiles/:id/pin : simple erreur, pas de déconnexion', async () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem(PROFILE_TOKEN_KEY, parent)
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false, code: 'INVALID_CURRENT_PIN', message: 'Code PIN actuel incorrect' }))

    const error = await authService.updatePin(1, '582913', '0000').catch(e => e)

    expect(error.code).toBe('INVALID_CURRENT_PIN')
    expect(error.message).toBe('Code PIN actuel incorrect')
    expect(apiService.getProfileToken()).toBe(parent)
    expect(authErrorHandler).not.toHaveBeenCalled()
  })


  it('changement de son propre PIN : le nouveau jeton remplace l\'ancien', async () => {
    storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    const fresh = profileToken({ profileId: 1, isAdmin: true, name: 'Parent (nouveau jeton)' })
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { profileId: 1, updatedAt: 'x', token: fresh } }))

    await authService.updatePin(1, '582913', '4821')

    expect(apiService.getProfileToken()).toBe(fresh)
    expect(sessionService.isUnlocked(1)).toBe(true)
  })


  it('changement du code familial : le nouveau jeton famille est enregistré', async () => {
    storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    const newFamily = familyToken()
    fetchMock.mockResolvedValue(jsonResponse(200, {
      success: true,
      data: { token: newFamily, expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() }
    }))

    await authService.updateFamilyCode('4821', '582913')

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ newPin: '582913', currentPin: '4821' })
    expect(familyGateService.getToken()).toBe(newFamily)
  })


  it('login admin : enregistre le jeton et ouvre la session parent', async () => {
    storeFamilySession()
    const parent = profileToken({ profileId: 1, isAdmin: true })
    fetchMock.mockResolvedValue(jsonResponse(200, {
      success: true,
      data: { token: parent, profile: { id: 1, name: 'Parent', isAdmin: true } }
    }))

    await authService.login(1, '4321')

    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBe(parent)
    expect(sessionService.isUnlocked(1)).toBe(true)
    expect(apiService.hasAdminTokenFor(1)).toBe(true)
  })


  it('logout : supprime jeton et session parent sans boucle', async () => {
    const family = storeFamilySession()
    localStorage.setItem(PROFILE_TOKEN_KEY, profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    fetchMock.mockResolvedValue(jsonResponse(401, { success: false }))

    await authService.logout()

    expect(localStorage.getItem(PROFILE_TOKEN_KEY)).toBeNull()
    expect(sessionService.getValidSession()).toBeNull()
    expect(familyGateService.getToken()).toBe(family)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(authErrorHandler).not.toHaveBeenCalled()
  })


  it('verifyToken ignore le jeton famille (pas d\'utilisateur connecté)', async () => {
    storeFamilySession()

    expect(await authService.verifyToken()).toBeNull()
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

    const user = await authService.verifyToken()

    expect(user).toMatchObject({ id: 1, isAdmin: true })
    expect(lastAuthorizationHeader(fetchMock)).toBe(`Bearer ${parent}`)
  })
})
