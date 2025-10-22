# Correction de l'erreur Vercel - Serverless Functions

## Problème Initial

Lors du déploiement sur Vercel, l'erreur suivante apparaissait :
```
Error: The pattern "backend/api/index.js" defined in `functions` doesn't match any Serverless Functions inside the `api` directory.
```

## Cause

Vercel cherche automatiquement les Serverless Functions dans un dossier `api/` à la racine du projet, pas dans `backend/api/`.

## Solution Implémentée

### 1. Création du dossier `api/` à la racine

Création d'un dossier `api/` à la racine du projet avec un fichier `index.js` qui sert de point d'entrée.

### 2. Fichier `api/index.js`

```javascript
// Point d'entrée pour Vercel Serverless Functions
// Ce fichier réexporte le handler principal depuis backend/api/index.js

const handler = require('../backend/api/index.js');

module.exports = handler;
```

Ce fichier sert de pont entre la structure attendue par Vercel et notre structure backend organisée.

### 3. Mise à jour de `vercel.json`

Suppression de la section `functions` qui était incorrecte :

**Avant :**
```json
{
  "functions": {
    "backend/api/index.js": {
      "runtime": "@vercel/node@3.0.12"
    }
  }
}
```

**Après :**
```json
{
  "version": 2,
  "buildCommand": "pnpm run build:vercel",
  "outputDirectory": "dist",
  "headers": [...],
  "rewrites": [...]
}
```

Vercel détecte automatiquement les fonctions dans le dossier `api/`, donc la section `functions` n'est plus nécessaire.

### 4. Ajout des dépendances backend au `package.json` racine

Ajout de `express` et `jsonwebtoken` au `package.json` racine pour que Vercel puisse installer toutes les dépendances nécessaires :

```json
"dependencies": {
  "@iconify/vue": "^5.0.0",
  "@neondatabase/serverless": "^1.0.2",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "pinia": "^3.0.3",
  "vue": "^3.4.0",
  "vue-router": "^4.2.0"
}
```

### 5. Mise à jour du script de vérification

Mise à jour de `scripts/check-vercel-config.js` pour vérifier la présence du nouveau dossier `api/`.

## Structure Finale

```
teachDigital/
├── api/                          # Point d'entrée Vercel
│   ├── index.js                  # Réexporte backend/api/index.js
│   └── README.md                 # Documentation
├── backend/                      # Code backend organisé
│   ├── api/
│   │   └── index.js             # Handler principal
│   ├── lib/                     # Bibliothèques backend
│   └── vercel.json              # Config backend (optionnelle)
├── vercel.json                  # Configuration Vercel principale
└── package.json                 # Dépendances complètes
```

## Vérification

Pour vérifier que la configuration est correcte :

```bash
node scripts/check-vercel-config.js
```

Ce script vérifie :
- ✅ Présence du fichier `api/index.js`
- ✅ Présence du fichier `backend/api/index.js`
- ✅ Configuration `vercel.json`
- ✅ Script de build `build:vercel`

## Déploiement

Le déploiement sur Vercel devrait maintenant fonctionner correctement :

```bash
pnpm run build:vercel
vercel deploy
```

Ou via l'intégration Git de Vercel (recommandé).

## Routes API

Toutes les routes API sont gérées par `api/index.js` qui délègue au handler backend :

- `/api/auth/login` - Authentification
- `/api/auth/logout` - Déconnexion
- `/api/profiles` - Gestion des profils
- `/api/lessons` - Gestion des leçons
- `/api/notifications` - Gestion des notifications
- `/api/activities` - Gestion des activités
- `/api/youtube-videos` - Gestion des vidéos YouTube
- `/api/init-pins` - Initialisation des PINs

## Variables d'Environnement

Assurez-vous que les variables suivantes sont configurées dans Vercel :

- `DATABASE_URL` - URL de connexion Neon Database
- `JWT_SECRET` - Secret pour les tokens JWT

Voir [VERCEL-ENV-SETUP.md](./VERCEL-ENV-SETUP.md) pour plus de détails.

## Ressources

- [Documentation Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Configuration Vercel](https://vercel.com/docs/projects/project-configuration)
- [VERCEL-ENV-SETUP.md](./VERCEL-ENV-SETUP.md) - Configuration des variables d'environnement


