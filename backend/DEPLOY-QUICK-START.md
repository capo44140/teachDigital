# 🚀 Guide de Déploiement Rapide sur Synology

Ce guide vous explique comment redéployer facilement votre code sur votre Synology en une seule commande.

## 📋 Prérequis

1. **SSH activé** sur votre Synology
2. **Clé SSH configurée** pour l'accès sans mot de passe
3. **Docker et Docker Compose** installés sur le Synology
4. **pnpm** installé localement (pour le build)

## ⚡ Déploiement en une commande

### Méthode 1 : Via npm/pnpm (Recommandé)

```bash
pnpm run deploy:synology
```

Ou pour ignorer le build :

```bash
pnpm run deploy:synology:skip-build
```

### Méthode 2 : Directement avec PowerShell

#### Première utilisation

Lors de la première utilisation, le script vous demandera les paramètres de connexion :

```powershell
.\deploy-synology.ps1
```

Le script va :
1. Vous demander l'adresse IP/hostname du Synology
2. Vous demander l'utilisateur SSH
3. Vous demander le chemin de déploiement
4. Sauvegarder ces informations dans `.synology-deploy.json`

#### Utilisations suivantes

Une fois configuré, il suffit d'exécuter :

```powershell
.\deploy-synology.ps1
```

Le script va automatiquement :
1. ✅ Builder le frontend (`pnpm run build`)
2. ✅ Copier tous les fichiers sur le Synology
3. ✅ Reconstruire les images Docker
4. ✅ Redémarrer les conteneurs

## 🔧 Options disponibles

### Ignorer le build

Si vous avez déjà buildé le frontend :

```bash
pnpm run deploy:synology:skip-build
```

Ou avec PowerShell :

```powershell
.\deploy-synology.ps1 -SkipBuild
```

### Spécifier des paramètres différents

```powershell
.\deploy-synology.ps1 -SynologyHost "192.168.1.200" -SynologyUser "admin" -DeployPath "/volume2/docker/teachdigital"
```

## 📝 Configuration manuelle

Vous pouvez aussi créer/modifier le fichier `.synology-deploy.json` :

```json
{
  "host": "192.168.1.100",
  "user": "admin",
  "deployPath": "/volume1/docker/teachdigital"
}
```

**⚠️ Important :** Ne commitez JAMAIS ce fichier (il est dans `.gitignore`).

## 🔑 Configuration SSH

### Générer une clé SSH (si pas déjà fait)

```powershell
ssh-keygen -t ed25519 -C "synology-deploy" -f ~/.ssh/synology_deploy
```

### Copier la clé publique sur le Synology

```powershell
type ~/.ssh/synology_deploy.pub | ssh admin@192.168.1.100 "cat >> ~/.ssh/authorized_keys"
```

### Tester la connexion

```powershell
ssh admin@192.168.1.100 "echo 'Connexion OK'"
```

## 🐳 Préparation du Synology

### 1. Créer le répertoire de déploiement

```bash
ssh admin@192.168.1.100
mkdir -p /volume1/docker/teachdigital
cd /volume1/docker/teachdigital
```

### 2. Créer le fichier `.env`

```bash
cp env.synology.example .env
nano .env  # Éditer avec vos valeurs
```

### 3. Premier déploiement

Depuis votre machine locale :

```powershell
.\deploy-synology.ps1
```

## 📊 Vérifier le déploiement

### Voir les logs en temps réel

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml logs -f"
```

### Vérifier l'état des conteneurs

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml ps"
```

### Tester l'API

```powershell
curl http://192.168.1.100:3001/health
```

### Tester le frontend

Ouvrez dans votre navigateur : `http://192.168.1.100:3000`

## 🔄 Workflow de développement

### Développement local

1. Faire vos modifications
2. Tester localement avec `pnpm run dev`
3. Commit et push (optionnel)

### Déploiement sur Synology

```powershell
.\deploy-synology.ps1
```

C'est tout ! 🎉

## 🐛 Dépannage

### Erreur "Permission denied (publickey)"

**Solution :** Vérifiez que votre clé SSH est bien configurée :

```powershell
ssh admin@192.168.1.100 "echo 'OK'"
```

Si ça ne fonctionne pas, copiez à nouveau votre clé publique.

### Erreur "Cannot connect to the Docker daemon"

**Solution :** Vérifiez que l'utilisateur SSH a les droits Docker :

```bash
ssh admin@192.168.1.100
sudo usermod -aG docker admin
```

Puis reconnectez-vous.

### Erreur "rsync: command not found"

**Solution :** Le script utilisera `scp` à la place. Pour installer rsync sur Windows :

- **Option 1 :** Installer [Git for Windows](https://git-scm.com/download/win) (inclut rsync)
- **Option 2 :** Utiliser [Cygwin](https://www.cygwin.com/)
- **Option 3 :** Le script fonctionnera avec `scp` (plus lent mais fonctionnel)

### Le build échoue

**Solution :** Vérifiez que vous avez installé les dépendances :

```powershell
pnpm install
```

### Les conteneurs ne démarrent pas

**Solution :** Vérifiez les logs :

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml logs"
```

Vérifiez aussi que le fichier `.env` est bien configuré.

## 📚 Commandes utiles

### Redémarrer les services

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml restart"
```

### Arrêter les services

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml down"
```

### Voir les logs d'un service spécifique

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml logs -f backend"
```

### Reconstruire sans cache

```powershell
ssh admin@192.168.1.100 "cd /volume1/docker/teachdigital && docker-compose -f docker-compose.app.yml build --no-cache"
```

## 🎯 Prochaines étapes

1. ✅ Configurez SSH avec clé
2. ✅ Testez le premier déploiement
3. ✅ Configurez un reverse proxy (optionnel) pour HTTPS
4. ✅ Configurez un domaine (optionnel)

## 💡 Astuces

- **Déploiement rapide :** Utilisez `-SkipBuild` si vous n'avez pas modifié le frontend
- **Logs en temps réel :** Gardez une fenêtre SSH ouverte avec `docker-compose logs -f`
- **Backup :** Le script peut créer un backup avant déploiement (à venir)
- **Notifications :** Configurez des notifications pour les déploiements réussis (à venir)

---

**Besoin d'aide ?** Consultez aussi :
- [Guide de déploiement complet](README-DEPLOY.md)
- [Guide backend Synology](backend/DEPLOY-SYNOLOGY.md)
- [Configuration HTTPS](doc/HTTPS-SYNOLOGY-SETUP.md)

