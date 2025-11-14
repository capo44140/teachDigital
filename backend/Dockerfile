FROM node:22-alpine

# Installer pnpm globalement
RUN npm install -g pnpm

WORKDIR /app

# Copier les fichiers de dépendances et configuration
COPY package.json pnpm-lock.yaml .npmrc ./

# Installer les dépendances (autoriser les scripts de build pour tesseract.js)
RUN pnpm install --prod --config.enable-pre-post-scripts=true

# Copier le reste du code (SANS les dossiers logs, temp, etc. grâce à .dockerignore)
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    # Créer les dossiers pour les volumes en tant que root (à chown en tant que nodejs)
    mkdir -p /logs /output /temp && \
    chown -R nodejs:nodejs /logs /output /temp

USER nodejs

# Exposer le port
EXPOSE 3001

# Déclarer les volumes (fichiers en dehors du conteneur)
VOLUME ["/logs", "/output", "/temp"]

# Variables d'environnement Docker
ENV NODE_ENV=production \
    DOCKER_ENV=true \
    LOGS_DIR=/logs \
    LOG_ENABLE_FILE=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "server.js"]

