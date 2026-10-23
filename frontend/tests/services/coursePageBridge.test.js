import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  parseProgressMessage,
  getCoursePageViewUrl,
  getCoursePagePreviewUrl,
  PROGRESS_MESSAGE_TYPE
} from '../../src/services/coursePageService.js'
import { apiService } from '../../src/services/apiService.js'

describe('parseProgressMessage', () => {
  it('accepte un message valide et borne la série', () => {
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 3, total: 5, streak: 2 })).toEqual({ ok: 3, total: 5, streak: 2 })
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 0, total: 1, streak: -4 })).toEqual({ ok: 0, total: 1, streak: 0 })
  })

  it('rejette les messages d\'un autre type ou incohérents', () => {
    expect(parseProgressMessage({ type: 'autre', ok: 1, total: 1 })).toBeNull()
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 6, total: 5 })).toBeNull()
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: 1, total: 0 })).toBeNull()
    expect(parseProgressMessage({ type: PROGRESS_MESSAGE_TYPE, ok: '1.5', total: 3 })).toBeNull()
    expect(parseProgressMessage(null)).toBeNull()
  })
})

describe('URL d\'affichage isolé', () => {
  afterEach(() => vi.restoreAllMocks())

  it('page enregistrée : POST /course-pages/:id/view', async () => {
    const request = vi.spyOn(apiService, 'request').mockResolvedValue({ data: { url: '/api/course-pages/render?t=abc' } })
    await expect(getCoursePageViewUrl(12)).resolves.toBe('/api/course-pages/render?t=abc')
    expect(request).toHaveBeenCalledWith('/api/course-pages/12/view', { method: 'POST' })
  })

  it('brouillon : POST /course-pages/preview avec le HTML', async () => {
    const request = vi.spyOn(apiService, 'request').mockResolvedValue({ data: { url: '/api/course-pages/render?t=def' } })
    await expect(getCoursePagePreviewUrl('<p>x</p>')).resolves.toBe('/api/course-pages/render?t=def')
    expect(request).toHaveBeenCalledWith('/api/course-pages/preview', {
      method: 'POST',
      body: JSON.stringify({ htmlContent: '<p>x</p>' })
    })
  })
})
