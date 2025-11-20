#!/bin/bash
# Script helper pour gérer Docker sur Synology sans problèmes de permissions
# Ce script doit être exécuté avec les bonnes permissions Docker

DOCKER_CMD="/usr/local/bin/docker"
COMPOSE_DIR="/volume1/docker/teachdigital/backend"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo "Usage: docker-helper.sh [commande]"
    echo ""
    echo "Commandes disponibles:"
    echo "  logs      - Afficher les logs en temps réel"
    echo "  status    - Afficher l'état des conteneurs"
    echo "  restart   - Redémarrer le conteneur backend"
    echo "  stop      - Arrêter le conteneur backend"
    echo "  start     - Démarrer le conteneur backend"
    echo "  shell     - Ouvrir un shell dans le conteneur backend"
    echo "  rebuild   - Reconstruire et redémarrer les conteneurs"
    echo "  ps        - Liste des conteneurs (alias de status)"
    echo "  help      - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./docker-helper.sh logs"
    echo "  ./docker-helper.sh restart"
}

# Vérifier que nous sommes dans le bon répertoire
cd "$COMPOSE_DIR" || {
    echo -e "${RED}[ERREUR]${NC} Impossible d'accéder à $COMPOSE_DIR"
    exit 1
}

# Vérifier que docker-compose.yml existe
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}[ERREUR]${NC} docker-compose.yml introuvable dans $COMPOSE_DIR"
    exit 1
fi

# Traiter la commande
case "${1:-help}" in
    logs)
        echo -e "${GREEN}[INFO]${NC} Affichage des logs (Ctrl+C pour quitter)..."
        $DOCKER_CMD compose logs -f backend
        ;;
    
    status|ps)
        echo -e "${GREEN}[INFO]${NC} État des conteneurs:"
        $DOCKER_CMD compose ps
        ;;
    
    restart)
        echo -e "${YELLOW}[INFO]${NC} Redémarrage du conteneur backend..."
        $DOCKER_CMD compose restart backend
        echo -e "${GREEN}[OK]${NC} Conteneur redémarré"
        $DOCKER_CMD compose ps
        ;;
    
    stop)
        echo -e "${YELLOW}[INFO]${NC} Arrêt du conteneur backend..."
        $DOCKER_CMD compose stop backend
        echo -e "${GREEN}[OK]${NC} Conteneur arrêté"
        ;;
    
    start)
        echo -e "${GREEN}[INFO]${NC} Démarrage du conteneur backend..."
        $DOCKER_CMD compose start backend
        echo -e "${GREEN}[OK]${NC} Conteneur démarré"
        $DOCKER_CMD compose ps
        ;;
    
    shell)
        echo -e "${GREEN}[INFO]${NC} Ouverture d'un shell dans le conteneur backend..."
        $DOCKER_CMD compose exec backend sh
        ;;
    
    rebuild)
        echo -e "${YELLOW}[INFO]${NC} Reconstruction complète des conteneurs..."
        $DOCKER_CMD compose down
        echo -e "${GREEN}[BUILD]${NC} Reconstruction de l'image..."
        $DOCKER_CMD compose build --no-cache
        echo -e "${GREEN}[START]${NC} Démarrage des conteneurs..."
        $DOCKER_CMD compose up -d
        echo -e "${GREEN}[OK]${NC} Conteneurs reconstruits et démarrés"
        $DOCKER_CMD compose ps
        sleep 3
        echo -e "${GREEN}[LOGS]${NC} Logs récents:"
        $DOCKER_CMD compose logs --tail=20 backend
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        echo -e "${RED}[ERREUR]${NC} Commande inconnue: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
