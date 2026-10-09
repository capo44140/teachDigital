# 🚀 Installation Supabase sur Synology (optionnel)

> ℹ️ Cette stack est **optionnelle et non utilisée par l'application** TeachDigital
> (qui tourne avec `backend/docker-compose.yml` + `frontend/docker-compose.yml`, cf. `deploy.ps1`).

Ce guide vous explique comment installer et configurer Supabase sur votre Synology avec Docker Compose.

## 📋 Prérequis

- Docker et Docker Compose installés sur votre Synology
- Ports disponibles **sur 127.0.0.1** : 5432, 8000, 8443, 8080, 3005, 8081, 9999

## 🔧 Installation

### 1. Créer les fichiers nécessaires

Placez les fichiers suivants dans un dossier sur votre Synology (par exemple `/docker/supabase/`) :
- `docker-compose.yml`
- `kong.yml` (non fourni dans ce dépôt)
- `init-supabase.sql`
- `.env` (à créer, **jamais commité**) :

```env
POSTGRES_PASSWORD=<generate-with: openssl rand -hex 24>
AUTHENTICATOR_PASSWORD=<generate-with: openssl rand -hex 24>
SUPABASE_JWT_SECRET=<generate-with: openssl rand -hex 32>
# JWT signés (HS256) avec SUPABASE_JWT_SECRET, claims role=anon / role=service_role
SUPABASE_ANON_KEY=<jwt-anon-signe-avec-SUPABASE_JWT_SECRET>
SUPABASE_SERVICE_KEY=<jwt-service_role-signe-avec-SUPABASE_JWT_SECRET>
```

`docker compose` refuse de démarrer tant que ces variables ne sont pas définies.

### 2. Initialiser la base de données

Avant d'utiliser PostgREST, initialisez les rôles Supabase (le mot de passe du rôle
`authenticator` est passé en variable psql, il n'est jamais écrit dans le script) :

```bash
# Charger les variables du .env dans le shell courant
set -a; . ./.env; set +a

# Option 1 : Via Docker
docker run --rm -it \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  -v $(pwd)/init-supabase.sql:/init-supabase.sql \
  --network host \
  postgres:15 \
  psql -h localhost -U postgres -d postgres \
       -v authenticator_password="$AUTHENTICATOR_PASSWORD" -f /init-supabase.sql

# Option 2 : Attendre que le conteneur db soit démarré, puis :
docker exec -i supabase-db psql -U postgres -d postgres \
  -v authenticator_password="$AUTHENTICATOR_PASSWORD" < init-supabase.sql
```

### 3. Démarrer les services

```bash
docker compose up -d
```

### 4. Vérifier les services

```bash
# Vérifier que tous les conteneurs sont en cours d'exécution
docker compose ps

# Vérifier les logs
docker compose logs -f
```

## 🌐 Accès aux services

Tous les ports sont liés à `127.0.0.1` (Studio et postgres-meta n'ont aucune authentification).
Depuis votre poste, passez par un tunnel SSH, par exemple :

```bash
ssh -L 8080:127.0.0.1:8080 -L 8000:127.0.0.1:8000 <utilisateur>@<votre-nas>
```

- **Supabase Studio** : http://localhost:8080
- **API REST** : http://localhost:8000/rest/v1/
- **API Auth** : http://localhost:8000/auth/v1/
- **PostgreSQL** : `localhost:5432` (depuis votre Synology)

## 🔑 Clés API

Les clés `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` sont des JWT signés avec
`SUPABASE_JWT_SECRET`. Générez-les vous-même ; ne réutilisez jamais les clés de
démonstration publiques de Supabase.

⚠️ D'anciennes versions de ce dépôt contenaient un mot de passe PostgreSQL et des clés
en clair : ils doivent être considérés comme compromis et changés.

## 🔒 Sécurité

### Pour la production :

1. **Définissez tous les secrets dans `.env`** (jamais dans `docker-compose.yml`)
2. **Générez un secret JWT** :
   ```bash
   openssl rand -hex 32
   ```
3. **Mettez à jour les clés** dans `.env` et `kong.yml`
4. **Configurez un reverse proxy** (nginx) avec SSL/TLS si un accès externe est nécessaire
5. **Restreignez l'accès** : `GOTRUE_URI_ALLOW_LIST` explicite, inscription désactivée
   (`GOTRUE_DISABLE_SIGNUP=true`) et pas d'auto-confirmation des e-mails par défaut

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
docker compose logs studio
```

## 📝 Notes

- Les ports peuvent être modifiés dans `docker-compose.yml` si nécessaire
- PostgREST est publié sur 3005 (le port 3001 est celui du backend TeachDigital)
- Les images Docker sont fixées à des versions spécifiques pour la stabilité
