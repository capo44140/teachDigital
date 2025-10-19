# 🚀 TeachDigital Backend API

Backend API pour l'application TeachDigital utilisant Vercel Functions.

## 📁 Structure du Projet

```
backend/
├── api/                    # Endpoints Vercel Functions
│   ├── auth/              # Authentification
│   │   ├── login.js       # POST /api/auth/login
│   │   ├── logout.js      # POST /api/auth/logout
│   │   └── verify.js      # GET /api/auth/verify
│   ├── profiles/          # Gestion des profils
│   │   ├── index.js       # GET,POST /api/profiles
│   │   ├── [id].js        # GET,PUT,DELETE /api/profiles/:id
│   │   └── [id]/pin.js    # GET,PUT /api/profiles/:id/pin
│   ├── lessons/           # Gestion des leçons
│   │   ├── index.js       # GET,POST /api/lessons
│   │   ├── [id].js        # GET,PUT,DELETE /api/lessons/:id
│   │   └── [id]/quiz-results.js # GET,POST /api/lessons/:id/quiz-results
│   └── notifications/     # Gestion des notifications
│       ├── index.js       # GET,POST /api/notifications
│       ├── [id].js        # GET,PUT,DELETE /api/notifications/:id
│       └── mark-all-read.js # POST /api/notifications/mark-all-read
├── lib/                   # Utilitaires partagés
│   ├── database.js        # Configuration base de données
│   ├── auth.js           # Authentification JWT
│   └── response.js       # Réponses API standardisées
├── vercel.json           # Configuration Vercel
└── package.json          # Dépendances
```

## 🔧 Configuration

### Variables d'Environnement

Dans Vercel, configurez ces variables :

```bash
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
```

### Installation Locale

```bash
cd backend
pnpm install
pnpm run dev
```

## 🔐 Authentification

Tous les endpoints (sauf `/api/auth/login`) nécessitent un token JWT dans l'en-tête :

```bash
Authorization: Bearer <jwt-token>
```

## 📚 API Endpoints

### 🔑 Authentification

#### POST /api/auth/login
Connexion avec profil et code PIN.

**Body:**
```json
{
  "profileId": 1,
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "token": "jwt-token",
    "profile": {
      "id": 1,
      "name": "Parent",
      "type": "admin",
      "isAdmin": true
    }
  }
}
```

#### POST /api/auth/logout
Déconnexion et suppression de session.

#### GET /api/auth/verify
Vérification du token JWT.

### 👥 Profils

#### GET /api/profiles
Récupérer tous les profils.

#### POST /api/profiles
Créer un nouveau profil (admin seulement).

#### GET /api/profiles/:id
Récupérer un profil par ID.

#### PUT /api/profiles/:id
Modifier un profil.

#### DELETE /api/profiles/:id
Supprimer un profil (admin seulement).

#### GET /api/profiles/:id/pin
Récupérer le statut du code PIN (admin seulement).

#### PUT /api/profiles/:id/pin
Mettre à jour le code PIN.

### 📚 Leçons

#### GET /api/lessons
Récupérer les leçons avec filtres optionnels :
- `?profileId=1` - Filtrer par profil
- `?published=true` - Filtrer par statut de publication

#### POST /api/lessons
Créer une nouvelle leçon.

#### GET /api/lessons/:id
Récupérer une leçon par ID.

#### PUT /api/lessons/:id
Modifier une leçon (propriétaire ou admin).

#### DELETE /api/lessons/:id
Supprimer une leçon (propriétaire ou admin).

#### GET /api/lessons/:id/quiz-results
Récupérer les résultats de quiz pour une leçon.

#### POST /api/lessons/:id/quiz-results
Sauvegarder un résultat de quiz.

### 🔔 Notifications

#### GET /api/notifications
Récupérer les notifications avec filtres optionnels :
- `?profileId=1` - Filtrer par profil
- `?isRead=false` - Filtrer par statut de lecture
- `?type=lesson` - Filtrer par type

#### POST /api/notifications
Créer une notification (admin seulement).

#### GET /api/notifications/:id
Récupérer une notification par ID.

#### PUT /api/notifications/:id
Marquer une notification comme lue/non lue.

#### DELETE /api/notifications/:id
Supprimer une notification (admin seulement).

#### POST /api/notifications/mark-all-read
Marquer toutes les notifications comme lues.

## 🚀 Déploiement

### Vercel CLI

```bash
# Déploiement en preview
vercel

# Déploiement en production
vercel --prod
```

### Variables d'Environnement Vercel

```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

## 🔒 Sécurité

- **JWT Tokens** : Expiration 24h
- **CORS** : Configuré pour le domaine frontend
- **Rate Limiting** : 100 requêtes/15min par IP
- **Validation** : Tous les inputs sont validés
- **Permissions** : Contrôle d'accès basé sur les rôles

## 🧪 Tests

```bash
# Tests à implémenter
pnpm run test
```

## 📝 Logs

Les logs sont automatiquement gérés par Vercel. Consultez le dashboard Vercel pour les logs en temps réel.

## 🔄 Migration depuis le Frontend

1. **Phase 1** : Déployer le backend
2. **Phase 2** : Adapter le frontend pour utiliser les APIs
3. **Phase 3** : Supprimer les services du frontend
4. **Phase 4** : Tests et optimisations

