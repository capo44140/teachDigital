import { test, expect } from '@playwright/test'
import { waitForAppLoad, cleanupTestData } from '../utils/test-helpers.js'
import { selectors, testProfiles, errorMessages, successMessages } from '../utils/fixtures.js'

test.describe('Authentification par Code PIN', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait afficher la page de verrouillage PIN pour un profil parent', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Vérifier la redirection vers la page PIN
    await expect(page).toHaveURL(/.*pin-lock.*/)
    
    // Vérifier les éléments de la page PIN
    await expect(page.locator(selectors.pinInput)).toBeVisible()
    await expect(page.locator(selectors.pinSubmit)).toBeVisible()
    
    // Vérifier que le nom du profil est affiché
    await expect(page.locator('[data-testid="profile-name"]')).toContainText(testProfiles.parent.name)
  })

  test('devrait accepter un code PIN valide', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Saisir le code PIN correct
    await page.fill(selectors.pinInput, testProfiles.parent.pin)
    await page.click(selectors.pinSubmit)

    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL(/.*dashboard.*/)
  })

  test('devrait rejeter un code PIN invalide', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Saisir un code PIN incorrect
    await page.fill(selectors.pinInput, '0000')
    await page.click(selectors.pinSubmit)

    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator(selectors.pinError)).toBeVisible()
    await expect(page.locator(selectors.pinError)).toContainText(errorMessages.invalidPin)
    
    // Vérifier qu'on reste sur la page PIN
    await expect(page).toHaveURL(/.*pin-lock.*/)
  })

  test('devrait permettre de réessayer après une erreur', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Premier essai avec un PIN incorrect
    await page.fill(selectors.pinInput, '0000')
    await page.click(selectors.pinSubmit)
    
    // Vérifier l'erreur
    await expect(page.locator(selectors.pinError)).toBeVisible()
    
    // Deuxième essai avec le bon PIN
    await page.fill(selectors.pinInput, testProfiles.parent.pin)
    await page.click(selectors.pinSubmit)
    
    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL(/.*dashboard.*/)
  })

  test('devrait vider le champ PIN après une erreur', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Saisir un code PIN incorrect
    await page.fill(selectors.pinInput, '0000')
    await page.click(selectors.pinSubmit)
    
    // Vérifier que le champ est vidé
    await expect(page.locator(selectors.pinInput)).toHaveValue('')
  })

  test('devrait limiter le nombre de caractères dans le champ PIN', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Essayer de saisir plus de 4 caractères
    await page.fill(selectors.pinInput, '12345')
    
    // Vérifier que seuls 4 caractères sont acceptés
    await expect(page.locator(selectors.pinInput)).toHaveValue('1234')
  })

  test('devrait accepter uniquement des chiffres dans le champ PIN', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Essayer de saisir des lettres
    await page.fill(selectors.pinInput, 'abcd')
    
    // Vérifier que le champ reste vide
    await expect(page.locator(selectors.pinInput)).toHaveValue('')
  })

  test('devrait permettre la soumission avec la touche Entrée', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Saisir le code PIN et appuyer sur Entrée
    await page.fill(selectors.pinInput, testProfiles.parent.pin)
    await page.keyboard.press('Enter')

    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL(/.*dashboard.*/)
  })

  test('devrait être accessible au clavier', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Vérifier que le champ PIN a le focus
    await expect(page.locator(selectors.pinInput)).toBeFocused()
    
    // Naviguer vers le bouton avec Tab
    await page.keyboard.press('Tab')
    await expect(page.locator(selectors.pinSubmit)).toBeFocused()
  })

  test('devrait gérer les erreurs de session expirée', async ({ page }) => {
    // Intercepter les requêtes API et simuler une session expirée
    await page.route('**/api/auth/verify**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expirée' })
      })
    })

    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Saisir le code PIN
    await page.fill(selectors.pinInput, testProfiles.parent.pin)
    await page.click(selectors.pinSubmit)

    // Vérifier qu'un message d'erreur de session est affiché
    await expect(page.locator(selectors.pinError)).toContainText(errorMessages.sessionExpired)
  })

  test('devrait afficher un indicateur de chargement pendant la vérification', async ({ page }) => {
    // Intercepter les requêtes API et ajouter un délai
    await page.route('**/api/auth/verify**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Saisir le code PIN et soumettre
    await page.fill(selectors.pinInput, testProfiles.parent.pin)
    await page.click(selectors.pinSubmit)

    // Vérifier qu'un indicateur de chargement est affiché
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Simuler un écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await waitForAppLoad(page)

    // Sélectionner le profil parent
    await page.click(`[data-testid="profile-${testProfiles.parent.name.toLowerCase()}"]`)

    // Vérifier que les éléments sont visibles sur mobile
    await expect(page.locator(selectors.pinInput)).toBeVisible()
    await expect(page.locator(selectors.pinSubmit)).toBeVisible()
    
    // Vérifier que le champ PIN est assez grand pour la saisie tactile
    const inputBox = await page.locator(selectors.pinInput).boundingBox()
    expect(inputBox.height).toBeGreaterThanOrEqual(44) // Taille minimale recommandée pour mobile
  })
})
