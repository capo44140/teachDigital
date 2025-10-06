# TeachDigital

Une application Vue.js moderne avec Tailwind CSS 4, optimisée pour le déploiement sur Vercel avec configuration de production avancée.

## 🚀 Technologies utilisées

- **Vue.js 3** - Framework JavaScript progressif
- **Vite** - Outil de build rapide et moderne
- **Tailwind CSS 4** - Framework CSS utilitaire
- **PostCSS** - Processeur CSS
- **Pinia** - Gestion d'état Vue.js
- **Neon Database** - Base de données PostgreSQL serverless
- **Vercel** - Plateforme de déploiement optimisée

## 📦 Installation

Ce projet utilise **pnpm** comme gestionnaire de paquets pour de meilleures performances.

1. Installez les dépendances :
```bash
pnpm install
```

2. Lancez le serveur de développement :
```bash
pnpm run dev
```

3. Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🏗️ Build pour la production

```bash
pnpm run build
```

Le build sera généré dans le dossier `dist/` avec optimisations avancées :
- Minification avec Terser
- Chunking intelligent des vendors
- Noms de fichiers avec hash pour le cache
- Configuration de production dédiée

## 🚀 Déploiement Vercel

Ce projet est optimisé pour Vercel avec une configuration de production avancée :

### Configuration Vercel recommandée :
- **Build Command** : `pnpm run build`
- **Output Directory** : `dist`
- **Install Command** : `pnpm install`
- **Framework** : `vite`

### Fonctionnalités de déploiement :
- **Cache optimisé** - Headers de cache pour les assets statiques
- **Build rapide** - Configuration Vite optimisée pour la production
- **Variables d'environnement** - Support complet des variables Neon Database
- **PWA Ready** - Service Worker et manifest configurés

### Autres plateformes supportées :
- **Netlify** - Déploiement automatique depuis Git
- **GitHub Pages** - Hébergement gratuit
- **Firebase Hosting** - Plateforme Google

## 📁 Structure du projet

```
teachDigital/
├── public/              # Assets statiques et PWA
├── src/
│   ├── components/      # Composants Vue.js
│   ├── services/        # Services (DB, AI, etc.)
│   ├── stores/          # Gestion d'état Pinia
│   ├── config/          # Configuration (DB, PIN)
│   ├── router/          # Configuration Vue Router
│   ├── App.vue          # Composant principal
│   ├── main.js          # Point d'entrée
│   └── style.css        # Styles Tailwind CSS
├── scripts/             # Scripts de migration et utilitaires
├── dist/                # Build de production
├── index.html           # Template HTML
├── package.json         # Dépendances et scripts
├── vite.config.js       # Configuration Vite (dev)
├── vite.config.prod.js  # Configuration Vite (production)
├── vercel.json          # Configuration Vercel
├── postcss.config.mjs   # Configuration PostCSS
└── README.md
```

## 🎨 Personnalisation

Le projet utilise Tailwind CSS 4 avec une configuration moderne. Vous pouvez personnaliser les styles dans `src/style.css` et ajouter vos propres classes utilitaires.

## 📝 Scripts disponibles

### Scripts de développement :
- `pnpm run dev` - Lance le serveur de développement
- `pnpm run build` - Construit l'application pour la production
- `pnpm run preview` - Prévisualise le build de production

### Scripts de base de données :
- `pnpm run init-db` - Initialise la base de données
- `pnpm run db:test` - Teste la connexion à la base de données
- `pnpm run migrate-db` - Migre la base de données
- `pnpm run migrate-pins` - Migre les codes PIN
- `pnpm run migrate-teens` - Migre les profils adolescents

### Scripts utilitaires :
- `pnpm run generate-icons` - Génère les icônes PWA
- `pnpm run test-pin-security` - Teste la sécurité des codes PIN
- `pnpm run version:patch` - Incrémente la version (patch)
- `pnpm run version:minor` - Incrémente la version (minor)
- `pnpm run version:major` - Incrémente la version (major)

## 🔧 Configuration Vercel

Pour déployer sur Vercel, assurez-vous que les paramètres suivants sont configurés :

1. **Framework Settings** :
   - Framework Preset : `Vite`
   - Build Command : `pnpm run build`
   - Output Directory : `dist`
   - Install Command : `pnpm install`
   - Development Command : `vite`

2. **Variables d'environnement** (à configurer dans Vercel) :
   - `DATABASE_URL` - URL de connexion Neon Database
   - `VITE_DATABASE_URL` - URL publique pour le client
   - `NEON_HOST`, `NEON_DATABASE`, `NEON_USERNAME`, `NEON_PASSWORD`, `NEON_PORT`

3. **Activation des Overrides** :
   - Activez tous les toggles "Override" dans l'interface Vercel
   - Cela synchronise les paramètres de projet avec ceux de production

## 🚀 Fonctionnalités avancées

- **PWA Ready** - Application Web Progressive avec Service Worker
- **Gestion d'état** - Pinia pour la gestion d'état Vue.js
- **Base de données** - Intégration Neon Database PostgreSQL
- **Sécurité** - Système de codes PIN avec chiffrement
- **Cache optimisé** - Headers de cache configurés pour Vercel
- **Build optimisé** - Configuration de production dédiée

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.
