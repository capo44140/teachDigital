FROM node:22-alpine

# Pin pnpm sur la version 9.15 — pnpm 10+ a un nouveau comportement strict qui
# transforme [ERR_PNPM_IGNORED_BUILDS] en erreur fatale (tesseract.js) malgré
# --config.enable-pre-post-scripts. La 9.15 est aussi celle utilisée en local.
RUN npm install -g pnpm@9.15.9

WORKDIR /app

# Copier les fichiers de dépendances et configuration
COPY package.json pnpm-lock.yaml .npmrc ./

# Installer les dépendances (autoriser les scripts de build pour tesseract.js).
# --frozen-lockfile : échoue si pnpm-lock.yaml n'est pas à jour (build reproductible).
RUN pnpm install --prod --frozen-lockfile --config.enable-pre-post-scripts=true

# Copier le reste du code (SANS .env, logs, output, temp, tests... grâce à .dockerignore).
# migrations/*.sql est inclus : le serveur les applique au démarrage, avant d'écouter.
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    # Créer les dossiers pour les volumes en tant que root (à chown en tant que nodejs)
    mkdir -p /logs /output /temp /tesseract-cache && \
    chown -R nodejs:nodejs /logs /output /temp /tesseract-cache

USER nodejs

# Exposer le port
EXPOSE 3001

# Déclarer les volumes (fichiers en dehors du conteneur)
# /tesseract-cache : données de langue Tesseract (fra, eng) téléchargées au premier OCR
VOLUME ["/logs", "/output", "/temp", "/tesseract-cache"]

# Variables d'environnement Docker
ENV NODE_ENV=production \
    DOCKER_ENV=true \
    LOGS_DIR=/logs \
    LOG_ENABLE_FILE=true \
    TESSERACT_CACHE_DIR=/tesseract-cache

# Health check (liveness : ne dépend pas de la base)
# start-period large : au démarrage, le serveur attend PostgreSQL puis applique les migrations
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Commande de démarrage : node reçoit SIGTERM (via tini quand docker-compose déclare init: true)
# et s'arrête proprement (lib/shutdown.js).
CMD ["node", "server.js"]
