# 🔧 Guide de Correction CORS pour Synology

Ce guide vous aide à corriger les erreurs CORS lorsque le frontend Vercel (`https://teach-digital.vercel.app`) appelle le backend Synology (`https://lespoires.synology.me:3002`).

## 🔍 Diagnostic du Problème

L'erreur CORS se produit lorsque :
- Le frontend est sur `https://teach-digital.vercel.app`
- Le backend est sur `https://lespoires.synology.me:3002`
- Le reverse proxy Synology ne transmet pas correctement les en-têtes CORS

## ✅ Solution 1 : Vérifier la Configuration du Reverse Proxy Synology

### Étape 1 : Accéder à la Configuration du Reverse Proxy

1. **Connectez-vous à DSM** (interface web de votre Synology)
2. **Allez dans** : **Panneau de configuration** → **Application Portal** → **Reverse Proxy**
3. **Trouvez la règle** pour `lespoires.synology.me:3002`

### Étape 2 : Vérifier la Configuration de la Règle

#### Onglet "Général"
- **Description** : `TeachDigital Backend API`
- **Protocole** : `HTTPS`
- **Nom d'hôte** : `lespoires.synology.me`
- **Port** : `3002`
- **Activer HSTS** : ✅ (recommandé)
- **Activer HTTP/2** : ✅ (recommandé)

#### Onglet "Destination"
- **Protocole** : `HTTP`
- **Nom d'hôte** : `localhost` (ou `127.0.0.1`)
- **Port** : `3001` (le port interne du conteneur Docker)

#### Onglet "En-têtes personnalisés" (CRITIQUE pour CORS)

**Ajoutez ces en-têtes personnalisés** pour que le reverse proxy transmette correctement les en-têtes CORS :

```
Header name: Access-Control-Allow-Origin
Header value: https://teach-digital.vercel.app

Header name: Access-Control-Allow-Methods
Header value: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD

Header name: Access-Control-Allow-Headers
Header value: Content-Type, Authorization, X-Requested-With, Accept

Header name: Access-Control-Allow-Credentials
Header value: true

Header name: Access-Control-Max-Age
Header value: 86400
```

> ⚠️ **IMPORTANT** : Ne définissez PAS ces en-têtes dans le reverse proxy si le backend les gère déjà (ce qui est le cas avec notre configuration). Le reverse proxy doit seulement **transmettre** l'en-tête `Origin` au backend.

### Étape 3 : Configuration Alternative (Recommandée)

**Au lieu d'ajouter des en-têtes CORS dans le reverse proxy**, assurez-vous que le reverse proxy **transmet** l'en-tête `Origin` au backend :

1. **Dans l'onglet "En-têtes personnalisés"**, **NE PAS** ajouter les en-têtes CORS ci-dessus
2. **Vérifiez que le reverse proxy transmet** :
   - `Origin` (doit être transmis automatiquement)
   - `Host`
   - `X-Forwarded-For`
   - `X-Forwarded-Proto`

3. **Le backend gère déjà les en-têtes CORS** dans `server.js`

## ✅ Solution 2 : Vérifier les Variables d'Environnement

Assurez-vous que le fichier `.env` du backend contient :

```env
# URL du frontend pour CORS
FRONTEND_URL=https://teach-digital.vercel.app
ALLOWED_ORIGIN=https://teach-digital.vercel.app

# Ou pour autoriser plusieurs origines
ALLOWED_ORIGIN=https://teach-digital.vercel.app,https://teachdigital.vercel.app
```

### Où se trouve le fichier `.env` ?

Le fichier `.env` doit être dans le répertoire de déploiement sur Synology :
```
/volume1/docker/teachdigital/backend/.env
```

### Créer/Mettre à jour le fichier `.env`

1. **Connectez-vous en SSH** à votre Synology
2. **Naviguez vers le répertoire** :
   ```bash
   cd /volume1/docker/teachdigital/backend
   ```
3. **Créez ou modifiez** le fichier `.env` :
   ```bash
   nano .env
   ```
4. **Ajoutez les variables** :
   ```env
   FRONTEND_URL=https://teach-digital.vercel.app
   ALLOWED_ORIGIN=https://teach-digital.vercel.app
   ```
5. **Redémarrez le conteneur** :
   ```bash
   docker-compose restart backend
   ```

## ✅ Solution 3 : Vérifier que le Backend est Déployé avec la Nouvelle Configuration

### Étape 1 : Redéployer le Backend

Depuis votre machine locale :

```powershell
cd backend
.\deploy-simple.ps1
```

### Étape 2 : Vérifier les Logs du Conteneur

Connectez-vous en SSH à votre Synology et vérifiez les logs :

```bash
docker logs teachdigital-backend --tail 50
```

Vous devriez voir des logs comme :
```
🚀 Serveur TeachDigital démarré sur le port 3001
📡 Mode: production
🔗 URL: http://0.0.0.0:3001
```

### Étape 3 : Tester une Requête OPTIONS

Testez manuellement une requête OPTIONS (preflight) :

```bash
curl -X OPTIONS \
  -H "Origin: https://teach-digital.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://lespoires.synology.me:3002/api/profiles
```

Vous devriez voir dans la réponse :
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: https://teach-digital.vercel.app
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD
< Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept
< Access-Control-Allow-Credentials: true
```

## ✅ Solution 4 : Configuration Nginx Personnalisée (Si nécessaire)

Si le reverse proxy Synology ne fonctionne pas correctement, vous pouvez utiliser une configuration Nginx personnalisée.

### Créer un fichier `nginx-cors.conf`

```nginx
server {
    listen 3002;
    server_name lespoires.synology.me;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # Transmettre les en-têtes originaux
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Transmettre l'en-tête Origin (CRITIQUE pour CORS)
        proxy_set_header Origin $http_origin;
        
        # Ne PAS définir les en-têtes CORS ici - le backend les gère
    }
}
```

## 🔍 Vérification Finale

### Test 1 : Requête OPTIONS (Preflight)

```bash
curl -X OPTIONS \
  -H "Origin: https://teach-digital.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://lespoires.synology.me:3002/api/profiles
```

**Résultat attendu** : Status 200 avec tous les en-têtes CORS

### Test 2 : Requête GET Réelle

```bash
curl -X GET \
  -H "Origin: https://teach-digital.vercel.app" \
  -v \
  https://lespoires.synology.me:3002/api/profiles
```

**Résultat attendu** : Status 200 avec les données JSON et les en-têtes CORS

### Test 3 : Depuis le Frontend

Ouvrez la console du navigateur sur `https://teach-digital.vercel.app` et vérifiez qu'il n'y a plus d'erreurs CORS.

## 🐛 Dépannage

### Problème : Les en-têtes CORS ne sont pas présents

**Solution** :
1. Vérifiez que le backend est bien redémarré avec la nouvelle configuration
2. Vérifiez les logs du conteneur : `docker logs teachdigital-backend`
3. Vérifiez que le reverse proxy transmet bien l'en-tête `Origin`

### Problème : Erreur "No 'Access-Control-Allow-Origin' header"

**Solution** :
1. Vérifiez que `FRONTEND_URL` est bien défini dans `.env`
2. Vérifiez que `https://teach-digital.vercel.app` est dans la liste des origines autorisées dans `server.js`
3. Redéployez le backend

### Problème : Le reverse proxy bloque les requêtes OPTIONS

**Solution** :
1. Vérifiez que le reverse proxy n'a pas de règles qui bloquent OPTIONS
2. Vérifiez que le backend répond bien aux requêtes OPTIONS (testez directement sur `localhost:3001`)

## 📝 Checklist de Vérification

- [ ] Le backend est redéployé avec la nouvelle configuration CORS
- [ ] Le fichier `.env` contient `FRONTEND_URL=https://teach-digital.vercel.app`
- [ ] Le reverse proxy transmet l'en-tête `Origin` au backend
- [ ] Le reverse proxy ne définit PAS les en-têtes CORS (le backend les gère)
- [ ] Le conteneur Docker est redémarré après les modifications
- [ ] Les logs du conteneur montrent que le serveur démarre correctement
- [ ] La requête OPTIONS retourne un status 200 avec les en-têtes CORS
- [ ] La requête GET fonctionne depuis le frontend

## 🎯 Résumé

Le problème CORS est résolu en :
1. ✅ Simplifiant la configuration CORS dans `server.js` (déjà fait)
2. ✅ S'assurant que le reverse proxy transmet l'en-tête `Origin`
3. ✅ Configurant `FRONTEND_URL` dans le fichier `.env`
4. ✅ Redéployant le backend avec la nouvelle configuration

Le backend gère maintenant automatiquement les en-têtes CORS pour toutes les requêtes, y compris les requêtes preflight OPTIONS.

