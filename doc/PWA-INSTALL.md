# 📱 Installation PWA - TeachDigital

## 🎯 Comment installer l'application sur votre iPhone

### Méthode 1 : Via Safari (Recommandée)
1. **Ouvrez Safari** sur votre iPhone
2. **Naviguez** vers votre application TeachDigital
3. **Touchez l'icône de partage** (carré avec flèche vers le haut)
4. **Sélectionnez "Sur l'écran d'accueil"**
5. **Personnalisez** le nom si souhaité
6. **Touchez "Ajouter"**

### Méthode 2 : Via Chrome (Android)
1. **Ouvrez Chrome** sur votre appareil
2. **Naviguez** vers votre application TeachDigital
3. **Touchez le menu** (3 points)
4. **Sélectionnez "Ajouter à l'écran d'accueil"**
5. **Confirmez** l'installation

## ✨ Fonctionnalités PWA

### 🎨 Icône moderne
- **Design éducatif** avec livre ouvert et tablette
- **Couleurs attrayantes** : bleu dégradé avec accents dorés
- **Multiples tailles** : 16x16 à 512x512 pixels
- **Optimisée** pour tous les appareils

### 🚀 Performance
- **Service Worker** pour la mise en cache
- **Chargement rapide** même hors ligne
- **Interface native** sur mobile
- **Notifications push** (à venir)

### 🔒 Sécurité
- **Code PIN** pour les profils administrateurs
- **Gestion des profils** sécurisée
- **Données locales** protégées

## 🛠️ Développement

### Génération des icônes
```bash
pnpm run generate-icons
```

### Build avec icônes
```bash
pnpm run build
```

### Test local
```bash
pnpm run dev
```

## 📋 Spécifications techniques

- **Manifest PWA** : `/public/manifest.json`
- **Service Worker** : `/public/sw.js`
- **Icônes** : `/public/icons/`
- **Favicons** : `/public/favicon-*.png`

## 🎨 Design de l'icône

L'icône représente :
- 📚 **Livre ouvert** : Apprentissage et éducation
- 📱 **Tablette** : Technologie numérique
- 👥 **Profils colorés** : Gestion des utilisateurs
- 🔒 **Cadenas** : Sécurité et protection
- **TD** : Initiales de TeachDigital

## 🔧 Configuration

Toutes les icônes sont générées automatiquement à partir du fichier SVG source (`/public/icon.svg`) et optimisées pour :
- iOS (iPhone/iPad)
- Android
- Desktop (Chrome, Firefox, Safari)
- PWA (Progressive Web App)
