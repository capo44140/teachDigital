# 🐳 Déploiement Docker sur Synology

TeachDigital tourne sur le NAS dans deux conteneurs. Ils sont construits et lancés depuis un poste
Windows par `deploy.ps1` (racine du dépôt). PostgreSQL n'est pas fourni : on utilise une instance
existante, qui peut être le paquet du NAS, un conteneur ou une autre machine.

> Première mise en production de cette version sur un NAS déjà installé : suivre d'abord la
> [checklist « Mise à jour du déploiement »](#-mise-à-jour-du-déploiement-première-livraison-de-cette-version).

## 🧭 Architecture

```text
Navigateur ──HTTPS──▶ reverse proxy DSM ──▶ 127.0.0.1:3000 (ou IP du NAS:3000)
                                              │
                         conteneur teachdigital-frontend (nginx, port 80)
                         ├─ sert la SPA (frontend/dist) + en-têtes de sécurité (CSP…)
                         └─ /api/*  ──▶ http://backend:3001   (réseau Docker « teachdigital »)
                                              │
                         conteneur teachdigital-backend (Express, 3001)
                         ├─ publié uniquement sur 127.0.0.1:3001 (healthchecks depuis le NAS)
                         └─ PostgreSQL (DB_HOST : hôte du NAS, conteneur ou autre machine)
```

- Le réseau Docker externe `teachdigital` est créé par `deploy.ps1` avec un sous-réseau fixe
  (`-DockerSubnet`, défaut `172.30.240.0/24`, obligatoirement dans `172.16.0.0/12`). Le paramètre
  ne sert qu'à la création : pour changer de sous-réseau, arrêter les deux stacks, supprimer le
  réseau (`docker network rm teachdigital`) et redéployer.
- Le port 3001 n'est **pas** joignable depuis le réseau local : tout passe par le nginx du
  frontend.
- nginx ne prend en compte `X-Forwarded-For` que s'il vient de `127.0.0.1`, de `172.16.0.0/12`
  (passerelle Docker) ou de l'adresse indiquée dans `NGINX_TRUSTED_PROXY`. Le verrouillage des PIN
  se fait par adresse IP, d'où cette précaution.

## 📋 Prérequis

**Sur le NAS**

- DSM 7 avec Container Manager (`docker` et `docker compose`).
- Accès SSH par clé, avec un utilisateur autorisé à lancer `docker` (voir
  [SYNOLOGY_DOCKER_PERMISSIONS.md](SYNOLOGY_DOCKER_PERMISSIONS.md)).
- PostgreSQL joignable depuis le réseau Docker, avec une base et un utilisateur dédiés.
  Cet utilisateur doit être **propriétaire des tables**, car les migrations font des
  `ALTER TABLE` et des `CREATE INDEX`.

**Sur le poste Windows**

- PowerShell, Git for Windows (Git Bash et `tar`), Node 22 et pnpm 9.15 pour le build du frontend.
- Un alias `synology` dans `~/.ssh/config` (paramètre `-SshAlias` pour en utiliser un autre) :

  ```text
  Host synology
      HostName 192.168.1.10
      User mon-utilisateur
      IdentityFile ~/.ssh/synology_deploy
  ```

- Les dossiers de destination :
  - backend : `deployPath` dans `backend/.synology-deploy.json` (modèle
    `backend/.synology-deploy.json.example`), ou paramètre `-BackendPath` ;
  - frontend : `frontendDeployPath` dans `.synology-deploy.json` à la racine, ou paramètre
    `-FrontendPath`. Valeur par défaut : `/volume1/docker/teachdigital/frontend`.

## 🔐 Configuration sur le NAS

### Backend : `.env` à côté de `docker-compose.yml`

Copier `backend/env.docker.example` en `.env` dans le dossier backend du NAS et le remplir. Ce
fichier n'est jamais transféré par `deploy.ps1` ni intégré à l'image.

| Variable | Rôle |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (ou `DATABASE_URL`) | Accès PostgreSQL |
| `JWT_SECRET` | **Obligatoire**, au moins 32 caractères aléatoires (`openssl rand -hex 32`). Sans lui, `docker compose` refuse de démarrer |
| `AI_SETTINGS_KEY` | Recommandée, au moins 32 caractères et différente de `JWT_SECRET` : chiffre les clés IA enregistrées depuis l'interface. Ne plus la changer ensuite |
| `FRONTEND_URL`, `ALLOWED_ORIGIN` | Origines autorisées par CORS, par exemple `https://teachdigital.example` |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`… | Optionnelles. Elles peuvent aussi être saisies dans Configuration IA |

La liste complète, avec les valeurs par défaut, est dans
[SYNOLOGY-ENV-VARIABLES.md](SYNOLOGY-ENV-VARIABLES.md).

### PostgreSQL

Trois choix de `DB_HOST` :

- **PostgreSQL sur l'hôte du NAS** (paquet ou installation native) : `DB_HOST=host.docker.internal`.
  Le compose déclare `host.docker.internal:host-gateway`. PostgreSQL voit alors les connexions
  arriver depuis le sous-réseau du réseau `teachdigital`, qu'il faut autoriser :
  - `postgresql.conf` : `listen_addresses` doit inclure l'adresse de la passerelle Docker, ou `*` ;
  - `pg_hba.conf` : `host  teachdigital  teachdigital  172.30.240.0/24  scram-sha-256`
    (adapter la base, l'utilisateur et le sous-réseau `-DockerSubnet`), puis recharger PostgreSQL.
- **PostgreSQL dans un conteneur** : le connecter au réseau
  (`docker network connect teachdigital <conteneur-postgres>`) et mettre `DB_HOST=<conteneur-postgres>`.
- **Autre machine** : `DB_HOST=<ip>`. Le pare-feu doit laisser passer le port 5432 depuis le NAS.

### Frontend : `.env` facultatif dans le dossier frontend

Ce fichier est lu par `frontend/docker-compose.yml` :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `FRONTEND_BIND_ADDRESS` | `0.0.0.0` | Mettre `127.0.0.1` (recommandé) quand le reverse proxy DSM vise `localhost:3000` : les postes du réseau local passent alors forcément par le reverse proxy |
| `NGINX_TRUSTED_PROXY` | `127.0.0.1` | Adresse du reverse proxy DSM s'il vise l'IP réseau du NAS au lieu de `localhost:3000`. Sans elle, toutes les requêtes semblent venir du NAS |

`nginx.conf` est un modèle : au démarrage, l'image nginx y remplace uniquement les variables
`NGINX_*` (envsubst).

## 🚀 Déployer

Depuis la racine du dépôt :

```powershell
.\deploy.ps1                          # backend + frontend
.\deploy.ps1 -Target backend          # backend uniquement
.\deploy.ps1 -Target frontend         # frontend uniquement (build local puis envoi de frontend/dist/)
.\deploy.ps1 -SkipBuild               # réutilise le frontend/dist/ existant
.\deploy.ps1 -NoBuildCache            # docker compose build --no-cache
.\deploy.ps1 -DockerSubnet 172.31.0.0/24   # sous-réseau du réseau Docker (à sa création seulement)
```

Pour chaque composant, le script :

1. contrôle SSH et repère `docker` et `docker compose` sur le NAS ;
2. **backend** : crée les volumes (`logs`, `output`, `temp`, `.cache/tesseract`) et envoie
   `backend/`. Sont exclus : `node_modules`, `.env*`, `logs`, `output`, `temp`, `.cache` et
   `.synology-deploy.json` ;
3. **frontend** : lance `pnpm run build` en local, puis envoie `dist/`, `nginx.conf`,
   `Dockerfile.prebuilt` et `docker-compose.yml` ;
4. crée le réseau `teachdigital` s'il manque (`[NETWORK]`), puis enchaîne
   `docker compose down`, `build` et `up -d`. Si le build échoue, les conteneurs restent arrêtés ;
5. fait les vérifications suivantes :
   - backend : `/health`, puis `/health/ready` (base joignable et migrations appliquées) ;
   - frontend : `http://localhost:3000`, puis `/api/health` à travers nginx ;
   - avec `-Target backend` : présence du frontend sur le réseau.

Le backend applique seul les migrations au démarrage : il attend PostgreSQL jusqu'à 5 minutes,
puis migre. **Une migration en échec arrête le conteneur (code 1)** : lire les logs.

### Première installation

```bash
# Sur le NAS, après le premier déploiement
docker exec -it teachdigital-backend node scripts/init-family-gate.js <code à 4-8 chiffres>
docker exec -it teachdigital-backend node scripts/init-default-pins.js <PIN>   # profils sans PIN
docker exec -it teachdigital-backend node scripts/init-badges.js                # badges par défaut
```

- Sans code familial, personne ne peut se connecter, le parent compris. Un avertissement apparaît
  dans les logs au démarrage.
- Les codes triviaux (suites, répétitions, codes courants) sont refusés. Un profil parent exige
  un PIN d'au moins 6 chiffres.
- Pour un PIN parent oublié : `node scripts/reset-pin.js <id profil> <PIN>`. Les sessions du
  profil sont alors révoquées.

## ✅ Mise à jour du déploiement (première livraison de cette version)

Cette version change le réseau Docker, l'exposition des ports, la configuration nginx et le
schéma de la base, qui passe désormais par des migrations. Pour la première livraison sur un NAS
existant :

1. **Sauvegarder la base**
   `pg_dump -Fc -h <hôte> -U <utilisateur> <base> > teachdigital-avant-maj.dump`
   (ou `sh backend/scripts/backup-db.sh`, cf. [Sauvegardes de la base](#-sauvegardes-de-la-base))
2. **Vérifier le propriétaire des tables** : les migrations doivent pouvoir les modifier.

   ```sql
   SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public';
   -- si besoin, en superutilisateur : ALTER TABLE <table> OWNER TO <DB_USER>;
   ```

3. **Compléter le `.env` du backend sur le NAS**
   - ajouter `AI_SETTINGS_KEY` (`openssl rand -hex 32`, différente de `JWT_SECRET`). Les clés IA
     déjà enregistrées sont rechiffrées automatiquement au premier démarrage ;
   - **supprimer** `API_JSON_BODY_LIMIT=10mb` s'il est présent. La limite par défaut est désormais
     100 ko, et 10 Mo uniquement sur les routes qui en ont besoin ;
   - **supprimer** toute ancienne ligne `TRUST_PROXY`. Le compose fixe `1`, car le nginx du
     frontend est le seul intermédiaire.
4. **PostgreSQL sur l'hôte du NAS** : autoriser le sous-réseau du réseau Docker dans
   `pg_hba.conf` (`172.30.240.0/24` par défaut), puis recharger PostgreSQL. Voir plus haut.
5. **Reverse proxy DSM** : il doit viser `localhost:3000`, et non plus le port 3001. Mettre
   `FRONTEND_BIND_ADDRESS=127.0.0.1` dans le `.env` du dossier frontend. S'il vise l'IP réseau du
   NAS, renseigner `NGINX_TRUSTED_PROXY` avec cette IP (voir [HTTPS-SYNOLOGY-SETUP.md](HTTPS-SYNOLOGY-SETUP.md)).
6. **Déployer les deux composants ensemble** : `.\deploy.ps1`, **sans** `-Target`. Les deux
   conteneurs doivent rejoindre le nouveau réseau, et l'ancien frontend ne joint plus le backend.
7. **Lire la sortie du script**
   - `[NETWORK] Reseau teachdigital : sous-reseau 172.30.240.0/24` ;
   - `[OK] Base de donnees joignable et migrations appliquees (/health/ready)` ;
   - `[OK] /api/health repond via le nginx du frontend`.
8. **Vérifier les migrations** :
   `docker exec teachdigital-backend node scripts/migrate.js --status`. Les migrations
   `0001_baseline` à `0102_deactivate_learning_time_badges` doivent être appliquées, sans aucune
   en attente.
9. **Vérifier que le port 3001 n'est plus exposé**
   - depuis un poste du réseau local, `curl -m 5 http://<ip-du-nas>:3001/health` doit **échouer** ;
   - depuis le NAS, `curl http://127.0.0.1:3001/health` doit répondre.
10. **Contrôle fonctionnel** : saisir le code familial, se connecter au profil parent avec son PIN,
    puis ouvrir une page de cours. Les PIN existants restent valides. Un PIN trivial, ou un PIN
    parent de moins de 6 chiffres, sera refusé au prochain changement. Les badges
    « temps d'apprentissage » sont désactivés par la migration 0102.

En cas de problème : `docker logs --tail=100 teachdigital-backend`. Pour revenir en arrière,
restaurer la sauvegarde (`pg_restore`) et redéployer l'ancienne version des **deux** composants.

## 📊 Exploitation

```bash
# Logs et état (dossier backend du NAS ; docker-helper.sh est déployé par deploy.ps1)
./docker-helper.sh logs | status | restart | shell | rebuild
docker logs -f teachdigital-backend
docker logs -f teachdigital-frontend

# Santé
curl http://127.0.0.1:3001/health         # liveness (ne touche pas la base)
curl http://127.0.0.1:3001/health/ready   # readiness : 503 si PostgreSQL est injoignable
curl http://127.0.0.1:3000/api/health     # chaîne nginx -> backend
```

- Logs du backend : sortie standard (Docker) et fichiers dans le volume `logs/`, avec rotation.
  Les PIN, jetons, clés et mots de passe sont masqués. Chaque erreur renvoyée au client porte un
  `requestId`, qu'on retrouve dans les logs et dans l'en-tête `X-Request-Id`.
- Arrêt : `docker stop` laisse jusqu'à 15 s aux requêtes en cours (`stop_grace_period: 30s`).
- Les verrouillages après des PIN incorrects sont gardés en mémoire :
  `docker restart teachdigital-backend` les lève.
- Une variable du `.env` modifiée n'est prise en compte qu'à la recréation du conteneur
  (`docker compose up -d`, ou un nouveau déploiement) ; `docker compose restart` ne la recharge pas.

## 💾 Sauvegardes de la base

`backend/scripts/backup-db.sh` fait un `pg_dump` (format custom) de la base, vérifie que
l'archive est lisible, puis supprime les sauvegardes de plus de 14 jours. Il lit la connexion
dans le `.env` du backend (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) et lance
`pg_dump` dans un conteneur `postgres:16-alpine` jetable, sur le réseau `teachdigital` comme le
backend : même `DB_HOST`, même sous-réseau autorisé dans `pg_hba.conf`.

Les fichiers sont écrits dans `/volume1/docker/teachdigital/backups/` (à côté de `backend/`, hors
de ce que `deploy.ps1` remplace), lisibles par root seulement : ils contiennent les données des
enfants et les hash des PIN.

### Planifier la sauvegarde (DSM)

1. **Panneau de configuration** → **Planificateur de tâches** → **Créer** → **Tâche planifiée** →
   **Script défini par l'utilisateur**
2. **Utilisateur** : `root` ; **Programme** : tous les jours (ex. 3 h du matin)
3. **Script** :
   ```bash
   sh /volume1/docker/teachdigital/backend/scripts/backup-db.sh
   ```
4. Dans **Paramètres**, cocher l'envoi d'un e-mail **en cas d'échec** : le script sort en erreur
   si `pg_dump` échoue ou si l'archive est illisible.

Options (variables à placer devant la commande) :
- `BACKUP_DIR=/volume1/backups/teachdigital` : autre dossier de destination ;
- `BACKUP_RETENTION_DAYS=30` : durée de conservation ;
- `PG_DUMP_IMAGE=postgres:17-alpine` : à aligner sur la version **majeure** du serveur
  (`pg_dump` refuse un serveur plus récent que lui).

> Une copie sur le même disque ne protège pas d'une panne du NAS : ajouter le dossier `backups/`
> à une tâche **Hyper Backup** vers un disque externe ou un stockage distant.

### Restaurer une sauvegarde

Tester la restauration au moins une fois, dans une base jetable :

```bash
# Mot de passe de la base (DB_PASSWORD du .env), sans le laisser dans l'historique
read -rs PGPASSWORD && export PGPASSWORD

# Créer une base de test et y restaurer la sauvegarde (<DB_HOST> : valeur du .env)
docker run --rm -e PGPASSWORD --network teachdigital --add-host=host.docker.internal:host-gateway \
  -v /volume1/docker/teachdigital/backups:/backup postgres:16-alpine sh -c '
    createdb -h <DB_HOST> -U teachdigital teachdigital_restore_test &&
    pg_restore -h <DB_HOST> -U teachdigital -d teachdigital_restore_test \
      --no-owner /backup/teachdigital-AAAAMMJJ-HHMMSS.dump'

# Vérifier (psql ... -d teachdigital_restore_test -c "SELECT count(*) FROM profiles;")
# puis supprimer la base de test (dropdb ... teachdigital_restore_test)
```

En cas de perte réelle : arrêter le backend (`docker compose down` dans le dossier backend), puis
restaurer dans la base de production avec
`pg_restore --clean --if-exists --no-owner -d teachdigital <fichier>.dump`.

## 🤖 Déploiement par GitHub Actions (optionnel)

`.github/workflows/deploy-synology.yml` se lance à la main (Actions > Deploy to Synology > Run
workflow), après la CI. Il envoie les mêmes fichiers par `rsync` et utilise les secrets
`SYNOLOGY_SSH_KEY`, `SYNOLOGY_HOST` et `SYNOLOGY_USER`. Ce workflow ne crée **pas** le réseau
`teachdigital` : il ne fonctionne que si le réseau existe déjà, c'est-à-dire après un premier
`deploy.ps1`.

## 🐛 Dépannage

| Symptôme | Piste |
| --- | --- |
| Le backend redémarre en boucle, « PostgreSQL injoignable » | `DB_HOST`/`DB_PORT`, `pg_hba.conf` (sous-réseau Docker), `listen_addresses` |
| « Migrations de la base en échec » | Le message indique le fichier fautif. Cause probable : l'utilisateur n'est pas propriétaire des tables |
| `/api/...` en 502 via nginx | Le backend n'est pas lancé ou n'est pas sur le réseau `teachdigital` (`docker network inspect teachdigital`) |
| `[WARNING] Le conteneur frontend n est pas sur le reseau` | Redéployer le frontend : `.\deploy.ps1 -Target frontend` |
| « Code d'entrée familial non configuré » (503) | `node scripts/init-family-gate.js <code>` |
| Les erreurs CORS | `FRONTEND_URL` / `ALLOWED_ORIGIN` doivent contenir l'URL publique exacte (https) |
| Génération IA interrompue au bout d'environ 60 s | Augmenter les délais du reverse proxy DSM (voir le guide HTTPS) |
| `permission denied ... docker.sock` | [SYNOLOGY_DOCKER_PERMISSIONS.md](SYNOLOGY_DOCKER_PERMISSIONS.md) |
