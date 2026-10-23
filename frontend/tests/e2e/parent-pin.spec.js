import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession, ok, fail, parentToken, PARENT } from './support/api.js'

const pinInput = (page) => page.getByLabel(`Code PIN du profil ${PARENT.name}`, { exact: true })

test.describe('Espace parent : code PIN', () => {
  test.beforeEach(async ({ page }) => {
    await seedFamilySession(page)
  })

  async function openPinLock (page) {
    await page.goto('/')
    await page.getByRole('button', { name: `${PARENT.name} (parent, code PIN demandé)` }).click()
    await expect(page).toHaveURL(new RegExp(`/pin-lock\\?profile=${PARENT.id}`))
    await expect(page.getByRole('heading', { name: 'Entrez votre PIN' })).toBeVisible()
  }

  test('PIN correct (6 chiffres, touche Entrée) → tableau de bord parent', async ({ page }) => {
    const { calls } = await mockApi(page, [
      ['POST', '/api/auth/login', () => ok({ token: parentToken(), profile: { id: PARENT.id, name: PARENT.name, isAdmin: true } })]
    ])
    await openPinLock(page)

    await pinInput(page).fill('482913')
    await pinInput(page).press('Enter')

    await expect(page).toHaveURL(new RegExp(`/dashboard\\?profile=${PARENT.id}`))
    await expect(page.getByRole('heading', { name: `Bienvenue ${PARENT.name} !` })).toBeVisible()

    const login = calls.find(call => call.method === 'POST' && call.path === '/api/auth/login')
    expect(login.body).toEqual({ profileId: PARENT.id, pin: '482913' })
    // La connexion par PIN présente le jeton famille
    expect(login.headers.authorization).toMatch(/^Bearer /)
  })

  test('PIN de 4 chiffres validé avec le bouton', async ({ page }) => {
    const { calls } = await mockApi(page, [
      ['POST', '/api/auth/login', () => ok({ token: parentToken(), profile: { id: PARENT.id, name: PARENT.name, isAdmin: true } })]
    ])
    await openPinLock(page)

    await pinInput(page).fill('4829')
    await page.getByRole('button', { name: 'Valider' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    expect(calls.find(call => call.path === '/api/auth/login').body.pin).toBe('4829')
  })

  test('PIN incorrect : le message du serveur est affiché', async ({ page }) => {
    await mockApi(page, [
      ['POST', '/api/auth/login', () => fail(401, { code: 'INVALID_CREDENTIALS', message: 'Code PIN incorrect. Encore 4 essais avant le blocage.' })]
    ])
    await openPinLock(page)

    await pinInput(page).fill('000000')
    await page.getByRole('button', { name: 'Valider' }).click()

    await expect(page.getByRole('alert')).toHaveText('Code PIN incorrect. Encore 4 essais avant le blocage.')
    await expect(page).toHaveURL(/\/pin-lock/)
  })

  test('429 PIN_LOCKED : compte à rebours et saisie bloquée', async ({ page }) => {
    await mockApi(page, [
      ['POST', '/api/auth/login', () => ({
        status: 429,
        json: { success: false, code: 'PIN_LOCKED', message: 'Trop de tentatives', retryAfterSeconds: 900, requestId: 'req-e2e' }
      })]
    ])
    await openPinLock(page)

    await pinInput(page).fill('111111')
    await pinInput(page).press('Enter')

    const timer = page.getByRole('timer')
    await expect(timer).toContainText('Trop de codes incorrects : l\'accès est temporairement bloqué.')
    await expect(timer).toContainText(/Réessayez dans 1[45] min\./)
    await expect(pinInput(page)).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Valider' })).toBeDisabled()
  })
})
