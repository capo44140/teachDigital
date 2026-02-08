/**
 * Serveur Express pour TeachDigital Backend
 * Serveur standalone pour déploiement Docker/Synology
 */

const express = require('express');
const handler = require('./api/index.js');
const logger = require('./lib/logger.js');
const { corsMiddleware } = require('./lib/cors.js');
const crypto = require('crypto');

// Charger les variables d'environnement du backend (.env / env) avant tout accès à process.env
const { loadBackendEnv } = require('./lib/loadEnv.js');
loadBackendEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// Normaliser les variables d'environnement (évite les \r des fichiers .env en CRLF)
const envStr = (key, fallback = undefined) => {
  const val = process.env[key];
  if (val === undefined || val === null || val === '') return fallback;
  return typeof val === 'string' ? val.trim() : val;
};

// Checks de configuration (stabilité prod)
const jwtSecret = envStr('JWT_SECRET', '');
if (!jwtSecret || String(jwtSecret).length < 16) {
  logger.error('Configuration invalide: JWT_SECRET manquant ou trop court', {
    hint: 'Définissez JWT_SECRET (>= 16 caractères) dans votre environnement'
  });
  process.exit(1);
}

logger.info('Configuration runtime', {
  nodeEnv: process.env.NODE_ENV || 'production',
  port: PORT,
  logFormat: envStr('LOG_FORMAT', 'text'),
  logDebug: envStr('LOG_DEBUG') === 'true',
  rateLimit: {
    loginWindowMs: parseInt(process.env.API_RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10),
    loginMax: parseInt(process.env.API_RATE_LIMIT_LOGIN_MAX || '20', 10),
    pinWindowMs: parseInt(process.env.API_RATE_LIMIT_PIN_WINDOW_MS || '60000', 10),
    pinMax: parseInt(process.env.API_RATE_LIMIT_PIN_MAX || '30', 10)
  },
  dbTimeouts: {
    defaultMs: parseInt(process.env.API_DB_TIMEOUT_DEFAULT_MS || '7000', 10),
    fastMs: parseInt(process.env.API_DB_TIMEOUT_FAST_MS || '3000', 10),
    standardMs: parseInt(process.env.API_DB_TIMEOUT_STANDARD_MS || '5000', 10),
    longMs: parseInt(process.env.API_DB_TIMEOUT_LONG_MS || '9000', 10)
  }
});

// Configuration CORS - Utilisation du middleware centralisé
// DOIT être défini AVANT tous les autres middlewares
app.use(corsMiddleware);

// Middleware requestId + logs HTTP (observabilité prod)
app.use((req, res, next) => {
  const startHrTime = process.hrtime.bigint();

  // Récupérer un request id existant (proxy/load balancer) ou en générer un
  const incomingRequestId = req.headers['x-request-id'];
  const requestId = (typeof incomingRequestId === 'string' && incomingRequestId.trim())
    ? incomingRequestId.trim()
    : (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Log à la fin (status + durée)
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startHrTime) / 1e6;
    logger.http('HTTP request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  });

  next();
});

// Middleware pour parser FormData avec busboy AVANT les autres middlewares
app.use(async (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    try {
      // Parser FormData avec busboy
      const Busboy = require('@fastify/busboy');
      const busboy = Busboy({ headers: req.headers });
      const fields = {};
      const files = [];

      busboy.on('file', (fieldname, file, info) => {
        let filename, mimetype;
        if (info) {
          filename = info.filename || info.name || 'unknown';
          mimetype = info.mimeType || info.mimetype || 'application/octet-stream';
        } else {
          filename = 'unknown';
          mimetype = 'application/octet-stream';
        }

        const chunks = [];
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });
        file.on('end', () => {
          files.push({
            fieldname,
            filename,
            mimetype,
            buffer: Buffer.concat(chunks)
          });
        });
        file.on('error', (err) => {
          logger.error('Erreur lors de la lecture du fichier', {
            requestId: req.requestId,
            error: err?.message || String(err)
          });
        });
      });

      busboy.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });

      busboy.on('finish', () => {
        // Stocker les données parsées dans req.body pour compatibilité
        req.body = {
          fields,
          files
        };
        // Stocker aussi dans req.parsedFormData pour accès direct
        req.parsedFormData = {
          fields,
          files
        };
        next();
      });

      busboy.on('error', (err) => {
        logger.error('Erreur lors du parsing FormData', {
          requestId: req.requestId,
          error: err?.message || String(err)
        });
        return res.status(400).json({
          success: false,
          message: 'Erreur lors du parsing FormData: ' + err.message
        });
      });

      // Parser le stream
      req.pipe(busboy);
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de busboy', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors du parsing FormData'
      });
    }
  } else {
    // Pour les autres types, continuer avec les parsers Express normaux
    next();
  }
});

// Middleware pour parser le body JSON et URL-encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Utilisation du routeur API
// /api : accès direct au backend (ex. santé, tests)
// / : nginx Synology transmet sans le préfixe /api (proxy_pass .../), donc /auth/family-gate etc.
app.use('/api', handler);
app.use('/', handler);

// Gestion des erreurs 404 pour les routes API non trouvées
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route API non trouvée',
    code: 'NOT_FOUND',
    data: null
  });
});

// Route de santé pour Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Migration automatique au démarrage : ajout colonne target_profile_id si absente
async function runAutoMigrations() {
  try {
    const { pool } = require('./lib/database.js');
    
    // Vérifier si la colonne target_profile_id existe déjà
    const checkResult = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'lessons' AND column_name = 'target_profile_id'
    `);
    
    if (checkResult.rows.length === 0) {
      logger.info('🔄 Migration: ajout colonne target_profile_id à la table lessons...');
      
      // Ajouter la colonne (NULL = quiz visible par tous les enfants)
      await pool.query(`
        ALTER TABLE lessons
        ADD COLUMN target_profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL
      `);
      
      // Créer un index pour les recherches par enfant ciblé
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_lessons_target_profile_id ON lessons(target_profile_id)
      `);
      
      logger.info('✅ Migration target_profile_id terminée avec succès');
    } else {
      // Correction : si l'ancienne migration a mis target_profile_id = profile_id (l'ID du parent),
      // on remet à NULL pour que les anciens quiz soient visibles par tous les enfants.
      // On détecte ça en cherchant les leçons où target = creator (parent) et le profil est admin.
      const fixResult = await pool.query(`
        UPDATE lessons l
        SET target_profile_id = NULL
        WHERE l.target_profile_id = l.profile_id
          AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = l.profile_id AND p.is_admin = true)
      `);
      if (fixResult.rowCount > 0) {
        logger.info(`🔧 Correction: ${fixResult.rowCount} leçon(s) remises à target_profile_id=NULL (ancienne migration)`);
      }
    }
  } catch (error) {
    logger.warn('⚠️ Migration auto-migration (non bloquant):', error.message);
  }
}

// Démarrage du serveur
const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Serveur TeachDigital démarré sur le port ${PORT}`);
  logger.info(`Mode: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`URL: http://0.0.0.0:${PORT}`);
  if (logger.enableFileLogging) {
    logger.info(`Logs écrits dans: ${logger.logsDirectory}`);
  }
  
  // Exécuter les migrations automatiques après le démarrage
  await runAutoMigrations();
});

// Configuration des timeouts pour les opérations IA longues
// 180 secondes (3 minutes) pour permettre la génération de quiz avec plusieurs documents
server.timeout = 180000; // Timeout global du serveur
server.keepAliveTimeout = 185000; // Légèrement plus long que timeout pour éviter les race conditions
server.headersTimeout = 190000; // Plus long que keepAliveTimeout

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise: promise.toString(), reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});
