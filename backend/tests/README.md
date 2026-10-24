# Tests du backend - TeachDigital

## 📋 Vue d'ensemble

Les tests utilisent Jest (environnement Node, `**/tests/**/*.test.js`, délai de 30 s). Il y en a
deux familles :

- **unitaires** : sans base, la base étant simulée ou absente. Ils tournent toujours ;
- **intégration** (`describeWithDb`) : sur une vraie base PostgreSQL dédiée. Ils ne tournent que si
  `TEST_DATABASE_URL` est défini, et sont ignorés sinon.

## 🏗️ Structure des tests

```
backend/tests/
├── api/                    # Routeur réel monté sur /api (support/app.js) : endpoints, droits,
│   │                       #   isolation des profils, sécurité de bout en bout, pages de cours isolées
│   └── support/            # Application de test, chaînes de requêtes simulées, jeux de données
├── app/                    # Application Express (app.js) : limites de corps, multipart, erreurs, santé
├── controllers/            # Contrôleurs testés sur base réelle (résumé de progression)
├── lib/                    # auth, bruteForce, pinPolicy, migrate, database, queries, transaction,
│                           #   logger (masquage), shutdown, cors, rateLimit, badges, streaks, coursePageView, jeux
├── services/               # Routes et services IA (fournisseurs simulés), OCR, réglages chiffrés
├── helpers/testHelpers.js  # describeWithDb, en-têtes de jetons, création et nettoyage de données
├── init-test-db.js         # Vide la base de test dédiée puis applique les migrations
├── setup.js                # Configuration Jest (JWT aléatoire, base de test, logs, fermeture du pool)
└── README.md               # Ce fichier
```

Il n'y a plus de schéma de test séparé : la base de test est construite par les mêmes migrations
que la production (`backend/migrations/*.sql`, runner `lib/migrate.js`). Une nouvelle colonne ou
table s'ajoute donc dans une migration, jamais dans les tests. Les tests du runner
(`tests/lib/migrate.test.js`) travaillent dans des schémas PostgreSQL temporaires (`migr_*`) de la
base de test, supprimés en fin de suite.

## ▶️ Exécution des tests

### Tests unitaires uniquement (sans base)

```bash
cd backend
pnpm install
pnpm test
```

### Tests complets, avec une base PostgreSQL dédiée

```bash
cd backend
# 1) Démarrer une base jetable (son nom doit contenir « test »)
docker run --rm -d --name teachdigital-test-db \
  -e POSTGRES_USER=teachdigital -e POSTGRES_PASSWORD=teachdigital \
  -e POSTGRES_DB=teachdigital_test -p 5432:5432 postgres:16-alpine

# 2) Créer le schéma : base vidée puis toutes les migrations appliquées
#    (à relancer après l'ajout d'une migration)
TEST_DATABASE_URL=postgresql://teachdigital:teachdigital@localhost:5432/teachdigital_test \
  pnpm run test:db:init

# 3) Lancer tous les tests (une suite à la fois, sur la même base)
TEST_DATABASE_URL=postgresql://teachdigital:teachdigital@localhost:5432/teachdigital_test \
  pnpm test -- --runInBand
```

`init-test-db.js` refuse de vider une base dont le nom ne contient pas « test ». C'est une
protection contre une `TEST_DATABASE_URL` qui viserait par erreur la production. La CI
(`.github/workflows/ci.yml`) suit les mêmes étapes, avec un PostgreSQL de service, et lance aussi
`pnpm run migrate` pour vérifier qu'il ne reste rien à appliquer.

### Autres modes

```bash
pnpm test:watch                 # re-exécution automatique
pnpm test:coverage              # couverture de lib/, api/ et controllers/
pnpm test auth.test.js          # un fichier (ou un motif)
pnpm test -- -t "verrouillage"  # tests dont le nom contient ce texte
```

## 🔧 Helpers de test (`helpers/testHelpers.js`)

- `describeWithDb` : `describe` si `TEST_DATABASE_URL` est défini, sinon `describe.skip`
- `familyAuthHeader()`, `profileAuthHeader(...)` : en-têtes `Authorization` avec un jeton famille
  ou profil
- `generateTestToken()`, `createTestProfile()`, `createTestPin()`, `createTestLesson()`,
  `createTestBadge()`, `cleanupTestData()`
- `createMockRequest()`, `createMockResponse()` : objets `req` / `res` simulés pour tester un
  contrôleur directement

Les tests `api/` utilisent `api/support/app.js` : le vrai routeur monté sur `/api`, avec
`trust proxy` activé pour simuler l'IP du client par `X-Forwarded-For` (tests du verrouillage par
IP). Le module IA doit y être mocké.

## ⚠️ Prérequis

1. **Base de données** (suites d'intégration uniquement) : `TEST_DATABASE_URL` vers une base
   DÉDIÉE (nom contenant « test »), initialisée par `pnpm run test:db:init`.
2. **Rien d'autre** : `tests/setup.js` ignore `backend/.env`, génère un `JWT_SECRET` aléatoire et
   désactive l'écriture des logs dans des fichiers.

## 🐛 Dépannage

| Symptôme | Piste |
| --- | --- |
| Suites « skipped » | `TEST_DATABASE_URL` n'est pas défini : c'est normal pour les tests unitaires seuls |
| `relation ... does not exist` / colonne manquante | Relancer `pnpm run test:db:init` (une migration a été ajoutée) |
| Conflits ou données résiduelles entre suites | Lancer avec `--runInBand` (une seule base partagée) |
| « Refus d'initialiser la base » | Le nom de la base de `TEST_DATABASE_URL` doit contenir « test » (dérogation explicite : `ALLOW_TEST_DB_INIT=1`) |

## 📚 Ressources

- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [README du backend](../README.md) (migrations, scripts, configuration)
