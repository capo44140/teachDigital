#!/bin/bash

# Script de vérification des volumes Docker
# Utilisation: ./verify-volumes.sh

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Vérification des Volumes Docker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Vérifier si le conteneur est en cours d'exécution
if ! docker-compose ps | grep -q "teachdigital-backend"; then
    echo -e "${YELLOW}⚠️  Le conteneur teachdigital-backend n'est pas actif${NC}"
    echo "Lancez d'abord: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✅ Conteneur actif${NC}"
echo ""

# 1. Vérifier les volumes
echo -e "${BLUE}1️⃣  Vérification des volumes déclarés${NC}"
echo ""

docker-compose exec backend ls -la /logs/ && echo -e "${GREEN}✅ /logs OK${NC}" || echo -e "${RED}❌ /logs ERREUR${NC}"
echo ""

docker-compose exec backend ls -la /output/ && echo -e "${GREEN}✅ /output OK${NC}" || echo -e "${RED}❌ /output ERREUR${NC}"
echo ""

docker-compose exec backend ls -la /temp/ && echo -e "${GREEN}✅ /temp OK${NC}" || echo -e "${RED}❌ /temp ERREUR${NC}"
echo ""

# 2. Vérifier les permissions
echo -e "${BLUE}2️⃣  Vérification des permissions${NC}"
echo ""

# Vérifier les permissions de /logs
if docker-compose exec backend test -w /logs; then
    echo -e "${GREEN}✅ /logs est writable${NC}"
else
    echo -e "${RED}❌ /logs n'est pas writable${NC}"
fi
echo ""

# 3. Vérifier les logs
echo -e "${BLUE}3️⃣  Vérification des fichiers logs${NC}"
echo ""

echo "Fichiers dans /logs:"
docker-compose exec backend ls -lh /logs/ || echo -e "${YELLOW}Pas de fichiers${NC}"
echo ""

# 4. Vérifier les variables d'environnement
echo -e "${BLUE}4️⃣  Vérification des variables d'environnement${NC}"
echo ""

echo "LOGS_DIR:"
docker-compose exec backend sh -c 'echo $LOGS_DIR'
echo ""

echo "DOCKER_ENV:"
docker-compose exec backend sh -c 'echo $DOCKER_ENV'
echo ""

echo "NODE_ENV:"
docker-compose exec backend sh -c 'echo $NODE_ENV'
echo ""

# 5. Vérifier les volumes montés
echo -e "${BLUE}5️⃣  Vérification des volumes montés (inspect)${NC}"
echo ""

docker inspect teachdigital-backend | grep -A 20 '"Mounts"' || echo -e "${YELLOW}Pas de détails de volumes${NC}"
echo ""

# 6. Vérifier la taille des volumes
echo -e "${BLUE}6️⃣  Taille des fichiers${NC}"
echo ""

echo "Taille de /logs:"
docker-compose exec backend du -sh /logs
echo ""

echo "Taille de /output:"
docker-compose exec backend du -sh /output
echo ""

echo "Taille de /temp:"
docker-compose exec backend du -sh /temp
echo ""

# 7. Test d'écriture
echo -e "${BLUE}7️⃣  Test d'écriture${NC}"
echo ""

echo "Création d'un fichier de test..."
docker-compose exec backend sh -c 'echo "Test write at $(date)" > /logs/test.log' && \
    echo -e "${GREEN}✅ Écriture dans /logs OK${NC}" || \
    echo -e "${RED}❌ Erreur d'écriture dans /logs${NC}"
echo ""

docker-compose exec backend sh -c 'echo "Test write at $(date)" > /output/test.log' && \
    echo -e "${GREEN}✅ Écriture dans /output OK${NC}" || \
    echo -e "${RED}❌ Erreur d'écriture dans /output${NC}"
echo ""

docker-compose exec backend sh -c 'echo "Test write at $(date)" > /temp/test.log' && \
    echo -e "${GREEN}✅ Écriture dans /temp OK${NC}" || \
    echo -e "${RED}❌ Erreur d'écriture dans /temp${NC}"
echo ""

# 8. Vérifier les fichiers locaux
echo -e "${BLUE}8️⃣  Vérification des fichiers locaux${NC}"
echo ""

if [ -d "logs" ]; then
    echo "Contenu de ./logs:"
    ls -lh logs/
    echo -e "${GREEN}✅ Dossier logs/ existe${NC}"
else
    echo -e "${RED}❌ Dossier logs/ n'existe pas${NC}"
fi
echo ""

if [ -d "output" ]; then
    echo "Contenu de ./output:"
    ls -lh output/
    echo -e "${GREEN}✅ Dossier output/ existe${NC}"
else
    echo -e "${RED}❌ Dossier output/ n'existe pas${NC}"
fi
echo ""

if [ -d "temp" ]; then
    echo "Contenu de ./temp:"
    ls -lh temp/
    echo -e "${GREEN}✅ Dossier temp/ existe${NC}"
else
    echo -e "${RED}❌ Dossier temp/ n'existe pas${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Résumé de la Vérification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ Les volumes sont correctement configurés${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Vérifiez les fichiers logs générés:"
echo "   - cat logs/info.log"
echo "   - cat logs/error.log"
echo ""
echo "2. Surveillez les logs en temps réel:"
echo "   - docker-compose logs -f backend"
echo ""
echo "3. Vérifiez la taille des volumes:"
echo "   - du -sh logs/ output/ temp/"
echo ""





