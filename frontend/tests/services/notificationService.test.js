/**
 * notificationService : endpoints /api/notifications appelés avec le jeton parent,
 * lecture des réponses et aides d'affichage (demande de profil, quiz terminé).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  NOTIFICATION_TYPES,
  normalizeNotification,
  getNotifications,
  getUnreadCount,
  setNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getProfileRequestDetails,
  getQuizCompletedChild
} from '../../src/services/notificationService.js'
import { jsonResponse, storeFamilySession, storeParentSession, profileToken } from './testUtils.js'

const RAW_QUIZ = {
  id: 12,
  type: 'quiz_completed',
  title: 'Lucas : Excellent travail !',
  message: 'Lucas a obtenu 9/10 (90 %) au quiz « Fractions ».',
  data: { childProfileId: 2, childName: 'Lucas', lessonTitle: 'Fractions', percentage: 90 },
  is_read: false,
  created_at: '2026-10-22T08:30:00.000Z',
  profile_name: 'Parent'
}

describe('notificationService', () => {
  let fetchMock
  let parentToken

  beforeEach(() => {
    localStorage.clear()
    storeFamilySession()
    parentToken = profileToken({ profileId: 1, isAdmin: true })
    localStorage.setItem('auth_token', parentToken)
    storeParentSession(1)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const lastCall = () => {
    const [url, options] = fetchMock.mock.calls.at(-1)
    const parsed = new URL(url, 'http://localhost')
    return { path: parsed.pathname, params: Object.fromEntries(parsed.searchParams), options }
  }

  describe('normalizeNotification', () => {
    it('passe en camelCase et garantit un objet data', () => {
      expect(normalizeNotification(RAW_QUIZ)).toEqual({
        id: 12,
        type: 'quiz_completed',
        title: RAW_QUIZ.title,
        message: RAW_QUIZ.message,
        data: RAW_QUIZ.data,
        isRead: false,
        createdAt: '2026-10-22T08:30:00.000Z'
      })
    })

    it('lit un data JSON en chaîne et ignore les valeurs illisibles', () => {
      expect(normalizeNotification({ id: 1, data: '{"requestedName":"Léa"}' }).data).toEqual({ requestedName: 'Léa' })
      expect(normalizeNotification({ id: 1, data: '{oups' }).data).toEqual({})
      expect(normalizeNotification({ id: 1, data: '[1,2]' }).data).toEqual({})
      expect(normalizeNotification({ id: 1, data: [1] }).data).toEqual({})
      expect(normalizeNotification({ id: 1, data: null }).data).toEqual({})
    })

    it('valeurs par défaut : type info, non lue, sans date', () => {
      expect(normalizeNotification()).toMatchObject({ type: 'info', title: '', message: '', isRead: false, createdAt: null })
      expect(normalizeNotification({ is_read: true }).isRead).toBe(true)
    })
  })

  it('GET /api/notifications?profileId= avec le jeton parent, liste normalisée', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { notifications: [RAW_QUIZ] } }))

    const list = await getNotifications('1')

    const { path, params, options } = lastCall()
    expect(path).toBe('/api/notifications')
    expect(params).toEqual({ profileId: '1' })
    expect(options.headers.Authorization).toBe(`Bearer ${parentToken}`)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 12, isRead: false, data: { childName: 'Lucas' } })
  })

  it('transmet les filtres isRead (y compris false) et type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { notifications: [] } }))

    await getNotifications(1, { isRead: false, type: 'security_alert' })

    expect(lastCall().params).toEqual({ profileId: '1', isRead: 'false', type: 'security_alert' })
  })

  it('réponse sans liste : tableau vide', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: {} }))
    expect(await getNotifications(1)).toEqual([])
  })

  it('getUnreadCount compte les non lues renvoyées par le serveur', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {
      success: true,
      data: { notifications: [RAW_QUIZ, { ...RAW_QUIZ, id: 13 }] }
    }))

    expect(await getUnreadCount('1')).toBe(2)
    expect(lastCall().params).toEqual({ profileId: '1', isRead: 'false' })
  })

  it('propage les erreurs HTTP (ApiError)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { success: false, code: 'FORBIDDEN', message: 'Accès refusé' }))

    await expect(getNotifications(1)).rejects.toMatchObject({ name: 'ApiError', status: 403, code: 'FORBIDDEN' })
  })

  it('PUT /api/notifications/:id { isRead }', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { notification: { ...RAW_QUIZ, is_read: true } } }))

    const updated = await setNotificationRead(12)

    const { path, options } = lastCall()
    expect(path).toBe('/api/notifications/12')
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ isRead: true })
    expect(updated).toMatchObject({ id: 12, isRead: true })

    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: {} }))
    expect(await setNotificationRead(12, false)).toBeNull()
    expect(JSON.parse(lastCall().options.body)).toEqual({ isRead: false })
  })

  it('POST /api/notifications/mark-all-read { profileId } → nombre modifié', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { profileId: 1, updated: 3 } }))

    expect(await markAllNotificationsRead('1')).toBe(3)

    const { path, options } = lastCall()
    expect(path).toBe('/api/notifications/mark-all-read')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ profileId: '1' })

    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: {} }))
    expect(await markAllNotificationsRead('1')).toBe(0)
  })

  it('DELETE /api/notifications/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { notification: RAW_QUIZ } }))

    expect(await deleteNotification(12)).toBe(true)
    const { path, options } = lastCall()
    expect(path).toBe('/api/notifications/12')
    expect(options.method).toBe('DELETE')
  })

  describe('aides d\'affichage', () => {
    it('getProfileRequestDetails : prénom et type demandés (profile_request uniquement)', () => {
      const request = { type: NOTIFICATION_TYPES.PROFILE_REQUEST, data: { requestedName: ' Léa ', requestedType: 'teen' } }
      expect(getProfileRequestDetails(request)).toEqual({ name: 'Léa', type: 'teen' })
      expect(getProfileRequestDetails({ ...request, data: { requestedName: 'Tom' } })).toEqual({ name: 'Tom', type: 'child' })
      expect(getProfileRequestDetails({ ...request, data: {} })).toBeNull()
      expect(getProfileRequestDetails({ type: 'info', data: { requestedName: 'Léa' } })).toBeNull()
      expect(getProfileRequestDetails(null)).toBeNull()
    })

    it('getQuizCompletedChild : enfant du quiz terminé (quiz_completed uniquement)', () => {
      const quiz = normalizeNotification(RAW_QUIZ)
      expect(getQuizCompletedChild(quiz)).toEqual({ id: '2', name: 'Lucas' })
      expect(getQuizCompletedChild({ ...quiz, data: { childProfileId: 3 } })).toEqual({ id: '3', name: '' })
      expect(getQuizCompletedChild({ ...quiz, data: {} })).toBeNull()
      expect(getQuizCompletedChild({ type: 'security_alert', data: { childProfileId: 2 } })).toBeNull()
    })
  })
})
