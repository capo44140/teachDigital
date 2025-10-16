import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour tests manuels
 * Le serveur doit être démarré manuellement avec: pnpm dev
 */
export default defineConfig({
  // Répertoire de base pour les tests
  testDir: './tests/e2e',
  
  // Exécuter les tests en parallèle
  fullyParallel: true,
  
  // Échec du build sur CI si vous laissez test.only dans le code source
  forbidOnly: !!process.env.CI,
  
  // Retry sur CI seulement
  retries: process.env.CI ? 2 : 0,
  
  // Nombre de workers sur CI
  workers: process.env.CI ? 1 : undefined,
  
  // Configuration des rapports
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  // Configuration globale des tests
  use: {
    // URL de base pour les tests
    baseURL: 'http://localhost:5173',
    
    // Collecter les traces en cas d'échec
    trace: 'on-first-retry',
    
    // Prendre des captures d'écran en cas d'échec
    screenshot: 'only-on-failure',
    
    // Enregistrer les vidéos en cas d'échec
    video: 'retain-on-failure',
    
    // Timeout pour les actions
    actionTimeout: 10000,
    
    // Timeout pour la navigation
    navigationTimeout: 30000,
  },

  // Configuration des projets (navigateurs)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Tests sur mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tests sur tablette
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Pas de serveur automatique - doit être démarré manuellement
  // webServer: {
  //   command: 'pnpm dev --port 5173',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },

  // Répertoires à ignorer
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**'
  ],

  // Timeout global pour les tests
  timeout: 30000,
  
  // Timeout pour chaque assertion
  expect: {
    timeout: 5000,
  },

  // Configuration des outputs
  outputDir: 'test-results/',
  
  // Configuration des snapshots
  snapshotDir: 'tests/snapshots',
})
