# Configuration Docker - TeachDigital Backend

## 📋 Vue d'ensemble

Le Dockerfile est configuré pour externaliser les fichiers de sortie (logs, outputs) **hors du conteneur** en utilisant des volumes Docker. Cela garantit que :

- ✅ Les logs ne sont **pas** inclus dans l'image Docker
- ✅ Les fichiers de sortie sont persistés **même après redémarrage**
- ✅ Le conteneur reste **stateless** et **lightweight**
- ✅ Les dossiers sensibles sont ignorés via `.dockerignore`

## 🔧 Architecture des Volumes

Le Dockerfile déclare 3 volumes :

```dockerfile
VOLUME ["/logs", "/output", "/temp"]
```

### Configuration du Logger

```javascript
// backend/lib/logger.js
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
this.logsDir = process.env.LOGS_DIR || (isDocker ? '/logs' : path.join(__dirname, '..', 'logs'));
```

**Comportement** :
- En développement local : logs écrits dans `backend/logs/`
- En Docker : logs écrits dans `/logs` (volume monté)

## 🐳 Utilisation avec Docker

### Build de l'image

```bash
# Depuis le répertoire backend/
docker build -t teachdigital-backend:latest .
```

### Exécution avec volumes montés

```bash
# Créer les dossiers locaux
mkdir -p ./logs ./output ./temp

# Lancer le conteneur avec les volumes
docker run -d \
  --name teachdigital-backend \
  --port 3001:3001 \
  -v ./logs:/logs \
  -v ./output:/output \
  -v ./temp:/temp \
  --env DATABASE_URL="postgresql://..." \
  teachdigital-backend:latest
```

### Avec Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - DOCKER_ENV=true
      - LOGS_DIR=/logs
      - LOG_ENABLE_FILE=true
    volumes:
      - ./logs:/logs
      - ./output:/output
      - ./temp:/temp
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
```

## 📁 Dossiers Ignorés lors du Build

Voir `backend/.dockerignore` pour les dossiers exclus de l'image Docker :

```
logs/           ← Logs ne sont PAS inclus
output/         ← Outputs ne sont PAS inclus
temp/           ← Fichiers temporaires ne sont PAS inclus
node_modules/   ← Réinstallés dans le conteneur
.env            ← Fichiers de configuration locaux
.git/           ← Repository Git
```

## 🔍 Vérification

### Vérifier la taille de l'image

```bash
docker images teachdigital-backend:latest
```

L'image ne devrait contenir **QUE** le code source et `node_modules`.

### Vérifier les volumes

```bash
# Lister les volumes du conteneur
docker inspect teachdigital-backend | grep -A 20 '"Mounts"'

# Accéder aux logs
cat logs/info.log
cat logs/error.log
```

## 🚀 Variables d'Environnement

Défini dans `Dockerfile` :

| Variable | Valeur Docker | Description |
|----------|---------------|-------------|
| `NODE_ENV` | `production` | Mode production |
| `DOCKER_ENV` | `true` | Indique l'exécution en Docker |
| `LOGS_DIR` | `/logs` | Chemin des fichiers de logs |
| `LOG_ENABLE_FILE` | `true` | Active l'écriture fichier |

## 📊 Configuration du Logger

Le logger respecte ces paramètres :

- **Écriture stdout** : ✅ Toujours (pour les logs Docker)
- **Écriture fichier** : ✅ Vers `/logs` (via volume monté)
- **Rotation des logs** : ✅ Tous les 10MB par défaut
- **Fichiers max** : 5 fichiers par défaut

## 🛡️ Bonnes Pratiques

1. **Ne pas inclure les logs dans git** :
   ```bash
   # .gitignore
   /logs/
   /output/
   /temp/
   ```

2. **Nettoyer les anciens logs** :
   ```bash
   # Supprimer les logs locaux avant déploiement
   rm -rf ./logs/*
   ```

3. **Monitorer les volumes** :
   ```bash
   # Vérifier l'espace utilisé
   du -sh logs/ output/ temp/
   ```

4. **Backup des logs** :
   ```bash
   # Archiver les logs importants
   tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
   ```

## 📝 Troubleshooting

### Les logs ne s'écrivent pas

1. Vérifier que le volume est correctement monté :
   ```bash
   docker exec teachdigital-backend ls -la /logs/
   ```

2. Vérifier les permissions :
   ```bash
   docker exec teachdigital-backend ls -la /logs/ | grep -E "^d"
   ```

3. Vérifier les logs de démarrage :
   ```bash
   docker logs teachdigital-backend | head -20
   ```

### Le dossier logs prend trop de place

1. Nettoyer les vieux logs :
   ```bash
   # Garder seulement les 10 derniers jours
   find logs/ -name "*.log" -mtime +10 -delete
   ```

2. Configurer la rotation :
   ```bash
   # Dans le docker-compose.yml ou au lancement
   --env LOG_MAX_SIZE=5242880 \  # 5MB
   --env LOG_MAX_FILES=10        # 10 fichiers max
   ```

## 📚 Références

- Configuration Logger : `backend/lib/logger.js`
- Dockerfile : `backend/Dockerfile`
- .dockerignore : `backend/.dockerignore`
- Vercel Functions : `backend/api/`

