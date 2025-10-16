# Tests End-to-End avec Playwright

Ce dossier contient les tests end-to-end (E2E) pour l'application TeachDigital utilisant Playwright.

## Structure des Tests

```
tests/e2e/
├── auth/                    # Tests d'authentification
│   ├── profile-selection.spec.js
│   └── pin-authentication.spec.js
├── dashboard/               # Tests des dashboards
│   ├── parent-dashboard.spec.js
│   └── user-dashboard.spec.js
├── youtube/                 # Tests du visualiseur YouTube Kids
│   └── youtube-kids-viewer.spec.js
├── pwa/                     # Tests des fonctionnalités PWA
│   └── pwa-functionality.spec.js
├── profile/                 # Tests de gestion des profils
│   └── profile-management.spec.js
├── utils/                   # Utilitaires et helpers
│   ├── test-helpers.js
│   └── fixtures.js
└── README.md               # Ce fichier
```

## Commandes Disponibles

### Tests E2E
```bash
# Exécuter tous les tests E2E
pnpm test:e2e

# Exécuter avec interface utilisateur
pnpm test:e2e:ui

# Exécuter en mode visible (headed)
pnpm test:e2e:headed

# Exécuter en mode debug
pnpm test:e2e:debug

# Afficher le rapport des tests
pnpm test:e2e:report

# Installer les navigateurs Playwright
pnpm test:e2e:install
```

### Tests par Catégorie
```bash
# Tests d'authentification
pnpm test:e2e:auth

# Tests des dashboards
pnpm test:e2e:dashboard

# Tests YouTube Kids
pnpm test:e2e:youtube

# Tests PWA
pnpm test:e2e:pwa

# Tests de gestion des profils
pnpm test:e2e:profile
```

### Tests Complets
```bash
# Exécuter tous les tests (unitaires + E2E)
pnpm test:all
```

## Configuration

La configuration Playwright se trouve dans `playwright.config.js` à la racine du projet.

### Navigateurs Testés
- **Chromium** (Desktop Chrome)
- **Firefox** (Desktop Firefox)
- **WebKit** (Desktop Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)
- **iPad** (iPad Pro)

### Variables d'Environnement
- `CI`: Mode CI/CD (retry automatique, 1 worker)
- `BASE_URL`: URL de base pour les tests (défaut: http://localhost:5173)

## Utilitaires de Test

### test-helpers.js
Fonctions utilitaires pour les tests :
- `waitForAppLoad()`: Attendre que l'application soit chargée
- `loginAsParent()`: Se connecter en tant que parent
- `loginAsChild()`: Se connecter en tant qu'enfant
- `createTestProfile()`: Créer un profil de test
- `waitForStableElement()`: Attendre qu'un élément soit stable
- `expectNotification()`: Vérifier une notification
- `waitForYouTubeVideo()`: Attendre qu'une vidéo YouTube soit chargée

### fixtures.js
Données de test et constantes :
- `testProfiles`: Profils de test (parent, enfant, adolescent)
- `testQuizzes`: Quiz de test
- `testLessons`: Leçons de test
- `testYouTubeVideos`: URLs de vidéos YouTube de test
- `selectors`: Sélecteurs CSS pour les tests
- `errorMessages`: Messages d'erreur attendus
- `successMessages`: Messages de succès attendus

## Bonnes Pratiques

### 1. Sélecteurs de Test
Utilisez des attributs `data-testid` pour identifier les éléments :
```html
<button data-testid="login-button">Se connecter</button>
```

### 2. Attentes et Assertions
```javascript
// Vérifier la visibilité
await expect(page.locator('[data-testid="element"]')).toBeVisible()

// Vérifier le contenu
await expect(page.locator('[data-testid="element"]')).toContainText('Texte attendu')

// Vérifier l'URL
await expect(page).toHaveURL(/.*dashboard.*/)
```

### 3. Gestion des Erreurs
```javascript
// Intercepter les requêtes API
await page.route('**/api/**', route => {
  route.fulfill({
    status: 500,
    body: JSON.stringify({ error: 'Erreur serveur' })
  })
})
```

### 4. Tests Responsive
```javascript
// Tester sur mobile
await page.setViewportSize({ width: 375, height: 667 })
```

### 5. Accessibilité
```javascript
// Navigation au clavier
await page.keyboard.press('Tab')
await expect(page.locator('[data-testid="element"]')).toBeFocused()
```

## Débogage

### Mode Debug
```bash
pnpm test:e2e:debug
```

### Mode Headed
```bash
pnpm test:e2e:headed
```

### Interface Utilisateur
```bash
pnpm test:e2e:ui
```

### Captures d'Écran
Les captures d'écran sont automatiquement prises en cas d'échec et sauvegardées dans `test-results/`.

### Vidéos
Les vidéos des tests en échec sont sauvegardées dans `test-results/`.

### Traces
Les traces Playwright sont générées pour les tests en échec et peuvent être visualisées avec :
```bash
npx playwright show-trace test-results/trace.zip
```

## Intégration CI/CD

### GitHub Actions
```yaml
- name: Install Playwright
  run: pnpm test:e2e:install

- name: Run E2E tests
  run: pnpm test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

### Variables d'Environnement CI
- `CI=true`: Active le mode CI (retry, 1 worker)
- `PLAYWRIGHT_BROWSERS_PATH`: Chemin vers les navigateurs

## Maintenance

### Mise à Jour des Tests
1. Mettre à jour les sélecteurs si l'UI change
2. Ajouter de nouveaux tests pour les nouvelles fonctionnalités
3. Maintenir les données de test à jour

### Performance
- Les tests doivent s'exécuter en moins de 5 minutes
- Utiliser `page.waitForLoadState()` pour les pages lentes
- Éviter les `page.waitForTimeout()` sauf cas exceptionnels

### Fiabilité
- Utiliser des sélecteurs stables (`data-testid`)
- Attendre que les éléments soient visibles avant interaction
- Nettoyer les données de test entre les tests
