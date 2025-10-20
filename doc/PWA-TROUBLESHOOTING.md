# Guide de Résolution des Problèmes PWA - TeachDigital

## 🚨 Problèmes Courants et Solutions

### 1. Erreur de Screenshots Manquants

**Problème**: `Error while trying to use the following icon from the Manifest: http://localhost:3000/screenshots/desktop-1.png`

**Cause**: Le manifest.json fait référence à des screenshots qui n'existent pas.

**Solution**:
```bash
# Supprimer les références aux screenshots du manifest.json
# Ou créer les screenshots manquants
pnpm run validate-manifest
```

**Prévention**: Utiliser le script de validation avant le déploiement.

### 2. Service Worker Non Enregistré

**Problème**: Le Service Worker ne se charge pas ou ne fonctionne pas.

**Diagnostic**:
```javascript
// Dans la console du navigateur
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

**Solutions**:
- Vérifier que le fichier `/sw.js` existe
- Vérifier les erreurs dans la console
- S'assurer que l'application est servie en HTTPS (ou localhost)

### 3. Manifest PWA Non Détecté

**Problème**: L'application n'est pas reconnue comme PWA.

**Diagnostic**:
```bash
# Valider le manifest
pnpm run validate-manifest

# Vérifier dans Chrome DevTools
# Application > Manifest
```

**Solutions**:
- Vérifier que le manifest.json est accessible
- Valider la syntaxe JSON
- S'assurer que toutes les icônes référencées existent

### 4. Notifications Push Non Fonctionnelles

**Problème**: Les notifications push ne s'affichent pas.

**Diagnostic**:
```javascript
// Vérifier le support
console.log('Notifications supportées:', 'Notification' in window);
console.log('Permission:', Notification.permission);
```

**Solutions**:
- Vérifier que l'application est en HTTPS
- Demander la permission explicitement

### 5. Installation PWA Échouée

**Problème**: L'application ne peut pas être installée.

**Conditions requises**:
- Service Worker enregistré
- Manifest PWA valide
- HTTPS (ou localhost)
- Icônes dans toutes les tailles requises

**Diagnostic**:
```javascript
// Vérifier les conditions d'installation
if ('serviceWorker' in navigator && 'PushManager' in window) {
  console.log('PWA installable');
}
```

## 🔧 Outils de Diagnostic

### 1. Composant PWAStatus

Utilisez le composant `PWAStatus.vue` pour diagnostiquer les problèmes :

```vue
<template>
  <PWAStatus />
</template>

<script>
import PWAStatus from '@/components/PWAStatus.vue'

export default {
  components: { PWAStatus }
}
</script>
```

### 2. Script de Validation

```bash
# Valider le manifest
pnpm run validate-manifest

# Tester les services PWA
node scripts/test-pwa-services.js
```

### 3. Chrome DevTools

**Application Tab**:
- Manifest: Vérifier la validité
- Service Workers: Vérifier l'enregistrement
- Storage: Vérifier les caches

**Lighthouse**:
- Auditer les performances PWA
- Vérifier les bonnes pratiques

## 📱 Tests de Compatibilité

### Navigateurs Supportés

| Navigateur | Service Worker | Notifications | Installation |
|------------|----------------|---------------|--------------|
| Chrome     | ✅             | ✅            | ✅           |
| Firefox    | ✅             | ✅            | ✅           |
| Safari     | ✅             | ⚠️            | ⚠️           |
| Edge       | ✅             | ✅            | ✅           |

### Tests Recommandés

1. **Test de base**:
   ```bash
   pnpm run dev
   # Ouvrir http://localhost:3000
   # Vérifier la console pour les erreurs
   ```

2. **Test de build**:
   ```bash
   pnpm run build
   pnpm run preview
   # Tester l'application en production
   ```

3. **Test d'installation**:
   - Ouvrir l'application
   - Attendre le prompt d'installation
   - Tester l'installation

## 🚀 Déploiement et Production

### Prérequis de Production

1. **HTTPS obligatoire** pour les notifications push
2. **Manifest valide** avec toutes les icônes
3. **Service Worker** fonctionnel
4. **Variables d'environnement** configurées

### Checklist de Déploiement

- [ ] Manifest PWA validé
- [ ] Service Worker testé
- [ ] Icônes générées
- [ ] HTTPS configuré
- [ ] Variables d'environnement définies
- [ ] Tests de compatibilité effectués

### Variables d'Environnement Requises

```env
# Production
VITE_API_URL=https://teachdigital.vercel.app

# Base de données
DATABASE_URL=your_database_url
```

## 🔍 Debugging Avancé

### Logs de Service Worker

```javascript
// Dans sw.js
self.addEventListener('install', event => {
  console.log('SW: Install', event);
});

self.addEventListener('activate', event => {
  console.log('SW: Activate', event);
});

self.addEventListener('fetch', event => {
  console.log('SW: Fetch', event.request.url);
});
```

### Monitoring des Erreurs

```javascript
// Dans main.js
window.addEventListener('error', event => {
  console.error('Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', event => {
  console.error('Promesse rejetée:', event.reason);
});
```

### Cache Debugging

```javascript
// Vérifier les caches
caches.keys().then(names => {
  console.log('Caches disponibles:', names);
});

// Vérifier le contenu d'un cache
caches.open('teachdigital-static-v2').then(cache => {
  cache.keys().then(requests => {
    console.log('Ressources en cache:', requests);
  });
});
```

## 📊 Métriques de Performance

### Indicateurs Clés

- **Time to Interactive (TTI)**: < 3.5s
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

### Optimisations

1. **Lazy Loading**: Composants et images
2. **Code Splitting**: Chunks optimisés
3. **Cache Strategy**: Stratégies adaptées
4. **Compression**: Assets minifiés

## 🆘 Support et Ressources

### Documentation

- [PWA Guidelines](PWA-GUIDELINES.md)
- [Service Worker Guide](SERVICE-WORKER-GUIDE.md)
- [Performance Guide](PERFORMANCE-GUIDE.md)

### Outils Externes

- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)

### Commandes Utiles

```bash
# Validation complète
pnpm run validate-manifest

# Test des services
node scripts/test-pwa-services.js

# Build et test
pnpm run build && pnpm run preview

# Audit Lighthouse
npx lighthouse http://localhost:3000 --view
```

---

*Pour plus d'aide, consultez les logs de la console ou utilisez le composant PWAStatus pour un diagnostic automatique.*
