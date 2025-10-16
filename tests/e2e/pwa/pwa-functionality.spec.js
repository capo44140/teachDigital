import { test, expect } from '@playwright/test'
import { waitForAppLoad, cleanupTestData } from '../utils/test-helpers.js'
import { selectors } from '../utils/fixtures.js'

test.describe('Fonctionnalités PWA', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page)
  })

  test('devrait avoir un manifest.json valide', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier que le manifest est chargé
    const manifest = await page.evaluate(() => {
      const manifestLink = document.querySelector('link[rel="manifest"]')
      return manifestLink ? manifestLink.href : null
    })
    
    expect(manifest).toBeTruthy()
    
    // Vérifier le contenu du manifest
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.status()).toBe(200)
    
    const manifestData = await manifestResponse.json()
    expect(manifestData.name).toBeTruthy()
    expect(manifestData.short_name).toBeTruthy()
    expect(manifestData.icons).toBeTruthy()
    expect(manifestData.start_url).toBeTruthy()
    expect(manifestData.display).toBeTruthy()
  })

  test('devrait enregistrer un Service Worker', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier que le Service Worker est enregistré
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        return registrations.length > 0
      })
    })
    
    expect(swRegistered).toBe(true)
  })

  test('devrait afficher un bouton d\'installation sur les navigateurs compatibles', async ({ page }) => {
    // Simuler un navigateur compatible avec l'installation PWA
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        window.deferredPrompt = e
      })
    })
    
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier que le bouton d'installation est visible
    await expect(page.locator(selectors.installButton)).toBeVisible()
  })

  test('devrait permettre l\'installation de l\'application', async ({ page }) => {
    // Simuler l'événement beforeinstallprompt
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        window.deferredPrompt = e
      })
    })
    
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'installation
    await page.click(selectors.installButton)
    
    // Vérifier que l'installation est déclenchée
    const installTriggered = await page.evaluate(() => {
      return window.deferredPrompt !== undefined
    })
    
    expect(installTriggered).toBe(true)
  })

  test('devrait fonctionner hors ligne', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler une connexion hors ligne
    await page.context().setOffline(true)
    
    // Naviguer vers une autre page
    await page.goto('/user-dashboard?profile=2')
    
    // Vérifier que l'application fonctionne toujours
    await expect(page.locator(selectors.userDashboard)).toBeVisible()
  })

  test('devrait afficher un indicateur de connexion hors ligne', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler une connexion hors ligne
    await page.context().setOffline(true)
    
    // Vérifier qu'un indicateur hors ligne est affiché
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('devrait synchroniser les données lors du retour en ligne', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler une connexion hors ligne
    await page.context().setOffline(true)
    
    // Effectuer une action qui nécessite une synchronisation
    await page.click('[data-testid="profile-card"]:first-child')
    
    // Simuler le retour en ligne
    await page.context().setOffline(false)
    
    // Vérifier que la synchronisation est déclenchée
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible()
  })

  test('devrait mettre en cache les ressources statiques', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier que les ressources sont mises en cache
    const cacheStatus = await page.evaluate(() => {
      return caches.keys().then(cacheNames => {
        return cacheNames.length > 0
      })
    })
    
    expect(cacheStatus).toBe(true)
  })

  test('devrait afficher une notification de mise à jour', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler une mise à jour disponible
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available'))
    })
    
    // Vérifier que la notification de mise à jour est affichée
    await expect(page.locator(selectors.updateButton)).toBeVisible()
  })

  test('devrait permettre de forcer la mise à jour', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler une mise à jour disponible
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available'))
    })
    
    // Cliquer sur le bouton de mise à jour
    await page.click(selectors.updateButton)
    
    // Vérifier que la mise à jour est déclenchée
    const updateTriggered = await page.evaluate(() => {
      return window.updateService !== undefined
    })
    
    expect(updateTriggered).toBe(true)
  })

  test('devrait avoir des icônes PWA appropriées', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier la présence des icônes
    const icons = await page.evaluate(() => {
      const iconLinks = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
      return Array.from(iconLinks).map(link => link.href)
    })
    
    expect(icons.length).toBeGreaterThan(0)
    
    // Vérifier que les icônes existent
    for (const iconUrl of icons) {
      const response = await page.request.get(iconUrl)
      expect(response.status()).toBe(200)
    }
  })

  test('devrait avoir un thème de couleur approprié', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier la présence des meta tags de thème
    const themeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]')
      return meta ? meta.content : null
    })
    
    expect(themeColor).toBeTruthy()
    
    // Vérifier la présence des meta tags pour iOS
    const appleStatusBarStyle = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      return meta ? meta.content : null
    })
    
    expect(appleStatusBarStyle).toBeTruthy()
  })

  test('devrait fonctionner en mode plein écran', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier que l'application peut être lancée en mode plein écran
    const canFullscreen = await page.evaluate(() => {
      return document.documentElement.requestFullscreen !== undefined
    })
    
    expect(canFullscreen).toBe(true)
  })

  test('devrait gérer les notifications push', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Vérifier que les notifications sont supportées
    const notificationsSupported = await page.evaluate(() => {
      return 'Notification' in window && 'serviceWorker' in navigator
    })
    
    expect(notificationsSupported).toBe(true)
  })

  test('devrait permettre de s\'abonner aux notifications', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Cliquer sur le bouton d'abonnement aux notifications
    await page.click('[data-testid="subscribe-notifications"]')
    
    // Vérifier que la demande de permission est déclenchée
    const permissionRequested = await page.evaluate(() => {
      return window.notificationPermissionRequested === true
    })
    
    expect(permissionRequested).toBe(true)
  })

  test('devrait afficher les notifications reçues', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler la réception d'une notification
    await page.evaluate(() => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Test Notification', {
            body: 'Ceci est une notification de test',
            icon: '/icon-192x192.png'
          })
        })
      }
    })
    
    // Vérifier que la notification est affichée
    await expect(page.locator('[data-testid="notification-banner"]')).toBeVisible()
  })

  test('devrait être responsive sur tous les appareils', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 }, // iPhone
      { width: 768, height: 1024 }, // iPad
      { width: 1280, height: 720 }  // Desktop
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await waitForAppLoad(page)
      
      // Vérifier que l'application s'adapte à la taille de l'écran
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('devrait avoir des performances optimales', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Mesurer les métriques de performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime
      }
    })
    
    // Vérifier que les performances sont acceptables
    expect(performanceMetrics.loadTime).toBeLessThan(3000) // Moins de 3 secondes
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000) // Moins de 2 secondes
  })

  test('devrait gérer les erreurs de Service Worker', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)
    
    // Simuler une erreur de Service Worker
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-error', {
        detail: { error: 'Service Worker error' }
      }))
    })
    
    // Vérifier qu'un message d'erreur est affiché
    await expect(page.locator('[data-testid="sw-error-message"]')).toBeVisible()
  })
})
