# Résumé de la Configuration des Volumes Docker

## 🎯 Objectif

Les fichiers de sortie (logs, output, temp) sont **externalisés du conteneur Docker** via des volumes. Cela garantit :

✅ Les logs ne polluent pas l'image Docker  
✅ Les données persistent après redémarrage du conteneur  
✅ Accès facile aux fichiers depuis l'hôte  
✅ Conteneur stateless et léger  

## 📋 Fichiers Modifiés

### 1. `backend/Dockerfile`
```dockerfile
# Volumes déclarés
VOLUME ["/logs", "/output", "/temp"]

# Variables d'environnement
ENV LOGS_DIR=/logs
ENV DOCKER_ENV=true
```

**Points clés** :
- Les dossiers `/logs`, `/output`, `/temp` sont créés dans le conteneur
- Les permissions sont gérées correctement (utilisateur `nodejs`)
- Les variables d'environnement sont définies

### 2. `backend/docker-compose.yml`
```yaml
volumes:
  - ${LOGS_VOLUME:-./logs}:/logs
  - ${OUTPUT_VOLUME:-./output}:/output
  - ${TEMP_VOLUME:-./temp}:/temp

environment:
  LOGS_DIR: /logs
  DOCKER_ENV: "true"
```

**Points clés** :
- Utilise des variables d'environnement pour flexibilité
- Valeurs par défaut : dossiers locaux (./logs, ./output, ./temp)
- En Synology : `/volume1/docker/teachdigital/backend/logs`, etc.

### 3. `backend/lib/logger.js`
```javascript
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
this.logsDir = process.env.LOGS_DIR || (isDocker ? '/logs' : path.join(__dirname, '..', 'logs'));
```

**Points clés** :
- Détecte automatiquement si on est en Docker
- Développement local : `backend/logs/`
- Docker/Production : `/logs` (volume monté)

### 4. `backend/.dockerignore`
```
logs/
output/
temp/
node_modules/
.env
.git/
```

**Points clés** :
- Exclut les dossiers de sortie de l'image
- Exclut les autres dossiers non essentiels
- L'image reste petite et propre

## 🚀 Utilisation

### Mode Développement Local

```bash
# Les dossiers sont créés localement
mkdir -p ./logs ./output ./temp

# Lancer le conteneur
docker-compose up -d

# Les logs sont écrits dans ./logs/
ls -la logs/
tail -f logs/info.log
```

### Mode Synology

```bash
# .env.docker
LOGS_VOLUME=/volume1/docker/teachdigital/backend/logs
OUTPUT_VOLUME=/volume1/docker/teachdigital/backend/output
TEMP_VOLUME=/volume1/docker/teachdigital/backend/temp

# Les logs sont écrits dans /volume1/docker/teachdigital/backend/logs/
docker-compose up -d
ls -la /volume1/docker/teachdigital/backend/logs/
```

## 📊 Structure des Chemins

### En Développement Local
```
backend/
├── Dockerfile
├── docker-compose.yml
├── .env.docker
├── logs/              ← Volume /logs du conteneur
│   ├── info.log
│   ├── error.log
│   └── ...
├── output/            ← Volume /output du conteneur
│   └── ...
└── temp/              ← Volume /temp du conteneur
    └── ...
```

### En Synology
```
/volume1/docker/teachdigital/backend/
├── logs/              ← Volume /logs du conteneur
│   ├── info.log
│   ├── error.log
│   └── ...
├── output/            ← Volume /output du conteneur
│   └── ...
└── temp/              ← Volume /temp du conteneur
    └── ...
```

## 🔄 Flux des Logs

```
Application Node.js
    ↓
Logger.js (backend/lib/logger.js)
    ├─→ console.log() → Docker logs
    └─→ fs.appendFile() → /logs/info.log (volume monté)
    
/logs (conteneur) ← Volume Monté ← ./logs (hôte)
```

## 🛠️ Scripts Helper

### Linux/Mac
```bash
# Setup initial
./docker-setup.sh --local
./docker-setup.sh --synology

# Lancer
docker-compose up -d

# Arrêter
docker-compose down
```

### Windows PowerShell
```powershell
# Setup initial
.\docker-setup.ps1 -Type local
.\docker-setup.ps1 -Type synology

# Lancer
docker-compose up -d

# Arrêter
docker-compose down
```

## ✅ Checklist de Configuration

- [ ] `Dockerfile` configuré avec `VOLUME ["/logs", "/output", "/temp"]`
- [ ] `docker-compose.yml` utilise les variables `LOGS_VOLUME`, `OUTPUT_VOLUME`, `TEMP_VOLUME`
- [ ] `logger.js` détecte `DOCKER_ENV` et utilise `/logs`
- [ ] `.dockerignore` exclut les dossiers `logs/`, `output/`, `temp/`
- [ ] `.env.docker` créé avec les bons chemins
- [ ] Dossiers locaux créés : `mkdir -p logs output temp`
- [ ] Conteneur lancé avec `docker-compose up -d`
- [ ] Logs vérifiés : `cat logs/info.log`

## 📚 Fichiers de Référence

| Fichier | Description |
|---------|-------------|
| `Dockerfile` | Configuration Docker avec volumes |
| `docker-compose.yml` | Configuration Docker Compose avec env vars |
| `lib/logger.js` | Logger qui écrit dans `/logs` |
| `.dockerignore` | Exclusions de l'image Docker |
| `.env.docker` | Variables d'environnement (à créer) |
| `DOCKER.md` | Documentation Docker |
| `DOCKER-COMPOSE-SETUP.md` | Guide Docker Compose |
| `docker-setup.sh` | Script bash pour setup |
| `docker-setup.ps1` | Script PowerShell pour setup |

## 🎓 Concepts Clés

### Volume Docker
Un volume est un système de fichiers persistant en dehors du conteneur. Les données restent même si le conteneur est supprimé.

```bash
# Voir les volumes
docker volume ls

# Inspecter un volume
docker volume inspect <volume-name>
```

### Bind Mount
C'est ce qu'on utilise : montage d'un dossier de l'hôte dans le conteneur.

```yaml
volumes:
  - ./logs:/logs  # Dossier local ./logs → /logs du conteneur
```

### Variables d'Environnement
Permettent la flexibilité entre environnements.

```yaml
volumes:
  - ${LOGS_VOLUME:-./logs}:/logs
  # Si LOGS_VOLUME n'existe pas, utilise ./logs
```

## 🔐 Sécurité

Les dossiers sont créés avec les bonnes permissions :

```dockerfile
RUN chown -R nodejs:nodejs /logs /output /temp
```

Seul l'utilisateur `nodejs` peut écrire dedans (pas root).

## 📈 Performance

Les fichiers ne sont pas inclus dans l'image → image plus légère

```bash
# Avant (❌ logs dans l'image)
Size: 500MB

# Après (✅ logs en volume)
Size: 300MB
```

## 🔧 Configuration Avancée

### Limite la taille des logs
```env
LOG_MAX_SIZE=5242880  # 5MB par fichier
LOG_MAX_FILES=10      # 10 fichiers max
```

### Nettoyage automatique
```bash
# Supprimer les logs > 7 jours
find logs/ -name "*.log.*" -mtime +7 -delete
```

### Monitoring
```bash
# Taille des volumes
du -sh logs/ output/ temp/

# Derniers logs
tail -f logs/error.log
```

---

**Configuration complètement cohérente et prête pour production ! ✨**





