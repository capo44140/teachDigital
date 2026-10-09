# 🚀 Guide de Déploiement sur Synology

Ce guide explique comment déployer automatiquement TeachDigital sur votre Synology via GitHub Actions.

## 📋 Prérequis

1. **Synology avec Docker installé**
2. **SSH activé** sur le Synology
3. **Clé SSH** générée pour l'accès
4. **GitHub Repository** avec accès

---

## 🔧 Configuration GitHub Secrets

Ajoute ces secrets dans **GitHub Settings > Secrets and variables > Actions** :

### Secrets requis :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `SYNOLOGY_SSH_KEY` | Clé privée SSH pour accéder au Synology | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SYNOLOGY_HOST` | Adresse IP ou hostname du Synology | `votre-nas.synology.me` ou `192.168.1.100` |
| `SYNOLOGY_USER` | Utilisateur SSH du Synology | `admin` |
| `SYNOLOGY_DEPLOY_PATH` | Chemin où déployer l'application | `/volume1/docker/teachdigital` |

---

## 🔑 Générer une clé SSH

### Sur Windows (PowerShell) :

```powershell
# Générer une clé SSH
ssh-keygen -t ed25519 -C "github-actions-synology" -f ~/.ssh/synology_deploy

# Afficher la clé privée (à copier dans GitHub Secrets)
Get-Content ~/.ssh/synology_deploy

# Afficher la clé publique (à ajouter sur le Synology)
Get-Content ~/.ssh/synology_deploy.pub
```

### Sur Linux/Mac :

```bash
# Générer une clé SSH
ssh-keygen -t ed25519 -C "github-actions-synology" -f ~/.ssh/synology_deploy

# Afficher la clé privée
cat ~/.ssh/synology_deploy

# Afficher la clé publique
cat ~/.ssh/synology_deploy.pub
```

---

## 🔐 Configurer SSH sur Synology

### 1. Activer SSH sur Synology

1. **Control Panel** > **Terminal & SNMP**
2. Cochez **Enable SSH service**
3. Port : `22` (par défaut)
4. Cliquez **Apply**

### 2. Ajouter la clé publique SSH

```bash
# Se connecter au Synology
ssh admin@votre-nas.synology.me

# Créer le dossier .ssh s'il n'existe pas
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Ajouter la clé publique
echo "VOTRE_CLE_PUBLIQUE_ICI" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 📁 Préparer le répertoire de déploiement

```bash
# Se connecter au Synology
ssh admin@votre-nas.synology.me

# Créer le répertoire
mkdir -p /volume1/docker/teachdigital
cd /volume1/docker/teachdigital

# Créer le fichier .env
nano .env
```

Copie le contenu de `.env.synology.example` et adapte les valeurs.

---

## 🚀 Premier déploiement manuel

### 1. Cloner le repo sur le Synology

```bash
ssh admin@votre-nas.synology.me
cd /volume1/docker/teachdigital
git clone https://github.com/ton-username/teachDigital.git .
```

### 2. Créer le fichier .env

```bash
cp .env.synology.example .env
nano .env  # Édite avec tes valeurs
```

### 3. Lancer les conteneurs

```bash
docker-compose -f docker-compose.app.yml up -d
```

### 4. Vérifier que tout fonctionne

```bash
docker-compose -f docker-compose.app.yml ps
docker-compose -f docker-compose.app.yml logs
```

---

## 🔄 Déploiement automatique

Une fois configuré, **chaque push sur `main`** déclenchera automatiquement :

1. ✅ Build des images Docker
2. ✅ Copie des fichiers sur le Synology
3. ✅ Redémarrage des conteneurs
4. ✅ Health checks

### Déclencher manuellement

Sur GitHub : **Actions** > **🚀 Deploy to Synology** > **Run workflow**

---

## 📊 Vérifier le déploiement

### Logs GitHub Actions

```
https://github.com/ton-username/teachDigital/actions
```

### Logs sur Synology

```bash
ssh admin@votre-nas.synology.me
cd /volume1/docker/teachdigital
docker-compose -f docker-compose.app.yml logs -f
```

### État des conteneurs

```bash
docker-compose -f docker-compose.app.yml ps
```

---

## 🔧 Commandes utiles

### Redémarrer les services

```bash
cd /volume1/docker/teachdigital
docker-compose -f docker-compose.app.yml restart
```

### Voir les logs

```bash
docker-compose -f docker-compose.app.yml logs -f backend
docker-compose -f docker-compose.app.yml logs -f frontend
docker-compose -f docker-compose.app.yml logs -f postgres
```

### Arrêter les services

```bash
docker-compose -f docker-compose.app.yml down
```

### Mettre à jour manuellement

```bash
cd /volume1/docker/teachdigital
git pull
docker-compose -f docker-compose.app.yml up -d --build
```

---

## 🐛 Dépannage

### Erreur SSH

```
❌ Permission denied (publickey)
```

**Solution :** Vérifie que la clé publique est bien dans `~/.ssh/authorized_keys` sur le Synology.

---

### Erreur Docker

```
❌ Cannot connect to the Docker daemon
```

**Solution :** Vérifie que l'utilisateur SSH a les droits Docker :

```bash
# Sur Synology
sudo usermod -aG docker admin
```

---

### Erreur de connexion DB

```
❌ Connection refused to postgres:5432
```

**Solution :** Vérifie que le conteneur `postgres` est démarré :

```bash
docker-compose -f docker-compose.app.yml ps postgres
```

---

## 📝 Notes importantes

- ⚠️ **Ne commit JAMAIS** le fichier `.env` (il est dans `.gitignore`)
- ✅ Les secrets sont stockés dans GitHub Secrets
- 🔒 Utilise des mots de passe forts en production
- 📦 Les données PostgreSQL sont persistées dans un volume Docker

---

## 🎯 Prochaines étapes

1. ✅ Configure les GitHub Secrets
2. ✅ Teste le premier déploiement manuel
3. ✅ Push sur `main` pour déclencher le déploiement automatique
4. ✅ Configure un domaine (optionnel) avec Nginx reverse proxy

---

**Besoin d'aide ?** Ouvre une issue sur GitHub ! 🚀

