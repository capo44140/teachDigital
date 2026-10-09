import { describe, it, expect, beforeEach } from 'vitest'
import familyGateService from '../../src/services/familyGateService.js'
import { familyToken, makeJwtWithoutExp } from './testUtils.js'

const SESSION_KEY = 'teachdigital_family_session'

describe('familyGateService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('enregistre le jeton famille et considère la session valide', () => {
    const token = familyToken()
    const created = familyGateService.createFamilySession({
      token,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    })

    expect(created).toBe(true)
    expect(familyGateService.hasValidFamilySession()).toBe(true)
    expect(familyGateService.getToken()).toBe(token)
  })

  it('utilise l\'expiration du JWT quand expiresAt est absent', () => {
    const token = familyToken(3600)
    familyGateService.createFamilySession({ token })

    const stored = JSON.parse(localStorage.getItem(SESSION_KEY))
    expect(stored.expiresAt).toBeGreaterThan(Date.now())
    expect(familyGateService.hasValidFamilySession()).toBe(true)
  })

  it('refuse et efface un jeton dont le JWT est expiré', () => {
    familyGateService.createFamilySession({
      token: familyToken(-60),
      // expiresAt mensonger : le champ exp du jeton fait foi
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    })

    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(familyGateService.getToken()).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('refuse une session dont expiresAt est dépassé', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      token: familyToken(3600),
      expiresAt: Date.now() - 1000
    }))

    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ne crée pas de session sans jeton', () => {
    expect(familyGateService.createFamilySession({ valid: true })).toBe(false)
    expect(familyGateService.hasValidFamilySession()).toBe(false)
  })

  it('n\'accepte plus l\'ancien format { timestamp, valid } sans jeton', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now(), valid: true }))

    expect(familyGateService.hasValidFamilySession()).toBe(false)
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('refuse un jeton illisible ou une session corrompue', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'pas-un-jwt', expiresAt: Date.now() + 1000 }))
    expect(familyGateService.hasValidFamilySession()).toBe(false)

    localStorage.setItem(SESSION_KEY, '{oops')
    expect(familyGateService.hasValidFamilySession()).toBe(false)
  })

  it('accepte un jeton sans exp si expiresAt est dans le futur', () => {
    const token = makeJwtWithoutExp({ scope: 'family' })
    familyGateService.createFamilySession({ token, expiresAt: new Date(Date.now() + 1000 * 60).toISOString() })

    expect(familyGateService.hasValidFamilySession()).toBe(true)
  })

  it('clearFamilySession efface la session', () => {
    familyGateService.createFamilySession({ token: familyToken() })
    familyGateService.clearFamilySession()

    expect(familyGateService.hasValidFamilySession()).toBe(false)
  })
})
