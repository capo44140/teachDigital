# 🔧 Variables d'environnement sur Synology

Le déploiement (`deploy.ps1`) n'envoie aucun fichier `.env`. Les valeurs restent sur le NAS, dans
deux fichiers que l'on gère soi-même :

| Fichier sur le NAS | Lu par | Modèle |
| --- | --- | --- |
| `<dossier backend>/.env` (ex. `/volume1/docker/teachdigital/backend/.env`) | `backend/docker-compose.yml` (`env_file` + interpolation) | `backend/env.docker.example` |
| `<dossier frontend>/.env` (facultatif) | `frontend/docker-compose.yml` (interpolation) | — (deux variables, ci-dessous) |

Le fichier `.env` du backend est transmis en entier au conteneur (`env_file`). Pour les clés
listées dans `environment:` du compose, la valeur du compose l'emporte. Ce compose fixe notamment
`NODE_ENV`, `PORT`, `LOGS_DIR`, `TESSERACT_CACHE_DIR` et, par défaut, `TRUST_PROXY=1`.

## Backend : variables principales

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `host.docker.internal`, 5432, `teachdigital`, `teachdigital`, — | Accès PostgreSQL ([choix de `DB_HOST`](DEPLOY-SYNOLOGY.md#postgresql)) |
| `DATABASE_URL` | construite à partir des `DB_*` | Alternative aux `DB_*` |
| `DB_SSL` | `false` | Connexion TLS à PostgreSQL |
| `JWT_SECRET` | — | **Obligatoire**, au moins 32 caractères aléatoires. Le serveur refuse de démarrer avec un secret absent, trop court ou d'exemple |
| `AI_SETTINGS_KEY` | dérivée de `JWT_SECRET` | Chiffre les clés IA enregistrées depuis l'interface ; au moins 32 caractères, différente de `JWT_SECRET`, à ne plus changer |
| `FRONTEND_URL`, `ALLOWED_ORIGIN` | `http://localhost:3000`, — | Origines CORS : URL publique https du site ; liste séparée par des virgules |
| `JWT_FAMILY_EXPIRES_IN` / `JWT_PROFILE_EXPIRES_IN` | `24h` / `4h` | Durée des jetons « famille » (code familial) et « profil » (PIN) |
| `TRUST_PROXY` | `1` (compose) | Proxys de confiance pour l'IP client. **Ne pas définir** : le nginx du frontend est le seul intermédiaire |

## Base de données : démarrage, pool, délais

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DB_STARTUP_TIMEOUT_MS` | 300000 | Attente max de PostgreSQL au démarrage (redémarrage du NAS) |
| `MIGRATION_LOCK_WAIT_MS` | 60000 | Attente max d'un verrou pendant les migrations |
| `DB_MAX_CONNECTIONS` | 20 | Taille du pool |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | Attente max d'une connexion |
| `DB_STATEMENT_TIMEOUT_MS` | 10000 | Durée max d'une requête côté PostgreSQL |
| `DB_IDLE_TIMEOUT_MS`, `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` | 30000 | Fermeture des connexions inactives |
| `API_DB_TIMEOUT_DEFAULT_MS` / `_FAST_MS` / `_STANDARD_MS` / `_LONG_MS` | 7000 / 3000 / 5000 / 9000 | Délais applicatifs (`withQueryTimeout`), à garder sous `DB_STATEMENT_TIMEOUT_MS` |
| `SHUTDOWN_TIMEOUT_MS` | 15000 | Attente des requêtes en cours à l'arrêt (inférieure au `stop_grace_period` de 30 s) |

## Sécurité : limites et verrouillages

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `API_JSON_BODY_LIMIT` / `API_JSON_LARGE_BODY_LIMIT` | `100kb` / `10mb` | Corps JSON. 10 Mo seulement pour les pages de cours, les leçons, l'image de profil et les routes IA en JSON. **Ne pas** mettre `API_JSON_BODY_LIMIT=10mb` |
| `API_UPLOAD_MAX_FILE_BYTES` / `_MAX_FILES` / `_MAX_TOTAL_BYTES` | 15 Mo / 10 / 25 Mo | Fichiers multipart (routes IA uniquement) |
| `API_RATE_LIMIT_LOGIN_WINDOW_MS` / `_LOGIN_MAX` | 60000 / 20 | Connexions par PIN, par IP |
| `API_RATE_LIMIT_PIN_WINDOW_MS` / `_PIN_MAX` | 60000 / 5 | Vérifications de PIN, par IP et par profil |
| `API_RATE_LIMIT_FAMILY_GATE_WINDOW_MS` / `_FAMILY_GATE_MAX` | 60000 / 20 | Code familial, par IP |
| `API_RATE_LIMIT_AUDIT_MAX` / `_AUDIT_GLOBAL_MAX` | 60 / 300 par minute | Envoi de journaux d'audit, par IP et toutes IP confondues |
| `API_RATE_LIMIT_PROFILE_REQUEST_WINDOW_MS` / `_MAX` | 10 min / 5 | Demandes de création de profil |
| `API_PIN_LOCK_MAX_FAILURES` / `API_PIN_LOCK_WINDOW_MS` | 10 / 15 min | Verrouillage par (profil, IP) : 15 min, puis 1 h, puis 24 h |
| `API_PIN_LOCK_GLOBAL_MAX_FAILURES` / `API_PIN_LOCK_GLOBAL_WINDOW_MS` | 100 / 1 h | Plafond global par profil : 15 min, sans escalade |
| `AUTH_CACHE_TTL_MS` | 30000 | Cache du statut des profils et des versions de jetons |

## IA et OCR

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `KIMI_API_KEY`, `OPENROUTER_API_KEY` | — | Clés des fournisseurs. Elles peuvent aussi être saisies dans Configuration IA (prioritaire). Jamais dans une variable `VITE_*` |
| `<FOURNISSEUR>_MODEL` | selon le fournisseur | Modèle utilisé |
| `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL`, `LOCAL_LLM_TIMEOUT_MS` | —, —, 170000 | LLM local compatible OpenAI (LM Studio, Ollama) |
| `AI_REQUEST_TIMEOUT_MS` | 170000 | Délai global d'une génération IA (inférieur à 180 s) |
| `OCR_MODE` | `llm` | `llm` (vision) ou `tesseract` |
| `OCR_TIMEOUT_MS` | 60000 | Délai Tesseract par image. Les langues sont mises en cache dans le volume `.cache/tesseract` |
| `COURSE_PAGE_MAX_TOKENS` / `COURSE_PAGE_TIMEOUT_MS` | 16000 / 540000 | Génération de pages de cours |

## Logs, ports, volumes

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `LOG_FORMAT` | `text` | `json` recommandé si les logs sont collectés |
| `LOG_DEBUG` | `false` | Logs détaillés |
| `LOG_ENABLE_FILE`, `LOG_MAX_SIZE`, `LOG_MAX_FILES` | `true`, 10 Mo, 5 | Fichiers de logs dans le volume `logs/` |
| `BACKEND_PORT` | 3001 | Port publié sur `127.0.0.1` du NAS |
| `LOGS_VOLUME`, `OUTPUT_VOLUME`, `TEMP_VOLUME`, `TESSERACT_CACHE_VOLUME` | `./logs`, `./output`, `./temp`, `./.cache/tesseract` | Volumes du conteneur |

## Frontend (`.env` du dossier frontend)

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `FRONTEND_BIND_ADDRESS` | `0.0.0.0` | `127.0.0.1` si le reverse proxy DSM vise `localhost:3000` (recommandé) |
| `NGINX_TRUSTED_PROXY` | `127.0.0.1` | IP du reverse proxy DSM s'il vise l'IP réseau du NAS |

Les variables `VITE_*` (URL de l'API en production, etc.) sont intégrées **au build**, sur le poste
qui lance `deploy.ps1` (`frontend/.env`), et non sur le NAS.

## Appliquer une modification

```bash
cd /volume1/docker/teachdigital/backend
nano .env
docker compose up -d          # recrée le conteneur si sa configuration a changé
docker compose exec backend env | grep -E '^(DB_|FRONTEND_URL|ALLOWED_ORIGIN)'
```

`docker compose restart` ne relit **pas** le `.env`. Un nouveau `.\deploy.ps1` recrée aussi les
conteneurs. Au démarrage, la configuration effective (sans les secrets) est écrite dans les logs
(« Configuration runtime »).
