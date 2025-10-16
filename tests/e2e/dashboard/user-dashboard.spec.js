import { test, expect } from '@playwright/test'
import { loginAsChild, waitForAppLoad, cleanupTestData } from '../utils/test-helpers.js'
import { selectors, testProfiles } from '../utils/fixtures.js'

test.describe('Dashboard Utilisateur (Enfant/Adolescent)', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait afficher le dashboard utilisateur pour un profil enfant', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que le dashboard utilisateur est affiché
    await expect(page.locator(selectors.userDashboard)).toBeVisible()
    
    // Vérifier que le nom du profil est affiché
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Enfant')
  })

  test('devrait afficher les activités disponibles', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que la section des activités est visible
    await expect(page.locator('[data-testid="activities-section"]')).toBeVisible()
    
    // Vérifier la présence des cartes d'activités
    await expect(page.locator('[data-testid="activity-card"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de lancer une activité', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur la première activité
    await page.click('[data-testid="activity-card"]:first-child')
    
    // Vérifier que l'activité se lance
    await expect(page.locator('[data-testid="activity-container"]')).toBeVisible()
  })

  test('devrait afficher la progression de l\'utilisateur', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que la section de progression est visible
    await expect(page.locator('[data-testid="progress-section"]')).toBeVisible()
    
    // Vérifier la présence des métriques de progression
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="completed-activities-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-activities-count"]')).toBeVisible()
  })

  test('devrait permettre d\'accéder au visualiseur YouTube Kids', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur le bouton YouTube Kids
    await page.click('[data-testid="youtube-kids-button"]')
    
    // Vérifier la redirection vers le visualiseur YouTube Kids
    await expect(page).toHaveURL(/.*youtube-kids-viewer.*/)
  })

  test('devrait afficher les récompenses et badges', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que la section des récompenses est visible
    await expect(page.locator('[data-testid="rewards-section"]')).toBeVisible()
    
    // Vérifier la présence des badges
    await expect(page.locator('[data-testid="badge"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de voir l\'historique des activités', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur le bouton d'historique
    await page.click('[data-testid="activity-history-button"]')
    
    // Vérifier que l'historique s'affiche
    await expect(page.locator('[data-testid="activity-history"]')).toBeVisible()
  })

  test('devrait afficher les paramètres du profil', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur le bouton des paramètres
    await page.click('[data-testid="profile-settings-button"]')
    
    // Vérifier la redirection vers les paramètres du profil
    await expect(page).toHaveURL(/.*profile-settings.*/)
  })

  test('devrait permettre de changer de profil', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur le bouton de changement de profil
    await page.click('[data-testid="switch-profile-button"]')
    
    // Vérifier la redirection vers la page de sélection de profil
    await expect(page).toHaveURL('/')
  })

  test('devrait afficher les notifications pour l\'utilisateur', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que la section des notifications est visible
    await expect(page.locator('[data-testid="notifications-section"]')).toBeVisible()
    
    // Vérifier la présence du bouton de notification
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible()
  })

  test('devrait être adapté à l\'âge de l\'utilisateur', async ({ page }) => {
    // Test pour un enfant de 8 ans
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que les activités sont adaptées à l'âge
    await expect(page.locator('[data-testid="age-appropriate-content"]')).toBeVisible()
    
    // Vérifier que l'interface est simplifiée
    await expect(page.locator('[data-testid="simplified-interface"]')).toBeVisible()
  })

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Simuler un écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que le dashboard s'adapte à la taille de l'écran
    await expect(page.locator(selectors.userDashboard)).toBeVisible()
    
    // Vérifier que les cartes d'activités sont bien disposées
    const activityCard = page.locator('[data-testid="activity-card"]').first()
    const cardBox = await activityCard.boundingBox()
    expect(cardBox.width).toBeLessThanOrEqual(375)
  })

  test('devrait être accessible au clavier', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Naviguer avec Tab
    await page.keyboard.press('Tab')
    
    // Vérifier que le focus est sur le premier élément interactif
    const firstActivity = page.locator('[data-testid="activity-card"]').first()
    await expect(firstActivity).toBeFocused()
    
    // Activer avec Entrée
    await page.keyboard.press('Enter')
    
    // Vérifier que l'activité se lance
    await expect(page.locator('[data-testid="activity-container"]')).toBeVisible()
  })

  test('devrait gérer les erreurs de chargement des activités', async ({ page }) => {
    // Intercepter les requêtes API et simuler une erreur
    await page.route('**/api/activities**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erreur serveur' })
      })
    })

    await loginAsChild(page, 'Enfant')
    
    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('devrait afficher un indicateur de chargement', async ({ page }) => {
    // Intercepter les requêtes API et ajouter un délai
    await page.route('**/api/activities**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ activities: [] })
      })
    })

    await loginAsChild(page, 'Enfant')
    
    // Vérifier qu'un indicateur de chargement est affiché
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('devrait permettre de filtrer les activités par catégorie', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur un filtre de catégorie
    await page.click('[data-testid="filter-math"]')
    
    // Vérifier que seules les activités de mathématiques sont affichées
    await expect(page.locator('[data-testid="activity-card"][data-category="math"]')).toHaveCount.greaterThan(0)
  })

  test('devrait afficher les activités recommandées', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que la section des recommandations est visible
    await expect(page.locator('[data-testid="recommended-activities"]')).toBeVisible()
    
    // Vérifier la présence d'activités recommandées
    await expect(page.locator('[data-testid="recommended-activity"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de marquer une activité comme favorite', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Cliquer sur le bouton favori de la première activité
    await page.click('[data-testid="activity-card"]:first-child [data-testid="favorite-button"]')
    
    // Vérifier que l'activité est marquée comme favorite
    await expect(page.locator('[data-testid="activity-card"]:first-child [data-testid="favorite-button"]')).toHaveClass(/favorited/)
  })

  test('devrait afficher les statistiques de temps d\'écran', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Vérifier que la section des statistiques de temps d'écran est visible
    await expect(page.locator('[data-testid="screen-time-stats"]')).toBeVisible()
    
    // Vérifier la présence des métriques
    await expect(page.locator('[data-testid="daily-screen-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="weekly-screen-time"]')).toBeVisible()
  })
})
