# TeachDigital — Frontend

Application Vue 3 + Vite 7 (PWA). Toutes les commandes ci-dessous se lancent **dans ce dossier**.

```bash
pnpm install
cp .env.example .env     # variables VITE_* uniquement (aucun secret)
pnpm dev                 # http://localhost:3000, /api relayé vers le backend (127.0.0.1:3001)
pnpm run build           # dist/ + dist/sw.js (scripts/generate-sw.js)
pnpm run lint:check      # ESLint
pnpm exec vitest run     # tests unitaires (tests/services)
pnpm run test:e2e        # Playwright (tests/e2e)
```

## Contenu

- `src/` — composants, services, stores Pinia, router, config, utils
- `public/` — assets statiques, `manifest.json`, template du service worker `sw.js`
- `scripts/` — build (`generate-sw.js`, `generate-icons.js`), versioning, migrations / utilitaires DB
  (ceux-ci lisent `DATABASE_URL` dans `frontend/.env` et, pour certains, `../backend/lib/database.js`)
- `tests/` — Vitest (`tests/services`) et Playwright (`tests/e2e`)
- `Dockerfile` + `.dockerignore` — build complet dans Docker (utilisé par `../docker-compose.app.yml`)
- `Dockerfile.prebuilt`, `nginx.conf`, `docker-compose.yml` — image déployée sur le NAS à partir de `dist/`
  (envoyés par `../deploy.ps1` ou `../deploy-frontend.ps1`)

Le backend (API Express) vit dans `../backend/` ; la documentation générale est dans `../README.md` et `../doc/`.
