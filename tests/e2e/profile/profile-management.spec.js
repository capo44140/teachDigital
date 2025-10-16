import { test, expect } from '@playwright/test'
import { loginAsParent, waitForAppLoad, cleanupTestData, createTestProfile } from '../utils/test-helpers.js'
import { selectors, testProfiles, formData } from '../utils/fixtures.js'

test.describe('Gestion des Profils', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait afficher la page de gestion des profils pour un parent', async ({ page }) => {
    await loginAsParent(page)
    
    // Naviguer vers la gestion des profils
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Vérifier que la page de gestion des profils est affichée
    await expect(page.locator('[data-testid="profile-management"]')).toBeVisible()
  })

  test('devrait afficher la liste des profils existants', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Vérifier que les profils sont listés
    await expect(page.locator('[data-testid="profile-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-item"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de créer un nouveau profil enfant', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'ajout de profil
    await page.click(selectors.addProfileButton)
    
    // Vérifier que le formulaire s'ouvre
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible()
    
    // Remplir le formulaire
    await page.fill(selectors.profileName, formData.validProfile.name)
    await page.selectOption(selectors.profileType, formData.validProfile.type)
    await page.fill(selectors.profileAge, formData.validProfile.age)
    
    // Soumettre le formulaire
    await page.click(selectors.saveProfile)
    
    // Vérifier que le profil a été créé
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-list"]')).toContainText(formData.validProfile.name)
  })

  test('devrait permettre de créer un nouveau profil adolescent', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'ajout de profil
    await page.click(selectors.addProfileButton)
    
    // Remplir le formulaire pour un adolescent
    await page.fill(selectors.profileName, 'Nouvel Adolescent')
    await page.selectOption(selectors.profileType, 'teen')
    await page.fill(selectors.profileAge, '15')
    
    // Soumettre le formulaire
    await page.click(selectors.saveProfile)
    
    // Vérifier que le profil a été créé
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-list"]')).toContainText('Nouvel Adolescent')
  })

  test('devrait valider les données du formulaire', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'ajout de profil
    await page.click(selectors.addProfileButton)
    
    // Essayer de soumettre le formulaire vide
    await page.click(selectors.saveProfile)
    
    // Vérifier que les erreurs de validation sont affichées
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="type-error"]')).toBeVisible()
  })

  test('devrait permettre de modifier un profil existant', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'édition du premier profil
    await page.click('[data-testid="edit-profile"]:first-child')
    
    // Vérifier que le formulaire s'ouvre avec les données existantes
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible()
    
    // Modifier le nom du profil
    await page.fill(selectors.profileName, 'Profil Modifié')
    
    // Sauvegarder les modifications
    await page.click(selectors.saveProfile)
    
    // Vérifier que les modifications ont été sauvegardées
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-list"]')).toContainText('Profil Modifié')
  })

  test('devrait permettre de supprimer un profil', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Compter le nombre de profils avant suppression
    const initialCount = await page.locator('[data-testid="profile-item"]').count()
    
    // Cliquer sur le bouton de suppression du premier profil
    await page.click('[data-testid="delete-profile"]:first-child')
    
    // Confirmer la suppression
    await page.click('[data-testid="confirm-delete"]')
    
    // Vérifier que le profil a été supprimé
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-item"]')).toHaveCount(initialCount - 1)
  })

  test('devrait permettre d\'annuler la suppression d\'un profil', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Compter le nombre de profils avant tentative de suppression
    const initialCount = await page.locator('[data-testid="profile-item"]').count()
    
    // Cliquer sur le bouton de suppression du premier profil
    await page.click('[data-testid="delete-profile"]:first-child')
    
    // Annuler la suppression
    await page.click('[data-testid="cancel-delete"]')
    
    // Vérifier que le profil n'a pas été supprimé
    await expect(page.locator('[data-testid="profile-item"]')).toHaveCount(initialCount)
  })

  test('devrait afficher les informations détaillées d\'un profil', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur un profil pour voir les détails
    await page.click('[data-testid="profile-item"]:first-child')
    
    // Vérifier que les détails du profil sont affichés
    await expect(page.locator('[data-testid="profile-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-type"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-age"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-created"]')).toBeVisible()
  })

  test('devrait permettre de filtrer les profils par type', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Filtrer par type "enfant"
    await page.selectOption('[data-testid="profile-filter"]', 'child')
    
    // Vérifier que seuls les profils enfants sont affichés
    await expect(page.locator('[data-testid="profile-item"][data-type="child"]')).toHaveCount.greaterThan(0)
  })

  test('devrait permettre de rechercher un profil', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Rechercher un profil par nom
    await page.fill('[data-testid="profile-search"]', 'Enfant')
    
    // Vérifier que seuls les profils correspondants sont affichés
    await expect(page.locator('[data-testid="profile-item"]')).toContainText('Enfant')
  })

  test('devrait permettre de trier les profils', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Trier par nom
    await page.click('[data-testid="sort-by-name"]')
    
    // Vérifier que les profils sont triés par nom
    const profileNames = await page.locator('[data-testid="profile-name"]').allTextContents()
    const sortedNames = [...profileNames].sort()
    expect(profileNames).toEqual(sortedNames)
  })

  test('devrait être responsive sur mobile', async ({ page }) => {
    // Simuler un écran mobile
    await page.setViewportSize({ width: 375, height: 667 })
    
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Vérifier que la page s'adapte à la taille de l'écran
    await expect(page.locator('[data-testid="profile-management"]')).toBeVisible()
    
    // Vérifier que les boutons sont assez grands pour la saisie tactile
    const buttonBox = await page.locator(selectors.addProfileButton).boundingBox()
    expect(buttonBox.height).toBeGreaterThanOrEqual(44)
  })

  test('devrait être accessible au clavier', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Naviguer avec Tab
    await page.keyboard.press('Tab')
    
    // Vérifier que le focus est sur le premier élément interactif
    const firstButton = page.locator(selectors.addProfileButton)
    await expect(firstButton).toBeFocused()
    
    // Activer avec Entrée
    await page.keyboard.press('Enter')
    
    // Vérifier que le formulaire s'ouvre
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible()
  })

  test('devrait gérer les erreurs de sauvegarde', async ({ page }) => {
    // Intercepter les requêtes API et simuler une erreur
    await page.route('**/api/profiles**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erreur serveur' })
      })
    })

    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Essayer de créer un profil
    await page.click(selectors.addProfileButton)
    await page.fill(selectors.profileName, 'Test Profile')
    await page.selectOption(selectors.profileType, 'child')
    await page.click(selectors.saveProfile)
    
    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('devrait afficher un indicateur de chargement', async ({ page }) => {
    // Intercepter les requêtes API et ajouter un délai
    await page.route('**/api/profiles**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.continue()
    })

    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Vérifier qu'un indicateur de chargement est affiché
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('devrait permettre d\'exporter la liste des profils', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'export
    await page.click('[data-testid="export-profiles"]')
    
    // Vérifier que l'export est déclenché
    const downloadPromise = page.waitForEvent('download')
    await downloadPromise
    
    // Vérifier qu'un message de succès est affiché
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible()
  })

  test('devrait permettre d\'importer des profils', async ({ page }) => {
    await loginAsParent(page)
    
    await page.goto('/manage-profiles?profile=1&unlocked=true')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'import
    await page.click('[data-testid="import-profiles"]')
    
    // Vérifier que le dialogue d'import s'ouvre
    await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible()
    
    // Sélectionner un fichier (simulation)
    await page.setInputFiles('[data-testid="file-input"]', 'test-profiles.json')
    
    // Confirmer l'import
    await page.click('[data-testid="confirm-import"]')
    
    // Vérifier qu'un message de succès est affiché
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible()
  })
})
