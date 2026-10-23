# TeachDigital — Frontend

Application Vue 3 + Vite 7 (PWA). Toutes les commandes ci-dessous se lancent **dans ce dossier**.

```bash
pnpm install
cp .env.example .env     # variables VITE_* uniquement (aucun secret : elles sont publiées dans le JS)
pnpm dev                 # http://localhost:3000, /api relayé vers le backend (VITE_DEV_API_TARGET, défaut 127.0.0.1:3001)
pnpm run build           # dist/ + dist/version.json + dist/sw.js (scripts/generate-sw.js)
pnpm run lint:check      # ESLint
pnpm exec vitest run     # tests unitaires et de composants (tests/)
pnpm run test:coverage   # idem + seuils de couverture de vitest.config.js (utilisé par la CI)
pnpm exec playwright test  # E2E Playwright (tests/e2e) ; sans navigateur Playwright : E2E_BROWSER_CHANNEL=msedge
```

Variables : `VITE_API_URL` (développement, vide = proxy Vite), `VITE_DEV_API_TARGET` (cible du
proxy) et `VITE_API_URL_PROD` (build de production ; vide par défaut = même origine que la page,
à ne définir que pour forcer une autre origine). Le modèle commenté est `env.example`.

## Contenu

- `src/views/` — écrans cibles d'une route, tous chargés à la demande par `src/router/index.js`
  (le guard vérifie la session famille, l'accès parent et le profil enfant)
- `src/components/` — composants partagés (`AppBackground`, `BaseModal`, `ConfirmDialog`,
  `PinPad`, `OfflineBanner`, `InstallAppCard`, `UpdateNotification`, `ToastContainer`…) et par
  domaine (`quiz/`, `lesson-scanner/`, `course-pages/`, `badges/`, `dashboard/`, `notifications/`, `progress/`)
- `src/composables/` — `useParentNavigation`, `useQuizGeneration`, `useConfirm`
- `src/services/` — `apiService.js` est uniquement le client HTTP (jetons, erreurs `ApiError`,
  délais). Chaque domaine a son service : `authService`, `lessonService`, `coursePageService`,
  `profile/profileService`, `activityService`, `badgeService`, `youtubeVideoService`,
  `aiService`, `auditLogService`, `notificationService`… ; plus les sessions (`familyGateService`, `sessionService`,
  `parentAccessService`), la PWA (`installService`, `updateService`) et
  `clientErrorReporter`
- `src/stores/` — Pinia : `profileStore`, `badgeStore`, `settingsStore` (préférences d'affichage
  des enfants, appliquées par `src/styles/preferences.css`), `toastStore`, `onboardingStore`, `notificationStore` (notifications du parent : compteur de la cloche du tableau de bord)
- `src/styles/` — `liquid-glass.css` (variables et cartes partagées), `preferences.css` ;
  `src/utils/` (`apiErrors`, `jwt`, `pinPolicy`, `sanitizeHtml`…), `src/constants/`, `src/config/`
- `public/` — assets statiques, `manifest.json`, modèle du service worker `sw.js`
- `scripts/` — build (`generate-sw.js`, `generate-icons.js`, `validate-manifest.js`), versioning
  (`version-bump.js`, hooks git), analyse (`analyze-bundle.js`), mise à jour des dépendances.
  Aucun script n'accède à la base : le schéma est géré par `../backend/migrations/`.
- `tests/` — Vitest (`tests/services`, `tests/components`, `tests/stores`, `tests/utils`) et
  Playwright (`tests/e2e`, API simulée, voir `tests/e2e/README.md`)
- `Dockerfile` + `.dockerignore` — build complet dans Docker (utilisé par `../docker-compose.app.yml`)
- `Dockerfile.prebuilt`, `nginx.conf`, `docker-compose.yml` — image déployée sur le NAS à partir de
  `dist/` (envoyés par `../deploy.ps1`). `nginx.conf` est un modèle : seules les variables
  `NGINX_*` y sont substituées au démarrage. Il porte la CSP de l'application et relaie `/api/`
  vers `http://backend:3001`.

Le backend (API Express) vit dans `../backend/`. La documentation générale est dans
`../README.md` et `../doc/`.
