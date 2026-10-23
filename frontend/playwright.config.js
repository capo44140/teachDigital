import { defineConfig, devices } from '@playwright/test'

/**
 * Tests E2E de TeachDigital (tests/e2e) : parcours critiques sur le serveur de développement
 * Vite, avec l'API entièrement simulée par page.route (aucun backend ni base de données).
 *
 * Navigateur : Chromium de Playwright (CI : `playwright install --with-deps chromium`).
 * En local sans navigateur Playwright installé, utiliser un navigateur du système :
 *   E2E_BROWSER_CHANNEL=msedge  (ou chrome)
 * @see https://playwright.dev/docs/test-configuration
 */
const PORT = Number(process.env.E2E_PORT) || 5173
const BASE_URL = `http://127.0.0.1:${PORT}`
const channel = process.env.E2E_BROWSER_CHANNEL || undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/results.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    // Le Service Worker (cache hors ligne) court-circuiterait page.route
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Vidéo : nécessite le ffmpeg de Playwright (absent avec un navigateur du système)
    video: channel ? 'off' : 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel }
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], channel }
    }
  ],

  // Serveur de développement Vite (le proxy /api n'est jamais atteint : tout est intercepté)
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // BROWSER=none : Vite n'ouvre pas d'onglet (server.open dans vite.config.js)
    env: { BROWSER: 'none' },
    stdout: 'ignore',
    stderr: 'pipe'
  },

  timeout: 30000,
  expect: {
    timeout: 7000
  },
  outputDir: 'test-results/'
})
