/**
 * Serveur Express pour TeachDigital Backend
 * Serveur standalone pour déploiement Docker/Synology
 *
 * Démarrage : attente de PostgreSQL (le NAS peut démarrer la base après le backend)
 *   → migrations (échec = arrêt, code 1) → réglages IA → écoute du port.
 * Arrêt : SIGTERM / SIGINT → arrêt propre (lib/shutdown.js).
 * L'application Express elle-même est définie dans app.js.
 */

// Charger les variables d'environnement du backend (.env / env) avant tout accès à process.env
const { loadBackendEnv } = require('./lib/loadEnv.js');
loadBackendEnv();

const logger = require('./lib/logger.js');
const { getJwtSecretProblem } = require('./lib/auth.js');
const { createShutdownHandler } = require('./lib/shutdown.js');

const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = (process.env.HOST || '0.0.0.0').trim();
// Budget d'arrêt sous le stop_grace_period de 30 s de docker-compose.yml (SIGKILL ensuite) :
// attente des requêtes en cours (15 s) + 4 étapes de nettoyage (3 s max chacune) = 27 s
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '15000', 10) || 15000;
const SHUTDOWN_CLEANUP_STEP_TIMEOUT_MS = 3000;

const state = { ready: false, shuttingDown: false };
let server = null;

// Libère les ressources à l'arrêt (dans cet ordre), puis ferme les fichiers de log
const cleanupSteps = [
  ['réglages IA', () => require('./api/ai/services/aiSettingsLoader.js').stopAiSettingsRetry()],
  ['worker OCR', () => require('./api/ai/services/ocr.js').terminateOcrWorker()],
  ['pool PostgreSQL', () => require('./lib/database.js').pool.end()],
  ['logs', () => logger.close()]
];

const shutdown = createShutdownHandler({
  server: () => server,
  state,
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
  cleanupTimeoutMs: SHUTDOWN_CLEANUP_STEP_TIMEOUT_MS,
  cleanup: cleanupSteps
});

/**
 * Arrête le processus après une erreur de démarrage (code 1 : Docker redémarre le conteneur)
 */
async function failStartup(message, error, extra = {}) {
  logger.error(message, { ...extra, error });
  await shutdown('startup-failure', 1);
}

function logRuntimeConfig() {
  const { DB_SETTINGS } = require('./lib/database.js');
  const { TIMEOUTS } = require('./lib/queries.js');
  const { JSON_BODY_LIMIT, JSON_LARGE_BODY_LIMIT, UPLOAD_LIMITS } = require('./app.js');
  logger.info('Configuration runtime', {
    nodeEnv: process.env.NODE_ENV || 'production',
    port: PORT,
    trustProxy: process.env.TRUST_PROXY || '(défaut : loopback)',
    logFormat: process.env.LOG_FORMAT || 'text',
    logDebug: process.env.LOG_DEBUG === 'true',
    bodyLimits: { json: JSON_BODY_LIMIT, largeJson: JSON_LARGE_BODY_LIMIT, uploadTotalBytes: UPLOAD_LIMITS.totalBytes },
    rateLimit: {
      loginWindowMs: parseInt(process.env.API_RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10),
      loginMax: parseInt(process.env.API_RATE_LIMIT_LOGIN_MAX || '20', 10),
      pinWindowMs: parseInt(process.env.API_RATE_LIMIT_PIN_WINDOW_MS || '60000', 10),
      pinMax: parseInt(process.env.API_RATE_LIMIT_PIN_MAX || '5', 10)
    },
    db: { ...DB_SETTINGS, apiTimeoutsMs: TIMEOUTS },
    shutdownTimeoutMs: SHUTDOWN_TIMEOUT_MS
  });
}

async function start() {
  // Checks de configuration (sécurité prod) : un secret JWT connu permet de forger un jeton parent
  const jwtSecretProblem = getJwtSecretProblem();
  if (jwtSecretProblem) {
    logger.error(`Configuration invalide: ${jwtSecretProblem}`, {
      hint: 'Générez un secret aléatoire (ex: openssl rand -hex 32) et définissez JWT_SECRET'
    });
    return shutdown('invalid-config', 1);
  }

  let app;
  let database;
  try {
    // Chargement du code (routes, contrôleurs, configuration PostgreSQL) : erreurs immédiates
    database = require('./lib/database.js');
    app = require('./app.js').createApp({ state });
    logRuntimeConfig();
  } catch (error) {
    return failStartup('❌ Initialisation impossible', error);
  }

  // 1. Attendre PostgreSQL (redémarrage du NAS : la base peut arriver après le backend)
  try {
    await database.waitForDatabase({ shouldStop: () => state.shuttingDown });
  } catch (error) {
    if (state.shuttingDown) return undefined;
    return failStartup('❌ PostgreSQL injoignable : arrêt du serveur', error, {
      hint: 'Vérifiez DB_HOST/DB_PORT et que PostgreSQL accepte les connexions depuis le réseau Docker (pg_hba.conf)'
    });
  }
  if (state.shuttingDown) return undefined;

  // 2. Migrations : on ne sert jamais de requêtes sur un schéma incomplet
  try {
    const { runMigrations } = require('./lib/migrate.js');
    await runMigrations();
  } catch (error) {
    return failStartup('❌ Migrations de la base en échec : arrêt du serveur', error, { migration: error.migration });
  }
  if (state.shuttingDown) return undefined;

  // Installation neuve : sans code familial, personne ne peut obtenir de jeton famille,
  // donc ni choisir un profil ni se connecter (même le parent)
  try {
    const rows = await database.pool.query('SELECT 1 FROM family_gate WHERE id = 1');
    if (rows.rowCount === 0) {
      logger.warn('⚠️  Code d\'entrée familial non configuré : aucune connexion possible', {
        hint: 'docker exec -it teachdigital-backend node scripts/init-family-gate.js <code à 4-8 chiffres>'
      });
    }
  } catch (error) {
    logger.warn('Vérification du code familial impossible', { error: error?.message || error });
  }

  // 3. Réglages IA enregistrés depuis l'interface (clés chiffrées, modèles, URL LM Studio).
  //    Non bloquant : en cas d'échec, nouvel essai automatique et à la première requête IA.
  await require('./api/ai/services/aiSettingsLoader.js').loadAiSettings();
  if (state.shuttingDown) return undefined;

  // 4. Écoute
  server = app.listen(PORT, HOST, () => {
    state.ready = true;
    logger.info(`Serveur TeachDigital démarré sur ${HOST}:${PORT}`, {
      mode: process.env.NODE_ENV || 'production',
      logsDirectory: logger.enableFileLogging ? logger.logsDirectory : null
    });
  });
  server.on('error', (error) => {
    failStartup(`❌ Impossible d'écouter sur le port ${PORT}`, error);
  });

  // Timeouts pour les opérations IA longues : les routes IA ont leur propre délai global
  // (AI_REQUEST_TIMEOUT_MS = 170 s, sous ces 180 s ; la page de cours prolonge le sien).
  server.timeout = 180000;
  server.keepAliveTimeout = 185000; // Légèrement plus long que timeout pour éviter les race conditions
  server.headersTimeout = 190000; // Plus long que keepAliveTimeout
  return server;
}

// Arrêt propre : `docker stop` envoie SIGTERM (relayé par tini, cf. init: true), Ctrl+C envoie SIGINT
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  // État incertain : on sort, après avoir vidé les logs fichiers (Docker redémarre le conteneur)
  const forceExit = setTimeout(() => process.exit(1), 2000);
  forceExit.unref();
  logger.close().finally(() => process.exit(1));
});

start().catch(error => failStartup('❌ Erreur au démarrage', error));
