#!/bin/sh
# Sauvegarde de la base PostgreSQL de TeachDigital (pg_dump, format custom) avec rotation.
#
# Usage (sur le NAS, tâche planifiée DSM exécutée en root, cf. doc/DEPLOY-SYNOLOGY.md) :
#   sh /volume1/docker/teachdigital/backend/scripts/backup-db.sh
#
# Connexion lue dans backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) ;
# une variable déjà définie dans l'environnement est prioritaire.
# pg_dump tourne dans un conteneur jetable (Docker du NAS), à défaut celui de l'hôte.
# Options (environnement) :
#   BACKUP_DIR             dossier des sauvegardes (défaut : <dossier parent de backend>/backups)
#   BACKUP_RETENTION_DAYS  nombre de jours conservés (défaut : 14)
#   PG_DUMP_IMAGE          image Docker de pg_dump (défaut : postgres:16-alpine ;
#                          prendre au moins la version majeure du serveur)
#   BACKUP_DOCKER_NETWORK  réseau Docker de ce conteneur (défaut : teachdigital s'il existe, comme
#                          le backend : même sous-réseau autorisé dans pg_hba.conf, même DB_HOST)

set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR=$(dirname "$SCRIPT_DIR")
ENV_FILE="$BACKEND_DIR/.env"

# Lit KEY=valeur dans .env sans l'exécuter (guillemets simples/doubles retirés)
read_env() {
  [ -f "$ENV_FILE" ] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r' | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

DB_HOST=${DB_HOST:-$(read_env DB_HOST)}
DB_PORT=${DB_PORT:-$(read_env DB_PORT)}
DB_NAME=${DB_NAME:-$(read_env DB_NAME)}
DB_USER=${DB_USER:-$(read_env DB_USER)}
PGPASSWORD=${DB_PASSWORD:-$(read_env DB_PASSWORD)}
export PGPASSWORD

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-teachdigital}
DB_USER=${DB_USER:-teachdigital}
BACKUP_DIR=${BACKUP_DIR:-$(dirname "$BACKEND_DIR")/backups}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
PG_DUMP_IMAGE=${PG_DUMP_IMAGE:-postgres:16-alpine}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Les sauvegardes contiennent les données des enfants et les hash des PIN : lisibles par root seul
umask 077
mkdir -p "$BACKUP_DIR"

STAMP=$(date '+%Y%m%d-%H%M%S')
NAME="teachdigital-$STAMP.dump"
# Deux exécutions dans la même seconde ne partagent ni le nom final ni le fichier temporaire
# (pg_dump crée sa sortie avant même de se connecter : un échec ne doit rien écraser)
[ -e "$BACKUP_DIR/$NAME" ] && NAME="teachdigital-$STAMP-$$.dump"
TMP_NAME=".$NAME.$$.partial"

# Conteneur jetable sur le réseau du backend (même DB_HOST, même accès pg_hba.conf) ;
# pg_dump de l'hôte seulement si Docker est absent
DOCKER=""
for d in docker /usr/local/bin/docker /var/packages/ContainerManager/target/usr/bin/docker; do
  if "$d" --version >/dev/null 2>&1; then DOCKER="$d"; break; fi
done
if [ -n "$DOCKER" ]; then
  if [ -z "${BACKUP_DOCKER_NETWORK:-}" ] && "$DOCKER" network inspect teachdigital >/dev/null 2>&1; then
    BACKUP_DOCKER_NETWORK=teachdigital
  fi
  run_pg() {
    "$DOCKER" run --rm ${BACKUP_DOCKER_NETWORK:+--network "$BACKUP_DOCKER_NETWORK"} \
      -e PGPASSWORD --add-host=host.docker.internal:host-gateway \
      -v "$BACKUP_DIR:/backup" "$PG_DUMP_IMAGE" "$@"
  }
  OUT_DIR=/backup
elif command -v pg_dump >/dev/null 2>&1; then
  # host.docker.internal (valeur du .env pour le conteneur backend) n'existe pas sur l'hôte
  [ "$DB_HOST" = "host.docker.internal" ] && DB_HOST=127.0.0.1
  run_pg() { "$@"; }
  OUT_DIR="$BACKUP_DIR"
else
  log "ERREUR : ni docker ni pg_dump disponibles"
  exit 1
fi

log "Sauvegarde de $DB_NAME ($DB_USER@$DB_HOST:$DB_PORT) -> $BACKUP_DIR/$NAME"

# Écrit dans un fichier temporaire : une sauvegarde interrompue n'est jamais prise pour valide
if ! run_pg pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom --no-owner --file="$OUT_DIR/$TMP_NAME"; then
  rm -f "$BACKUP_DIR/$TMP_NAME"
  log "ERREUR : pg_dump a échoué"
  exit 1
fi

# Vérifie que l'archive est lisible avant de la garder
if ! run_pg pg_restore --list "$OUT_DIR/$TMP_NAME" >/dev/null; then
  rm -f "$BACKUP_DIR/$TMP_NAME"
  log "ERREUR : archive illisible, sauvegarde supprimée"
  exit 1
fi

mv "$BACKUP_DIR/$TMP_NAME" "$BACKUP_DIR/$NAME"
chmod 600 "$BACKUP_DIR/$NAME"
log "OK : $(du -h "$BACKUP_DIR/$NAME" | cut -f1)"

# Rotation : supprime les sauvegardes plus anciennes que la rétention
find "$BACKUP_DIR" -maxdepth 1 -name 'teachdigital-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -print -exec rm -f {} \; |
  while read -r old; do log "Supprimée (> $BACKUP_RETENTION_DAYS j) : $(basename "$old")"; done
