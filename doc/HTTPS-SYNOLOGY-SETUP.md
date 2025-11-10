# 🔒 Guide de Configuration HTTPS sur Synology

Ce guide vous explique comment configurer HTTPS pour votre application TeachDigital sur Synology en utilisant le Reverse Proxy intégré.

## 📋 Prérequis

- Synology NAS avec DSM 7.0 ou supérieur
- Application TeachDigital déjà déployée et accessible en HTTP
- Domaine configuré (ex: `lespoires.synology.me`)
- Accès administrateur à votre Synology

## 🎯 Objectif

Configurer `https://lespoires.synology.me:3001` avec un certificat SSL valide.

## 🚀 Méthode 1 : Reverse Proxy Synology (Recommandé)

### Étape 1 : Obtenir un Certificat SSL avec Let's Encrypt

1. **Ouvrez le Panneau de configuration** de votre Synology
2. **Allez dans "Sécurité"** → **"Certificat"**
3. **Cliquez sur "Ajouter"** → **"Ajouter un nouveau certificat"**
4. **Sélectionnez "Obtenir un certificat depuis Let's Encrypt"**
5. **Remplissez le formulaire** :
   - **Nom du domaine** : `lespoires.synology.me`
   - **Domaine** : `lespoires.synology.me`
   - **E-mail** : Votre adresse e-mail (pour les notifications)
   - **Description** : `TeachDigital SSL Certificate`
6. **Cliquez sur "Appliquer"**
7. **Attendez** que le certificat soit généré (peut prendre quelques minutes)

> ⚠️ **Important** : Pour que Let's Encrypt fonctionne, votre domaine doit pointer vers l'IP publique de votre Synology et le port 80 doit être accessible depuis Internet.

### Étape 2 : Configurer le Reverse Proxy

1. **Ouvrez le Panneau de configuration** → **"Application Portal"** → **"Reverse Proxy"**
2. **Cliquez sur "Créer"** → **"Règle de reverse proxy"**
3. **Configurez la règle** :

#### Onglet "Général"

- **Description** : `TeachDigital Backend HTTPS`
- **Protocole** : `HTTPS`
- **Nom d'hôte** : `lespoires.synology.me`
- **Port** : `3001`
- **Activer HSTS** : ✅ (recommandé)
- **Activer HTTP/2** : ✅ (recommandé)

#### Onglet "Destination"

- **Protocole** : `HTTP`
- **Nom d'hôte** : `localhost` (ou l'IP interne de votre conteneur)
- **Port** : `3001`

#### Onglet "Certificat SSL**

- **Certificat** : Sélectionnez le certificat Let's Encrypt créé à l'étape 1

4. **Cliquez sur "Enregistrer"**

### Étape 3 : Configurer le Pare-feu

1. **Ouvrez le Panneau de configuration** → **"Pare-feu"**
2. **Créez une règle** pour autoriser le port 3001 :
   - **Nom** : `TeachDigital HTTPS`
   - **Port** : `3001`
   - **Protocole** : `TCP`
   - **Action** : `Autoriser`
   - **Source** : `Toutes les interfaces` (ou spécifiez selon vos besoins)

### Étape 4 : Mettre à jour la Configuration Backend

Mettez à jour votre fichier `.env` du backend pour utiliser HTTPS :

```env
# URL du frontend (pour CORS) - IMPORTANT pour HTTPS
FRONTEND_URL=https://lespoires.synology.me:3001

# Si vous avez un frontend séparé sur un autre port
# FRONTEND_URL=https://lespoires.synology.me:3000

# Optionnel : URL supplémentaire autorisée
# ALLOWED_ORIGIN=https://lespoires.synology.me:3000
```

> ⚠️ **Important** : Assurez-vous que `FRONTEND_URL` utilise bien `https://` et non `http://`. Cette variable est utilisée par la configuration CORS pour autoriser les requêtes depuis votre frontend.

### Étape 5 : Redémarrer le Backend

```bash
cd /docker/teachdigital/backend
docker-compose restart backend
```

### Étape 6 : Tester la Configuration

Testez l'accès HTTPS :

```bash
# Test depuis votre machine
curl https://lespoires.synology.me:3001/health

# Ou ouvrez dans votre navigateur
# https://lespoires.synology.me:3001/health
```

## 🔧 Méthode 2 : Configuration Avancée avec Nginx

Si vous préférez utiliser Nginx directement dans Docker, voici comment configurer HTTPS.

### Étape 1 : Obtenir les Certificats SSL

Utilisez la méthode de l'Étape 1 ci-dessus pour obtenir un certificat Let's Encrypt via Synology.

### Étape 2 : Exporter les Certificats

1. **Dans "Certificat"**, sélectionnez votre certificat
2. **Cliquez sur "Exporter"**
3. **Exportez** :
   - Le certificat (`.pem` ou `.crt`)
   - La clé privée (`.key`)

### Étape 3 : Créer la Configuration Nginx HTTPS

Créez un fichier `nginx-https.conf` :

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:3001;
    }

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # HTTP Server - Redirection vers HTTPS
    server {
        listen 80;
        server_name lespoires.synology.me;

        # Redirection vers HTTPS
        return 301 https://$host$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name lespoires.synology.me;

        # Certificats SSL
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Configuration SSL moderne
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # HSTS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Port $server_port;
        }
    }
}
```

### Étape 4 : Mettre à jour Docker Compose

Ajoutez un service Nginx dans votre `docker-compose.yml` :

```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: teachdigital-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-https.conf:/etc/nginx/nginx.conf:ro
      - /path/to/ssl/cert.pem:/etc/nginx/ssl/cert.pem:ro
      - /path/to/ssl/key.pem:/etc/nginx/ssl/key.pem:ro
    depends_on:
      - frontend
      - backend
    networks:
      - teachdigital-network

networks:
  teachdigital-network:
    driver: bridge
```

### Étape 5 : Démarrer Nginx

```bash
docker-compose up -d nginx
```

## 🔄 Renouvellement Automatique des Certificats

Let's Encrypt émet des certificats valides pour 90 jours. Synology peut les renouveler automatiquement :

1. **Dans "Certificat"**, sélectionnez votre certificat
2. **Cliquez sur "Paramètres"**
3. **Activez "Renouveler automatiquement le certificat"**

## 🛠️ Configuration Frontend pour HTTPS

Mettez à jour votre configuration frontend pour utiliser HTTPS :

### Fichier `.env` ou `env.local`

```env
VITE_API_URL=https://lespoires.synology.me:3001/api
```

### Fichier `src/services/apiService.js`

Vérifiez que l'URL de base utilise HTTPS :

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://lespoires.synology.me:3001/api'
```

## 🔍 Vérification de la Configuration

### Test 1 : Vérifier le Certificat SSL

```bash
# Vérifier le certificat
openssl s_client -connect lespoires.synology.me:3001 -showcerts

# Ou utilisez un outil en ligne
# https://www.ssllabs.com/ssltest/
```

### Test 2 : Vérifier la Redirection HTTP → HTTPS

```bash
# Doit rediriger vers HTTPS
curl -I http://lespoires.synology.me:3001
```

### Test 3 : Tester l'API en HTTPS

```bash
# Test de santé
curl https://lespoires.synology.me:3001/health

# Test avec authentification
curl -H "Authorization: Bearer YOUR_TOKEN" https://lespoires.synology.me:3001/api/profiles
```

## 🐛 Dépannage

### Problème : Certificat non valide

**Symptômes** : Le navigateur affiche "Certificat non valide" ou "Connexion non sécurisée"

**Solutions** :
1. Vérifiez que le certificat est correctement installé dans Synology
2. Vérifiez que le certificat est sélectionné dans la règle de reverse proxy
3. Vérifiez que le domaine correspond exactement au certificat
4. Vérifiez que le port 80 est accessible depuis Internet (nécessaire pour Let's Encrypt)

### Problème : Erreur "ERR_SSL_PROTOCOL_ERROR"

**Symptômes** : Le navigateur affiche une erreur de protocole SSL

**Solutions** :
1. Vérifiez que le port 443 est ouvert dans le pare-feu
2. Vérifiez que le reverse proxy est correctement configuré
3. Vérifiez que le certificat est valide et non expiré
4. Vérifiez les logs Nginx : `docker-compose logs nginx`

### Problème : CORS Errors avec HTTPS

**Symptômes** : Erreurs CORS lors des appels API

**Solutions** :
1. Mettez à jour `FRONTEND_URL` dans `.env` du backend pour utiliser HTTPS
2. Redémarrez le backend : `docker-compose restart backend`
3. Vérifiez la configuration CORS dans `backend/lib/cors.js`

### Problème : Le certificat n'est pas renouvelé automatiquement

**Symptômes** : Le certificat expire après 90 jours

**Solutions** :
1. Vérifiez que le renouvellement automatique est activé dans Synology
2. Vérifiez que le port 80 est accessible depuis Internet
3. Vérifiez les logs de renouvellement dans "Certificat" → "Journal"

### Problème : Le port 3001 n'est pas accessible en HTTPS

**Symptômes** : Impossible d'accéder à `https://lespoires.synology.me:3001`

**Solutions** :
1. Vérifiez que le reverse proxy est configuré pour le port 3001
2. Vérifiez que le pare-feu autorise le port 3001
3. Vérifiez que le backend écoute bien sur le port 3001
4. Testez depuis l'intérieur du réseau : `curl https://localhost:3001/health`

## 📝 Notes Importantes

1. **Port personnalisé** : Si vous utilisez un port personnalisé (3001), assurez-vous que :
   - Le reverse proxy est configuré pour ce port
   - Le pare-feu autorise ce port
   - Le certificat SSL est valide pour ce domaine

2. **Sécurité** : 
   - Utilisez toujours HTTPS en production
   - Activez HSTS pour forcer HTTPS
   - Limitez l'accès au port 3001 via le pare-feu si possible

3. **Performance** :
   - HTTP/2 améliore les performances avec HTTPS
   - Le reverse proxy Synology est optimisé pour les performances

4. **Renouvellement** :
   - Les certificats Let's Encrypt expirent après 90 jours
   - Synology peut les renouveler automatiquement si configuré

## 🔗 Ressources

- [Documentation Synology Reverse Proxy](https://kb.synology.com/fr-fr/DSM/help/DSM/AdminCenter/application_appportalias_reverseproxy)
- [Documentation Let's Encrypt](https://letsencrypt.org/docs/)
- [Guide SSL/TLS Synology](https://kb.synology.com/fr-fr/DSM/help/DSM/AdminCenter/connection_certificate)

## ✅ Checklist de Configuration

- [ ] Certificat Let's Encrypt obtenu et installé
- [ ] Reverse Proxy configuré pour HTTPS sur le port 3001
- [ ] Pare-feu configuré pour autoriser le port 3001
- [ ] `FRONTEND_URL` mis à jour dans `.env` du backend
- [ ] Backend redémarré
- [ ] Test HTTPS réussi (`curl https://lespoires.synology.me:3001/health`)
- [ ] Redirection HTTP → HTTPS fonctionnelle
- [ ] Renouvellement automatique activé
- [ ] Frontend configuré pour utiliser HTTPS

---

**Version** : 1.0  
**Dernière mise à jour** : 2024

