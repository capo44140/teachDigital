import { describe, it, expect } from 'vitest'
import { formatDate, formatRelativeDate } from '../../src/utils/progressFormatters.js'
import { describeError, requestRef } from '../../src/utils/apiErrors.js'
import { sanitizeAvatarHtml } from '../../src/utils/sanitizeHtml.js'
import { extractVideoId } from '../../src/services/youtubeVideoService.js'
import { describeGenerationError, assertValidQuiz } from '../../src/composables/useQuizGeneration.js'
import { confirmAction, settleConfirm, confirmState } from '../../src/composables/useConfirm.js'
import { sameProfileId } from '../../src/stores/profileStore.js'

describe('formatDate (formateur partagé)', () => {
  it('formate en français, avec ou sans heure', () => {
    const date = new Date(2025, 2, 3, 14, 5)
    expect(formatDate(date, { time: false })).toBe('3 mars 2025')
    expect(formatDate(date)).toMatch(/3 mars 2025.*14:05/)
  })

  it('renvoie le texte de repli pour une date absente ou invalide', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('pas une date', { fallback: 'N/A' })).toBe('N/A')
  })
})

describe('formatRelativeDate (notifications)', () => {
  const now = new Date(2026, 9, 23, 12, 0)
  const before = (ms) => new Date(now.getTime() - ms)

  it('date relative jusqu\'à une semaine, puis date courte', () => {
    expect(formatRelativeDate(before(20 * 1000), { now })).toBe('à l\'instant')
    expect(formatRelativeDate(before(5 * 60 * 1000), { now })).toBe('il y a 5 minutes')
    expect(formatRelativeDate(before(3 * 3600 * 1000), { now })).toBe('il y a 3 heures')
    expect(formatRelativeDate(before(24 * 3600 * 1000), { now })).toBe('hier')
    expect(formatRelativeDate(before(10 * 24 * 3600 * 1000).toISOString(), { now })).toBe('13 oct. 2026')
  })

  it('renvoie le texte de repli pour une date absente ou invalide', () => {
    expect(formatRelativeDate(null)).toBe('—')
    expect(formatRelativeDate('pas une date', { fallback: '' })).toBe('')
  })
})

describe('apiErrors', () => {
  it('extrait message et référence de requête', () => {
    const error = Object.assign(new Error('Erreur serveur'), { requestId: 'abc123' })
    expect(describeError(error)).toEqual({ message: 'Erreur serveur', requestId: 'abc123' })
    expect(requestRef(error)).toBe('Réf. abc123')
    expect(describeError(null, 'Repli')).toEqual({ message: 'Repli', requestId: null })
  })
})

describe('sanitizeAvatarHtml', () => {
  it('retire l\'attribut style des avatars', () => {
    const html = sanitizeAvatarHtml('<div class="w-8" style="position:fixed;inset:0">x</div>')
    expect(html).toContain('class="w-8"')
    expect(html).not.toContain('style')
  })
})

describe('extractVideoId (YouTube)', () => {
  it('reconnaît watch, youtu.be, embed et Shorts', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=abcdefghijk&t=3')).toBe('abcdefghijk')
    expect(extractVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk')
    expect(extractVideoId('https://www.youtube.com/embed/abcdefghijk')).toBe('abcdefghijk')
    expect(extractVideoId('https://youtube.com/shorts/abcdefghijk?feature=share')).toBe('abcdefghijk')
  })

  it('renvoie null pour une URL non reconnue (aucune vidéo de repli)', () => {
    expect(extractVideoId('https://example.com/video')).toBeNull()
    expect(extractVideoId('')).toBeNull()
  })
})

describe('useQuizGeneration - helpers', () => {
  it('explique une limite de génération (429 + délai du serveur)', () => {
    const error = Object.assign(new Error('Trop de requêtes'), { status: 429, retryAfterSeconds: 90, requestId: 'r1' })
    expect(describeGenerationError(error)).toEqual({
      message: 'Limite de générations atteinte. Réessayez dans 2 min.',
      requestId: 'r1'
    })
  })

  it('conserve le message d\'un format refusé (415)', () => {
    const error = Object.assign(new Error('Les PDF ne sont pas acceptés'), { status: 415, code: 'UNSUPPORTED_FILE_TYPE' })
    expect(describeGenerationError(error).message).toBe('Les PDF ne sont pas acceptés')
  })

  it('refuse un quiz vide', () => {
    expect(() => assertValidQuiz({ questions: [] })).toThrow(/vide ou invalide/)
    const quiz = { questions: [{ question: 'Q', options: ['a', 'b'], correctAnswer: 0 }] }
    expect(assertValidQuiz(quiz)).toBe(quiz)
  })
})

describe('useConfirm', () => {
  it('résout la promesse selon la réponse', async () => {
    const pending = confirmAction({ title: 'Supprimer ?', message: 'Sûr ?', danger: true })
    expect(confirmState.open).toBe(true)
    expect(confirmState.title).toBe('Supprimer ?')
    settleConfirm(true)
    await expect(pending).resolves.toBe(true)
    expect(confirmState.open).toBe(false)
  })

  it('annule la demande précédente si une nouvelle arrive', async () => {
    const first = confirmAction('Première ?')
    const second = confirmAction('Seconde ?')
    await expect(first).resolves.toBe(false)
    settleConfirm(false)
    await expect(second).resolves.toBe(false)
  })
})

describe('sameProfileId', () => {
  it('compare des identifiants nombre / chaîne', () => {
    expect(sameProfileId(2, '2')).toBe(true)
    expect(sameProfileId('2', 3)).toBe(false)
    expect(sameProfileId(null, null)).toBe(false)
  })
})
