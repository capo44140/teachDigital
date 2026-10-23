import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession } from './support/api.js'

test.describe('Coquille de l\'application', () => {
  test('adresse inconnue : page 404 publique, retour à l\'accueil', async ({ page }) => {
    const { calls } = await mockApi(page)

    await page.goto('/nulle-part/introuvable')

    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
    // Page publique : aucun appel à l'API
    expect(calls).toHaveLength(0)

    await page.getByRole('link', { name: 'Retour à l\'accueil' }).click()
    // Sans session famille, l'accueil renvoie au code familial
    await expect(page).toHaveURL(/\/family-gate/)
  })

  test('perte de connexion : bandeau hors ligne annoncé, retiré au retour du réseau', async ({ page, context }) => {
    await seedFamilySession(page)
    await mockApi(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Qui est-ce ?' })).toBeVisible()

    const banner = page.getByRole('status').filter({ hasText: 'Hors ligne' })
    await expect(banner).toHaveCount(0)

    await context.setOffline(true)
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('rien ne peut être chargé ni enregistré')

    await context.setOffline(false)
    await expect(banner).toHaveCount(0)
  })
})
