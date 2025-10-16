import { test, expect } from '@playwright/test'
import { loginAsParent, waitForAppLoad, cleanupTestData } from '../utils/test-helpers.js'
import { selectors, testProfiles } from '../utils/fixtures.js'

test.describe('Dashboard Parent', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait afficher le dashboard parent après authentification', async ({ page }) => {
    await loginAsParent(page)
    
    // Vérifier que le dashboard parent est affiché
    await expect(page.locator(selectors.parentDashboard)).toBeVisible()
    
    // Vérifier que le nom du profil parent est affiché
    await expect(page.locator('[data-testid="profile-name"]')).toContainText(testProfiles.parent.name)
  })

  test('devrait afficher les sections principales du dashboard', async ({ page }) => {
    await loginAsParent(page)
    
    // Vérifier la présence des sections principales
    await expect(page.locator('[data-testid="profiles-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="activities-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="progress-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-section"]')).toBeVisible()
  })

  test('devrait permettre d\'accéder à la gestion des profils', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton de gestion des profils
    await page.click('[data-testid="manage-profiles-button"]')
    
    // Vérifier la redirection vers la page de gestion des profils
    await expect(page).toHaveURL(/.*manage-profiles.*/)
  })

  test('devrait permettre d\'accéder aux paramètres PIN', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton des paramètres PIN
    await page.click('[data-testid="pin-settings-button"]')
    
    // Vérifier la redirection vers la page des paramètres PIN
    await expect(page).toHaveURL(/.*pin-settings.*/)
  })

  test('devrait afficher la liste des profils enfants', async ({ page }) => {
    await loginAsParent(page)
    
    // Vérifier que la section des profils est visible
    await expect(page.locator('[data-testid="profiles-section"]')).toBeVisible()
    
    // Vérifier que les profils enfants sont listés
    await expect(page.locator('[data-testid="child-profile"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de créer un nouveau profil', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton d'ajout de profil
    await page.click('[data-testid="add-profile-button"]')
    
    // Vérifier que le formulaire de création de profil s'ouvre
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible()
    
    // Remplir le formulaire
    await page.fill('[data-testid="profile-name-input"]', 'Nouveau Profil')
    await page.selectOption('[data-testid="profile-type-select"]', 'child')
    await page.fill('[data-testid="profile-age-input"]', '10')
    
    // Soumettre le formulaire
    await page.click('[data-testid="save-profile-button"]')
    
    // Vérifier que le profil a été créé
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('devrait afficher les statistiques de progression', async ({ page }) => {
    await loginAsParent(page)
    
    // Vérifier que la section de progression est visible
    await expect(page.locator('[data-testid="progress-section"]')).toBeVisible()
    
    // Vérifier la présence des métriques
    await expect(page.locator('[data-testid="total-activities"]')).toBeVisible()
    await expect(page.locator('[data-testid="completed-activities"]')).toBeVisible()
    await expect(page.locator('[data-testid="average-score"]')).toBeVisible()
  })

  test('devrait permettre d\'accéder au suivi de progression', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton de suivi de progression
    await page.click('[data-testid="progress-tracking-button"]')
    
    // Vérifier la redirection vers la page de suivi
    await expect(page).toHaveURL(/.*parent-progress-tracking.*/)
  })

  test('devrait permettre d\'accéder à la gestion des quiz', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton de gestion des quiz
    await page.click('[data-testid="quiz-management-button"]')
    
    // Vérifier la redirection vers la page de gestion des quiz
    await expect(page).toHaveURL(/.*parent-quiz-management.*/)
  })

  test('devrait permettre d\'accéder au scanner de leçons', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton du scanner de leçons
    await page.click('[data-testid="lesson-scanner-button"]')
    
    // Vérifier la redirection vers la page du scanner
    await expect(page).toHaveURL(/.*lesson-scanner.*/)
  })

  test('devrait permettre de se déconnecter', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton de déconnexion
    await page.click('[data-testid="logout-button"]')
    
    // Vérifier la redirection vers la page de sélection de profil
    await expect(page).toHaveURL('/')
  })

  test('devrait afficher les notifications récentes', async ({ page }) => {
    await loginAsParent(page)
    
    // Vérifier que la section des notifications est visible
    await expect(page.locator('[data-testid="notifications-section"]')).toBeVisible()
    
    // Vérifier la présence du bouton de notification
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible()
  })

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Simuler un écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAsParent(page)
    
    // Vérifier que le dashboard s'adapte à la taille de l'écran
    await expect(page.locator(selectors.parentDashboard)).toBeVisible()
    
    // Vérifier que les boutons sont assez grands pour la saisie tactile
    const buttonBox = await page.locator('[data-testid="manage-profiles-button"]').boundingBox()
    expect(buttonBox.height).toBeGreaterThanOrEqual(44)
  })

  test('devrait être accessible au clavier', async ({ page }) => {
    await loginAsParent(page)
    
    // Naviguer avec Tab
    await page.keyboard.press('Tab')
    
    // Vérifier que le focus est sur le premier élément interactif
    const firstButton = page.locator('[data-testid="manage-profiles-button"]')
    await expect(firstButton).toBeFocused()
    
    // Activer avec Entrée
    await page.keyboard.press('Enter')
    
    // Vérifier la redirection
    await expect(page).toHaveURL(/.*manage-profiles.*/)
  })

  test('devrait gérer les erreurs de chargement des données', async ({ page }) => {
    // Intercepter les requêtes API et simuler une erreur
    await page.route('**/api/dashboard**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erreur serveur' })
      })
    })

    await loginAsParent(page)
    
    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('devrait afficher un indicateur de chargement', async ({ page }) => {
    // Intercepter les requêtes API et ajouter un délai
    await page.route('**/api/dashboard**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          profiles: [],
          activities: [],
          progress: {}
        })
      })
    })

    await loginAsParent(page)
    
    // Vérifier qu'un indicateur de chargement est affiché
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('devrait permettre de rafraîchir les données', async ({ page }) => {
    await loginAsParent(page)
    
    // Cliquer sur le bouton de rafraîchissement
    await page.click('[data-testid="refresh-button"]')
    
    // Vérifier que les données sont rechargées
    await expect(page.locator('[data-testid="profiles-section"]')).toBeVisible()
  })
})
