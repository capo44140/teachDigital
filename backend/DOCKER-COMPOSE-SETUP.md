# Configuration Docker Compose - TeachDigital Backend

## 📋 Configuration des Volumes

Le `docker-compose.yml` a été mis à jour pour utiliser les volumes définis dans le Dockerfile :

```yaml
volumes:
  - ${LOGS_VOLUME:-./logs}:/logs
  - ${OUTPUT_VOLUME:-./output}:/output
  - ${TEMP_VOLUME:-./temp}:/temp
```

### Personnalisation selon votre environnement

**Créez un fichier `.env.docker`** à la racine du projet `backend/` :

#### Pour développement local (Linux/Mac/Windows WSL)

```env
# .env.docker
LOGS_VOLUME=./logs
OUTPUT_VOLUME=./output
TEMP_VOLUME=./temp
LOGS_DIR=/logs
```

#### Pour Synology

```env
# .env.docker
LOGS_VOLUME=/volume1/docker/teachdigital/backend/logs
OUTPUT_VOLUME=/volume1/docker/teachdigital/backend/output
TEMP_VOLUME=/volume1/docker/teachdigital/backend/temp
LOGS_DIR=/logs
```

## 🚀 Lancement avec Docker Compose

### 1️⃣ Créer les dossiers locaux (développement)

```bash
# Depuis le répertoire backend/
mkdir -p ./logs ./output ./temp
```

### 2️⃣ Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env.docker

# Adapter les variables pour votre environnement
# Éditez .env.docker avec vos paramètres
```

### 3️⃣ Lancer le conteneur

```bash
# Depuis le répertoire backend/
docker-compose up -d

# Vérifier le statut
docker-compose ps

# Voir les logs
docker-compose logs -f backend
```

### 4️⃣ Vérifier les volumes

```bash
# Accéder aux logs
cat logs/info.log
tail -f logs/error.log

# Vérifier que les dossiers existent
ls -la logs/ output/ temp/
```

## 📊 Variables d'Environnement

### Dans docker-compose.yml

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NODE_ENV` | `production` | Mode production |
| `DOCKER_ENV` | `true` | Indique l'exécution en Docker |
| `LOGS_DIR` | `/logs` | Chemin des logs (volume monté) |
| `LOG_ENABLE_FILE` | `true` | Écriture des logs en fichier |

### Dans .env.docker

| Variable | Défaut | Description |
|----------|--------|-------------|
| `LOGS_VOLUME` | `./logs` | Chemin local pour les logs |
| `OUTPUT_VOLUME` | `./output` | Chemin local pour les outputs |
| `TEMP_VOLUME` | `./temp` | Chemin local pour les fichiers temp |
| `DATABASE_URL` | - | URL de connexion PostgreSQL |
| `JWT_SECRET` | - | Clé secrète JWT |

## 🔄 Synchronisation Dockerfile/Docker Compose

### Avant (❌ Incohérent)
```yaml
# docker-compose.yml
LOGS_DIR: /app/logs
volumes:
  - /volume1/.../logs:/app/logs
```

### Après (✅ Cohérent)
```yaml
# docker-compose.yml
LOGS_DIR: /logs
volumes:
  - ${LOGS_VOLUME:-./logs}:/logs
```

### Dockerfile
```dockerfile
VOLUME ["/logs", "/output", "/temp"]
ENV LOGS_DIR=/logs
```

## 🐳 Commandes Utiles

```bash
# Démarrer le conteneur
docker-compose up -d

# Arrêter le conteneur
docker-compose down

# Redémarrer le conteneur
docker-compose restart

# Voir les logs en temps réel
docker-compose logs -f backend

# Exécuter une commande dans le conteneur
docker-compose exec backend sh

# Construire l'image
docker-compose build

# Nettoyer les volumes (⚠️ Attention!)
docker-compose down -v
```

## 📁 Structure des Volumes

```
.
├── logs/          ← Logs de l'application
│   ├── info.log
│   ├── error.log
│   ├── warn.log
│   └── debug.log
├── output/        ← Fichiers générés
│   └── reports/
└── temp/          ← Fichiers temporaires
    └── cache/
```

## ⚙️ Configuration Avancée

### Synology avec plusieurs volumes

```yaml
volumes:
  # Logs
  - /volume1/docker/teachdigital/backend/logs:/logs
  # Outputs
  - /volume1/docker/teachdigital/backend/output:/output
  # Temp
  - /volume1/docker/teachdigital/backend/temp:/temp
  # Base de données (optionnel si PostgreSQL sur le même volume)
  # - /volume1/docker/postgresql/data:/var/lib/postgresql/data
```

### Rétention automatique des logs

```bash
# Nettoyage cron hebdomadaire des logs > 30 jours
# Ajoutez à votre crontab:
0 2 * * 0 find /volume1/docker/teachdigital/backend/logs -name "*.log.*" -mtime +30 -delete
```

### Monitoring de l'espace disque

```bash
# Vérifier la taille des volumes
docker exec teachdigital-backend du -sh /logs /output /temp

# Archiver les anciens logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
rm -rf logs/*.log*
```

## 🔧 Troubleshooting

### Les volumes ne se créent pas

```bash
# Vérifier que les dossiers existent
mkdir -p ./logs ./output ./temp

# Vérifier les permissions
ls -la logs/ output/ temp/
```

### Les logs ne s'écrivent pas

```bash
# Vérifier que le conteneur utilise les bonnes variables
docker-compose config | grep LOGS_DIR

# Vérifier les permissions dans le conteneur
docker-compose exec backend ls -la /logs/
```

### Espace disque insuffisant

```bash
# Nettoyer les vieux logs
find logs/ -name "*.log.*" -mtime +7 -delete

# Réduire la taille max par fichier
docker-compose down
# Éditez .env.docker: LOG_MAX_SIZE=5242880
docker-compose up -d
```

## 📚 Références

- Configuration Logger : `backend/lib/logger.js`
- Dockerfile : `backend/Dockerfile`
- Docker Compose : `backend/docker-compose.yml`
- .dockerignore : `backend/.dockerignore`
- Documentation Docker : `backend/DOCKER.md`






