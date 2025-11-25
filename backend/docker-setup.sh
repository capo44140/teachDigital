#!/bin/bash

# Script de setup Docker Compose pour TeachDigital Backend
# Utilisation: ./docker-setup.sh [options]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
ENV_FILE=".env.docker"
SETUP_TYPE="local"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --synology)
            SETUP_TYPE="synology"
            shift
            ;;
        --local)
            SETUP_TYPE="local"
            shift
            ;;
        --help)
            echo "Usage: ./docker-setup.sh [options]"
            echo ""
            echo "Options:"
            echo "  --local      Configuration pour développement local (défaut)"
            echo "  --synology   Configuration pour Synology NAS"
            echo "  --help       Affiche cette aide"
            exit 0
            ;;
        *)
            print_error "Option inconnue: $1"
            exit 1
            ;;
    esac
done

# Main setup
print_header "Setup Docker Compose - TeachDigital Backend"

print_info "Mode: $SETUP_TYPE"

# 1. Créer le fichier .env.docker
if [ ! -f "$ENV_FILE" ]; then
    print_info "Création du fichier $ENV_FILE..."
    
    if [ "$SETUP_TYPE" = "synology" ]; then
        cat > "$ENV_FILE" << 'EOF'
# ====================================
# Configuration Docker Compose Synology
# ====================================

# Base de Données PostgreSQL
DATABASE_URL=postgresql://teachdigital:change_me_password@host.docker.internal:5432/teachdigital
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=change_me_password
DB_NAME=teachdigital

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# API Keys (Optionnelles)
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=

# CORS et Frontend
FRONTEND_URL=http://localhost:3000
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
EOF
        print_success "Fichier $ENV_FILE créé pour Synology"
        print_warning "Éditez $ENV_FILE et configurez vos paramètres Synology"
    else
        cat > "$ENV_FILE" << 'EOF'
# ====================================
# Configuration Docker Compose Local
# ====================================

# Base de Données PostgreSQL
DATABASE_URL=postgresql://teachdigital:change_me_password@host.docker.internal:5432/teachdigital
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=change_me_password
DB_NAME=teachdigital

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# API Keys (Optionnelles)
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=

# CORS et Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGIN=

# Configuration des logs
LOG_ENABLE_FILE=true
LOG_DEBUG=false
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Port Backend
BACKEND_PORT=3001

# Volumes Docker Local
LOGS_VOLUME=./logs
OUTPUT_VOLUME=./output
TEMP_VOLUME=./temp
EOF
        print_success "Fichier $ENV_FILE créé pour développement local"
    fi
else
    print_info "Fichier $ENV_FILE existe déjà"
fi

# 2. Créer les dossiers locaux si mode local
if [ "$SETUP_TYPE" = "local" ]; then
    print_info "Création des dossiers volumes..."
    mkdir -p logs output temp
    print_success "Dossiers créés: logs/, output/, temp/"
fi

# 3. Vérifier Docker et Docker Compose
print_info "Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé"
    exit 1
fi
print_success "Docker trouvé: $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé"
    exit 1
fi
print_success "Docker Compose trouvé: $(docker-compose --version)"

# 4. Build l'image
print_header "Build de l'image Docker"
print_info "Building teachdigital-backend:latest..."
docker-compose build

print_header "Setup Complété ✅"
echo ""
print_success "Configuration Docker Compose prête !"
echo ""
echo -e "${BLUE}Prochaines étapes:${NC}"
echo "1. Éditez le fichier: vim $ENV_FILE"
echo "2. Configurez vos paramètres (DB_PASSWORD, JWT_SECRET, etc.)"
echo "3. Lancez le conteneur:"
echo ""
echo -e "${YELLOW}   docker-compose up -d${NC}"
echo ""
echo "4. Vérifiez le statut:"
echo ""
echo -e "${YELLOW}   docker-compose ps${NC}"
echo ""
echo "5. Consultez les logs:"
echo ""
echo -e "${YELLOW}   docker-compose logs -f backend${NC}"
echo ""
echo -e "${BLUE}Commandes utiles:${NC}"
echo "  docker-compose down       # Arrêter le conteneur"
echo "  docker-compose logs -f    # Voir les logs en temps réel"
echo "  docker-compose exec backend sh  # Terminal dans le conteneur"
echo ""








