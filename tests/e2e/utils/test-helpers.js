/**
 * Utilitaires et helpers pour les tests Playwright de TeachDigital
 */

/**
 * Attendre que l'application soit complètement chargée
 * @param {import('@playwright/test').Page} page
 */
export async function waitForAppLoad(page) {
  // Attendre que la page soit complètement chargée
  await page.waitForLoadState('networkidle')
  
  // Attendre que l'élément racine de l'application soit présent
  await page.waitForSelector('#app', { state: 'attached', timeout: 10000 })
  
  // Attendre que Vue soit monté (vérifier la présence d'éléments Vue)
  await page.waitForFunction(() => {
    const app = document.querySelector('#app')
    return app && app.children.length > 0
  }, { timeout: 10000 })
  
  // Attendre un peu pour que l'application soit stable
  await page.waitForTimeout(500)
}

/**
 * Se connecter en tant que profil parent
 * @param {import('@playwright/test').Page} page
 * @param {string} pin - Code PIN du parent
 */
export async function loginAsParent(page, pin = '1234') {
  // Aller à la page de sélection de profil
  await page.goto('/')
  await waitForAppLoad(page)
  
  // Sélectionner le profil parent
  await page.click('[data-testid="profile-parent"]')
  
  // Attendre la page de verrouillage PIN
  await page.waitForURL('**/pin-lock**')
  
  // Saisir le code PIN
  await page.fill('[data-testid="pin-input"]', pin)
  await page.click('[data-testid="pin-submit"]')
  
  // Attendre la redirection vers le dashboard
  await page.waitForURL('**/dashboard**')
}

/**
 * Se connecter en tant que profil enfant
 * @param {import('@playwright/test').Page} page
 * @param {string} profileName - Nom du profil enfant
 */
export async function loginAsChild(page, profileName = 'Enfant') {
  await page.goto('/')
  await waitForAppLoad(page)
  
  // Sélectionner le profil enfant
  await page.click(`[data-testid="profile-${profileName.toLowerCase()}"]`)
  
  // Attendre la redirection vers le dashboard utilisateur
  await page.waitForURL('**/user-dashboard**')
}

/**
 * Créer un profil de test
 * @param {import('@playwright/test').Page} page
 * @param {Object} profileData - Données du profil
 */
export async function createTestProfile(page, profileData) {
  await page.goto('/manage-profiles?profile=1&unlocked=true')
  await waitForAppLoad(page)
  
  // Cliquer sur le bouton d'ajout de profil
  await page.click('[data-testid="add-profile-button"]')
  
  // Remplir le formulaire
  await page.fill('[data-testid="profile-name"]', profileData.name)
  await page.selectOption('[data-testid="profile-type"]', profileData.type)
  
  if (profileData.age) {
    await page.fill('[data-testid="profile-age"]', profileData.age.toString())
  }
  
  // Sauvegarder
  await page.click('[data-testid="save-profile"]')
  
  // Attendre la confirmation
  await page.waitForSelector('[data-testid="success-message"]')
}

/**
 * Attendre qu'un élément soit visible et stable
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} timeout
 */
export async function waitForStableElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
  
  // Attendre que l'élément soit stable (pas d'animations)
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel)
      if (!element) return false
      
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    },
    selector,
    { timeout: 2000 }
  )
}

/**
 * Simuler une interaction tactile sur mobile
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function mobileTap(page, selector) {
  await page.tap(selector)
  // Attendre un peu pour que l'interaction soit traitée
  await page.waitForTimeout(100)
}

/**
 * Vérifier qu'une notification est affichée
 * @param {import('@playwright/test').Page} page
 * @param {string} message - Message attendu
 */
export async function expectNotification(page, message) {
  const notification = page.locator('[data-testid="notification"]')
  await expect(notification).toBeVisible()
  await expect(notification).toContainText(message)
}

/**
 * Attendre qu'une vidéo YouTube soit chargée
 * @param {import('@playwright/test').Page} page
 */
export async function waitForYouTubeVideo(page) {
  // Attendre que l'iframe YouTube soit chargée
  await page.waitForSelector('iframe[src*="youtube.com"]', { timeout: 10000 })
  
  // Attendre que la vidéo soit prête
  await page.waitForFunction(() => {
    const iframe = document.querySelector('iframe[src*="youtube.com"]')
    return iframe && iframe.contentDocument?.readyState === 'complete'
  }, { timeout: 15000 })
}

/**
 * Simuler une connexion réseau lente
 * @param {import('@playwright/test').Page} page
 */
export async function simulateSlowNetwork(page) {
  await page.route('**/*', async (route) => {
    // Ajouter un délai de 2 secondes à toutes les requêtes
    await new Promise(resolve => setTimeout(resolve, 2000))
    await route.continue()
  })
}

/**
 * Capturer une métrique de performance
 * @param {import('@playwright/test').Page} page
 * @param {string} metricName
 */
export async function capturePerformanceMetric(page, metricName) {
  const metric = await page.evaluate((name) => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const entry = entries.find(e => e.name === name)
        if (entry) {
          resolve(entry.duration)
        }
      })
      observer.observe({ entryTypes: ['measure'] })
      
      // Déclencher la mesure
      performance.mark(`${name}-start`)
      setTimeout(() => {
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
      }, 100)
    })
  }, metricName)
  
  return metric
}

/**
 * Vérifier l'accessibilité d'un élément
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function checkAccessibility(page, selector) {
  const element = page.locator(selector)
  
  // Vérifier que l'élément a un attribut aria-label ou aria-labelledby
  const ariaLabel = await element.getAttribute('aria-label')
  const ariaLabelledBy = await element.getAttribute('aria-labelledby')
  
  if (!ariaLabel && !ariaLabelledBy) {
    // Vérifier s'il y a un texte visible
    const text = await element.textContent()
    if (!text || text.trim() === '') {
      throw new Error(`L'élément ${selector} n'a pas d'accessibilité appropriée`)
    }
  }
}

/**
 * Nettoyer les données de test
 * @param {import('@playwright/test').Page} page
 */
export async function cleanupTestData(page) {
  try {
    // Supprimer les données de localStorage (seulement si la page est chargée)
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear()
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear()
      }
    })
  } catch (error) {
    // Ignorer les erreurs de sécurité si la page n'est pas encore chargée
    console.log('Nettoyage des données de test ignoré:', error.message)
  }
  
  // Supprimer les cookies
  await page.context().clearCookies()
}

/**
 * Attendre qu'une animation soit terminée
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function waitForAnimationEnd(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel)
      if (!element) return true
      
      const style = window.getComputedStyle(element)
      return style.animationPlayState === 'paused' || 
             style.animationPlayState === 'running' && 
             style.animationDuration === '0s'
    },
    selector,
    { timeout: 5000 }
  )
}
