# Guide de Résolution des Problèmes VAPID et CORS

## 🚨 Problème Résolu

**Erreur** : `https://teachdigital.vercel.app/api/vapid-public-key' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`

**Cause** : L'endpoint `/api/vapid-public-key` n'existait pas dans l'API backend.

## ✅ Solutions Implémentées

### 1. **Nouvel Endpoint VAPID**

Créé `backend/api/vapid-public-key.js` :

```javascript
export default async function handler(req, res) {
  // Configuration CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Retourner la clé VAPID publique
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  return successResponse(res, { publicKey: vapidPublicKey });
}
```

### 2. **Configuration des Variables d'Environnement**

Ajouté dans `backend/env.example` :

```env
# Clés VAPID pour les notifications push
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
```

### 3. **Scripts de Gestion**

- **`scripts/generate-vapid-keys.js`** : Génération des clés VAPID
- **`scripts/test-vapid-endpoint.js`** : Test de l'endpoint

## 🛠️ Configuration Requise

### **1. Générer les Clés VAPID**

```bash
# Générer les clés VAPID
pnpm run generate-vapid

# Ou utiliser web-push directement
npx web-push generate-vapid-keys
```

### **2. Configurer les Variables d'Environnement**

#### **Backend (Vercel)**
```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI8F8j8K4pQpVUfXz5JZvKz4L8uQ1Cz2vB3hF6gE9iD2cA5bB8eF1gH4jK7lM0nP3qR6sT9uV2wX5yZ8
VAPID_PRIVATE_KEY=your_private_key_here
```

#### **Frontend (.env.local)**
```env
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI8F8j8K4pQpVUfXz5JZvKz4L8uQ1Cz2vB3hF6gE9iD2cA5bB8eF1gH4jK7lM0nP3qR6sT9uV2wX5yZ8
```

### **3. Déployer l'API**

```bash
# Déployer sur Vercel
cd backend
vercel --prod
```

## 🧪 Tests et Validation

### **1. Tester l'Endpoint**

```bash
# Tester l'endpoint VAPID
pnpm run test-vapid

# Test manuel avec curl
curl -H "Origin: http://localhost:3000" \
     https://teachdigital.vercel.app/api/vapid-public-key
```

### **2. Vérifier les Headers CORS**

L'endpoint doit retourner :

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### **3. Réponse Attendue**

```json
{
  "success": true,
  "data": {
    "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa40HI8F8j8K4pQpVUfXz5JZvKz4L8uQ1Cz2vB3hF6gE9iD2cA5bB8eF1gH4jK7lM0nP3qR6sT9uV2wX5yZ8"
  }
}
```

## 🔧 Résolution des Problèmes

### **Problème : Endpoint 404**

**Symptômes** :
- Erreur 404 lors de l'appel à `/api/vapid-public-key`
- Endpoint non trouvé

**Solutions** :
1. Vérifier que le fichier `backend/api/vapid-public-key.js` existe
2. Redéployer l'API sur Vercel
3. Vérifier la configuration `vercel.json`

### **Problème : Erreur CORS**

**Symptômes** :
- `Access-Control-Allow-Origin` manquant
- Requête bloquée par le navigateur

**Solutions** :
1. Vérifier les headers CORS dans l'endpoint
2. Tester avec `pnpm run test-vapid`
3. Vérifier la configuration `vercel.json`

### **Problème : Clé VAPID Manquante**

**Symptômes** :
- Réponse avec clé de développement
- Message d'avertissement dans les logs

**Solutions** :
1. Générer les clés VAPID : `pnpm run generate-vapid`
2. Configurer `VAPID_PUBLIC_KEY` dans Vercel
3. Redéployer l'API

### **Problème : Variables d'Environnement**

**Symptômes** :
- Clé VAPID non configurée
- Erreur de configuration

**Solutions** :
1. Vérifier les variables dans Vercel Dashboard
2. Utiliser `vercel env add VAPID_PUBLIC_KEY`
3. Redéployer après ajout des variables

## 📱 Intégration Frontend

### **Service de Notifications Push**

```javascript
// Dans pushNotificationService.js
async getVapidPublicKey() {
  try {
    const response = await fetch('/api/vapid-public-key');
    const data = await response.json();
    return data.data.publicKey;
  } catch (error) {
    console.error('Erreur lors de la récupération de la clé VAPID:', error);
    throw error;
  }
}
```

### **Configuration PWA**

```javascript
// Dans vite.config.js
define: {
  'process.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(process.env.VITE_VAPID_PUBLIC_KEY)
}
```

## 🚀 Déploiement

### **1. Préparer le Déploiement**

```bash
# Générer les clés VAPID
pnpm run generate-vapid

# Tester localement
pnpm run test-vapid
```

### **2. Déployer sur Vercel**

```bash
# Déployer l'API
cd backend
vercel --prod

# Vérifier le déploiement
curl https://teachdigital.vercel.app/api/vapid-public-key
```

### **3. Configurer les Variables**

Dans Vercel Dashboard :
1. Aller dans Settings > Environment Variables
2. Ajouter `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY`
3. Redéployer si nécessaire

## 🔒 Sécurité

### **Bonnes Pratiques**

- ✅ Garder la clé privée SECRÈTE
- ✅ Ne jamais commiter les clés dans le code
- ✅ Utiliser des variables d'environnement
- ✅ Régénérer les clés pour la production
- ✅ Limiter l'accès à l'endpoint VAPID

### **Variables Sensibles**

```env
# ❌ NE PAS COMMITER
VAPID_PRIVATE_KEY=your_secret_private_key

# ✅ Peut être publique
VAPID_PUBLIC_KEY=your_public_key
```

## 📊 Monitoring

### **Logs à Surveiller**

```bash
# Logs Vercel
vercel logs

# Logs de l'endpoint
console.log('VAPID endpoint appelé:', req.headers.origin);
```

### **Métriques Importantes**

- Taux de réussite des requêtes VAPID
- Temps de réponse de l'endpoint
- Erreurs CORS
- Utilisation des notifications push

---

*L'endpoint VAPID est maintenant configuré et prêt pour les notifications push PWA.*
