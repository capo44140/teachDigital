/**
 * notificationStore : compteur de non lues partagé (cloche + panneau), liste, actions
 * et réponses périmées ignorées. Le service est simulé.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockService = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  setNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn()
}))

vi.mock('../../src/services/notificationService.js', () => mockService)

const { useNotificationStore } = await import('../../src/stores/notificationStore.js')

const item = (id, isRead = false) => ({ id, type: 'info', title: `N${id}`, message: '', data: {}, isRead, createdAt: null })

function deferred () {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

describe('notificationStore', () => {
  let store

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useNotificationStore()
  })

  it('refreshUnreadCount : compteur du profil parent', async () => {
    mockService.getUnreadCount.mockResolvedValue(3)

    expect(await store.refreshUnreadCount(1)).toBe(3)
    expect(mockService.getUnreadCount).toHaveBeenCalledWith('1')
    expect(store.unreadCount).toBe(3)
    expect(store.profileId).toBe('1')
  })

  it('refreshUnreadCount : sans profil, aucun appel ; en erreur, garde la dernière valeur', async () => {
    expect(await store.refreshUnreadCount(null)).toBe(0)
    expect(mockService.getUnreadCount).not.toHaveBeenCalled()

    mockService.getUnreadCount.mockResolvedValueOnce(2).mockRejectedValueOnce(new Error('Hors ligne'))
    await store.refreshUnreadCount('1')
    expect(await store.refreshUnreadCount()).toBe(2)
    expect(console.warn).toHaveBeenCalled()
  })

  it('fetchNotifications : liste et compteur déduit, état de chargement', async () => {
    mockService.getNotifications.mockResolvedValue([item(1), item(2, true), item(3)])

    const pending = store.fetchNotifications('1')
    expect(store.loading).toBe(true)
    await pending

    expect(mockService.getNotifications).toHaveBeenCalledWith('1')
    expect(store.items).toHaveLength(3)
    expect(store.unreadCount).toBe(2)
    expect(store.loaded).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchNotifications : erreur conservée, sans profil aucun appel', async () => {
    expect(await store.fetchNotifications(null)).toEqual([])
    expect(mockService.getNotifications).not.toHaveBeenCalled()

    const failure = new Error('Erreur serveur')
    mockService.getNotifications.mockRejectedValue(failure)
    await store.fetchNotifications('1')

    expect(store.error).toBe(failure)
    expect(store.loading).toBe(false)
    expect(store.loaded).toBe(false)
  })

  it('ignore une lecture du compteur devenue périmée (liste chargée entre-temps)', async () => {
    const count = deferred()
    mockService.getUnreadCount.mockReturnValue(count.promise)
    mockService.getNotifications.mockResolvedValue([item(1)])

    const refresh = store.refreshUnreadCount('1')
    await store.fetchNotifications('1')
    count.resolve(9)
    await refresh

    expect(store.unreadCount).toBe(1)
  })

  it('ignore une liste périmée (deux chargements successifs)', async () => {
    const first = deferred()
    mockService.getNotifications.mockReturnValueOnce(first.promise).mockResolvedValueOnce([item(2)])

    const stale = store.fetchNotifications('1')
    await store.fetchNotifications('1')
    first.resolve([item(1), item(3)])
    await stale

    expect(store.items.map(n => n.id)).toEqual([2])
    expect(store.loading).toBe(false)
  })

  it('un autre profil parent repart d\'un état vide', async () => {
    mockService.getNotifications.mockResolvedValue([item(1)])
    await store.fetchNotifications('1')

    store.setProfile('4')

    expect(store.items).toEqual([])
    expect(store.unreadCount).toBe(0)
    expect(store.profileId).toBe('4')
  })

  it('markAsRead : met à jour la notification et le compteur', async () => {
    mockService.getNotifications.mockResolvedValue([item(1), item(2)])
    await store.fetchNotifications('1')
    mockService.setNotificationRead.mockResolvedValueOnce({ ...item(1), isRead: true }).mockResolvedValueOnce(null)

    await store.markAsRead(1)
    expect(mockService.setNotificationRead).toHaveBeenCalledWith(1, true)
    expect(store.items[0].isRead).toBe(true)
    expect(store.unreadCount).toBe(1)

    // Réponse sans notification : la valeur demandée est appliquée
    await store.markAsRead(2)
    expect(store.items[1].isRead).toBe(true)
    expect(store.unreadCount).toBe(0)
  })

  it('markAllAsRead : tout est lu, nombre renvoyé par le serveur', async () => {
    expect(await store.markAllAsRead()).toBe(0)
    expect(mockService.markAllNotificationsRead).not.toHaveBeenCalled()

    mockService.getNotifications.mockResolvedValue([item(1), item(2), item(3, true)])
    await store.fetchNotifications('1')
    mockService.markAllNotificationsRead.mockResolvedValue(2)

    expect(await store.markAllAsRead()).toBe(2)
    expect(mockService.markAllNotificationsRead).toHaveBeenCalledWith('1')
    expect(store.items.every(n => n.isRead)).toBe(true)
    expect(store.unreadCount).toBe(0)
  })

  it('remove : retire la notification ; 404 = déjà supprimée ; autre erreur propagée', async () => {
    mockService.getNotifications.mockResolvedValue([item(1), item(2), item(3)])
    await store.fetchNotifications('1')

    mockService.deleteNotification.mockResolvedValueOnce(true)
    await store.remove(1)
    expect(mockService.deleteNotification).toHaveBeenCalledWith(1)
    expect(store.items.map(n => n.id)).toEqual([2, 3])
    expect(store.unreadCount).toBe(2)

    mockService.deleteNotification.mockRejectedValueOnce(Object.assign(new Error('Introuvable'), { status: 404 }))
    await store.remove(2)
    expect(store.items.map(n => n.id)).toEqual([3])

    mockService.deleteNotification.mockRejectedValueOnce(Object.assign(new Error('Panne'), { status: 500 }))
    await expect(store.remove(3)).rejects.toThrow('Panne')
    expect(store.items.map(n => n.id)).toEqual([3])
  })
})
