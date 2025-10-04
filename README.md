# TeachDigital

Une application Vue.js moderne avec Tailwind CSS 4, optimisée pour le déploiement sur Vercel.

## 🚀 Technologies utilisées

- **Vue.js 3** - Framework JavaScript progressif
- **Vite** - Outil de build rapide et moderne
- **Tailwind CSS 4** - Framework CSS utilitaire
- **PostCSS** - Processeur CSS

## 📦 Installation

1. Installez les dépendances :
```bash
npm install
```

2. Lancez le serveur de développement :
```bash
npm run dev
```

3. Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🏗️ Build pour la production

```bash
npm run build
```

Le build sera généré dans le dossier `dist/`.

## 🚀 Déploiement

Ce projet peut être déployé sur n'importe quelle plateforme qui supporte les applications Vue.js statiques :

- **Netlify** - Déploiement automatique depuis Git
- **GitHub Pages** - Hébergement gratuit
- **Firebase Hosting** - Plateforme Google
- **Surge.sh** - Déploiement simple en ligne de commande

## 📁 Structure du projet

```
teachDigital/
├── public/
├── src/
│   ├── App.vue          # Composant principal
│   ├── main.js          # Point d'entrée
│   └── style.css        # Styles Tailwind CSS
├── index.html           # Template HTML
├── package.json         # Dépendances et scripts
├── vite.config.js       # Configuration Vite
├── postcss.config.mjs   # Configuration PostCSS
└── README.md
```

## 🎨 Personnalisation

Le projet utilise Tailwind CSS 4 avec une configuration moderne. Vous pouvez personnaliser les styles dans `src/style.css` et ajouter vos propres classes utilitaires.

## 📝 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run preview` - Prévisualise le build de production

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.
