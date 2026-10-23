import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { auditLogService } from '../../src/services/auditLogService.js'
import { jsonResponse, storeFamilySession } from './testUtils.js'
import { reportClientError, resetClientErrorReporter } from '../../src/services/clientErrorReporter.js'

describe('auditLogService', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { success: true }))
    vi.stubGlobal('fetch', fetchMock)
    resetClientErrorReporter()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('n\'envoie rien sans jeton (le serveur journalise lui-même code familial et connexion)', async () => {
    const sent = await auditLogService.logDataAccess(2, 'lesson', 'LESSON_CREATED', { lessonId: 1 })

    expect(sent).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('n\'envoie ni userId, ni adresse IP, ni User-Agent (déduits par le serveur)', async () => {
    const family = storeFamilySession()

    await auditLogService.logDataAccess(2, 'lesson', 'LESSON_CREATED', { lessonId: 1 })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/audit\/logs$/)
    expect(options.headers.Authorization).toBe(`Bearer ${family}`)
    const body = JSON.parse(options.body)
    expect(body).toEqual({
      action: 'LESSON_CREATED',
      category: 'data_access',
      level: 'info',
      details: { targetProfileId: 2, dataType: 'lesson', lessonId: 1 }
    })
  })

  it('n\'envoie pas les actions refusées par le serveur (LOGIN_*, QUIZ_COMPLETED)', async () => {
    storeFamilySession()

    expect(await auditLogService.log('LOGIN_SUCCESS', 'authentication')).toBe(false)
    expect(await auditLogService.log('QUIZ_COMPLETED', 'data_access')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('journalise les étapes de génération de quiz avec les actions QUIZ_GENERATION_*', async () => {
    storeFamilySession()

    await auditLogService.logQuizGeneration('FAILED', 4, { source: 'text' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({
      action: 'QUIZ_GENERATION_FAILED',
      category: 'api_usage',
      level: 'error',
      details: { targetProfileId: 4, source: 'text' }
    })
  })

  it('remonte les erreurs client (CLIENT_ERROR) avec limitation', async () => {
    storeFamilySession()

    expect(reportClientError(new Error('boom'), { source: 'vue', info: 'render' })).toBe(true)
    // Même erreur : ignorée ; autre erreur trop rapprochée : ignorée
    expect(reportClientError(new Error('boom'), { source: 'vue' })).toBe(false)
    expect(reportClientError(new Error('autre'), { source: 'vue' })).toBe(false)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.action).toBe('CLIENT_ERROR')
    expect(body.details).toMatchObject({ name: 'Error', message: 'boom', source: 'vue' })
  })
})
