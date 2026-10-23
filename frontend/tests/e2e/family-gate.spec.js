import { test, expect } from '@playwright/test'
import { mockApi, ok, fail, familyToken, CHILD } from './support/api.js'

test.describe('Code familial → choix du profil → espace enfant', () => {
  test('un enfant accède à son tableau de bord après le code familial', async ({ page }) => {
    const { calls } = await mockApi(page, [
      ['POST', '/api/auth/family-gate', () => ok({ valid: true, token: familyToken(), expiresAt: new Date(Date.now() + 86400000).toISOString() })]
    ])

    // Sans session famille, toute page renvoie au code familial
    await page.goto('/')
    await expect(page).toHaveURL(/\/family-gate/)
    await expect(page.getByRole('heading', { name: 'Code d\'entrée familial' })).toBeVisible()

    await page.getByLabel('Code d\'entrée familial', { exact: true }).fill('482913')
    await page.getByRole('button', { name: 'Valider' }).click()
    await expect(page.getByRole('heading', { name: 'Qui est-ce ?' })).toBeVisible()

    // Le code a été vérifié par le serveur (POST public, sans jeton)
    const gateCall = calls.find(call => call.method === 'POST' && call.path === '/api/auth/family-gate')
    expect(gateCall.body).toEqual({ pin: '482913' })
    expect(gateCall.headers.authorization).toBeUndefined()

    await page.getByRole('button', { name: `${CHILD.name} (enfant)` }).click()

    await expect(page).toHaveURL(new RegExp(`/user-dashboard\\?profile=${CHILD.id}`))

    // Première visite : présentation guidée (fenêtre modale), que l'enfant peut passer
    const tour = page.getByRole('dialog', { name: `Bienvenue ${CHILD.name} !` })
    await expect(tour).toBeVisible()
    await tour.getByRole('button', { name: 'Passer la présentation' }).click()
    await expect(tour).toBeHidden()

    await expect(page.getByRole('heading', { level: 1, name: `Salut ${CHILD.name} !` })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mes interrogations' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Les fractions/ })).toBeVisible()

    // Les appels du tableau de bord partent avec le jeton famille
    const lessonsCall = calls.find(call => call.method === 'GET' && call.path === '/api/lessons')
    expect(lessonsCall.headers.authorization).toMatch(/^Bearer /)
  })

  test('code familial incorrect : message du serveur, on reste sur la page', async ({ page }) => {
    await mockApi(page, [
      ['POST', '/api/auth/family-gate', () => fail(401, { code: 'INVALID_CREDENTIALS', message: 'Code incorrect' })]
    ])

    await page.goto('/family-gate')
    const input = page.getByLabel('Code d\'entrée familial', { exact: true })
    await input.fill('111111')
    await input.press('Enter')

    await expect(page.getByRole('alert')).toContainText('Code incorrect')
    await expect(page).toHaveURL(/\/family-gate/)
  })
})
