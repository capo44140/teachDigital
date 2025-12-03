# 🚀 Installation Supabase sur Synology

Ce guide vous explique comment installer et configurer Supabase sur votre Synology avec Docker Compose.

## 📋 Prérequis

- Docker et Docker Compose installés sur votre Synology
- Ports disponibles : 5432, 8000, 8080, 3001, 8081, 9999

## 🔧 Installation

### 1. Créer les fichiers nécessaires

Placez les fichiers suivants dans un dossier sur votre Synology (par exemple `/docker/supabase/`) :
- `docker-compose.yml`
- `kong.yml`
- `init-supabase.sql`

### 2. Initialiser la base de données

Avant de démarrer les conteneurs, vous devez initialiser la base de données avec les rôles Supabase :

```bash
# Option 1 : Via Docker (recommandé)
docker run --rm -it \
  -e PGPASSWORD=5WZqggz2CrD1vyLA \
  -v $(pwd)/init-supabase.sql:/init-supabase.sql \
  --network host \
  postgres:15 \
  psql -h localhost -U postgres -d postgres -f /init-supabase.sql

# Option 2 : Attendre que le conteneur db soit démarré, puis :
docker exec -i supabase-db psql -U postgres -d postgres < init-supabase.sql
```

### 3. Démarrer les services

```bash
docker-compose up -d
```

### 4. Vérifier les services

```bash
# Vérifier que tous les conteneurs sont en cours d'exécution
docker-compose ps

# Vérifier les logs
docker-compose logs -f
```

## 🌐 Accès aux services

Une fois démarrés, vous pouvez accéder à :

- **Supabase Studio** : http://votre-synology-ip:8080
- **API REST** : http://votre-synology-ip:8000/rest/v1/
- **API Auth** : http://votre-synology-ip:8000/auth/v1/
- **PostgreSQL** : `localhost:5432` (depuis votre Synology)

## 🔑 Clés API

Les clés API utilisées dans cette configuration sont :

- **ANON_KEY** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **SERVICE_KEY** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

⚠️ **Important** : Ces clés sont des clés de démonstration. Pour la production, générez de nouvelles clés avec un secret JWT différent.

## 🔒 Sécurité

### Pour la production :

1. **Changez tous les mots de passe** dans `docker-compose.yml`
2. **Générez de nouvelles clés JWT** :
   ```bash
   openssl rand -base64 32
   ```
3. **Mettez à jour les clés** dans `docker-compose.yml` et `kong.yml`
4. **Configurez un reverse proxy** (nginx) avec SSL/TLS
5. **Restreignez l'accès** aux ports exposés avec un firewall

## 📊 Persistance des données

Les données de la base de données sont stockées dans un volume Docker nommé `db_data`. Pour sauvegarder :

```bash
# Sauvegarder la base de données
docker exec supabase-db pg_dump -U postgres postgres > backup.sql

# Restaurer la base de données
docker exec -i supabase-db psql -U postgres postgres < backup.sql
```

## 🐛 Dépannage

### Kong ne démarre pas

Vérifiez que le fichier `kong.yml` est bien monté et accessible :
```bash
docker exec supabase-kong cat /usr/local/kong/kong.yml
```

### PostgREST ne peut pas se connecter

Vérifiez que les rôles ont bien été créés :
```bash
docker exec supabase-db psql -U postgres -c "\du"
```

### Studio ne se connecte pas

Vérifiez les logs :
```bash
docker-compose logs studio
```

## 📝 Notes

- Les ports peuvent être modifiés dans `docker-compose.yml` si nécessaire
- Pour accéder depuis l'extérieur, configurez votre routeur pour rediriger les ports
- Les images Docker sont fixées à des versions spécifiques pour la stabilité



























