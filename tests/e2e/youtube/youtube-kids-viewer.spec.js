import { test, expect } from '@playwright/test'
import { loginAsChild, waitForAppLoad, cleanupTestData, waitForYouTubeVideo } from '../utils/test-helpers.js'
import { selectors, testYouTubeVideos } from '../utils/fixtures.js'

test.describe('Visualiseur YouTube Kids', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait afficher le visualiseur YouTube Kids pour un profil enfant', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Naviguer vers le visualiseur YouTube Kids
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier que le visualiseur est affiché
    await expect(page.locator(selectors.youtubePlayer)).toBeVisible()
  })

  test('devrait charger une vidéo YouTube', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    // Naviguer vers le visualiseur avec une vidéo spécifique
    await page.goto(`/youtube-kids-viewer?profile=2&video=${encodeURIComponent(testYouTubeVideos.educational[0])}`)
    await waitForAppLoad(page)
    
    // Attendre que la vidéo soit chargée
    await waitForYouTubeVideo(page)
    
    // Vérifier que l'iframe YouTube est présente
    await expect(page.locator(selectors.youtubeIframe)).toBeVisible()
  })

  test('devrait afficher les contrôles de vidéo', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier la présence des contrôles
    await expect(page.locator(selectors.videoControls)).toBeVisible()
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="volume-control"]')).toBeVisible()
  })

  test('devrait permettre de jouer et mettre en pause la vidéo', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto(`/youtube-kids-viewer?profile=2&video=${encodeURIComponent(testYouTubeVideos.educational[0])}`)
    await waitForAppLoad(page)
    
    await waitForYouTubeVideo(page)
    
    // Cliquer sur le bouton play
    await page.click('[data-testid="play-button"]')
    
    // Vérifier que la vidéo est en cours de lecture
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible()
    
    // Cliquer sur le bouton pause
    await page.click('[data-testid="pause-button"]')
    
    // Vérifier que la vidéo est en pause
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
  })

  test('devrait permettre de contrôler le volume', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier que le contrôle de volume est présent
    await expect(page.locator('[data-testid="volume-control"]')).toBeVisible()
    
    // Modifier le volume
    await page.fill('[data-testid="volume-slider"]', '50')
    
    // Vérifier que la valeur du volume a changé
    await expect(page.locator('[data-testid="volume-slider"]')).toHaveValue('50')
  })

  test('devrait afficher une liste de vidéos recommandées', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier que la liste de recommandations est visible
    await expect(page.locator('[data-testid="recommended-videos"]')).toBeVisible()
    
    // Vérifier la présence de vidéos recommandées
    await expect(page.locator('[data-testid="recommended-video"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de sélectionner une vidéo recommandée', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Cliquer sur la première vidéo recommandée
    await page.click('[data-testid="recommended-video"]:first-child')
    
    // Vérifier que la nouvelle vidéo est chargée
    await waitForYouTubeVideo(page)
    await expect(page.locator(selectors.youtubeIframe)).toBeVisible()
  })

  test('devrait filtrer les vidéos par catégorie', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Cliquer sur un filtre de catégorie
    await page.click('[data-testid="filter-educational"]')
    
    // Vérifier que seules les vidéos éducatives sont affichées
    await expect(page.locator('[data-testid="recommended-video"][data-category="educational"]')).toHaveCount.greaterThan(0)
  })

  test('devrait afficher les informations de la vidéo', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto(`/youtube-kids-viewer?profile=2&video=${encodeURIComponent(testYouTubeVideos.educational[0])}`)
    await waitForAppLoad(page)
    
    // Vérifier que les informations de la vidéo sont affichées
    await expect(page.locator('[data-testid="video-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="video-description"]')).toBeVisible()
    await expect(page.locator('[data-testid="video-duration"]')).toBeVisible()
  })

  test('devrait permettre de revenir au dashboard', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton de retour
    await page.click(selectors.backButton)
    
    // Vérifier la redirection vers le dashboard utilisateur
    await expect(page).toHaveURL(/.*user-dashboard.*/)
  })

  test('devrait être sécurisé pour les enfants', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier que les commentaires sont désactivés
    await expect(page.locator('[data-testid="comments-section"]')).not.toBeVisible()
    
    // Vérifier que les suggestions de vidéos sont filtrées
    await expect(page.locator('[data-testid="inappropriate-content"]')).not.toBeVisible()
    
    // Vérifier que les contrôles parentaux sont actifs
    await expect(page.locator('[data-testid="parental-controls"]')).toBeVisible()
  })

  test('devrait gérer les erreurs de chargement de vidéo', async ({ page }) => {
    // Intercepter les requêtes YouTube et simuler une erreur
    await page.route('**/youtube.com/**', route => {
      route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: '<html><body>Video not found</body></html>'
      })
    })

    await loginAsChild(page, 'Enfant')
    
    await page.goto(`/youtube-kids-viewer?profile=2&video=${encodeURIComponent(testYouTubeVideos.educational[0])}`)
    await waitForAppLoad(page)
    
    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator('[data-testid="video-error"]')).toBeVisible()
  })

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Simuler un écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier que le visualiseur s'adapte à la taille de l'écran
    await expect(page.locator(selectors.youtubePlayer)).toBeVisible()
    
    // Vérifier que les contrôles sont accessibles sur mobile
    await expect(page.locator(selectors.videoControls)).toBeVisible()
  })

  test('devrait être accessible au clavier', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Naviguer avec Tab
    await page.keyboard.press('Tab')
    
    // Vérifier que le focus est sur le premier élément interactif
    const firstControl = page.locator('[data-testid="play-button"]')
    await expect(firstControl).toBeFocused()
    
    // Activer avec Entrée
    await page.keyboard.press('Enter')
    
    // Vérifier que la vidéo se lance
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible()
  })

  test('devrait afficher un indicateur de chargement', async ({ page }) => {
    // Intercepter les requêtes YouTube et ajouter un délai
    await page.route('**/youtube.com/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      route.continue()
    })

    await loginAsChild(page, 'Enfant')
    
    await page.goto(`/youtube-kids-viewer?profile=2&video=${encodeURIComponent(testYouTubeVideos.educational[0])}`)
    await waitForAppLoad(page)
    
    // Vérifier qu'un indicateur de chargement est affiché
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('devrait permettre de rechercher des vidéos', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton de recherche
    await page.click('[data-testid="search-button"]')
    
    // Vérifier que le champ de recherche apparaît
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
    
    // Saisir une recherche
    await page.fill('[data-testid="search-input"]', 'apprendre les couleurs')
    await page.keyboard.press('Enter')
    
    // Vérifier que les résultats de recherche sont affichés
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })

  test('devrait afficher l\'historique de visionnage', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'historique
    await page.click('[data-testid="history-button"]')
    
    // Vérifier que l'historique s'affiche
    await expect(page.locator('[data-testid="watch-history"]')).toBeVisible()
  })

  test('devrait permettre de marquer une vidéo comme favorite', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton favori
    await page.click('[data-testid="favorite-button"]')
    
    // Vérifier que la vidéo est marquée comme favorite
    await expect(page.locator('[data-testid="favorite-button"]')).toHaveClass(/favorited/)
  })

  test('devrait afficher les statistiques de visionnage', async ({ page }) => {
    await loginAsChild(page, 'Enfant')
    
    await page.goto('/youtube-kids-viewer?profile=2')
    await waitForAppLoad(page)
    
    // Vérifier que les statistiques sont visibles
    await expect(page.locator('[data-testid="watch-stats"]')).toBeVisible()
    
    // Vérifier la présence des métriques
    await expect(page.locator('[data-testid="total-watch-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="videos-watched"]')).toBeVisible()
  })
})
