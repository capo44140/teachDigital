# Guide Rapide de Vérification des Performances

## 🚀 Test Rapide des Optimisations

### 1. Vérification Visuelle

#### Ouvrir l'application en mode développement
```bash
npm run dev
```

#### Ce que vous devriez observer :

✅ **Chargement immédiat du skeleton**
- Le titre "Qui est-ce ?" s'affiche instantanément
- 4 cartes skeleton animées apparaissent immédiatement
- L'effet shimmer est visible sur les cartes

✅ **Chargement progressif**
- Les profils réels remplacent les skeletons après ~300ms
- Pas de "blanc" pendant le chargement
- Transition fluide entre skeleton et contenu réel

✅ **Console logs attendus**
```
🚀 Initialisation asynchrone des services...
📱 Stale-while-revalidate: retour immédiat du cache pour profiles
✅ Profils préchargés
🔧 Initialisation des services PWA...
✅ Services PWA initialisés avec succès
```

---

## 📊 Tests Chrome DevTools

### Test 1 : Network Tab

1. Ouvrir DevTools (F12)
2. Onglet **Network**
3. Activer **Disable cache**
4. Rafraîchir la page (Ctrl+R)

#### Vérifications :
- ✅ `vercel.app` charge en < 100ms
- ✅ `/registerSW.js` charge en parallèle
- ✅ Les chunks JS sont lazy-loaded
- ✅ La requête SQL à Neon ne bloque PAS le premier rendu

### Test 2 : Performance Tab

1. Onglet **Performance**
2. Cliquer sur **Record** (⚫)
3. Rafraîchir la page
4. Arrêter l'enregistrement après 3 secondes

#### Vérifications :
- ✅ FCP (bleu) apparaît < 1s
- ✅ LCP (vert) apparaît < 2.5s
- ✅ Pas de long tasks > 50ms dans les premiers 2s
- ✅ Le thread principal n'est pas bloqué

### Test 3 : Lighthouse

1. Onglet **Lighthouse**
2. Mode : **Mobile**
3. Catégories : **Performance** uniquement
4. Cliquer sur **Analyze page load**

#### Scores attendus :
- ✅ Performance : **> 85/100**
- ✅ FCP : **< 1.0s**
- ✅ LCP : **< 2.5s**
- ✅ TBT : **< 200ms**
- ✅ CLS : **< 0.1**

---

## 🔍 Vérification du Cache

### Test Cache Stale-While-Revalidate

1. Charger l'application une première fois
2. Ouvrir DevTools > Application > Storage
3. Vérifier que les profils sont en cache (LocalStorage)
4. Rafraîchir la page
5. Observer dans Console :

```
📱 Stale-while-revalidate: retour immédiat du cache pour profiles
🔄 Revalidation en arrière-plan pour profiles
✅ Revalidation terminée pour profiles
```

✅ **Les profils s'affichent instantanément depuis le cache**  
✅ **La mise à jour se fait en arrière-plan**

---

## 🌐 Test Connexion Lente

### Simuler une connexion 3G

1. DevTools > Network
2. Throttling : **Slow 3G**
3. Rafraîchir la page

#### Vérifications :
- ✅ Le skeleton s'affiche immédiatement
- ✅ Les profils en cache s'affichent rapidement
- ✅ Pas de "page blanche" pendant le chargement
- ✅ L'application reste responsive

---

## 📱 Test Mobile

### Chrome DevTools Device Emulation

1. DevTools > Toggle device toolbar (Ctrl+Shift+M)
2. Sélectionner : **iPhone 12 Pro**
3. Rafraîchir la page

#### Vérifications :
- ✅ Layout responsive
- ✅ Skeleton adapté au mobile (grid 2 colonnes)
- ✅ Touch events fonctionnent
- ✅ Pas de défilement horizontal

---

## 🐛 Vérifications Console

### Logs Attendus (Premier Chargement)

```
✅ Service Worker enregistré avec succès
🚀 Initialisation asynchrone des services...
📱 Profils préchargés depuis le cache
🔧 Initialisation des services PWA...
✅ Services PWA initialisés avec succès
✅ Données secondaires préchargées
```

### Logs Attendus (Rechargement)

```
📱 Stale-while-revalidate: retour immédiat du cache pour profiles
🔄 Revalidation en arrière-plan pour profiles
✅ Revalidation terminée pour profiles
```

### ⚠️ Warnings Acceptables

```
⚠️ Erreur préchargement profils: Network error
⚠️ Échec de revalidation pour lessons: Offline
```

### ❌ Erreurs à Investiguer

```
❌ Échec de l'initialisation Optimisation Mobile
❌ Aucune donnée disponible pour profiles en mode offline
❌ TypeError: Cannot read property 'map' of undefined
```

---

## 🎯 Checklist Rapide

### Avant de Commit

- [ ] `npm run dev` démarre sans erreur
- [ ] Les skeletons s'affichent immédiatement
- [ ] Les profils se chargent en < 1s
- [ ] Lighthouse Performance > 85
- [ ] Console sans erreurs rouges
- [ ] Test connexion lente OK
- [ ] Test mobile OK

### Avant de Déployer

- [ ] `npm run build` réussit
- [ ] `npm run preview` fonctionne
- [ ] Test en mode production
- [ ] Service Worker enregistré
- [ ] Cache fonctionne offline
- [ ] Bundle size raisonnable (< 150 KB main chunk)

---

## 🔧 Commandes Utiles

### Analyser le Bundle
```bash
npm run analyze
```

### Vérifier les Dépendances
```bash
npm run update:deps:check
```

### Lancer Lighthouse CI
```bash
npx lighthouse https://teach-digital.vercel.app --view
```

### Nettoyer le Cache
```bash
# Dans la console DevTools
localStorage.clear()
caches.keys().then(names => names.forEach(name => caches.delete(name)))
```

---

## 📈 Métriques Cibles

| Métrique | Cible | Actuel (Avant) | Objectif (Après) |
|----------|-------|----------------|------------------|
| FCP | < 1.0s | ~1.5s | ~0.5s |
| LCP | < 2.5s | ~3.0s | ~1.5s |
| TTI | < 3.8s | ~4.5s | ~2.0s |
| TBT | < 300ms | ~500ms | ~100ms |
| Lighthouse | > 90 | ~65 | > 85 |

---

## ❓ Problèmes Courants

### Le skeleton ne s'affiche pas
**Solution** : Vérifier que `ProfileSkeleton.vue` est importé dans `ProfileSelector.vue`

### Les profils ne se chargent pas
**Solution** : Vérifier la connexion à Neon DB et les variables d'environnement

### "requestIdleCallback is not defined"
**Solution** : Le polyfill est déjà implémenté dans `main.js`, vérifier qu'il n'y a pas d'erreur syntaxe

### Le cache ne fonctionne pas
**Solution** : Vérifier que le Service Worker est enregistré et actif

---

**Mise à jour** : 19 octobre 2025  
**Version** : 1.0.0

