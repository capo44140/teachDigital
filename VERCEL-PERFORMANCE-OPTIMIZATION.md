# Optimisations Vercel pour TeachDigital

## 🚀 Configuration Vercel Optimale

### Headers de Performance

Créer ou mettre à jour `vercel.json` :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(icons|models)/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/backend/api/:path*"
    }
  ],
  "functions": {
    "backend/api/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

---

## 🔧 Optimisations Build

### Configuration Vite pour Vercel

Mettre à jour `vite.config.js` :

```javascript
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Retirer console.log en production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Optimiser les chunks pour le cache
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-utils': ['@vladmandic/face-api'],
          'vendor-ui': ['tailwindcss']
        }
      }
    },
    // Améliorer la performance de build
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000
  },
  
  // Optimiser les dépendances
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['@vladmandic/face-api']
  }
})
```

---

## 🌐 Edge Functions vs Serverless

### Recommandations

#### Utiliser Edge Functions pour :
- ✅ Routes d'API légères (< 1MB)
- ✅ Authentification/Authorization
- ✅ Redirections dynamiques
- ✅ Headers personnalisés

#### Utiliser Serverless Functions pour :
- ✅ Requêtes base de données Neon
- ✅ Traitement d'images
- ✅ Génération de contenu IA
- ✅ Webhooks externes

### Configuration Edge Functions

```javascript
// backend/api/auth.js (Edge Function example)
export const config = {
  runtime: 'edge'
}

export default async function handler(req) {
  // Logique légère et rapide
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  })
}
```

---

## 📦 Compression et CDN

### Activer la Compression

Vercel active automatiquement :
- ✅ Gzip
- ✅ Brotli (meilleure compression)

### Vérifier la Compression

```bash
curl -H "Accept-Encoding: br,gzip" -I https://teach-digital.vercel.app
```

Chercher : `Content-Encoding: br` ou `gzip`

### Optimiser les Assets Statiques

```javascript
// vite.config.js
export default defineConfig({
  build: {
    assetsInlineLimit: 4096, // Inline les assets < 4KB
    cssCodeSplit: true, // Split CSS par route
  }
})
```

---

## 🔍 Analytics et Monitoring

### Activer Web Analytics

1. Dashboard Vercel > Projet > Analytics
2. Activer **Web Analytics**
3. Installer le package :

```bash
npm install @vercel/analytics
```

4. Ajouter dans `src/main.js` :

```javascript
import { inject } from '@vercel/analytics'

// Initialiser les analytics
if (import.meta.env.PROD) {
  inject()
}
```

### Activer Speed Insights

```bash
npm install @vercel/speed-insights
```

```javascript
// src/main.js
import { injectSpeedInsights } from '@vercel/speed-insights'

if (import.meta.env.PROD) {
  injectSpeedInsights()
}
```

---

## 🚀 Préconnexion DNS

### Optimiser les Connexions Externes

Ajouter dans `index.html` :

```html
<head>
  <!-- Préconnexion à Neon Database -->
  <link rel="preconnect" href="https://api-c2-us-east-1.aws.neon.tech">
  <link rel="dns-prefetch" href="https://api-c2-us-east-1.aws.neon.tech">
  
  <!-- Préconnexion à Vercel Functions -->
  <link rel="preconnect" href="https://teach-digital.vercel.app">
  
  <!-- Précharger les fonts critiques -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
</head>
```

---

## 📊 Variables d'Environnement

### Configuration Optimale

Dans Vercel Dashboard > Settings > Environment Variables :

```bash
# Base de données
DATABASE_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Performance
VITE_ENABLE_CACHE=true
VITE_CACHE_MAX_AGE=1800000
VITE_STALE_WHILE_REVALIDATE=true

# Build optimizations
VITE_DROP_CONSOLE=true
VITE_MINIFY=true

# Analytics
VERCEL_ANALYTICS_ID=auto
```

---

## 🔄 Déploiement Optimisé

### Script de Build

Créer `scripts/vercel-build.js` :

```javascript
import { execSync } from 'child_process'
import fs from 'fs'

console.log('🚀 Build Vercel optimisé...')

// 1. Clean
console.log('🧹 Nettoyage...')
execSync('rm -rf dist', { stdio: 'inherit' })

// 2. Build optimisé
console.log('📦 Build de production...')
execSync('npm run build', { 
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    VITE_DROP_CONSOLE: 'true'
  }
})

// 3. Optimiser les assets
console.log('🎨 Optimisation des assets...')
// Logique d'optimisation d'images, etc.

// 4. Générer le sitemap
console.log('🗺️ Génération du sitemap...')
// Logique de génération du sitemap

console.log('✅ Build terminé avec succès!')
```

### Ajouter dans `package.json` :

```json
{
  "scripts": {
    "vercel-build": "node scripts/vercel-build.js"
  }
}
```

---

## 🎯 Optimisations Database

### Connection Pooling Neon

```javascript
// backend/lib/database.js
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Configuration optimisée pour Vercel
neonConfig.fetchConnectionCache = true
neonConfig.webSocketConstructor = ws

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 20, // Pool size optimal pour Vercel
  idleTimeoutMillis: 30000
})

export default pool
```

### Query Optimization

```javascript
// Utiliser des requêtes préparées
const getProfiles = pool.prepare(`
  SELECT id, name, avatar_class 
  FROM profiles 
  WHERE is_active = true
  ORDER BY created_at DESC
`)

// Limiter les résultats
const profiles = await getProfiles.all()
```

---

## 📈 Monitoring des Performances

### Créer un Dashboard Custom

```javascript
// src/services/performanceMonitoring.js
export class PerformanceMonitor {
  static trackMetric(name, value) {
    if (window.performance && window.performance.mark) {
      performance.mark(name)
    }
    
    // Envoyer à Vercel Analytics
    if (window.va) {
      window.va('track', name, { value })
    }
  }
  
  static trackPageLoad() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.trackMetric('fcp', entry.domContentLoadedEventEnd)
            this.trackMetric('lcp', entry.loadEventEnd)
          }
        }
      })
      
      observer.observe({ entryTypes: ['navigation', 'paint'] })
    }
  }
}
```

### Utiliser dans l'application

```javascript
// src/main.js
import { PerformanceMonitor } from './services/performanceMonitoring.js'

app.mount('#app')
PerformanceMonitor.trackPageLoad()
```

---

## 🔒 Sécurité et Performance

### Content Security Policy

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://api-c2-us-east-1.aws.neon.tech https://*.vercel.app; font-src 'self' data:;"
        }
      ]
    }
  ]
}
```

---

## ✅ Checklist Déploiement Vercel

### Avant le Premier Déploiement

- [ ] Variables d'environnement configurées
- [ ] `vercel.json` optimisé
- [ ] Headers de cache configurés
- [ ] Analytics activés
- [ ] DNS préconnexion configurée
- [ ] Build script optimisé

### À Chaque Déploiement

- [ ] `npm run build` réussit localement
- [ ] Lighthouse score > 85
- [ ] Tests e2e passent
- [ ] Pas d'erreurs console
- [ ] Database migrations appliquées
- [ ] Vérification post-déploiement

### Post-Déploiement

- [ ] Vérifier les logs Vercel
- [ ] Tester l'application en production
- [ ] Vérifier Web Analytics
- [ ] Monitorer les métriques de performance
- [ ] Vérifier le Service Worker

---

## 🎓 Ressources

### Documentation Officielle
- [Vercel Performance Best Practices](https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching)
- [Vercel Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)
- [Vercel Analytics](https://vercel.com/docs/analytics)

### Outils Utiles
- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [Neon Database Docs](https://neon.tech/docs/introduction)

---

**Mise à jour** : 19 octobre 2025  
**Version** : 1.0.0

