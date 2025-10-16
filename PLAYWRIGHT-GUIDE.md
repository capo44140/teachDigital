# Guide Playwright - TeachDigital

## 🚀 Démarrage Rapide

### 1. Installation
```bash
# Les dépendances sont déjà installées
pnpm test:e2e:install
```

### 2. Démarrer le serveur de développement
```bash
# Dans un terminal
pnpm dev
```

### 3. Lancer les tests
```bash
# Tests avec serveur automatique
pnpm test:e2e

# Tests avec serveur manuel (recommandé)
pnpm test:e2e:manual

# Tests avec interface utilisateur
pnpm test:e2e:ui:manual

# Tests en mode visible
pnpm test:e2e:headed
```

## 📋 Commandes Disponibles

### Tests E2E
```bash
pnpm test:e2e              # Tous les tests (serveur auto)
pnpm test:e2e:manual       # Tous les tests (serveur manuel)
pnpm test:e2e:ui           # Interface utilisateur
pnpm test:e2e:headed       # Mode visible
pnpm test:e2e:debug        # Mode debug
pnpm test:e2e:report       # Afficher le rapport
```

### Tests par Catégorie
```bash
pnpm test:e2e:auth         # Authentification
pnpm test:e2e:dashboard    # Dashboards
pnpm test:e2e:youtube      # YouTube Kids
pnpm test:e2e:pwa          # PWA
pnpm test:e2e:profile      # Gestion des profils
```

### Tests Complets
```bash
pnpm test:all              # Unitaires + E2E
```

## 🛠️ Configuration

### Fichiers de Configuration
- `playwright.config.js` - Configuration principale (serveur auto)
- `playwright.manual.config.js` - Configuration manuelle (recommandée)
- `playwright.local.config.js` - Configuration locale optimisée

### Navigateurs Testés
- **Desktop** : Chrome, Firefox, Safari
- **Mobile** : Chrome Mobile, Safari Mobile
- **Tablette** : iPad

## 🧪 Structure des Tests

```
tests/e2e/
├── auth/                    # Tests d'authentification
├── dashboard/               # Tests des dashboards
├── youtube/                 # Tests YouTube Kids
├── pwa/                     # Tests PWA
├── profile/                 # Tests de gestion des profils
├── utils/                   # Utilitaires et helpers
└── smoke-test.spec.js       # Test de fumée
```

## 🔧 Utilitaires de Test

### Helpers Disponibles
```javascript
import { 
  waitForAppLoad, 
  loginAsParent, 
  loginAsChild,
  createTestProfile,
  waitForStableElement,
  expectNotification,
  waitForYouTubeVideo,
  cleanupTestData
} from './utils/test-helpers.js'
```

### Fixtures Disponibles
```javascript
import { 
  testProfiles,
  testQuizzes,
  selectors,
  errorMessages,
  successMessages
} from './utils/fixtures.js'
```

## 🐛 Débogage

### Mode Debug
```bash
pnpm test:e2e:debug
```

### Mode Visible
```bash
pnpm test:e2e:headed
```

### Interface Utilisateur
```bash
pnpm test:e2e:ui:manual
```

### Rapports
```bash
pnpm test:e2e:report
```

## 📊 Résultats des Tests

### Captures d'Écran
- Automatiques en cas d'échec
- Sauvegardées dans `test-results/`

### Vidéos
- Enregistrées en cas d'échec
- Sauvegardées dans `test-results/`

### Traces
- Générées pour les tests en échec
- Visualisables avec `npx playwright show-trace`

### Fichiers Ignorés par Git
Les rapports et artefacts de test sont automatiquement ignorés :
- `test-results/` - Résultats des tests
- `playwright-report/` - Rapports HTML
- `playwright/.cache/` - Cache Playwright
- `blob-report/` - Rapports blob
- `coverage/` - Rapports de couverture

## 🔄 Intégration CI/CD

### GitHub Actions
Le workflow est configuré dans `.github/workflows/e2e-tests.yml`

### Variables d'Environnement
- `CI=true` : Active le mode CI (retry, 1 worker)
- `BASE_URL` : URL de base pour les tests

## 📝 Bonnes Pratiques

### 1. Sélecteurs de Test
```html
<!-- ✅ Bon -->
<button data-testid="login-button">Se connecter</button>

<!-- ❌ Éviter -->
<button class="btn-primary">Se connecter</button>
```

### 2. Attentes et Assertions
```javascript
// ✅ Bon
await expect(page.locator('[data-testid="element"]')).toBeVisible()
await expect(page).toHaveURL(/.*dashboard.*/)

// ❌ Éviter
await page.waitForTimeout(1000)
```

### 3. Gestion des Erreurs
```javascript
// ✅ Bon
await page.route('**/api/**', route => {
  route.fulfill({
    status: 500,
    body: JSON.stringify({ error: 'Erreur serveur' })
  })
})
```

### 4. Tests Responsive
```javascript
// ✅ Bon
await page.setViewportSize({ width: 375, height: 667 })
```

### 5. Accessibilité
```javascript
// ✅ Bon
await page.keyboard.press('Tab')
await expect(page.locator('[data-testid="element"]')).toBeFocused()
```

## 🚨 Résolution de Problèmes

### Erreur "Process from config.webServer exited early"
```bash
# Solution : Utiliser le mode manuel
pnpm test:e2e:manual
```

### Erreur "SecurityError: Failed to read localStorage"
```bash
# Solution : Les helpers ont été corrigés
# Utiliser waitForLoadState('networkidle') au lieu de waitForAppLoad()
```

### Tests qui échouent de manière intermittente
```bash
# Solution : Augmenter les timeouts
# Utiliser waitForStableElement() pour les éléments animés
```

### Problèmes de performance
```bash
# Solution : Réduire le nombre de workers
# Utiliser --workers=1 pour les tests lents
```

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Guide des sélecteurs](https://playwright.dev/docs/selectors)
- [API de test](https://playwright.dev/docs/api/class-test)
- [Configuration](https://playwright.dev/docs/test-configuration)

## 🎯 Prochaines Étapes

1. **Ajouter des tests spécifiques** à vos fonctionnalités
2. **Configurer les sélecteurs** `data-testid` dans vos composants
3. **Intégrer dans votre workflow** de développement
4. **Configurer les tests CI/CD** pour votre déploiement

## 💡 Conseils

- Commencez par les tests de fumée
- Ajoutez des tests pour les fonctionnalités critiques
- Utilisez l'interface utilisateur pour développer les tests
- Gardez les tests simples et maintenables
- Documentez les cas de test complexes
