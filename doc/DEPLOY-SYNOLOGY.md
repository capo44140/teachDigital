# 🐳 Guide de Déploiement Docker sur Synology

Ce guide vous explique comment déployer TeachDigital Backend sur votre Synology avec Docker, en utilisant votre propre instance PostgreSQL.

## 📋 Prérequis

- Synology NAS avec DSM 7.0 ou supérieur
- Docker installé via le Package Center
- PostgreSQL déjà installé et configuré (conteneur Docker, package Synology, ou machine externe)
- Au moins 2 Go de RAM disponible
- Accès SSH à votre Synology (recommandé pour faciliter le déploiement)

## 🚀 Installation Rapide

### Étape 1 : Préparer les fichiers

1. **Connectez-vous à votre Synology** via SSH ou File Station
2. **Créez un dossier** pour votre projet :
   ```bash
   sudo mkdir -p /docker/teachdigital/backend
   cd /docker/teachdigital/backend
   ```

3. **Copiez les fichiers suivants** dans le dossier `backend/` :
   - Tous les fichiers du dossier `backend/` du projet
   - `docker-compose.yml`
   - `env.docker.example` (renommez-le en `.env`)

### Étape 2 : Configurer les variables d'environnement

1. **Copiez le fichier d'exemple** :
   ```bash
   cp env.docker.example .env
   ```

2. **Éditez le fichier `.env`** avec vos paramètres :

```env
# ============================================
# BASE DE DONNÉES POSTGRESQL EXTERNE
# ============================================
# IMPORTANT: Configurez selon votre installation PostgreSQL

# Option A: PostgreSQL sur un autre conteneur Docker
DB_HOST=nom-de-votre-conteneur-postgresql
# Exemple: DB_HOST=postgresql-container

# Option B: PostgreSQL sur le host Synology (package ou installation native)
DB_HOST=host.docker.internal

# Option C: PostgreSQL sur une autre machine
DB_HOST=192.168.1.100

DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=VotreMotDePasseFort123!
DB_NAME=teachdigital

# ============================================
# SÉCURITÉ
# ============================================
# Générez un secret fort (voir section Sécurité)
JWT_SECRET=<generate-with: openssl rand -hex 32>

# ============================================
# FRONTEND
# ============================================
# URL de votre frontend pour CORS
FRONTEND_URL=http://votre-synology-ip:3000
# OU si vous utilisez un reverse proxy:
# FRONTEND_URL=https://teachdigital.votre-domaine.com

# ============================================
# API IA (Optionnel)
# ============================================
# Au moins une clé est recommandée pour la génération de quiz
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
```

### Étape 3 : Configurer l'accès PostgreSQL

**IMPORTANT** : Votre PostgreSQL doit autoriser les connexions depuis le conteneur Docker.

#### 📦 Si PostgreSQL est sur un autre conteneur Docker

1. **Trouvez le nom de votre conteneur PostgreSQL** :
   ```bash
   docker ps | grep postgres
   ```

2. **Trouvez le réseau Docker utilisé** :
   ```bash
   docker inspect nom-conteneur-postgresql | grep -A 10 Networks
   ```

3. **Dans `.env`**, utilisez le nom du conteneur :
   ```env
   DB_HOST=nom-conteneur-postgresql
   ```

4. **Connectez les conteneurs au même réseau** (voir section "Réseau Docker" ci-dessous)

#### 🖥️ Si PostgreSQL est sur le host Synology (package ou installation native)

1. **Dans `.env`**, utilisez `host.docker.internal` :
   ```env
   DB_HOST=host.docker.internal
   ```

2. **Vérifiez la configuration PostgreSQL** :
   - Modifiez `postgresql.conf` : `listen_addresses = '*'`
   - Modifiez `pg_hba.conf` pour autoriser les connexions depuis Docker :
     ```
     host    all    all    172.17.0.0/16    md5
     ```

#### 🌐 Si PostgreSQL est sur une autre machine

1. **Dans `.env`**, utilisez l'IP de la machine :
   ```env
   DB_HOST=192.168.1.100
   ```

2. **Vérifiez le pare-feu** pour autoriser le port 5432 depuis votre Synology

### Étape 4 : Déployer avec Docker Compose

#### Méthode 1 : Via SSH (Recommandé)

1. **Connectez-vous en SSH** à votre Synology :
   ```bash
   ssh admin@votre-synology-ip
   ```

2. **Naviguez vers le dossier du projet** :
   ```bash
   cd /docker/teachdigital/backend
   ```

3. **Vérifiez que Docker Compose est disponible** :
   ```bash
   docker-compose --version
   # OU pour les versions récentes:
   docker compose version
   ```
   
   Si ce n'est pas disponible, installez-le ou utilisez `docker compose` (sans tiret).

4. **Construisez et démarrez le conteneur** :
   ```bash
   docker-compose up -d --build
   ```

5. **Vérifiez que le conteneur est démarré** :
   ```bash
   docker-compose ps
   ```

6. **Consultez les logs** pour vérifier que tout fonctionne :
   ```bash
   docker-compose logs -f backend
   ```

#### Méthode 2 : Via l'interface Synology Docker

1. **Ouvrez Docker** dans le Package Center
2. **Allez dans l'onglet "Image"**
3. **Cliquez sur "Créer"** → **"Depuis un fichier"**
4. **Sélectionnez le Dockerfile** dans `/docker/teachdigital/backend`
5. **Créez le conteneur** avec les paramètres suivants :
   - **Nom** : `teachdigital-backend`
   - **Port** : `3001:3001`
   - **Variables d'environnement** : Importez depuis `.env` ou configurez manuellement
   - **Réseau** : Bridge (ou le réseau de votre PostgreSQL si applicable)

### Étape 5 : Initialiser la base de données

1. **Exécutez les scripts d'initialisation** dans le conteneur :
   ```bash
   docker-compose exec backend node scripts/init-db.js
   docker-compose exec backend node scripts/init-badges.js
   ```

2. **Vérifiez la connexion** :
   ```bash
   docker-compose exec backend node scripts/test-connection.js
   ```

3. **Testez l'API** :
   ```bash
   curl http://votre-synology-ip:3001/health
   ```

## 🌐 Réseau Docker

Si votre PostgreSQL est sur un autre conteneur Docker, vous devez les connecter au même réseau.

### Option 1 : Utiliser un réseau existant

1. **Trouvez le réseau de votre PostgreSQL** :
   ```bash
   docker inspect nom-conteneur-postgresql | grep -A 5 Networks
   ```

2. **Notez le nom du réseau** (ex: `bridge`, `postgres-network`, etc.)

3. **Modifiez `docker-compose.yml`** pour utiliser ce réseau :
   ```yaml
   services:
     backend:
       networks:
         - votre-reseau-postgresql
   
   networks:
     votre-reseau-postgresql:
       external: true
       name: nom-du-reseau-trouve
   ```

4. **Redémarrez le conteneur** :
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Option 2 : Créer un réseau partagé

1. **Créez un réseau Docker** :
   ```bash
   docker network create teachdigital-network
   ```

2. **Connectez votre conteneur PostgreSQL à ce réseau** :
   ```bash
   docker network connect teachdigital-network nom-conteneur-postgresql
   ```

3. **Modifiez `docker-compose.yml`** :
   ```yaml
   services:
     backend:
       networks:
         - teachdigital-network
   
   networks:
     teachdigital-network:
       external: true
       name: teachdigital-network
   ```

4. **Redémarrez le conteneur** :
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## 🔧 Configuration

### Changer le port du backend

1. **Modifiez le fichier `.env`** :
   ```env
   BACKEND_PORT=8080
   ```

2. **Modifiez `docker-compose.yml`** :
   ```yaml
   ports:
     - "8080:3001"  # Port externe:Port interne
   ```

3. **Redémarrez le conteneur** :
   ```bash
   docker-compose restart
   ```

### Configurer CORS pour le frontend

Dans `.env`, configurez l'URL de votre frontend :
```env
FRONTEND_URL=http://votre-synology-ip:3000
# OU avec reverse proxy:
FRONTEND_URL=https://teachdigital.votre-domaine.com
```

## 🌐 Accès à l'API

Une fois déployé, votre API sera accessible à :

- **Local** : `http://votre-synology-ip:3001`
- **Réseau local** : `http://192.168.x.x:3001`
- **Externe** : Si vous avez configuré un reverse proxy

### Test de santé

Testez que l'API fonctionne :
```bash
curl http://votre-synology-ip:3001/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456
}
```

### Test des endpoints

```bash
# Liste des profils
curl http://votre-synology-ip:3001/api/profiles

# Health check
curl http://votre-synology-ip:3001/health
```

## 🔄 Mise à jour

Pour mettre à jour l'application :

1. **Arrêtez le conteneur** :
   ```bash
   docker-compose down
   ```

2. **Récupérez les dernières modifications** :
   ```bash
   # Via Git
   git pull
   
   # OU copiez les nouveaux fichiers via File Station
   ```

3. **Reconstruisez et redémarrez** :
   ```bash
   docker-compose up -d --build
   ```

4. **Vérifiez les logs** :
   ```bash
   docker-compose logs -f backend
   ```

## 📊 Gestion des conteneurs

### Voir les logs
```bash
# Logs en temps réel
docker-compose logs -f backend

# Dernières 100 lignes
docker-compose logs --tail=100 backend

# Logs depuis une date
docker-compose logs --since="2024-01-01T00:00:00" backend
```

### Arrêter le conteneur
```bash
docker-compose stop
```

### Démarrer le conteneur
```bash
docker-compose start
```

### Redémarrer le conteneur
```bash
docker-compose restart
```

### Supprimer le conteneur (⚠️ Attention)
```bash
# Arrête et supprime le conteneur (les données sont conservées)
docker-compose down

# Supprime aussi les volumes (⚠️⚠️⚠️ Supprime TOUTES les données)
docker-compose down -v
```

### Accéder au shell du conteneur
```bash
docker-compose exec backend sh
```

## 🔒 Sécurité

### Recommandations importantes

1. **Changez tous les mots de passe par défaut** dans `.env`
2. **Générez un JWT_SECRET fort** (au moins 32 caractères aléatoires)
3. **Utilisez un reverse proxy** (Nginx, Traefik) pour HTTPS
4. **Limitez l'accès** au port 3001 via le pare-feu Synology
5. **Sauvegardez régulièrement** votre base de données PostgreSQL

### Configuration HTTPS

Pour configurer HTTPS sur votre Synology, consultez le guide détaillé :
- **[Guide HTTPS Synology](HTTPS-SYNOLOGY-SETUP.md)** - Configuration complète HTTPS avec Let's Encrypt

### Générer un JWT_SECRET fort

```bash
# Sur Linux/Mac
openssl rand -base64 32

# Sur Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Depuis le conteneur
docker-compose exec backend node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Configuration du pare-feu Synology

1. **Ouvrez "Pare-feu"** dans le Panneau de configuration
2. **Créez une règle** pour autoriser le port 3001 uniquement depuis votre réseau local
3. **Bloquez l'accès externe** si vous n'utilisez pas de reverse proxy

## 🐛 Dépannage

### Le backend ne démarre pas

1. **Vérifiez les logs** :
   ```bash
   docker-compose logs backend
   ```

2. **Vérifiez l'état du conteneur** :
   ```bash
   docker-compose ps
   ```

3. **Vérifiez les variables d'environnement** :
   ```bash
   docker-compose exec backend env | grep -E "DB_|JWT_|PORT"
   ```

4. **Vérifiez que le port n'est pas déjà utilisé** :
   ```bash
   netstat -tuln | grep 3001
   ```

### Erreur de connexion à la base de données

1. **Testez la connectivité réseau** :
   ```bash
   # Depuis le conteneur backend
   docker-compose exec backend ping ${DB_HOST}
   
   # Testez le port PostgreSQL
   docker-compose exec backend nc -zv ${DB_HOST} ${DB_PORT}
   ```

2. **Testez la connexion PostgreSQL** :
   ```bash
   docker-compose exec backend node -e "
   const {Pool}=require('pg');
   const p=new Pool({
     host:process.env.DB_HOST,
     port:process.env.DB_PORT,
     user:process.env.DB_USER,
     password:process.env.DB_PASSWORD,
     database:process.env.DB_NAME
   });
   p.query('SELECT 1').then(()=>console.log('✅ Connexion OK')).catch(e=>console.error('❌ ERREUR:',e.message));
   "
   ```

3. **Vérifiez les variables d'environnement** :
   ```bash
   docker-compose exec backend env | grep DB_
   ```

4. **Vérifiez la configuration PostgreSQL** :
   - Si PostgreSQL est sur un autre conteneur : vérifiez qu'ils sont sur le même réseau
   - Si PostgreSQL est sur le host : vérifiez `postgresql.conf` et `pg_hba.conf`
   - Si PostgreSQL est sur une autre machine : vérifiez le pare-feu

5. **Testez depuis votre machine** :
   ```bash
   psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}
   ```

### Le port est déjà utilisé

1. **Trouvez quel processus utilise le port** :
   ```bash
   netstat -tuln | grep 3001
   # OU
   lsof -i :3001
   ```

2. **Changez le port** dans `.env` et `docker-compose.yml`

### Problèmes de permissions

Si vous avez des erreurs de permissions :

```bash
# Donnez les permissions au dossier
sudo chmod -R 755 /docker/teachdigital

# Vérifiez le propriétaire
sudo chown -R admin:users /docker/teachdigital
```

### Le conteneur redémarre en boucle

1. **Consultez les logs** pour identifier l'erreur :
   ```bash
   docker-compose logs --tail=50 backend
   ```

2. **Vérifiez les variables d'environnement** requises
3. **Vérifiez la connexion à PostgreSQL**

### Erreur "Cannot connect to the Docker daemon"

1. **Vérifiez que Docker est démarré** :
   ```bash
   sudo systemctl status docker
   ```

2. **Redémarrez Docker** si nécessaire :
   ```bash
   sudo systemctl restart docker
   ```

## 📝 Notes importantes

- **PostgreSQL est indépendant** : Ce déploiement n'inclut PAS PostgreSQL, vous devez utiliser votre propre instance
- **Les logs** sont stockés dans `./logs` (si configuré)
- **Le backend** redémarre automatiquement en cas de crash (restart: unless-stopped)
- **Les données** sont stockées dans votre PostgreSQL externe
- **Le fichier `.env`** contient des informations sensibles, ne le partagez jamais

## 🔗 Liens utiles

- Documentation Docker : https://docs.docker.com/
- Documentation Synology Docker : https://kb.synology.com/
- Support PostgreSQL : https://www.postgresql.org/docs/
- Documentation Express : https://expressjs.com/

## 💡 Astuces

1. **Utilisez Portainer** (via Package Center) pour une interface graphique de gestion Docker
2. **Configurez un reverse proxy** avec Nginx (via Package Center) pour HTTPS
3. **Sauvegardez régulièrement** votre base de données PostgreSQL avec Hyper Backup
4. **Surveillez les ressources** via Resource Monitor dans DSM
5. **Utilisez Watchtower** pour mettre à jour automatiquement les images Docker

## 📞 Support

Si vous rencontrez des problèmes :

1. **Consultez les logs** : `docker-compose logs -f backend`
2. **Vérifiez la documentation** ci-dessus
3. **Créez une issue** sur le dépôt du projet avec :
   - Les logs d'erreur
   - Votre configuration (sans les mots de passe)
   - Les étapes pour reproduire le problème

---

**Version** : 1.0  
**Dernière mise à jour** : 2024
