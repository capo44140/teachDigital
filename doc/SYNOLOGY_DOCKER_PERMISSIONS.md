# Configuration Docker sur Synology

## Problème de permissions Docker

Si vous rencontrez l'erreur suivante :
```
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

C'est parce que votre utilisateur SSH n'a pas les permissions pour accéder au socket Docker.

## Solutions

### Solution 1 : Utiliser le script helper (Recommandé)

Le script `docker-helper.sh` est automatiquement déployé lors du déploiement. Il permet d'exécuter les commandes Docker courantes :

```bash
# Voir les logs en temps réel
ssh synology "/volume1/docker/teachdigital/backend/docker-helper.sh logs"

# Voir le statut des conteneurs
ssh synology "/volume1/docker/teachdigital/backend/docker-helper.sh status"

# Redémarrer le conteneur
ssh synology "/volume1/docker/teachdigital/backend/docker-helper.sh restart"

# Ouvrir un shell dans le conteneur
ssh synology "/volume1/docker/teachdigital/backend/docker-helper.sh shell"

# Reconstruire complètement
ssh synology "/volume1/docker/teachdigital/backend/docker-helper.sh rebuild"
```

### Solution 2 : Configurer les permissions Docker (Permanent)

Pour éviter les problèmes de permissions de manière permanente, ajoutez votre utilisateur au groupe `docker` sur le Synology :

1. Connectez-vous en SSH au Synology :
   ```bash
   ssh synology
   ```

2. Ajoutez votre utilisateur au groupe docker :
   ```bash
   sudo synogroup --member docker $USER
   ```
   
   Ou si vous connaissez votre nom d'utilisateur :
   ```bash
   sudo synogroup --member docker votre_nom_utilisateur
   ```

3. Déconnectez-vous et reconnectez-vous pour que les changements prennent effet :
   ```bash
   exit
   ssh synology
   ```

4. Vérifiez que vous êtes bien dans le groupe docker :
   ```bash
   groups
   ```
   Vous devriez voir `docker` dans la liste.

5. Testez une commande Docker :
   ```bash
   docker ps
   ```

### Solution 3 : Utiliser sudo (Temporaire)

Si vous ne pouvez pas modifier les permissions, utilisez `sudo` devant chaque commande Docker :

```bash
ssh synology "cd /volume1/docker/teachdigital/backend && sudo /usr/local/bin/docker compose logs -f backend"
```

**Note :** Cette solution nécessite que votre utilisateur ait les droits sudo et peut demander un mot de passe.

## Configuration sudo sans mot de passe (Optionnel)

Si vous utilisez souvent sudo et voulez éviter de taper le mot de passe à chaque fois :

1. Connectez-vous au Synology :
   ```bash
   ssh synology
   ```

2. Éditez le fichier sudoers :
   ```bash
   sudo visudo
   ```

3. Ajoutez cette ligne à la fin (remplacez `votre_utilisateur` par votre nom d'utilisateur) :
   ```
   votre_utilisateur ALL=(ALL) NOPASSWD: /usr/local/bin/docker
   ```

4. Sauvegardez et quittez (Ctrl+X, puis Y, puis Entrée)

## Vérification

Pour vérifier que tout fonctionne :

```bash
# Avec le script helper
ssh synology "/volume1/docker/teachdigital/backend/docker-helper.sh status"

# Ou directement
ssh synology "docker ps"
```

Si vous voyez la liste des conteneurs, c'est bon ! ✅
