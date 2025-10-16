import { test, expect } from '@playwright/test'
import { waitForAppLoad, cleanupTestData } from '../utils/test-helpers.js'
import { selectors, testProfiles, timeouts } from '../utils/fixtures.js'

test.describe('Sélection de Profil', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait afficher la page de sélection de profil au chargement initial', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Vérifier que la page de sélection de profil est affichée
    await expect(page.locator(selectors.profileSelector)).toBeVisible()
    
    // Vérifier que les profils sont affichés
    await expect(page.locator(selectors.profileCard)).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de sélectionner un profil parent', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Cliquer sur le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Vérifier la redirection vers la page de verrouillage PIN
    await expect(page).toHaveURL(/.*pin-lock.*/)
    
    // Vérifier que le champ PIN est présent
    await expect(page.locator(selectors.pinInput)).toBeVisible()
  })

  test('devrait permettre de sélectionner un profil enfant', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Cliquer sur le profil enfant
    await page.click(`[data-testid="profile-${testProfiles.child.name.toLowerCase()}"]`)

    // Vérifier la redirection vers le dashboard utilisateur
    await expect(page).toHaveURL(/.*user-dashboard.*/)
  })

  test('devrait permettre de sélectionner un profil adolescent', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Cliquer sur le profil adolescent
    await page.click(`[data-testid="profile-${testProfiles.teen.name.toLowerCase()}"]`)

    // Vérifier la redirection vers le dashboard utilisateur
    await expect(page).toHaveURL(/.*user-dashboard.*/)
  })

  test('devrait afficher les informations correctes pour chaque profil', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Vérifier le profil parent
    const parentCard = page.locator(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)
    await expect(parentCard).toContainText(testProfiles.parent.name)
    await expect(parentCard).toContainText('Parent')

    // Vérifier le profil enfant
    const childCard = page.locator(`[data-testid="profile-${testProfiles.child.name.toLowerCase()}"]`)
    await expect(childCard).toContainText(testProfiles.child.name)
    await expect(childCard).toContainText('Enfant')

    // Vérifier le profil adolescent
    const teenCard = page.locator(`[data-testid="profile-${testProfiles.teen.name.toLowerCase()}"]`)
    await expect(teenCard).toContainText(testProfiles.teen.name)
    await expect(teenCard).toContainText('Adolescent')
  })

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Simuler un écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await waitForAppLoad(page)

    // Vérifier que les profils sont toujours visibles
    await expect(page.locator(selectors.profileCard)).toBeVisible()
    
    // Vérifier que les cartes s'adaptent à la taille de l'écran
    const cardBox = await page.locator(selectors.profileCard).first().boundingBox()
    expect(cardBox.width).toBeLessThanOrEqual(375)
  })

  test('devrait être accessible au clavier', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Naviguer avec Tab
    await page.keyboard.press('Tab')
    
    // Vérifier que le focus est sur le premier profil
    const firstProfile = page.locator(selectors.profileCard).first()
    await expect(firstProfile).toBeFocused()
    
    // Activer avec Entrée
    await page.keyboard.press('Enter')
    
    // Vérifier la redirection
    await expect(page).toHaveURL(/.*pin-lock|.*user-dashboard.*/)
  })

  test('devrait gérer les erreurs de chargement des profils', async ({ page }) => {
    // Intercepter les requêtes API et simuler une erreur
    await page.route('**/api/profiles**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erreur serveur' })
      })
    })

    await page.goto('/')
    await waitForAppLoad(page)

    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })
})
