# 🔧 Guide : Ajouter des Variables d'Environnement dans Synology

Ce guide vous explique comment ajouter et configurer des variables d'environnement pour TeachDigital Backend sur votre Synology.

## 📋 Méthodes Disponibles

Il existe **3 méthodes principales** pour ajouter des variables d'environnement dans Synology :

1. **Méthode 1 : Fichier `.env.docker`** (Recommandé pour Docker Compose)
2. **Méthode 2 : Interface Container Manager** (Interface graphique Synology)
3. **Méthode 3 : Fichier `.env`** (Alternative)

---

## 🎯 Méthode 1 : Fichier `.env.docker` (Recommandé)

Cette méthode est la plus simple et recommandée si vous utilisez Docker Compose.

### Étape 1 : Créer le fichier `.env.docker`

1. **Connectez-vous à votre Synology** via SSH ou File Station
2. **Naviguez vers le dossier du projet** :
   ```bash
   cd /volume1/docker/teachdigital/backend
   # OU selon votre configuration
   cd /docker/teachdigital/backend
   ```

3. **Créez le fichier `.env.docker`** :
   ```bash
   nano .env.docker
   # OU
   vi .env.docker
   ```

### Étape 2 : Configurer les variables

Copiez-collez ce template et adaptez les valeurs :

```env
# ====================================
# Configuration Docker Compose Synology
# ====================================

# Base de Données PostgreSQL
DATABASE_URL=postgresql://teachdigital:VotreMotDePasse@host.docker.internal:5432/teachdigital
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=VotreMotDePasseFort123!
DB_NAME=teachdigital

# JWT Secret (Générez un secret fort - voir section Sécurité)
JWT_SECRET=<generate-with: openssl rand -hex 32>

# API Keys (Optionnelles mais recommandées)
OPENAI_API_KEY=sk-votre-cle-openai
GEMINI_API_KEY=votre-cle-gemini
DEEPSEEK_API_KEY=votre-cle-deepseek
GROQ_API_KEY=votre-cle-groq
MISTRAL_API_KEY=votre-cle-mistral
LOCAL_LLM_MODEL=mistralai/ministral-3-14b-reasoning

# CORS et Frontend
FRONTEND_URL=http://votre-synology-ip:3000
ALLOWED_ORIGIN=

# Configuration des logs
LOG_ENABLE_FILE=true
LOG_DEBUG=false
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Port Backend
BACKEND_PORT=3001

# Volumes Docker Synology (chemins absolus)
LOGS_VOLUME=/volume1/docker/teachdigital/backend/logs
OUTPUT_VOLUME=/volume1/docker/teachdigital/backend/output
TEMP_VOLUME=/volume1/docker/teachdigital/backend/temp
```

### Étape 3 : Sauvegarder et appliquer

1. **Sauvegardez le fichier** (dans nano : `Ctrl+O`, puis `Enter`, puis `Ctrl+X`)
2. **Redémarrez le conteneur** pour appliquer les changements :
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### ✅ Vérifier que les variables sont chargées

```bash
# Vérifier les variables dans le conteneur
docker-compose exec backend env | grep -E "DB_|JWT_|OPENAI"
```

---

## 🖥️ Méthode 2 : Interface Container Manager (Synology)

Cette méthode utilise l'interface graphique de Synology.

### Étape 1 : Ouvrir Container Manager

1. **Ouvrez DSM** (interface web de Synology)
2. **Ouvrez Container Manager** (anciennement Docker)
3. **Allez dans l'onglet "Container"**
4. **Sélectionnez votre conteneur** `teachdigital-backend`
5. **Cliquez sur "Modifier"** (icône crayon)

### Étape 2 : Ajouter les variables d'environnement

1. **Dans le menu latéral**, cliquez sur **"Variables d'environnement"**
2. **Cliquez sur "Ajouter"** pour chaque variable
3. **Remplissez les champs** :
   - **Nom** : `DB_HOST`
   - **Valeur** : `host.docker.internal`
   - Cliquez sur **"Créer"**

### Étape 3 : Variables à ajouter

Ajoutez toutes ces variables une par une :

| Nom | Valeur | Description |
|-----|--------|-------------|
| `DB_HOST` | `host.docker.internal` | Adresse PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USER` | `teachdigital` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `VotreMotDePasse` | Mot de passe PostgreSQL |
| `DB_NAME` | `teachdigital` | Nom de la base de données |
| `DATABASE_URL` | `postgresql://teachdigital:password@host.docker.internal:5432/teachdigital` | URL complète |
| `JWT_SECRET` | `VotreSecretJWT` | Secret JWT (générer un secret fort) |
| `OPENAI_API_KEY` | `sk-...` | Clé API OpenAI (optionnel) |
| `GEMINI_API_KEY` | `...` | Clé API Gemini (optionnel) |
| `GROQ_API_KEY` | `...` | Clé API Groq (optionnel) |
| `FRONTEND_URL` | `http://votre-ip:3000` | URL du frontend |
| `LOG_ENABLE_FILE` | `true` | Activer les logs fichiers |
| `BACKEND_PORT` | `3001` | Port du backend |

### Étape 4 : Sauvegarder et redémarrer

1. **Cliquez sur "Appliquer"** en bas de la page
2. **Le conteneur redémarre automatiquement** avec les nouvelles variables

### ✅ Vérifier

1. **Allez dans "Détails"** du conteneur
2. **Onglet "Variables d'environnement"** pour voir toutes les variables configurées

---

## 📝 Méthode 3 : Fichier `.env` (Alternative)

Si Docker Compose ne trouve pas `.env.docker`, vous pouvez utiliser `.env`.

### Étape 1 : Créer le fichier `.env`

```bash
cd /volume1/docker/teachdigital/backend
nano .env
```

### Étape 2 : Même contenu que `.env.docker`

Copiez le même contenu que pour la Méthode 1.

### Étape 3 : Modifier docker-compose.yml

Assurez-vous que `docker-compose.yml` charge le fichier `.env` :

```yaml
version: '3.8'

services:
  backend:
    # ... autres configurations ...
    env_file:
      - .env  # Charge le fichier .env
```

---

## 🔐 Générer un JWT_SECRET Fort

### Via SSH (Synology)

```bash
# Générer un secret aléatoire de 32 caractères
openssl rand -base64 32

# OU avec Node.js (si installé)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Via PowerShell (Windows)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Via le conteneur Docker

```bash
docker-compose exec backend node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔍 Vérifier les Variables d'Environnement

### Méthode 1 : Via SSH

```bash
# Voir toutes les variables
docker-compose exec backend env

# Filtrer les variables importantes
docker-compose exec backend env | grep -E "DB_|JWT_|OPENAI|GEMINI|GROQ"

# Voir une variable spécifique
docker-compose exec backend env | grep DB_HOST
```

### Méthode 2 : Via Container Manager

1. **Ouvrez Container Manager**
2. **Sélectionnez le conteneur** `teachdigital-backend`
3. **Cliquez sur "Détails"**
4. **Onglet "Variables d'environnement"**

### Méthode 3 : Via les logs

```bash
# Les logs peuvent afficher certaines variables (masquées)
docker-compose logs backend | grep -i "database\|jwt"
```

---

## 🛠️ Modifier une Variable Existante

### Méthode 1 : Modifier le fichier `.env.docker`

```bash
# Éditer le fichier
nano .env.docker

# Modifier la variable
# Exemple : changer DB_PASSWORD=VotreNouveauMotDePasse

# Redémarrer le conteneur
docker-compose down
docker-compose up -d
```

### Méthode 2 : Via Container Manager

1. **Ouvrez Container Manager**
2. **Sélectionnez le conteneur** → **"Modifier"**
3. **Variables d'environnement** → **Modifier la variable**
4. **Appliquer** → Le conteneur redémarre

---

## 🚨 Problèmes Courants

### Les variables ne sont pas chargées

**Problème** : Les variables ne sont pas prises en compte.

**Solutions** :
1. **Vérifiez le nom du fichier** : `.env.docker` ou `.env`
2. **Vérifiez l'emplacement** : Le fichier doit être dans le même dossier que `docker-compose.yml`
3. **Redémarrez le conteneur** :
   ```bash
   docker-compose down
   docker-compose up -d
   ```
4. **Vérifiez les permissions** :
   ```bash
   ls -la .env.docker
   chmod 644 .env.docker
   ```

### Erreur "Variable not found"

**Problème** : Docker Compose ne trouve pas une variable.

**Solutions** :
1. **Vérifiez l'orthographe** dans `.env.docker`
2. **Vérifiez qu'il n'y a pas d'espaces** autour du `=`
3. **Vérifiez les valeurs par défaut** dans `docker-compose.yml`

### Les variables sont vides

**Problème** : Les variables sont définies mais vides.

**Solutions** :
1. **Vérifiez le fichier `.env.docker`** :
   ```bash
   cat .env.docker | grep DB_PASSWORD
   ```
2. **Assurez-vous qu'il n'y a pas de guillemets** autour des valeurs (sauf si nécessaire)
3. **Vérifiez les caractères spéciaux** : échappez-les si nécessaire

---

## 📋 Checklist de Configuration

Avant de démarrer le conteneur, vérifiez :

- [ ] Fichier `.env.docker` créé dans le bon dossier
- [ ] `DB_HOST` configuré correctement (selon votre installation PostgreSQL)
- [ ] `DB_PASSWORD` changé (pas le mot de passe par défaut)
- [ ] `JWT_SECRET` généré et configuré (secret fort)
- [ ] `DATABASE_URL` construit correctement
- [ ] Au moins une clé API IA configurée (recommandé)
- [ ] `FRONTEND_URL` correspond à votre frontend
- [ ] Volumes configurés avec les bons chemins Synology
- [ ] Permissions des fichiers correctes
- [ ] Conteneur redémarré après modification

---

## 🔄 Mettre à Jour les Variables

### Processus complet

```bash
# 1. Arrêter le conteneur
docker-compose down

# 2. Modifier le fichier .env.docker
nano .env.docker

# 3. Vérifier les modifications
cat .env.docker

# 4. Redémarrer le conteneur
docker-compose up -d

# 5. Vérifier que les variables sont chargées
docker-compose exec backend env | grep -E "DB_|JWT_"
```

---

## 💡 Astuces

1. **Sauvegardez votre fichier `.env.docker`** dans un endroit sûr (mais ne le partagez jamais publiquement)
2. **Utilisez des secrets forts** pour `JWT_SECRET` et `DB_PASSWORD`
3. **Ne commitez jamais** le fichier `.env.docker` dans Git (il devrait être dans `.gitignore`)
4. **Documentez vos variables** dans un fichier séparé (sans les valeurs sensibles)
5. **Testez après chaque modification** pour vérifier que tout fonctionne

---

## 📚 Exemple Complet

Voici un exemple complet de fichier `.env.docker` pour Synology :

```env
# ====================================
# Configuration Docker Compose Synology
# ====================================

# Base de Données PostgreSQL
# Si PostgreSQL est sur le host Synology :
DATABASE_URL=postgresql://teachdigital:MonMotDePasse123!@host.docker.internal:5432/teachdigital
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=MonMotDePasse123!
DB_NAME=teachdigital

# JWT Secret (généré avec: openssl rand -base64 32)
JWT_SECRET=<generate-with: openssl rand -hex 32>

# API Keys IA
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# CORS et Frontend
FRONTEND_URL=http://192.168.1.100:3000
ALLOWED_ORIGIN=

# Configuration des logs
LOG_ENABLE_FILE=true
LOG_DEBUG=false
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Port Backend
BACKEND_PORT=3001

# Volumes Docker Synology
LOGS_VOLUME=/volume1/docker/teachdigital/backend/logs
OUTPUT_VOLUME=/volume1/docker/teachdigital/backend/output
TEMP_VOLUME=/volume1/docker/teachdigital/backend/temp
```

---

## 🔗 Liens Utiles

- [Guide de déploiement Synology complet](DEPLOY-SYNOLOGY.md)
- [Documentation Docker Compose](https://docs.docker.com/compose/environment-variables/)
- [Documentation Synology Container Manager](https://kb.synology.com/)

---

**Version** : 1.0  
**Dernière mise à jour** : 2024

