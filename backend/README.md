# TeachDigital — Backend API

API Node.js / Express 4 adossée à PostgreSQL (`pg`), déployée en conteneur Docker sur le NAS
Synology par `../deploy.ps1` (cf. README racine, section « Déploiement »).

## Structure

```text
backend/
├── server.js          # Cycle de vie : attente de PostgreSQL → migrations → réglages IA → écoute ; arrêt propre
├── app.js             # Application Express : requestId, sécurité, CORS, limites de corps, multipart, erreurs
├── api/               # Routeur (index.js), badges, routes IA (api/ai/**)
├── controllers/       # Contrôleurs métier (profils, leçons, pages de cours, progression...)
├── lib/               # database (pool, sql``), migrate, queries (timeouts), logger, auth, badgeService...
├── migrations/        # Schéma de la base : fichiers NNNN_description.sql
├── scripts/           # Outils en ligne de commande (migrations, codes PIN, badges)
└── tests/             # Jest (cf. tests/README.md)
```

## Démarrage local

```bash
pnpm install
cp env.example .env      # DB_* (ou DATABASE_URL) et JWT_SECRET obligatoires
pnpm dev                 # http://localhost:3001
```

Au démarrage, `server.js` :

1. attend que PostgreSQL réponde (délai croissant, jusqu'à `DB_STARTUP_TIMEOUT_MS`, 5 min par défaut :
   au redémarrage du NAS, la base peut arriver après le backend) ;
2. applique les migrations en attente — **une migration en échec arrête le serveur (code 1)** ;
3. charge les réglages IA enregistrés depuis l'interface (en cas d'échec : nouvel essai automatique,
   et à la première requête IA) ;
4. écoute le port (`PORT`, 3001).

`SIGTERM` (docker stop) / `SIGINT` : plus de nouvelles connexions, `/health/ready` répond 503, les requêtes
en cours ont `SHUTDOWN_TIMEOUT_MS` (15 s) pour se terminer, puis pool PostgreSQL, worker OCR et logs sont fermés.

Santé : `GET /health` (liveness, ne touche pas la base) et `GET /health/ready` (readiness : base joignable).

## Migrations

- Fichiers SQL `migrations/NNNN_description.sql`, appliqués dans l'ordre lexical, **chacun dans sa
  transaction** (ne pas écrire `BEGIN`/`COMMIT` ni `CREATE INDEX CONCURRENTLY` dedans).
- Suivi dans la table `schema_migrations(name, applied_at)` : un fichier appliqué n'est jamais rejoué.
  Ne pas modifier un fichier déjà déployé : en ajouter un nouveau.
- Un verrou consultatif PostgreSQL empêche deux instances de migrer en même temps.
- Plages : `0001-0099` schéma de base / infrastructure, `0100-0199` fonctionnalités.
- Écrire des migrations **idempotentes** (`IF NOT EXISTS`, gardes `DO $$ ... $$`) et sans préfixe `public.`.
- `0001_baseline.sql` reprend tout l'historique (anciens scripts `frontend/scripts/*.sql`, `migrate-*.js`,
  DDL de l'ancien `server.js`) : il s'applique sans perte sur une base existante comme sur une base vide.

```bash
pnpm run migrate          # applique les migrations en attente (base du .env)
pnpm run migrate:status   # liste appliquées / en attente
```

L'utilisateur PostgreSQL du backend doit être **propriétaire des tables** (ALTER TABLE / CREATE INDEX).

## Scripts utiles

| Commande | Rôle |
| --- | --- |
| `node scripts/init-family-gate.js <code>` | Définit le code d'entrée familial (4 à 8 chiffres, pas de code trivial) et révoque les jetons famille |
| `node scripts/init-default-pins.js <PIN>` | Donne un PIN aux profils qui n'en ont pas (6 chiffres minimum si l'un d'eux est parent) |
| `node scripts/reset-pin.js <id profil> <PIN>` | Réinitialise le PIN d'un profil (PIN parent oublié) et révoque ses sessions (remplace l'ancien `update-parent-pin.js`) |
| `node scripts/init-badges.js` | Crée les badges par défaut (en production, s'arrête si des badges existent) |

Équivalents `pnpm run init-family-gate|init-default-pins|reset-pin|init-badges -- <arguments>`.

Sur le NAS : `docker exec -it teachdigital-backend node scripts/<script> ...`

## Configuration (extraits)

Modèles complets : `env.example` (local) et `env.docker.example` (NAS). Points importants :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `JWT_SECRET` | — (obligatoire) | ≥ 32 caractères aléatoires |
| `AI_SETTINGS_KEY` | — (dérivée de `JWT_SECRET`) | Chiffre les clés API IA enregistrées depuis l'interface ; ≥ 32 caractères, différente de `JWT_SECRET` |
| `TRUST_PROXY` | `loopback` (`1` en Docker) | Proxys de confiance pour `X-Forwarded-For` (nombre, liste d'adresses/sous-réseaux, true/false) |
| `DB_MAX_CONNECTIONS` | 20 | Taille du pool |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | Attente max d'une connexion |
| `DB_STATEMENT_TIMEOUT_MS` | 10000 | Durée max d'une requête côté PostgreSQL (> `API_DB_TIMEOUT_LONG_MS`) |
| `DB_STARTUP_TIMEOUT_MS` | 300000 | Attente max de PostgreSQL au démarrage |
| `API_JSON_BODY_LIMIT` / `API_JSON_LARGE_BODY_LIMIT` | 100kb / 10mb | Corps JSON ; 10 Mo seulement pour pages de cours, leçons, image de profil, routes IA en JSON |
| `AI_REQUEST_TIMEOUT_MS` | 170000 | Délai global d'une génération IA (annulée aussi si le client se déconnecte) |
| `OCR_TIMEOUT_MS` / `TESSERACT_CACHE_DIR` | 60000 / `/tesseract-cache` | OCR Tesseract : délai par image, cache des langues (volume) |
| `SHUTDOWN_TIMEOUT_MS` | 15000 | Attente des requêtes en cours à l'arrêt |

Liste complète (limites de débit, verrouillage des PIN, IA, logs) :
[../doc/SYNOLOGY-ENV-VARIABLES.md](../doc/SYNOLOGY-ENV-VARIABLES.md).

## Routes et sécurité

Le routeur est `api/index.js`. Le corps et la query sont validés par des schémas Zod
(`lib/schemas.js`, middleware `validate`).

- **Publiques** : `POST /auth/family-gate` (code familial → jeton « famille »), `GET /auth/verify`,
  `POST /auth/logout`, `GET /course-pages/render?t=` (page de cours isolée, avec un jeton signé
  de 5 min et une CSP `sandbox`, cf. `lib/coursePageView.js`).
- `POST /auth/login` (PIN → jeton « profil ») exige un jeton famille : le code familial passe en
  premier.
- **Tout le reste** exige un jeton non révoqué (`requireMember`). Les actions parent passent par
  `requireAdmin` (statut admin revérifié en base), les badges par `requireAdminForWrites`, et
  `/ai/*` est réservé aux parents.
- Un jeton famille n'accède qu'aux profils enfants actifs (`canActForProfile`, `lib/scope.js`).
- Révocation par `token_version` (code familial, PIN, désactivation ou changement de type d'un
  profil). Verrouillage progressif des PIN par (profil, IP), en mémoire
  (`lib/bruteForce.js`, `lib/pinAttempts.js`). Politique des PIN à chaque changement
  (`lib/pinPolicy.js`).
- Quiz : `GET /lessons/:id` retire les réponses pour un non-parent ; `POST /lessons/:id/quiz-results`
  recalcule le score et renvoie la correction.
- Les événements d'authentification sont journalisés par le serveur (`lib/auditLog.js`).
  `POST /audit/logs` exige un jeton.

Détails : [../doc/PIN-SECURITY.md](../doc/PIN-SECURITY.md).

## Erreurs et logs

- Réponses d'erreur : `{ success: false, message, code, requestId }`. Le message est générique ;
  le détail technique n'est que dans les logs, avec le même `requestId` (en-tête `X-Request-Id`).
- Logs sur stdout (Docker) et dans `LOGS_DIR` (fichiers par niveau, écriture par flux, rotation
  `LOG_MAX_SIZE` / `LOG_MAX_FILES`). PIN, jetons, clés API, mots de passe et texte OCR sont masqués.

## Docker

`docker-compose.yml` : conteneur `teachdigital-backend` (`init: true` pour relayer SIGTERM,
`stop_grace_period: 30s`), port publié **uniquement sur `127.0.0.1:3001`**, réseau externe
`teachdigital` partagé avec le frontend (son nginx relaie `/api/` vers `http://backend:3001`).
Le réseau est créé par `deploy.ps1` avec un sous-réseau fixe (`-DockerSubnet`, défaut
`172.30.240.0/24`), à autoriser dans `pg_hba.conf` si PostgreSQL tourne sur l'hôte du NAS
(`DB_HOST=host.docker.internal`). Voir [../doc/DEPLOY-SYNOLOGY.md](../doc/DEPLOY-SYNOLOGY.md).
Volumes : `logs`, `output`, `temp`, `.cache/tesseract` (monté en `/tesseract-cache`).

## Tests

Voir [tests/README.md](tests/README.md) : `pnpm test` (unitaires), et avec une base dédiée
`TEST_DATABASE_URL=... pnpm run test:db:init && pnpm test -- --runInBand`.
