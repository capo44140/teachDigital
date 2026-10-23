/**
 * Centre de notifications parent (NotificationCenter + NotificationPanel) : cloche et compteur,
 * liste (non lues, alerte de sécurité, demande de profil, quiz terminé), actions « Marquer comme
 * lue », « Tout marquer comme lu », « Supprimer » (confirmation), états vide / erreur / Réessayer.
 * Le service est simulé ; les aides d'affichage restent réelles.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { storeParentSession } from '../services/testUtils.js'

const mockService = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  setNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn()
}))

vi.mock('../../src/services/notificationService.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, ...mockService }
})

const { default: NotificationCenter } = await import('../../src/components/notifications/NotificationCenter.vue')
const { confirmState, settleConfirm } = await import('../../src/composables/useConfirm.js')
const { useToastStore } = await import('../../src/stores/toastStore.js')

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString()

const QUIZ = {
  id: 1,
  type: 'quiz_completed',
  title: 'Lucas : Excellent travail !',
  message: 'Lucas a obtenu 9/10 (90 %) au quiz « Fractions ».',
  data: { childProfileId: 2, childName: 'Lucas' },
  isRead: false,
  createdAt: minutesAgo(5)
}
const ALERT = {
  id: 2,
  type: 'security_alert',
  title: 'Code PIN parent verrouillé',
  message: 'Trop de codes PIN incorrects ont été saisis.',
  data: { lockMinutes: 15 },
  isRead: false,
  createdAt: minutesAgo(90)
}
const REQUEST = {
  id: 3,
  type: 'profile_request',
  title: 'Demande de création de profil',
  message: 'Un nouveau profil "Léa" a été demandé. Validation requise.',
  data: { requestedName: 'Léa', requestedType: 'teen' },
  isRead: true,
  createdAt: minutesAgo(3 * 24 * 60)
}

async function flush () {
  for (let i = 0; i < 4; i++) {
    await new Promise(resolve => setTimeout(resolve, 0))
    await nextTick()
  }
}

describe('NotificationCenter', () => {
  let wrapper
  let router

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    storeParentSession(1)
    router = { push: vi.fn() }
    mockService.getUnreadCount.mockResolvedValue(2)
    mockService.getNotifications.mockResolvedValue([{ ...QUIZ }, { ...ALERT }, { ...REQUEST }])
    mockService.setNotificationRead.mockImplementation(async (id, isRead = true) => ({ id, isRead }))
    mockService.markAllNotificationsRead.mockResolvedValue(2)
    mockService.deleteNotification.mockResolvedValue(true)
  })

  afterEach(() => {
    // Aucun avertissement Vue (propriété inconnue, injection manquante…)
    const vueWarnings = console.warn.mock.calls.filter(([message]) => String(message).includes('[Vue warn]'))
    expect(vueWarnings).toEqual([])
    if (confirmState.open) settleConfirm(false)
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  async function mountCenter () {
    wrapper = mount(NotificationCenter, {
      props: { profileId: '1' },
      attachTo: document.body,
      global: { mocks: { $router: router } }
    })
    await flush()
    return wrapper
  }

  const bell = () => document.querySelector('button[aria-haspopup="dialog"]')
  const dialog = () => document.querySelector('[role="dialog"]')
  const buttonByLabel = (label) => [...document.querySelectorAll('button')]
    .find(button => (button.getAttribute('aria-label') || button.textContent.trim()) === label)
  const click = async (element) => {
    expect(element).toBeTruthy()
    element.click()
    await flush()
  }
  const openPanel = async () => {
    await click(bell())
    expect(dialog()).toBeTruthy()
  }
  const status = () => dialog().querySelector('[role="status"]').textContent

  describe('cloche', () => {
    it('actualise le compteur au montage : nom accessible et pastille', async () => {
      await mountCenter()

      expect(mockService.getUnreadCount).toHaveBeenCalledWith('1')
      expect(bell().getAttribute('aria-label')).toBe('Notifications, 2 non lues')
      expect(bell().textContent.trim()).toBe('2')
    })

    it('singulier, aucune pastille à zéro, « 99+ » au-delà de 99', async () => {
      mockService.getUnreadCount.mockResolvedValueOnce(1)
      await mountCenter()
      expect(bell().getAttribute('aria-label')).toBe('Notifications, 1 non lue')
      wrapper.unmount()

      mockService.getUnreadCount.mockResolvedValueOnce(0)
      await mountCenter()
      expect(bell().getAttribute('aria-label')).toBe('Notifications')
      expect(bell().textContent.trim()).toBe('')
      wrapper.unmount()

      mockService.getUnreadCount.mockResolvedValueOnce(150)
      await mountCenter()
      expect(bell().textContent.trim()).toBe('99+')
    })

    it('retour sur la fenêtre : nouvelle lecture au plus toutes les 30 s, écouteur retiré au démontage', async () => {
      let now = Date.now()
      vi.spyOn(Date, 'now').mockImplementation(() => now)
      await mountCenter()
      expect(mockService.getUnreadCount).toHaveBeenCalledTimes(1)

      window.dispatchEvent(new Event('focus'))
      await flush()
      expect(mockService.getUnreadCount).toHaveBeenCalledTimes(1)

      now += 31 * 1000
      window.dispatchEvent(new Event('focus'))
      await flush()
      expect(mockService.getUnreadCount).toHaveBeenCalledTimes(2)

      wrapper.unmount()
      wrapper = null
      now += 31 * 1000
      window.dispatchEvent(new Event('focus'))
      await flush()
      expect(mockService.getUnreadCount).toHaveBeenCalledTimes(2)
    })

    it('nouveau profil parent : compteur relu', async () => {
      await mountCenter()
      await wrapper.setProps({ profileId: '4' })
      await flush()
      expect(mockService.getUnreadCount).toHaveBeenLastCalledWith('4')
    })
  })

  describe('panneau', () => {
    it('charge la liste à l\'ouverture : non lues, alerte de sécurité, demande de profil, dates', async () => {
      await mountCenter()
      await openPanel()

      expect(mockService.getNotifications).toHaveBeenCalledWith('1')
      expect(dialog().getAttribute('aria-labelledby')).toBe('notification-panel-title')
      expect(document.getElementById('notification-panel-summary').textContent)
        .toBe('3 notifications, dont 2 non lues.')
      // Focus initial sur « Fermer »
      expect(document.activeElement.getAttribute('aria-label')).toBe('Fermer les notifications')

      const items = [...dialog().querySelectorAll('li[data-notification-id]')]
      expect(items).toHaveLength(3)
      expect(items[0].textContent).toContain('Lucas : Excellent travail !')
      expect(items[0].textContent).toContain('Non lue')
      expect(items[0].querySelector('time').textContent).toBe('il y a 5 minutes')
      expect(items[0].querySelector('time').getAttribute('datetime')).toBe(QUIZ.createdAt)

      // Alerte de sécurité : style d'avertissement et libellé visible
      expect(items[1].textContent).toContain('Alerte de sécurité')
      expect(items[1].className).toContain('border-amber-400/50')

      // Demande de profil (lue) : prénom et type demandés
      expect(items[2].textContent).toContain('Profil demandé : Léa (Adolescent)')
      expect(items[2].textContent).not.toContain('Non lue')
      expect(items[2].querySelector('time').textContent).toBe('il y a 3 jours')
      expect(buttonByLabel('Marquer comme lue : Demande de création de profil')).toBeUndefined()
    })

    it('« Marquer comme lue » : notification et compteur mis à jour, annonce, focus sur la notification', async () => {
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Marquer comme lue : Lucas : Excellent travail !'))

      expect(mockService.setNotificationRead).toHaveBeenCalledWith(1, true)
      const item = dialog().querySelector('li[data-notification-id="1"]')
      expect(item.textContent).not.toContain('Non lue')
      expect(status()).toBe('Notification marquée comme lue.')
      expect(document.activeElement).toBe(item)
      expect(bell().getAttribute('aria-label')).toBe('Notifications, 1 non lue')
    })

    it('« Tout marquer comme lu » : plus aucune non lue, focus sur le titre', async () => {
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Tout marquer comme lu'))

      expect(mockService.markAllNotificationsRead).toHaveBeenCalledWith('1')
      expect(dialog().textContent).not.toContain('Non lue')
      expect(buttonByLabel('Tout marquer comme lu')).toBeUndefined()
      expect(status()).toBe('Toutes les notifications sont marquées comme lues.')
      expect(document.activeElement.id).toBe('notification-panel-title')
      expect(document.getElementById('notification-panel-summary').textContent)
        .toBe('3 notifications, aucune non lue.')
      expect(bell().getAttribute('aria-label')).toBe('Notifications')
    })

    it('« Supprimer » demande confirmation ; annuler ne supprime rien', async () => {
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Supprimer : Code PIN parent verrouillé'))
      expect(confirmState.open).toBe(true)
      expect(confirmState.title).toBe('Supprimer la notification ?')
      expect(confirmState.message).toContain('Code PIN parent verrouillé')
      expect(confirmState.danger).toBe(true)

      settleConfirm(false)
      await flush()
      expect(mockService.deleteNotification).not.toHaveBeenCalled()
      expect(dialog().querySelectorAll('li[data-notification-id]')).toHaveLength(3)
    })

    it('« Supprimer » confirmé : notification retirée, annonce, focus sur la suivante', async () => {
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Supprimer : Code PIN parent verrouillé'))
      settleConfirm(true)
      await flush()

      expect(mockService.deleteNotification).toHaveBeenCalledWith(2)
      const items = [...dialog().querySelectorAll('li[data-notification-id]')]
      expect(items.map(li => li.dataset.notificationId)).toEqual(['1', '3'])
      expect(status()).toBe('Notification supprimée.')
      expect(document.activeElement).toBe(items[1])
      expect(bell().getAttribute('aria-label')).toBe('Notifications, 1 non lue')
    })

    it('dernière notification supprimée : état vide, focus sur le titre', async () => {
      mockService.getNotifications.mockResolvedValue([{ ...REQUEST }])
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Supprimer : Demande de création de profil'))
      settleConfirm(true)
      await flush()

      expect(dialog().textContent).toContain('Aucune notification')
      expect(document.activeElement.id).toBe('notification-panel-title')
    })

    it('échec d\'une action : message d\'erreur (toast), notification conservée', async () => {
      mockService.setNotificationRead.mockRejectedValueOnce(Object.assign(new Error('Erreur serveur'), { requestId: 'req-1' }))
      mockService.markAllNotificationsRead.mockRejectedValueOnce(new Error(''))
      mockService.deleteNotification.mockRejectedValueOnce(Object.assign(new Error('Panne'), { status: 500 }))
      await mountCenter()
      await openPanel()
      const toast = useToastStore()

      await click(buttonByLabel('Marquer comme lue : Lucas : Excellent travail !'))
      expect(toast.items.at(-1)).toMatchObject({ type: 'error', message: 'Erreur serveur', meta: 'Réf. req-1' })
      expect(dialog().querySelector('li[data-notification-id="1"]').textContent).toContain('Non lue')

      await click(buttonByLabel('Tout marquer comme lu'))
      expect(toast.items.at(-1).message).toBe('Impossible de marquer les notifications comme lues.')

      await click(buttonByLabel('Supprimer : Lucas : Excellent travail !'))
      settleConfirm(true)
      await flush()
      expect(toast.items.at(-1).message).toBe('Panne')
      expect(dialog().querySelectorAll('li[data-notification-id]')).toHaveLength(3)
    })

    it('état vide', async () => {
      mockService.getNotifications.mockResolvedValue([])
      await mountCenter()
      await openPanel()

      expect(dialog().textContent).toContain('Aucune notification')
      expect(document.getElementById('notification-panel-summary').textContent).toBe('Aucune notification.')
    })

    it('chargement puis erreur, « Réessayer » recharge la liste', async () => {
      let rejectFirst
      mockService.getNotifications
        .mockReturnValueOnce(new Promise((resolve, reject) => { rejectFirst = reject }))
        .mockResolvedValueOnce([{ ...QUIZ }])
      await mountCenter()
      await openPanel()

      expect(dialog().textContent).toContain('Chargement des notifications…')
      expect(document.getElementById('notification-panel-summary').textContent).toBe('Chargement…')
      // Pas d'action globale tant que la liste n'est pas là
      expect(buttonByLabel('Tout marquer comme lu')).toBeUndefined()

      rejectFirst(Object.assign(new Error('Impossible de contacter le serveur.'), { requestId: 'req-9' }))
      await flush()
      const alert = dialog().querySelector('[role="alert"]')
      expect(alert.textContent).toContain('Impossible de charger les notifications.')
      expect(alert.textContent).toContain('Impossible de contacter le serveur.')
      expect(alert.textContent).toContain('Réf. req-9')
      expect(document.getElementById('notification-panel-summary').textContent).toBe('Liste indisponible.')

      await click(buttonByLabel('Réessayer'))
      expect(dialog().querySelector('[role="alert"]')).toBeNull()
      expect(document.activeElement.id).toBe('notification-panel-title')
      expect(dialog().querySelectorAll('li[data-notification-id]')).toHaveLength(1)
      expect(document.getElementById('notification-panel-summary').textContent).toBe('1 notification, dont 1 non lue.')
    })

    it('quiz terminé : « Voir les progrès de Lucas » ouvre sa page de progrès et marque la notification lue', async () => {
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Voir les progrès de Lucas'))

      expect(router.push).toHaveBeenCalledWith({ name: 'ProgressTracking', query: { childId: '2' } })
      expect(mockService.setNotificationRead).toHaveBeenCalledWith(1, true)
      expect(dialog()).toBeNull()
    })

    it('demande de profil : « Gérer les profils » ouvre la gestion des profils (déjà lue : pas de PUT)', async () => {
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Gérer les profils'))

      expect(router.push).toHaveBeenCalledWith({ path: '/manage-profiles', query: { profile: '1' } })
      expect(mockService.setNotificationRead).not.toHaveBeenCalled()
      expect(dialog()).toBeNull()
    })

    it('ouvrir le sujet d\'une notification : un échec du marquage ne bloque pas la navigation', async () => {
      mockService.setNotificationRead.mockRejectedValueOnce(new Error('Hors ligne'))
      mockService.getNotifications.mockResolvedValue([{ ...QUIZ, data: { childProfileId: 2 } }])
      await mountCenter()
      await openPanel()

      await click(buttonByLabel('Voir les progrès'))

      expect(router.push).toHaveBeenCalledWith({ name: 'ProgressTracking', query: { childId: '2' } })
      expect(console.warn).toHaveBeenCalled()
    })

    it('« Fermer » et Échap ferment le panneau ; le focus revient sur la cloche', async () => {
      await mountCenter()
      bell().focus()
      await openPanel()

      await click(buttonByLabel('Fermer les notifications'))
      expect(dialog()).toBeNull()
      expect(document.activeElement).toBe(bell())

      await openPanel()
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await flush()
      expect(dialog()).toBeNull()
    })
  })
})
