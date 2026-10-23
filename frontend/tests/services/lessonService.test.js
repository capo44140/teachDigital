import { describe, it, expect, beforeEach, vi } from 'vitest'

// Le transport est simulé : on vérifie les endpoints /api/lessons appelés et la lecture des réponses
const mockApiService = vi.hoisted(() => ({
  request: vi.fn()
}))

const mockAudit = vi.hoisted(() => ({
  logDataAccess: vi.fn(),
  logSystemError: vi.fn()
}))

vi.mock('../../src/services/apiService.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, apiService: mockApiService }
})

vi.mock('../../src/services/auditLogService.js', () => ({
  auditLogService: mockAudit
}))

const { LessonService, normalizeQuizResult } = await import('../../src/services/lessonService.js')

const ok = (data) => ({ success: true, data })

describe('LessonService - résultats de quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('n\'envoie que { profileId, answers } et renvoie le score calculé par le serveur', async () => {
    mockApiService.request.mockResolvedValue(ok({
      result: { id: 9, score: 2, total_questions: 3, percentage: 67 },
      unlockedBadges: [{ id: 1, name: 'Premier quiz', icon: '🎯' }]
    }))

    const outcome = await LessonService.saveQuizResults(12, 4, [1, null, 2, 'x'])

    expect(mockApiService.request).toHaveBeenCalledTimes(1)
    const [endpoint, options] = mockApiService.request.mock.calls[0]
    expect(endpoint).toBe('/api/lessons/12/quiz-results')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ profileId: 4, answers: [1, null, 2, null] })
    expect(outcome.result).toEqual({ score: 2, totalQuestions: 3, percentage: 67 })
    expect(outcome.unlockedBadges).toHaveLength(1)
    // Notification parent et audit : créés par le serveur
    expect(mockAudit.logDataAccess).not.toHaveBeenCalled()
  })

  it('score du serveur au format { score, totalQuestions, percentage } et correction normalisée', async () => {
    mockApiService.request.mockResolvedValue(ok({
      score: 0,
      totalQuestions: 2,
      percentage: 0,
      result: { id: 1 },
      correction: [{ correctAnswer: 1, explanation: 'Parce que.' }, { correctAnswer: '2', explanation: '' }]
    }))

    const outcome = await LessonService.saveQuizResults(5, 2, [0, 0])

    expect(outcome.result).toEqual({ score: 0, totalQuestions: 2, percentage: 0 })
    expect(outcome.correction).toEqual([
      { correctAnswer: 1, explanation: 'Parce que.' },
      { correctAnswer: null, explanation: null }
    ])
    expect(outcome.unlockedBadges).toEqual([])
  })

  it('sans correction dans la réponse : correction null', async () => {
    mockApiService.request.mockResolvedValue(ok({ score: 1, totalQuestions: 1, percentage: 100 }))

    const outcome = await LessonService.saveQuizResults(5, 2, [0])

    expect(outcome.correction).toBeNull()
  })

  it('normalise un résultat incomplet en null', () => {
    expect(normalizeQuizResult(null)).toBeNull()
    expect(normalizeQuizResult({ score: 1 })).toBeNull()
    expect(normalizeQuizResult({ score: 3, totalQuestions: 4 })).toEqual({ score: 3, totalQuestions: 4, percentage: 75 })
  })
})

describe('LessonService - leçons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enregistre la leçon pour l\'enfant ciblé en une seule requête', async () => {
    mockApiService.request.mockResolvedValue(ok({ lesson: { id: 33 } }))

    const lesson = await LessonService.saveLesson({ title: 'Fractions', questions: [{}] }, 7, [
      { name: 'page1.jpg', type: 'image/jpeg' }
    ])

    expect(lesson.id).toBe(33)
    expect(mockApiService.request).toHaveBeenCalledTimes(1)
    const [endpoint, options] = mockApiService.request.mock.calls[0]
    expect(endpoint).toBe('/api/lessons')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({
      title: 'Fractions',
      targetProfileId: 7,
      imageFilename: 'page1.jpg',
      isPublished: true
    })
  })

  it('ne réessaie pas l\'enregistrement d\'une leçon en cas d\'erreur (pas de doublon)', async () => {
    mockApiService.request.mockRejectedValue(new Error('Timeout'))

    await expect(LessonService.saveLesson({ title: 'X' }, 7)).rejects.toThrow('Timeout')
    expect(mockApiService.request).toHaveBeenCalledTimes(1)
  })

  it('leçons d\'un profil : GET /api/lessons?targetProfileId=&published=true', async () => {
    mockApiService.request.mockResolvedValue(ok({ lessons: [{ id: 1 }] }))

    await expect(LessonService.getLessonsByProfile(4)).resolves.toEqual([{ id: 1 }])
    expect(mockApiService.request).toHaveBeenCalledWith('/api/lessons?targetProfileId=4&published=true')
  })

  it('leçon introuvable : erreur explicite', async () => {
    mockApiService.request.mockResolvedValue(ok({ lesson: null }))

    await expect(LessonService.getLessonById(99)).rejects.toThrow('Leçon non trouvée')
    expect(mockApiService.request).toHaveBeenCalledWith('/api/lessons/99')
  })

  it('suppression : DELETE /api/lessons/:id puis journal d\'audit', async () => {
    mockApiService.request.mockResolvedValue({ success: true })

    await expect(LessonService.deleteLesson(5, 1)).resolves.toBe(true)
    expect(mockApiService.request).toHaveBeenCalledWith('/api/lessons/5', { method: 'DELETE' })
    expect(mockAudit.logDataAccess).toHaveBeenCalledWith(1, 'lesson_deletion', 'LESSON_DELETED', { lessonId: 5 })
  })
})
