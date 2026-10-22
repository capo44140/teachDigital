# Tests des Endpoints API - TeachDigital

## 📋 Vue d'ensemble

Cette suite de tests couvre tous les endpoints de l'API TeachDigital. Les tests sont organisés par groupe d'endpoints pour faciliter la maintenance et la compréhension.

## 🏗️ Structure des Tests

```
backend/tests/
├── helpers/
│   └── testHelpers.js      # Fonctions utilitaires pour les tests
├── api/                    # Tests des contrôleurs / endpoints
├── lib/                    # Tests des utilitaires (auth, CORS, SQL...)
├── services/               # Tests des générateurs IA
├── schema.sql              # Schéma PostgreSQL minimal pour les tests d'intégration
├── init-test-db.js         # Initialise une base de test dédiée
├── setup.js                # Configuration Jest (JWT, base de test, fermeture du pool)
└── README.md               # Ce fichier
```

## 🚀 Installation

Assurez-vous d'avoir installé les dépendances :

```bash
cd backend
pnpm install
```

## ▶️ Exécution des Tests

### Tests unitaires uniquement (sans base)

```bash
cd backend
pnpm test
```

Les suites d'intégration (`describeWithDb`) sont ignorées automatiquement tant que
`TEST_DATABASE_URL` n'est pas défini.

### Tests complets, avec une base PostgreSQL dédiée

```bash
cd backend
# 1) Démarrer une base jetable (nom contenant « test »)
docker run --rm -d --name teachdigital-test-db \
  -e POSTGRES_USER=teachdigital -e POSTGRES_PASSWORD=teachdigital \
  -e POSTGRES_DB=teachdigital_test -p 5432:5432 postgres:16-alpine

# 2) Créer le schéma
TEST_DATABASE_URL=postgresql://teachdigital:teachdigital@localhost:5432/teachdigital_test \
  pnpm run test:db:init

# 3) Lancer tous les tests (une suite à la fois, même base)
TEST_DATABASE_URL=postgresql://teachdigital:teachdigital@localhost:5432/teachdigital_test \
  pnpm test -- --runInBand
```

`init-test-db.js` refuse de vider une base dont le nom ne contient pas « test »
(protection contre une `TEST_DATABASE_URL` pointant par erreur vers la production).

### Tests en mode watch (re-exécution automatique)

```bash
pnpm test:watch
```

### Tests avec couverture de code

```bash
pnpm test:coverage
```

### Tests spécifiques

```bash
# Tests d'authentification uniquement
pnpm test auth.test.js

# Tests de profils uniquement
pnpm test profiles.test.js
```

## 📊 Couverture des Endpoints

### ✅ Authentification (`/api/auth`)
- [x] POST `/api/auth/login` - Connexion avec profil et PIN
- [x] POST `/api/auth/logout` - Déconnexion

### ✅ Profils (`/api/profiles`)
- [x] GET `/api/profiles` - Récupérer tous les profils
- [x] POST `/api/profiles` - Créer un profil (admin)
- [x] GET `/api/profiles/:id` - Récupérer un profil
- [x] PUT `/api/profiles/:id` - Mettre à jour un profil
- [x] DELETE `/api/profiles/:id` - Supprimer un profil (admin)
- [x] GET `/api/profiles/stats` - Statistiques des profils
- [x] POST `/api/profiles/:id/pin` - Mettre à jour le PIN

### ✅ Leçons (`/api/lessons`)
- [x] GET `/api/lessons` - Récupérer les leçons (avec filtres)
- [x] POST `/api/lessons` - Créer une leçon
- [x] GET `/api/lessons/:id` - Récupérer une leçon
- [x] PUT `/api/lessons/:id` - Mettre à jour une leçon
- [x] DELETE `/api/lessons/:id` - Supprimer une leçon
- [x] GET `/api/lessons/:id/quiz-results` - Récupérer les résultats de quiz
- [x] POST `/api/lessons/:id/quiz-results` - Créer un résultat de quiz

### ✅ Notifications (`/api/notifications`)
- [x] GET `/api/notifications` - Récupérer les notifications (avec filtres)
- [x] POST `/api/notifications` - Créer une notification (admin)
- [x] GET `/api/notifications/:id` - Récupérer une notification
- [x] PUT `/api/notifications/:id` - Mettre à jour une notification
- [x] DELETE `/api/notifications/:id` - Supprimer une notification

### ✅ Badges (`/api/badges`)
- [x] GET `/api/badges` - Récupérer tous les badges
- [x] POST `/api/badges` - Créer un badge (admin)
- [x] GET `/api/badges/:id` - Récupérer un badge
- [x] GET `/api/badges/profile/:id` - Récupérer les badges d'un profil
- [x] GET `/api/badges/profile/:id/unlocked` - Badges débloqués
- [x] GET `/api/badges/profile/:id/stats` - Statistiques de badges
- [x] POST `/api/badges/check-unlock` - Vérifier et débloquer les badges

### ✅ Activités (`/api/activities`)
- [x] GET `/api/activities` - Récupérer les activités actives

### ✅ Vidéos YouTube (`/api/youtube-videos`)
- [x] GET `/api/youtube-videos` - Récupérer les vidéos actives

### ✅ IA (`/api/ai`)
- [x] GET `/api/ai/validate-key` - Valider une clé API
- [x] GET `/api/ai/has-valid-key` - Vérifier si une clé valide existe
- [x] POST `/api/ai/generate-quiz-from-text` - Générer un quiz depuis du texte
- [x] POST `/api/ai/generate-quiz-from-image` - Générer un quiz depuis une image
- [x] POST `/api/ai/generate-quiz-from-documents` - Générer un quiz depuis des documents

## 🔧 Helpers de Test

Le fichier `helpers/testHelpers.js` fournit des fonctions utilitaires :

- `createTestProfile()` - Créer un profil de test
- `createTestPin()` - Créer un code PIN pour un profil
- `generateTestToken()` - Générer un token JWT pour les tests
- `cleanupTestData()` - Nettoyer les données de test
- `createMockRequest()` - Créer une requête HTTP mock
- `createMockResponse()` - Créer une réponse HTTP mock
- `createTestLesson()` - Créer une leçon de test
- `createTestBadge()` - Créer un badge de test

## 📝 Configuration

Les tests utilisent Jest avec la configuration suivante :

- **Environnement** : Node.js
- **Pattern de fichiers** : `**/*.test.js`
- **Couverture** : `lib/**/*.js`, `api/**/*.js`, `controllers/**/*.js`

## ⚠️ Prérequis

1. **Base de données** : Les tests nécessitent une connexion à la base de données PostgreSQL configurée via les variables d'environnement
2. **Variables d'environnement** : Assurez-vous d'avoir configuré :
   - `DATABASE_URL` ou les variables DB_*
   - `JWT_SECRET`

## 🐛 Dépannage

### Erreurs de connexion à la base de données

Vérifiez que :
- Les variables d'environnement sont correctement configurées
- La base de données est accessible
- Les tables nécessaires existent

### Erreurs d'authentification

Vérifiez que :
- `JWT_SECRET` est défini
- Les tokens générés sont valides

### Tests qui échouent

- Vérifiez que les données de test sont correctement nettoyées
- Assurez-vous que les IDs de test ne sont pas en conflit
- Vérifiez les logs pour plus de détails

## 📈 Améliorations Futures

- [ ] Tests de performance
- [ ] Tests de charge
- [ ] Tests d'intégration E2E
- [ ] Tests de sécurité (injection SQL, XSS, etc.)
- [ ] Tests de validation des données
- [ ] Tests de gestion d'erreurs

## 📚 Ressources

- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [Documentation API TeachDigital](../README.md)

