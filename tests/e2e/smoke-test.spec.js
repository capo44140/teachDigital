import { test, expect } from '@playwright/test'

test.describe('Test de Fumée - TeachDigital', () => {
  test('devrait charger la page d\'accueil', async ({ page }) => {
    await page.goto('/')
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle')
    
    // Vérifier que la page se charge correctement
    await expect(page).toHaveTitle(/TeachDigital/)
    
    // Vérifier que le contenu principal est présent
    await expect(page.locator('body')).toBeVisible()
  })

  test('devrait être responsive', async ({ page }) => {
    // Test sur desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // Test sur mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('devrait avoir un manifest PWA valide', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier que le manifest est chargé
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.status()).toBe(200)
    
    const manifest = await manifestResponse.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
  })

  test('devrait enregistrer un Service Worker', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier que le Service Worker est enregistré
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        return registrations.length > 0
      })
    })
    
    expect(swRegistered).toBe(true)
  })

  test('devrait avoir des icônes PWA', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Vérifier la présence des icônes
    const icons = await page.evaluate(() => {
      const iconLinks = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
      return Array.from(iconLinks).map(link => link.href)
    })
    
    expect(icons.length).toBeGreaterThan(0)
  })
})
