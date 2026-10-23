import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession, ok, parentToken, PARENT, CHILD } from './support/api.js'

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString()

// Notifications du parent, telles que renvoyées par GET /api/notifications (les plus récentes d'abord)
function initialNotifications () {
  return [
    {
      id: 11,
      type: 'quiz_completed',
      title: `${CHILD.name} : Excellent travail !`,
      message: `${CHILD.name} a obtenu 9/10 (90 %) au quiz « Les fractions ».`,
      data: { childProfileId: CHILD.id, childName: CHILD.name, lessonTitle: 'Les fractions' },
      is_read: false,
      created_at: minutesAgo(5)
    },
    {
      id: 12,
      type: 'security_alert',
      title: 'Code PIN parent verrouillé',
      message: 'Trop de codes PIN incorrects ont été saisis pour le profil « Parent ».',
      data: { lockMinutes: 15 },
      is_read: false,
      created_at: minutesAgo(60)
    },
    {
      id: 13,
      type: 'profile_request',
      title: 'Demande de création de profil',
      message: 'Un nouveau profil "Léa" a été demandé. Validation requise.',
      data: { requestedName: 'Léa', requestedType: 'child' },
      is_read: true,
      created_at: minutesAgo(2 * 24 * 60)
    }
  ]
}

test.describe('Espace parent : centre de notifications', () => {
  test.beforeEach(async ({ page }) => {
    await seedFamilySession(page)
  })

  test('cloche (non lues), panneau, marquer comme lue, supprimer, tout marquer comme lu', async ({ page }) => {
    let notifications = initialNotifications()
    const { calls } = await mockApi(page, [
      ['POST', '/api/auth/login', () => ok({ token: parentToken(), profile: { id: PARENT.id, name: PARENT.name, isAdmin: true } })],
      ['GET', '/api/notifications', (_match, request) => {
        const isRead = new URL(request.url()).searchParams.get('isRead')
        const list = isRead === null ? notifications : notifications.filter(n => String(n.is_read) === isRead)
        return ok({ notifications: list })
      }],
      ['POST', '/api/notifications/mark-all-read', () => {
        const updated = notifications.filter(n => !n.is_read).length
        notifications = notifications.map(n => ({ ...n, is_read: true }))
        return ok({ profileId: PARENT.id, updated })
      }],
      ['PUT', /^\/api\/notifications\/(\d+)$/, (match, request) => {
        const { isRead } = request.postDataJSON()
        notifications = notifications.map(n => (String(n.id) === match[1] ? { ...n, is_read: isRead } : n))
        return ok({ notification: notifications.find(n => String(n.id) === match[1]) })
      }],
      ['DELETE', /^\/api\/notifications\/(\d+)$/, (match) => {
        const removed = notifications.find(n => String(n.id) === match[1])
        notifications = notifications.filter(n => n !== removed)
        return ok({ notification: removed })
      }]
    ])

    // Connexion parent (PIN) → tableau de bord
    await page.goto('/')
    await page.getByRole('button', { name: `${PARENT.name} (parent, code PIN demandé)` }).click()
    const pin = page.getByLabel(`Code PIN du profil ${PARENT.name}`, { exact: true })
    await pin.fill('482913')
    await pin.press('Enter')
    await expect(page).toHaveURL(/\/dashboard/)

    // Compteur lu au montage du tableau de bord
    const bell = page.getByRole('button', { name: /^Notifications/ })
    await expect(bell).toHaveAccessibleName('Notifications, 2 non lues')
    const countCall = calls.find(call => call.method === 'GET' && call.path === '/api/notifications')
    expect(new URLSearchParams(countCall.search).get('profileId')).toBe(String(PARENT.id))

    await bell.click()
    const panel = page.getByRole('dialog', { name: 'Notifications' })
    await expect(panel).toBeVisible()
    await expect(panel.getByText('3 notifications, dont 2 non lues.')).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Code PIN parent verrouillé' })).toBeVisible()
    await expect(panel.getByText('Alerte de sécurité')).toBeVisible()
    await expect(panel.getByText('Profil demandé : Léa (Enfant)')).toBeVisible()
    await expect(panel.getByRole('button', { name: `Voir les progrès de ${CHILD.name}` })).toBeVisible()

    // Marquer comme lue
    await panel.getByRole('button', { name: 'Marquer comme lue : Code PIN parent verrouillé' }).click()
    await expect(bell).toHaveAccessibleName('Notifications, 1 non lue')
    const put = calls.find(call => call.method === 'PUT')
    expect(put.path).toBe('/api/notifications/12')
    expect(put.body).toEqual({ isRead: true })

    // Supprimer (confirmation)
    await panel.getByRole('button', { name: 'Supprimer : Demande de création de profil' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Supprimer la notification ?' })
    await confirm.getByRole('button', { name: 'Supprimer' }).click()
    await expect(panel.getByRole('heading', { name: 'Demande de création de profil' })).toHaveCount(0)
    expect(calls.some(call => call.method === 'DELETE' && call.path === '/api/notifications/13')).toBe(true)

    // Tout marquer comme lu
    await panel.getByRole('button', { name: 'Tout marquer comme lu' }).click()
    await expect(panel.getByText('2 notifications, aucune non lue.')).toBeVisible()
    await expect(bell).toHaveAccessibleName('Notifications')
    const markAll = calls.find(call => call.method === 'POST' && call.path === '/api/notifications/mark-all-read')
    expect(markAll.body).toEqual({ profileId: String(PARENT.id) })
  })

  test('erreur de chargement puis « Réessayer »', async ({ page }) => {
    let failures = 1
    await mockApi(page, [
      ['POST', '/api/auth/login', () => ok({ token: parentToken(), profile: { id: PARENT.id, name: PARENT.name, isAdmin: true } })],
      ['GET', '/api/notifications', (_match, request) => {
        const isRead = new URL(request.url()).searchParams.get('isRead')
        if (isRead === null && failures > 0) {
          failures--
          return { status: 500, json: { success: false, message: 'Base indisponible', requestId: 'req-e2e' } }
        }
        return ok({ notifications: [] })
      }]
    ])

    await page.goto('/')
    await page.getByRole('button', { name: `${PARENT.name} (parent, code PIN demandé)` }).click()
    const pin = page.getByLabel(`Code PIN du profil ${PARENT.name}`, { exact: true })
    await pin.fill('482913')
    await pin.press('Enter')
    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByRole('button', { name: 'Notifications' }).click()
    const panel = page.getByRole('dialog', { name: 'Notifications' })
    await expect(panel.getByRole('alert')).toContainText('Impossible de charger les notifications.')

    await panel.getByRole('button', { name: 'Réessayer' }).click()
    await expect(panel.getByText('Aucune notification', { exact: true })).toBeVisible()
  })
})
