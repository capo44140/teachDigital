# Correction : Accès Base de Données depuis le Frontend

## ⚠️ Problème Identifié

L'application tente d'accéder directement à la base de données Neon depuis le navigateur (frontend), ce qui cause :
1. **Erreur en production** : Les variables d'environnement ne sont pas exposées au navigateur
2. **Problème de sécurité** : Les credentials de la base de données seraient visibles dans le code JavaScript

## ✅ Solution : Architecture Backend/Frontend

### Principe
- **Frontend** : Ne doit JAMAIS accéder directement à la base de données
- **Backend** : API Vercel Functions qui gère tous les accès à la base de données
- **Communication** : Le frontend appelle l'API backend via HTTP

### Architecture Actuelle

```
Frontend (Vue.js) 
    ↓
Neon Database ❌ MAUVAIS - Credentials exposés
```

### Architecture Correcte

```
Frontend (Vue.js)
    ↓ HTTP Request
Backend API (Vercel Functions)
    ↓ SQL Query
Neon Database ✅ BON - Credentials sécurisés
```

## 🔧 Corrections à Apporter

### 1. Supprimer l'accès direct à la base de données depuis le frontend

Le module `src/config/database.js` a été **supprimé** : le frontend ne contient plus de couche d’accès DB.

### 2. Utiliser les repositories existants

Les repositories doivent appeler l'API backend, pas la base de données directement :

**Exemple : ProfileRepository**
```javascript
// ❌ MAUVAIS - Accès direct à la DB
import sql from '@/config/database.js'
const profiles = await sql`SELECT * FROM profiles`

// ✅ BON - Appel à l'API backend
import { apiService } from '@/services/apiService.js'
const profiles = await apiService.getProfiles()
```

### 3. Configuration Vercel pour la Production

#### Variables d'environnement sur Vercel

Sur le dashboard Vercel (https://vercel.com/dashboard) :
1. Allez dans **Settings** > **Environment Variables**
2. Ajoutez UNIQUEMENT ces variables (sans le préfixe VITE_) :

```
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require
```

**Important** : Ne PAS ajouter de variables avec le préfixe `VITE_` car elles seraient exposées au frontend.

### 4. Modifier vite.config.js

Supprimer l'exposition des variables de base de données :

```javascript
// ❌ À SUPPRIMER de vite.config.js
define: {
  'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL),
  'process.env.VITE_DATABASE_URL': JSON.stringify(env.VITE_DATABASE_URL),
  // ... autres variables DB
}
```

Ces variables doivent rester côté backend uniquement.

## 📝 Plan d'Action

### Étape 1 : Vérifier l'API Backend
```bash
# Tester l'API backend localement
cd backend
pnpm install
pnpm run test:local
```

### Étape 2 : Modifier les Repositories
Tous les fichiers dans `src/repositories/` doivent utiliser l'API HTTP, pas l'accès direct à la DB.

### Étape 3 : Configurer Vercel
1. Ajouter `DATABASE_URL` dans les variables d'environnement Vercel
2. Supprimer toutes les variables `VITE_DATABASE_*` si elles existent

### Étape 4 : Nettoyer vite.config.js
Supprimer l'exposition des variables de base de données dans la section `define`.

### Étape 5 : Redéployer
```bash
git add .
git commit -m "fix: sécuriser accès base de données via API backend"
git push origin main
```

## 🔍 Vérification

Après déploiement, vérifier dans les DevTools du navigateur :
1. Ouvrir la Console
2. Taper `process.env` ou `import.meta.env`
3. Vérifier qu'aucune variable `DATABASE_URL` n'est visible

## 📚 Ressources

- [Backend API](../backend/api/index.js) - API Vercel Functions
- [VERCEL-ENV-SETUP.md](./VERCEL-ENV-SETUP.md) - Configuration Vercel
- [SECURITY-IMPROVEMENTS.md](./SECURITY-IMPROVEMENTS.md) - Bonnes pratiques sécurité


