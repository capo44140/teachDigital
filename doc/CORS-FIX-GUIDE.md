# Guide de Correction de l'Erreur CORS sur Vercel

## 📋 Résumé du Problème

**Erreur reçue :**
```
Access to fetch at 'https://backend-sepia-mu.vercel.app/api/profiles' from origin 
'https://teach-digital.vercel.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

### Cause
- La requête **OPTIONS (preflight)** sent par le navigateur n'a pas retourné HTTP 200
- Les headers CORS ne sont pas correctement configurés
- Conflit entre les configurations CORS au niveau Vercel et au niveau du code

---

## 🔧 Solutions Appliquées

### 1. **Mise à jour de `backend/vercel.json`**
   - ✅ Ajout de `Access-Control-Max-Age: 86400` (cache preflight 24h)
   - ✅ Ajout du header `Vary: Origin` (important pour la cache)
   - ✅ Ajout de `PATCH` et `HEAD` dans les méthodes autorisées
   - ✅ Simplification du rewrite (pas de `$1` inutile)

### 2. **Amélioration de `backend/api/index.js`**
   - ✅ Gestion garantie de OPTIONS avec HTTP 200
   - ✅ Headers CORS complets sur toutes les réponses
   - ✅ Support des headers supplémentaires (X-Requested-With)

### 3. **Configuration du frontend**
   - ✅ Création de `VITE_API_URL_PROD` pour la production
   - ✅ Logique d'environnement intelligente dans `apiService.js`
   - ✅ Distinction dev/prod dans la sélection de l'URL

---

## 📝 Checklist de Déploiement

Avant de redéployer sur Vercel :

- [ ] Vérifier que `backend/vercel.json` est correct
- [ ] Vérifier que `backend/api/index.js` gère OPTIONS correctement
- [ ] Vérifier que `.env.local` a `VITE_API_URL_PROD` correct
- [ ] Redéployer le backend : `cd backend && git push`
- [ ] Redéployer le frontend : `cd .. && git push`
- [ ] Attendre la fin du build sur les deux projets Vercel
- [ ] Tester dans les DevTools (Network tab)

---

## 🧪 Test de CORS

### Depuis les DevTools du navigateur :

1. **Ouvrir Console → Network**
2. Chercher la requête à `backend-sepia-mu.vercel.app/api/profiles`
3. Cliquer dessus et vérifier les **Response Headers** :

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Vary: Origin
```

4. Vérifier aussi la requête **OPTIONS** (preflight) :
   - Elle doit retourner **HTTP 200** (ou 204)
   - Avec tous les headers CORS

### Depuis le terminal :

```bash
# Tester une requête OPTIONS (preflight)
curl -X OPTIONS https://backend-sepia-mu.vercel.app/api/profiles \
  -H "Origin: https://teach-digital.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Tester une vraie requête GET
curl -X GET https://backend-sepia-mu.vercel.app/api/profiles \
  -H "Origin: https://teach-digital.vercel.app" \
  -H "Content-Type: application/json" \
  -v
```

---

## ⚙️ Configuration Détaillée

### Fichier : `backend/vercel.json`

La section `headers` s'applique à tous les chemins matching `/api/(.*)` :

```json
"headers": [
  {
    "source": "/api/(.*)",
    "headers": [
      {
        "key": "Access-Control-Allow-Origin",
        "value": "*"
      },
      // ... autres headers
    ]
  }
]
```

### Fichier : `backend/api/index.js`

Le handler ajoute les headers CORS sur **toutes les réponses** :

```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

// Gérer les requêtes OPTIONS
if (req.method === 'OPTIONS') {
  res.status(200).end();
  return;
}
```

### Fichier : `.env.local`

```env
# Dev local
VITE_API_URL=http://localhost:3001

# Production Vercel
VITE_API_URL_PROD=https://backend-sepia-mu.vercel.app
```

### Fichier : `src/services/apiService.js`

```javascript
const isDevelopment = import.meta.env.DEV;
this.baseURL = isDevelopment 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_URL_PROD || 'https://backend-sepia-mu.vercel.app');
```

---

## 🐛 Dépannage

### Problème : "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solution :** Vérifier que tous les handlers retournent les headers CORS

### Problème : "Preflight request failed (HTTP 404)"
**Solution :** Le rewrite est incorrect. Vérifier `backend/vercel.json`

### Problème : "The CORS protocol does not allow specifying a wildcard (*) for credentials"
**Solution :** Retirer `Access-Control-Allow-Credentials: true` si on utilise `*`

### Problème : Les requêtes fonctionnent en dev mais pas en prod
**Solution :** Vérifier `VITE_API_URL_PROD` dans `.env.local`

---

## 📚 Ressources

- [MDN - CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)
- [Vercel - CORS Documentation](https://vercel.com/docs/edge-network/headers)
- [Vercel - Functions Deployment](https://vercel.com/docs/functions/serverless-functions)
- [Understanding CORS Preflight Requests](https://developer.chrome.com/blog/private-network-access-preflight/)

---

## ✅ Prochaines Étapes

1. Commit les changements : 
   ```bash
   git add .
   git commit -m "fix: corriger configuration CORS Vercel pour le backend"
   ```

2. Push sur GitHub (Vercel redéploiera automatiquement)
   ```bash
   git push origin main
   ```

3. Vérifier les logs Vercel du backend dans le dashboard

4. Tester avec un vrai utilisateur depuis la production

5. Ajouter des logs de debug temporaires si l'erreur persiste
