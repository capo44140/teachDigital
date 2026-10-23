/**
 * aiService : erreurs des routes IA (415, 503 AI_UNAVAILABLE, 504 AI_TIMEOUT) et bornes d'envoi
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AIService } from '../../src/services/aiService.js'
import { describeGenerationError } from '../../src/composables/useQuizGeneration.js'
import { boundQuestionCount, AI_TIMEOUT_MESSAGE, AI_MAX_QUESTION_COUNT } from '../../src/constants/aiLimits.js'
import { jsonResponse, storeFamilySession } from './testUtils.js'

describe('aiService - erreurs des routes IA', () => {
  let fetchMock
  const service = new AIService()

  beforeEach(() => {
    localStorage.clear()
    storeFamilySession()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('504 AI_TIMEOUT : message clair (moins de documents ou de questions)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(504, { success: false, code: 'AI_TIMEOUT', message: 'trop long', requestId: 'req-1' }))

    const error = await service.generateQuizFromText('Texte', { name: 'Lucas' }, { questionCount: 5 }).catch(e => e)

    expect(error.code).toBe('AI_TIMEOUT')
    expect(error.status).toBe(504)
    expect(error.message).toBe(AI_TIMEOUT_MESSAGE)
    expect(error.requestId).toBe('req-1')
    expect(describeGenerationError(error).message).toBe(AI_TIMEOUT_MESSAGE)
  })

  it('503 AI_UNAVAILABLE : message du serveur conservé (sans champ « reason »)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, {
      success: false,
      code: 'AI_UNAVAILABLE',
      message: 'Aucun service d\'intelligence artificielle n\'a pu répondre.'
    }))

    const error = await service.extractTextFromDocuments([new File(['x'], 'page.jpg', { type: 'image/jpeg' })]).catch(e => e)

    expect(error.status).toBe(503)
    expect(error.code).toBe('AI_UNAVAILABLE')
    expect(error.message).toBe('Aucun service d\'intelligence artificielle n\'a pu répondre.')
  })

  it('415 UNSUPPORTED_FILE_TYPE : erreur transmise telle quelle', async () => {
    fetchMock.mockResolvedValue(jsonResponse(415, { success: false, code: 'UNSUPPORTED_FILE_TYPE', message: 'Envoyez des photos.' }))

    const error = await service.generateCoursePage([new File(['x'], 'cours.pdf', { type: 'application/pdf' })], { name: 'Lucas' }).catch(e => e)

    expect(error.status).toBe(415)
    expect(error.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(describeGenerationError(error).message).toBe('Envoyez des photos.')
  })

  it('500 : message générique, statut et référence conservés', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { success: false, code: 'INTERNAL_ERROR', message: 'stack…', requestId: 'req-2' }))

    const error = await service.generateQuizFromAnalyses([{ text: 'a' }], { name: 'Lucas' }, 5).catch(e => e)

    expect(error.message).toBe('Impossible de générer le quiz. Veuillez réessayer.')
    expect(error.status).toBe(500)
    expect(error.requestId).toBe('req-2')
  })
})

describe('aiLimits - nombre de questions', () => {
  it('borne le nombre de questions entre 1 et 40', () => {
    expect(boundQuestionCount('5')).toBe(5)
    expect(boundQuestionCount(0)).toBe(1)
    expect(boundQuestionCount(100)).toBe(AI_MAX_QUESTION_COUNT)
    expect(boundQuestionCount('abc', 8)).toBe(8)
  })
})
