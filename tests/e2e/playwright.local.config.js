import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour les tests locaux
 * Optimisée pour le développement et les tests rapides
 */
export default defineConfig({
  // Répertoire de base pour les tests
  testDir: './tests/e2e',
  
  // Exécuter les tests en parallèle
  fullyParallel: true,
  
  // Pas de retry en local
  retries: 0,
  
  // Nombre de workers pour les tests locaux
  workers: 2,
  
  // Configuration des rapports
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
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
    actionTimeout: 5000,
    
    // Timeout pour la navigation
    navigationTimeout: 15000,
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
  ],

  // Serveur de développement local
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60 * 1000, // 1 minute
  },

  // Timeout global pour les tests
  timeout: 15000,
  
  // Timeout pour chaque assertion
  expect: {
    timeout: 3000,
  },

  // Configuration des outputs
  outputDir: 'test-results/',
})
