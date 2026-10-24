import { test, expect } from '@playwright/test'
import { mockApi, seedFamilySession, ok, parentToken, PARENT, CHILD } from './support/api.js'

/**
 * Thèmes de l'application (src/stores/themeStore.js) : thème de la famille choisi par le parent,
 * thème propre à chaque enfant, persistance et application avant le premier rendu.
 */
test.describe('Thèmes de l\'application', () => {
  test.beforeEach(async ({ page }) => {
    await seedFamilySession(page)
  })

  test('le parent choisit le thème de la famille et celui d\'un enfant', async ({ page }) => {
    await mockApi(page, [
      ['POST', '/api/auth/login', () => ok({ token: parentToken(), profile: { id: PARENT.id, name: PARENT.name, isAdmin: true } })]
    ])
    const html = page.locator('html')

    // Connexion parent (PIN) → Paramètres → Thèmes de l'application
    await page.goto('/')
    await page.getByRole('button', { name: `${PARENT.name} (parent, code PIN demandé)` }).click()
    const pin = page.getByLabel(`Code PIN du profil ${PARENT.name}`, { exact: true })
    await pin.fill('482913')
    await pin.press('Enter')
    await expect(page).toHaveURL(/\/dashboard/)
    await page.getByRole('button', { name: /^Paramètres/ }).click()
    await page.getByRole('button', { name: 'Personnaliser les thèmes de l\'application' }).click()
    await expect(page.getByRole('heading', { name: 'Thèmes de l\'application' })).toBeVisible()
    await expect(html).toHaveAttribute('data-app-theme', 'liquid-glass')

    // Thème de la famille : appliqué tout de suite à l'espace parent
    const familyGroup = page.getByRole('group', { name: 'Thème de la famille' })
    await familyGroup.locator('label', { hasText: 'Pat\' Patrouille' }).click()
    await expect(familyGroup.getByRole('radio', { name: /Pat' Patrouille/ })).toBeChecked()
    await expect(html).toHaveAttribute('data-app-theme', 'paw-patrol')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0D47A1')

    // Thème propre à l'enfant
    await page.getByLabel(`Thème de ${CHILD.name}`).selectOption('netflix')
    await expect(page.getByText('Enfant · 🍿 Netflix')).toBeVisible()
    // L'espace parent garde le thème de la famille
    await expect(html).toHaveAttribute('data-app-theme', 'paw-patrol')

    // Dans l'espace de l'enfant : son thème
    await page.goto(`/user-dashboard?profile=${CHILD.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(`Salut ${CHILD.name}`) })).toBeVisible()
    await expect(html).toHaveAttribute('data-app-theme', 'netflix')
  })

  test('l\'enfant choisit son thème : appliqué à son espace et gardé au rechargement', async ({ page }) => {
    await mockApi(page)
    const html = page.locator('html')

    await page.goto(`/child-settings?profile=${CHILD.id}`)
    const group = page.getByRole('group', { name: 'Choisis ton thème' })
    await expect(group.getByRole('radio', { name: /Comme ma famille/ })).toBeChecked()

    await group.locator('label', { hasText: 'Desperate Housewives' }).click()
    await expect(html).toHaveAttribute('data-app-theme', 'desperate-housewives')
    // Ce thème n'utilise pas la couleur préférée : le choix de couleur disparaît
    await expect(page.getByRole('group', { name: 'Choisis ta couleur préférée' })).toHaveCount(0)

    await page.reload()
    await expect(html).toHaveAttribute('data-app-theme', 'desperate-housewives')
    await expect(group.getByRole('radio', { name: /Desperate Housewives/ })).toBeChecked()

    // Pat' Patrouille : la couleur préférée devient le chiot préféré
    await group.locator('label', { hasText: 'Pat\' Patrouille' }).click()
    await expect(html).toHaveAttribute('data-app-theme', 'paw-patrol')
    await expect(page.getByRole('group', { name: 'Choisis ton chiot préféré' }).getByRole('button', { name: /Chase/ })).toBeVisible()

    // Hors de l'espace de l'enfant : thème de la famille
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Qui est-ce ?' })).toBeVisible()
    await expect(html).toHaveAttribute('data-app-theme', 'liquid-glass')
  })

  test('rechargement d\'une page enfant : son thème d\'emblée, sans passer par celui de la famille', async ({ page }) => {
    await page.addInitScript((childId) => {
      window.localStorage.setItem('teachdigital_theme', JSON.stringify({
        family: 'netflix',
        profiles: { [childId]: 'paw-patrol' },
        applied: 'paw-patrol',
        appliedColor: '#0D47A1'
      }))
      // Journal de toutes les valeurs prises par data-app-theme pendant le chargement
      // (le document est observé : <html> n'existe pas encore quand ce script s'exécute)
      window.__appliedThemes = []
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          window.__appliedThemes.push(mutation.oldValue, mutation.target.getAttribute('data-app-theme'))
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-app-theme'], attributeOldValue: true })
    }, CHILD.id)
    await mockApi(page)

    await page.goto(`/user-dashboard?profile=${CHILD.id}`)
    await expect(page.getByRole('heading', { name: new RegExp(`Salut ${CHILD.name}`) })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-app-theme', 'paw-patrol')
    const appliedThemes = await page.evaluate(() => window.__appliedThemes)
    // Posé par public/theme-boot.js, puis jamais remplacé par le thème de la famille
    expect(appliedThemes).toContain('paw-patrol')
    expect(appliedThemes).not.toContain('netflix')
  })

  test('le thème enregistré est posé avant le premier rendu (public/theme-boot.js)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('teachdigital_theme', JSON.stringify({ family: 'netflix', applied: 'netflix', appliedColor: '#141414' }))
    })
    await mockApi(page)
    // Application bloquée : seul le script de démarrage du thème s'exécute
    await page.route('**/src/main.js*', route => route.abort())

    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-app-theme', 'netflix')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#141414')
  })
})
