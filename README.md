# TeachDigital

Application éducative familiale (PWA) : un frontend **Vue 3 + Vite 7** et une API **Node.js / Express**
adossée à **PostgreSQL**, déployés en conteneurs **Docker sur un NAS Synology**.

## 🚀 Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | Vue 3, Vite 7, Pinia, Vue Router, Tailwind CSS 4 (PostCSS), PWA (service worker généré au build) |
| Backend | Node.js, Express 4, `pg`, JWT, Zod, Helmet, Tesseract.js / fournisseurs IA (OpenAI, Gemini, Groq, Mistral, DeepSeek, Kimi, LLM local) |
| Base de données | PostgreSQL |
| Tests | Vitest (unitaires front), Jest (backend), Playwright (E2E) |
| Déploiement | Docker / Docker Compose sur Synology via `deploy.ps1` (ou `deploy-frontend.ps1`) |
| Outillage | **Node 22** (`.nvmrc`, minimum `^20.19 \|\| >=22.12` pour Vite 7), **pnpm 9.15** (`packageManager`) |

## 📦 Installation (développement)

Prérequis : Node 22 (`nvm use`) et pnpm 9.15 (`corepack enable` ou `npm i -g pnpm@9.15.9`).

```bash
# Frontend
cd frontend
pnpm install
cp .env.example .env            # aucune clé secrète côté frontend (cf. Sécurité)

# Backend
cd ../backend
pnpm install
cp env.example .env             # renseigner DB_* et JWT_SECRET
pnpm dev                        # API sur http://localhost:3001
```

Puis, dans `frontend/` : `pnpm dev` → [http://localhost:3000](http://localhost:3000).
En développement, Vite relaie `/api` vers le backend (`VITE_DEV_API_TARGET`, défaut `http://127.0.0.1:3001`).

## 🧪 Qualité et tests

Commandes à lancer dans `frontend/` (sauf mention contraire) :

```bash
pnpm run lint:check      # ESLint (sans correction) — utilisé par la CI
pnpm run lint            # ESLint avec --fix
pnpm exec vitest run     # tests unitaires frontend (pnpm test = mode watch)
pnpm run test:coverage   # couverture (src/ uniquement, pas de seuil imposé pour l'instant)
pnpm run test:e2e        # tests Playwright (cf. doc/PLAYWRIGHT-GUIDE.md)
cd backend && pnpm test  # tests Jest du backend (tests DB ignorés sans TEST_DATABASE_URL)
```

CI GitHub Actions :

- `.github/workflows/ci.yml` — à chaque push / PR : lint, tests unitaires, build frontend, tests backend.
- `.github/workflows/e2e-tests.yml` — tests Playwright.
- `.github/workflows/deploy-synology.yml` — déploiement **manuel** (`workflow_dispatch`), précédé de la CI.

## 🏗️ Build de production

```bash
cd frontend && pnpm run build
```

Génère `frontend/dist/` (Vite, minification Terser, chunks hashés) puis `dist/sw.js` (`frontend/scripts/generate-sw.js`).
L'URL publique de l'API utilisée par le build est `VITE_API_URL_PROD` (défaut dans `frontend/src/services/apiService.js`).

## 🐳 Déploiement (Docker sur Synology)

Le déploiement réel se fait depuis un poste Windows (PowerShell + Git Bash) vers le NAS via SSH
(alias `synology` dans `~/.ssh/config`) :

```powershell
.\deploy.ps1                     # backend + frontend
.\deploy.ps1 -Target backend     # backend uniquement
.\deploy.ps1 -Target frontend    # frontend uniquement (build local puis envoi de frontend/dist/)
.\deploy.ps1 -SkipBuild          # réutilise le frontend/dist/ existant
```

- **Backend** : le contenu de `backend/` est copié dans le dossier défini par `backend/.synology-deploy.json`
  (`deployPath`, cf. `backend/.synology-deploy.json.example`), puis `backend/docker-compose.yml` est
  reconstruit et relancé. Le conteneur écoute sur le port **3001** (healthcheck `/health`).
  Les secrets viennent du fichier **`.env` présent sur le NAS** à côté du compose (jamais transféré ni
  commité) — modèle : `backend/env.docker.example`.
- **Frontend** : `frontend/dist/`, `frontend/nginx.conf`, `frontend/Dockerfile.prebuilt` et
  `frontend/docker-compose.yml` sont copiés dans
  `/volume1/docker/teachdigital/frontend` (ou `frontendDeployPath` de `.synology-deploy.json`).
  L'hôte publie le port **3000** vers nginx (port 80 du conteneur), qui sert la SPA et relaie `/api/`
  vers le backend (`host.docker.internal:3001`). Le reverse proxy DSM (HTTPS) pointe vers le port 3000.
- `deploy-frontend.ps1` est l'ancien script équivalent pour le frontend seul.

Autres fichiers Docker :

- `docker-compose.app.yml` + `env.synology.example` : stack tout-en-un (PostgreSQL + backend + frontend
  [+ nginx avec `--profile production`]), non utilisée par `deploy.ps1`.
- `docker-compose.yml` (racine) + `init-supabase.sql` : stack Supabase **optionnelle et non utilisée**
  (cf. [doc/README-SUPABASE.md](doc/README-SUPABASE.md)).

Documentation complémentaire : [doc/DEPLOY-SYNOLOGY.md](doc/DEPLOY-SYNOLOGY.md),
[doc/SYNOLOGY-ENV-VARIABLES.md](doc/SYNOLOGY-ENV-VARIABLES.md),
[doc/HTTPS-SYNOLOGY-SETUP.md](doc/HTTPS-SYNOLOGY-SETUP.md)
(certains guides de `doc/` décrivent d'anciennes approches — Vercel, Neon — et sont conservés pour l'historique).

## 🔒 Sécurité / secrets

Aucun secret ne doit être commité : seuls les fichiers `*.example` sont versionnés (`frontend/.env`,
`.env.*`, `backend/.env` sont ignorés par git et exclus des images Docker).

Variables **obligatoires** côté backend (`backend/.env` en local, `.env` du NAS en production) :

| Variable | Exigence |
| --- | --- |
| `JWT_SECRET` | ≥ 32 caractères aléatoires, unique par environnement : `openssl rand -hex 32`. `docker compose` refuse de démarrer s'il est absent. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (ou `DATABASE_URL`) | Identifiants PostgreSQL dédiés à l'application, mot de passe fort. |
| `FRONTEND_URL` / `ALLOWED_ORIGIN` | Origines autorisées par CORS. |

Clés IA (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`,
`KIMI_API_KEY`) : **uniquement dans l'environnement du backend**. Ne jamais créer de variable `VITE_*`
contenant une clé : tout ce qui est préfixé `VITE_` est intégré en clair dans le JavaScript livré.

Mise en service :

1. Initialiser le code d'entrée familial (aucun code par défaut) :
   `cd backend && node scripts/init-family-gate.js <code à 4-8 chiffres>`
2. Définir les codes PIN des profils : `node scripts/init-default-pins.js <PIN>` (dans `backend/`).
3. **Changer tout code par défaut ou trivial** (ex. `1234`) : un code connu de tous donne accès à
   l'espace parent. Les PIN se modifient ensuite depuis les paramètres parent.

Si un secret a été commité par le passé, il doit être considéré comme compromis : le **changer**
(la réécriture de l'historique git ne suffit pas).

## 📁 Structure du projet

```text
teachDigital/
├── frontend/               # Application Vue 3 / Vite (PWA)
│   ├── src/                #   components, services, stores, router, config, utils...
│   ├── public/             #   assets statiques, manifest, template du service worker
│   ├── scripts/            #   build (generate-sw.js), versioning, migrations et utilitaires DB
│   ├── tests/              #   Vitest (tests/services) et Playwright (tests/e2e)
│   ├── index.html, vite.config.js, vitest.config.js, playwright.config.js, eslint.config.js
│   ├── Dockerfile, .dockerignore                           #   build complet dans Docker (docker-compose.app.yml)
│   ├── Dockerfile.prebuilt, nginx.conf, docker-compose.yml #   image frontend déployée sur le NAS
│   └── package.json, pnpm-lock.yaml, env.example           #   scripts et dépendances frontend (pnpm)
├── backend/                # API Express (server.js, api/, controllers/, lib/, scripts/, tests/, Dockerfile, docker-compose.yml)
├── doc/                    # Documentation détaillée
├── .github/workflows/      # CI, E2E, déploiement manuel Synology
├── deploy.ps1              # Déploiement Synology (backend + frontend)
├── deploy-frontend.ps1     # Déploiement Synology (frontend seul, historique)
├── docker-compose.app.yml, nginx.conf, env.synology.example   # stack tout-en-un (PostgreSQL + backend + frontend)
├── docker-compose.yml, init-supabase.sql                     # stack Supabase optionnelle (non utilisée)
└── .nvmrc, .gitignore, .gitattributes, README.md
```

## 📝 Scripts utiles

À lancer dans `frontend/` :

- `pnpm run dev` / `pnpm run build` / `pnpm run preview`
- `pnpm run generate-icons`, `pnpm run validate-manifest`
- `pnpm run version:patch|minor|major` — gestion de version (cf. [doc/VERSION-MANAGEMENT.md](doc/VERSION-MANAGEMENT.md))
- Scripts de migration / maintenance DB : `pnpm run init-db`, `migrate-db`, `migrate-pins`, `migrate-teens`,
  `migrate-lessons`, `migrate-badges`, `migrate:audit-logs` (variables DB dans `frontend/.env`, cf. `frontend/env.example`)
- `pnpm run audit` / `pnpm run security:check` — audit des dépendances + lint
- `pnpm run build:analyze`, `pnpm run bundle:analyze`, `pnpm run lighthouse` — analyse de performance

## ⚡ Performance

Les travaux d'optimisation (code splitting, lazy loading, cache) sont documentés dans :
[doc/OPTIMIZATIONS-README.md](doc/OPTIMIZATIONS-README.md),
[doc/OPTIMIZATIONS-SUMMARY.md](doc/OPTIMIZATIONS-SUMMARY.md),
[doc/BUNDLE-SIZE-OPTIMIZATION.md](doc/BUNDLE-SIZE-OPTIMIZATION.md),
[doc/PERFORMANCE-OPTIMIZATIONS-2024.md](doc/PERFORMANCE-OPTIMIZATIONS-2024.md),
[doc/QUICK-PERFORMANCE-CHECK.md](doc/QUICK-PERFORMANCE-CHECK.md).
Pour mesurer l'état actuel : `pnpm run build:analyze` et `pnpm run lighthouse` (sur `pnpm preview`).

## 🤝 Contribution

1. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
2. Vérifier localement (dans `frontend/`) : `pnpm run lint:check && pnpm exec vitest run && pnpm run build`
3. Ouvrir une Pull Request (la CI doit passer)

## 📄 Licence

Ce projet est sous licence MIT.
