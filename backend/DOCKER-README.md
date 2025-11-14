# 🐳 Configuration Docker - TeachDigital Backend

## 📌 Vue d'ensemble rapide

Le backend TeachDigital est maintenant configuré pour exécution en Docker avec les fichiers de sortie **externalisés via volumes**. Cela garantit :

✅ **Logs en dehors du conteneur** - Accès facile depuis l'hôte  
✅ **Données persistantes** - Survie après redémarrage  
✅ **Conteneur léger** - Pas de fichiers inutiles dans l'image  
✅ **Flexible** - Configuration locale ou Synology  

---

## 🚀 Démarrage Rapide

### Option 1: Linux/Mac avec Script bash

```bash
cd backend

# Setup automatique
./docker-setup.sh --local    # Pour développement
./docker-setup.sh --synology # Pour Synology

# Lancer
docker-compose up -d

# Vérifier
docker-compose ps
docker-compose logs -f backend
```

### Option 2: Windows avec Script PowerShell

```powershell
cd backend

# Setup automatique
.\docker-setup.ps1 -Type local    # Pour développement
.\docker-setup.ps1 -Type synology # Pour Synology

# Lancer
docker-compose up -d

# Vérifier
docker-compose ps
docker-compose logs -f backend
```

### Option 3: Manuel

```bash
cd backend

# Créer les dossiers
mkdir -p logs output temp

# Créer .env.docker
cp .env.example .env.docker
# Éditer .env.docker avec vos paramètres

# Build et lancer
docker-compose build
docker-compose up -d
```

---

## 📋 Configuration

### Fichier `.env.docker`

**Pour développement local :**
```env
LOGS_VOLUME=./logs
OUTPUT_VOLUME=./output
TEMP_VOLUME=./temp
DATABASE_URL=postgresql://teachdigital:password@host.docker.internal:5432/teachdigital
JWT_SECRET=your_secret_key
```

**Pour Synology :**
```env
LOGS_VOLUME=/volume1/docker/teachdigital/backend/logs
OUTPUT_VOLUME=/volume1/docker/teachdigital/backend/output
TEMP_VOLUME=/volume1/docker/teachdigital/backend/temp
DATABASE_URL=postgresql://teachdigital:password@host.docker.internal:5432/teachdigital
JWT_SECRET=your_secret_key
```

---

## 🔍 Vérification de la Configuration

### Script bash
```bash
./verify-volumes.sh
```

### Script PowerShell
```powershell
.\verify-volumes.ps1
```

### Manuel
```bash
# Vérifier les volumes du conteneur
docker inspect teachdigital-backend | grep -A 20 '"Mounts"'

# Accéder aux logs
cat logs/info.log
tail -f logs/error.log

# Vérifier la taille
du -sh logs/ output/ temp/
```

---

## 📊 Commandes Utiles

### Gestion du conteneur

```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Logs en temps réel
docker-compose logs -f backend

# Terminal dans le conteneur
docker-compose exec backend sh
```

### Gestion des logs

```bash
# Voir les logs info
cat logs/info.log

# Voir les erreurs
cat logs/error.log

# Taille des logs
du -sh logs/

# Nettoyer les vieux logs
find logs/ -name "*.log.*" -mtime +7 -delete
```

### Docker compose config

```bash
# Vérifier la configuration
docker-compose config

# Vérifier les variables
docker-compose config | grep -E "LOGS_DIR|DOCKER_ENV"

# Stats du conteneur
docker stats teachdigital-backend
```

---

## 🏗️ Architecture des Volumes

```
Conteneur Docker
├── /app          ← Code source
├── /logs         ← Logs (volume monté)
├── /output       ← Fichiers générés (volume monté)
└── /temp         ← Fichiers temporaires (volume monté)

        ↓↓↓ Volume Mount ↓↓↓

Hôte
├── backend/logs        ← Logs locaux (dev)
├── backend/output      ← Output local (dev)
└── backend/temp        ← Temp local (dev)

OU Synology
├── /volume1/.../logs   ← Logs Synology
├── /volume1/.../output ← Output Synology
└── /volume1/.../temp   ← Temp Synology
```

---

## 📁 Fichiers Importants

| Fichier | Description |
|---------|-------------|
| `Dockerfile` | Configuration Docker avec volumes |
| `docker-compose.yml` | Orchestration des conteneurs |
| `lib/logger.js` | Logger qui écrit dans `/logs` |
| `.dockerignore` | Exclusions de l'image |
| `.env.docker` | Variables d'environnement (à créer) |
| `docker-setup.sh` | Script bash d'automatisation |
| `docker-setup.ps1` | Script PowerShell d'automatisation |
| `verify-volumes.sh` | Vérification bash |
| `verify-volumes.ps1` | Vérification PowerShell |
| `DOCKER.md` | Documentation détaillée Docker |
| `DOCKER-COMPOSE-SETUP.md` | Guide Docker Compose |
| `VOLUMES-SUMMARY.md` | Résumé complet des volumes |

---

## 🔧 Troubleshooting

### Les logs ne s'écrivent pas

```bash
# Vérifier les permissions dans le conteneur
docker-compose exec backend ls -la /logs/

# Vérifier les permissions locales
ls -la logs/

# Vérifier la variable d'environnement
docker-compose exec backend sh -c 'echo $LOGS_DIR'
```

### L'image est trop grosse

```bash
# Vérifier la taille
docker images teachdigital-backend

# L'image ne devrait contenir QUE le code et node_modules
# Pas de logs, output, temp

# Vérifier ce qui est copié
docker build --progress=plain .
```

### Les volumes ne sont pas montés

```bash
# Vérifier la configuration
docker-compose config | grep -A 5 'volumes:'

# Vérifier les variables d'environnement
cat .env.docker

# Vérifier les dossiers locaux existent
ls -la logs/ output/ temp/
```

### Espace disque insuffisant

```bash
# Vérifier la taille des volumes
du -sh logs/ output/ temp/

# Nettoyer les vieux fichiers
find logs/ -name "*.log.*" -mtime +30 -delete
find output/ -type f -mtime +30 -delete

# Réduire la taille max des fichiers log
# Éditer .env.docker:
# LOG_MAX_SIZE=5242880  # 5MB au lieu de 10MB
```

---

## ✅ Checklist de Configuration

- [ ] Clonez le repository
- [ ] `cd backend`
- [ ] Exécutez `./docker-setup.sh --local` (ou PowerShell)
- [ ] Éditez `.env.docker` avec vos paramètres
- [ ] Lancez `docker-compose up -d`
- [ ] Exécutez `./verify-volumes.sh` (ou PowerShell)
- [ ] Vérifiez les logs : `cat logs/info.log`
- [ ] ✅ Configuration complète !

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

- **DOCKER.md** - Configuration Docker détaillée
- **DOCKER-COMPOSE-SETUP.md** - Guide Docker Compose
- **VOLUMES-SUMMARY.md** - Résumé complet des volumes

---

## 🎯 Points Clés à Retenir

### Volumes
- `/logs` → Logs de l'application
- `/output` → Fichiers générés
- `/temp` → Fichiers temporaires

### Variables Clés
- `DOCKER_ENV=true` → Indica exécution Docker
- `LOGS_DIR=/logs` → Chemin des logs
- `LOG_ENABLE_FILE=true` → Écriture fichier activée

### Développement
- Dossiers locaux : `./logs`, `./output`, `./temp`
- Base de données locale : `host.docker.internal:5432`
- Logs accessibles immédiatement

### Production/Synology
- Dossiers Synology : `/volume1/docker/teachdigital/backend/`
- Configuration via `.env.docker`
- Persistance garantie après redémarrage

---

**Configuration Docker complète et prête pour production ! 🚀**



