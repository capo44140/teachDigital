# TeachDigital

Application éducative familiale (PWA). Le frontend est en **Vue 3 + Vite 7**, l'API en
**Node.js / Express** sur **PostgreSQL**. Les deux tournent en conteneurs **Docker sur un NAS
Synology**.

> 🔄 Mise en production de cette version sur un NAS déjà installé : suivre la checklist
> [« Mise à jour du déploiement »](doc/DEPLOY-SYNOLOGY.md#-mise-à-jour-du-déploiement-première-livraison-de-cette-version)
> (réseau Docker, ports, nginx, migrations, `.env`).

## 🚀 Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | Vue 3, Vite 7, Pinia, Vue Router, Tailwind CSS 4 (PostCSS), DOMPurify, PWA (service worker unique, généré au build), thèmes au choix (polices auto-hébergées Fontsource) |
| Backend | Node.js, Express 4, `pg`, JWT, Zod, Helmet, busboy ; OCR Tesseract.js et fournisseurs IA (LLM local, OpenAI, Gemini, DeepSeek, Groq, Mistral, Kimi, OpenRouter) |
| Base de données | PostgreSQL, schéma versionné par des migrations SQL (`backend/migrations/`) |
| Tests | Vitest + Vue Test Utils (frontend), Jest (backend, unitaires et intégration PostgreSQL), Playwright (E2E, API simulée) |
| Déploiement | Docker Compose sur Synology via `deploy.ps1` (nginx du frontend → backend sur un réseau Docker dédié) |
| Outillage | **Node 22** (`.nvmrc` ; minimum `^20.19 \|\| >=22.12` pour Vite 7), **pnpm 9.15** (`packageManager`) |

## 📦 Installation (développement)

Prérequis : Node 22 (`nvm use`), pnpm 9.15 (`corepack enable` ou `npm i -g pnpm@9.15.9`) et un
PostgreSQL local, avec une base et un utilisateur dédiés.

```bash
# Backend
cd backend
pnpm install
cp env.example .env             # DB_* (ou DATABASE_URL) et JWT_SECRET (>= 32 caractères) obligatoires
pnpm dev                        # attend PostgreSQL, applique les migrations, puis écoute sur http://localhost:3001
node scripts/init-family-gate.js <code>    # code d'entrée familial (aucun code par défaut)
node scripts/init-default-pins.js <PIN>    # PIN des profils qui n'en ont pas

# Frontend
cd ../frontend
pnpm install
cp .env.example .env            # variables VITE_* uniquement, sans aucun secret
pnpm dev                        # http://localhost:3000
```

En développement, Vite relaie `/api` vers le backend (`VITE_DEV_API_TARGET`, défaut
`http://127.0.0.1:3001`). Le schéma de la base est créé et mis à jour **uniquement** par les
migrations du backend : voir [backend/README.md](backend/README.md#migrations).

## 🧪 Qualité et tests

```bash
# frontend/
pnpm run lint:check             # ESLint (pnpm run lint : avec --fix)
pnpm exec vitest run            # tests unitaires et de composants (pnpm test : mode watch)
pnpm run test:coverage          # couverture, avec les seuils minimaux de vitest.config.js
pnpm exec playwright test       # E2E : serveur Vite lancé par Playwright, API simulée
                                # sans navigateur Playwright : E2E_BROWSER_CHANNEL=msedge

# backend/
pnpm test                       # Jest ; les suites PostgreSQL sont ignorées sans TEST_DATABASE_URL
TEST_DATABASE_URL=postgresql://.../teachdigital_test pnpm run test:db:init   # base de test = migrations
TEST_DATABASE_URL=postgresql://.../teachdigital_test pnpm test -- --runInBand
```

Détails : [backend/tests/README.md](backend/tests/README.md) et
[frontend/tests/e2e/README.md](frontend/tests/e2e/README.md).

CI GitHub Actions :

- `.github/workflows/ci.yml`, à chaque push et PR :
  - frontend : lint, Vitest avec seuils de couverture, build ;
  - backend : PostgreSQL de service, schéma créé par les migrations, `pnpm run migrate`,
    tests unitaires et d'intégration.
- `.github/workflows/e2e-tests.yml` : Playwright (Chromium, projets bureau et mobile).
- `.github/workflows/deploy-synology.yml` : déploiement **manuel** (`workflow_dispatch`), précédé
  de la CI.

## 🏗️ Build de production

```bash
cd frontend && pnpm run build
```

Génère `frontend/dist/` (Vite, Terser, un chunk par écran), `dist/version.json`, puis `dist/sw.js`
(`scripts/generate-sw.js`, qui précache les fichiers du build). Le build appelle l'API sur la même
origine que la page (`/api/...`, relayé par le nginx du frontend) ; `VITE_API_URL_PROD` ne sert qu'à
forcer une autre origine (qui devrait alors aussi être autorisée par la CSP de `frontend/nginx.conf`).

## 🐳 Déploiement (Docker sur Synology)

Depuis un poste Windows (PowerShell et Git Bash), vers le NAS par SSH (alias `synology`) :

```powershell
.\deploy.ps1                     # backend + frontend
.\deploy.ps1 -Target backend     # backend uniquement
.\deploy.ps1 -Target frontend    # frontend uniquement (build local puis envoi de frontend/dist/)
.\deploy.ps1 -SkipBuild          # réutilise le frontend/dist/ existant
```

- **Frontend** (`teachdigital-frontend`) : nginx sur le port **3000** de l'hôte. Il sert la SPA,
  applique les en-têtes de sécurité et relaie `/api/` vers `http://backend:3001` par le réseau
  Docker externe `teachdigital`. `deploy.ps1` crée ce réseau, avec un sous-réseau fixe
  (`-DockerSubnet`, défaut `172.30.240.0/24`). Le reverse proxy HTTPS de DSM vise `localhost:3000`.
- **Backend** (`teachdigital-backend`) : publié **uniquement sur `127.0.0.1:3001`**. Les secrets
  viennent du `.env` présent sur le NAS à côté du compose (modèle `backend/env.docker.example`) ;
  ce fichier n'est jamais transféré ni commité. Les migrations s'appliquent au démarrage.
  Santé : `/health` (liveness) et `/health/ready` (base joignable).

Guides : [doc/DEPLOY-SYNOLOGY.md](doc/DEPLOY-SYNOLOGY.md),
[doc/HTTPS-SYNOLOGY-SETUP.md](doc/HTTPS-SYNOLOGY-SETUP.md) et
[doc/SYNOLOGY-ENV-VARIABLES.md](doc/SYNOLOGY-ENV-VARIABLES.md).
`docker-compose.app.yml` + `env.synology.example` décrivent une stack tout-en-un (PostgreSQL,
backend et frontend, plus nginx avec `--profile production`) que `deploy.ps1` n'utilise pas.

## 🔒 Sécurité / secrets

Aucun secret ne doit être commité : seuls les fichiers `*.example` sont versionnés. `.env` et
`.env.*` sont ignorés par git et exclus des images Docker.

| Variable (backend) | Exigence |
| --- | --- |
| `JWT_SECRET` | Au moins 32 caractères aléatoires (`openssl rand -hex 32`). Le serveur refuse de démarrer avec un secret absent, trop court ou d'exemple |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (ou `DATABASE_URL`) | Utilisateur PostgreSQL dédié, **propriétaire des tables**, mot de passe fort |
| `AI_SETTINGS_KEY` | Recommandée (au moins 32 caractères, différente de `JWT_SECRET`) : chiffre les clés IA saisies dans l'interface |
| `FRONTEND_URL` / `ALLOWED_ORIGIN` | Origines autorisées par CORS |

Les clés IA vont dans le `.env` du backend ou dans Configuration IA. Ne **jamais** créer de
variable `VITE_*` contenant une clé : tout ce qui est préfixé `VITE_` est publié en clair dans le
JavaScript.

Modèle d'accès (détails : [doc/PIN-SECURITY.md](doc/PIN-SECURITY.md)) :

- **Code familial d'abord**, qui délivre un jeton « famille » : accès enfant, jamais aux données
  d'un parent. Ensuite seulement, **PIN d'un profil** (`POST /api/auth/login` exige le jeton
  famille), qui délivre un jeton « profil ». L'espace parent exige le jeton admin du profil et une
  session de 30 min.
- **Révocation** par `token_version` : un changement de code familial ou de PIN, la désactivation
  d'un profil ou le changement de son type invalident les jetons déjà émis.
- **Verrouillage** des PIN par (profil, IP) : 15 min, puis 1 h, puis 24 h. Plafond global de 100
  échecs par heure, qui verrouille 15 min. Les verrous sont en mémoire : un redémarrage du backend
  les lève.
- **Politique des PIN**, à chaque changement : codes triviaux refusés (`WEAK_PIN`), au moins 6
  chiffres pour un parent (`PIN_TOO_SHORT`). Les PIN existants restent valides.
- **Quiz notés par le serveur** : un enfant ne reçoit jamais les bonnes réponses avant d'avoir
  envoyé les siennes.
- **Journal d'audit** : les événements d'authentification sont écrits par le serveur ; l'envoi
  client exige un jeton.
- **CSP** (`frontend/nginx.conf`) : une seule politique stricte pour l'application, sans script
  inline (`script-src 'self'`). Les pages de cours (HTML généré avec scripts) sont servies à part
  par `GET /api/course-pages/render?t=<jeton signé de 5 min>`, avec leur propre CSP `sandbox`
  (`backend/lib/coursePageView.js`). Elles s'affichent dans une iframe
  `sandbox="allow-scripts allow-forms allow-modals"`, et nginx n'ajoute aucune CSP sur cette route.

Mise en service : `node scripts/init-family-gate.js <code>` et
`node scripts/init-default-pins.js <PIN>` (dans `backend/`, ou par `docker exec` sur le NAS). Pour
un PIN oublié : `node scripts/reset-pin.js <id profil> <PIN>`. Un secret commité par le passé doit
être considéré comme compromis et **changé** : réécrire l'historique git ne suffit pas.

## 📁 Structure du projet

```text
teachDigital/
├── frontend/               # Application Vue 3 / Vite (PWA) — voir frontend/README.md
│   ├── src/                #   views/ (écrans routés), components/, composables/, services/, stores/,
│   │                       #   router/, styles/, utils/, constants/, config/
│   ├── public/             #   assets statiques, manifest, modèle du service worker (sw.js)
│   ├── scripts/            #   build (generate-sw.js, generate-icons.js), versioning, analyse du bundle
│   ├── tests/              #   Vitest (services, components, stores, utils) et Playwright (e2e)
│   ├── Dockerfile.prebuilt, nginx.conf (modèle), docker-compose.yml   # image déployée sur le NAS
│   └── Dockerfile          #   build complet dans Docker (docker-compose.app.yml)
├── backend/                # API Express — voir backend/README.md
│   ├── server.js, app.js   #   cycle de vie / application Express
│   ├── api/, controllers/, lib/
│   ├── migrations/         #   schéma PostgreSQL (NNNN_description.sql)
│   ├── scripts/            #   migrate, init-family-gate, init-default-pins, reset-pin, init-badges
│   ├── tests/              #   Jest
│   └── Dockerfile, docker-compose.yml, env.example, env.docker.example
├── doc/                    # Documentation détaillée (voir ci-dessous)
├── .cursor/rules/          # Règles pour les assistants IA
├── .github/workflows/      # CI, E2E, déploiement manuel Synology
├── deploy.ps1              # Déploiement Synology (backend + frontend)
├── docker-compose.app.yml, nginx.conf, env.synology.example   # stack tout-en-un (non utilisée par deploy.ps1)
└── .nvmrc, .gitignore, .gitattributes, README.md
```

## 📝 Scripts utiles

Dans `frontend/` :

- `pnpm run dev` / `build` / `preview`
- `pnpm run generate-icons`, `pnpm run validate-manifest`
- `pnpm run version:patch|minor|major` : gestion de version
  ([doc/VERSION-MANAGEMENT.md](doc/VERSION-MANAGEMENT.md))
- `pnpm run test:e2e[:ui|:headed|:debug|:report]`, `pnpm run test:all` (Vitest + Playwright)
- `pnpm run audit` / `pnpm run security:check` : audit des dépendances, plus lint
- `pnpm run build:analyze`, `pnpm run bundle:analyze`, `pnpm run lighthouse` : analyse de
  performance

Dans `backend/` :

- `pnpm dev` / `pnpm start`
- `pnpm run migrate` / `pnpm run migrate:status` : migrations de la base du `.env`
- `pnpm run init-family-gate`, `init-default-pins`, `reset-pin`, `init-badges` (voir
  [backend/README.md](backend/README.md))
- `pnpm test`, `pnpm run test:coverage`, `pnpm run test:db:init`

## ⚡ Performance

- Chaque écran (`src/views/`) est chargé à la demande, avec un chunk par vue. Les dépendances sont
  regroupées en `vue-vendor` et `vendor`. Terser retire `console.log/info/debug`.
- Le service worker précache tout le build et sert les fichiers hachés depuis le cache. L'API
  n'est jamais mise en cache.
- Le fond animé est rendu une seule fois (`AppBackground`), et il devient statique sur mobile ou
  quand les animations sont réduites.
- Mesures : `pnpm run build:analyze` (taille des chunks) et `pnpm run lighthouse` (audite
  `http://localhost:3000`).

## 📚 Documentation (`doc/`)

| Sujet | Document |
| --- | --- |
| Déploiement, mise à jour, exploitation | [DEPLOY-SYNOLOGY.md](doc/DEPLOY-SYNOLOGY.md) |
| HTTPS / reverse proxy DSM | [HTTPS-SYNOLOGY-SETUP.md](doc/HTTPS-SYNOLOGY-SETUP.md) |
| Variables d'environnement | [SYNOLOGY-ENV-VARIABLES.md](doc/SYNOLOGY-ENV-VARIABLES.md) |
| Droits Docker sur le NAS | [SYNOLOGY_DOCKER_PERMISSIONS.md](doc/SYNOLOGY_DOCKER_PERMISSIONS.md) |
| Authentification, PIN, jetons | [PIN-SECURITY.md](doc/PIN-SECURITY.md) |
| PWA, service worker, mises à jour | [PWA-INSTALL.md](doc/PWA-INSTALL.md) |
| Versions | [VERSION-MANAGEMENT.md](doc/VERSION-MANAGEMENT.md) |
| Design « Liquid Glass » et accessibilité | [LIQUID-GLASS-DESIGN-GUIDE.md](doc/LIQUID-GLASS-DESIGN-GUIDE.md) |
| Thèmes (Liquid Glass, Netflix, Pat' Patrouille, Desperate Housewives, Les Frères Scott, Mercedes F1) | [THEMES.md](doc/THEMES.md) |
| Scanner de leçons / IA | [LESSON-SCANNER.md](doc/LESSON-SCANNER.md) |
| Badges | [BADGE-SYSTEM-GUIDE.md](doc/BADGE-SYSTEM-GUIDE.md) |
| Activités | [ACTIVITY-MANAGEMENT-GUIDE.md](doc/ACTIVITY-MANAGEMENT-GUIDE.md) |
| Vidéos YouTube | [YOUTUBE-KIDS-GUIDE.md](doc/YOUTUBE-KIDS-GUIDE.md) |
| Portage React Native (API de référence) | [REACT-NATIVE-PORTING-GUIDE.md](doc/REACT-NATIVE-PORTING-GUIDE.md) |

## 🤝 Contribution

1. Créer une branche (`git checkout -b feature/ma-fonctionnalite`).
2. Vérifier en local :
   - dans `frontend/` : `pnpm run lint:check && pnpm exec vitest run --coverage && pnpm run build` ;
   - dans `backend/` : `pnpm test`.
   Toute évolution du schéma passe par une nouvelle migration dans `backend/migrations/`.
3. Ouvrir une Pull Request (la CI doit passer).

## 📄 Licence

Ce projet est sous licence MIT.
