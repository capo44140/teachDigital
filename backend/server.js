/**
 * Serveur Express pour TeachDigital Backend
 * Serveur standalone pour déploiement Docker/Synology
 */

const express = require('express');
const helmet = require('helmet');
const handler = require('./api/index.js');
const logger = require('./lib/logger.js');
const { corsMiddleware } = require('./lib/cors.js');
const crypto = require('crypto');
const { getJwtSecretProblem, authenticateToken } = require('./lib/auth.js');

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

// Checks de configuration (sécurité prod) : un secret JWT connu permet de forger un jeton parent
const jwtSecretProblem = getJwtSecretProblem();
if (jwtSecretProblem) {
  logger.error(`Configuration invalide: ${jwtSecretProblem}`, {
    hint: 'Générez un secret aléatoire (ex: openssl rand -hex 32) et définissez JWT_SECRET'
  });
  process.exit(1);
}

// Adresse IP client fiable (rate limiting, logs) : seuls les proxys du réseau local/Docker
// (nginx) sont crus pour X-Forwarded-For ; un client direct ne peut pas usurper son IP.
app.set('trust proxy', envStr('TRUST_PROXY', 'loopback, linklocal, uniquelocal'));

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

// Headers de sécurité (CSP, HSTS, X-Frame-Options, etc.)
// CSP désactivée ici car servie côté frontend (PWA gère sa propre policy via meta).
// Active HSTS, noSniff, frameguard (DENY), referrerPolicy, etc. par défaut.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

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
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  });

  next();
});

// Limites d'upload (les fichiers sont gardés en mémoire : il faut les borner)
const UPLOAD_LIMITS = {
  fileSize: parseInt(process.env.API_UPLOAD_MAX_FILE_BYTES || String(15 * 1024 * 1024), 10),
  files: parseInt(process.env.API_UPLOAD_MAX_FILES || '10', 10),
  fields: 50,
  fieldSize: 1024 * 1024,
  totalBytes: parseInt(process.env.API_UPLOAD_MAX_TOTAL_BYTES || String(25 * 1024 * 1024), 10)
};

// Seules les routes IA reçoivent des fichiers (multipart)
function isUploadRoute(req) {
  const path = req.path || '';
  return path.startsWith('/api/ai/') || path.startsWith('/ai/');
}

// Middleware pour parser FormData avec busboy AVANT les autres middlewares
app.use(async (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    if (!isUploadRoute(req)) {
      return res.status(415).json({ success: false, message: 'Envoi de fichiers non accepté sur cette route', code: 'UNSUPPORTED_MEDIA_TYPE' });
    }
    // Vérifier le jeton AVANT de lire le corps : un client anonyme ne doit pas pouvoir
    // faire charger des fichiers en mémoire (les droits admin sont vérifiés par la route).
    try {
      const user = authenticateToken(req);
      if (!user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Accès refusé - Admin requis', code: 'FORBIDDEN' });
      }
    } catch (authError) {
      return res.status(401).json({ success: false, message: authError.message, code: 'UNAUTHORIZED' });
    }
    const declaredLength = parseInt(req.headers['content-length'] || '0', 10);
    if (declaredLength > UPLOAD_LIMITS.totalBytes) {
      return res.status(413).json({ success: false, message: 'Fichiers trop volumineux', code: 'PAYLOAD_TOO_LARGE' });
    }
    try {
      // Parser FormData avec busboy
      const Busboy = require('@fastify/busboy');
      const busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: UPLOAD_LIMITS.fileSize,
          files: UPLOAD_LIMITS.files,
          fields: UPLOAD_LIMITS.fields,
          fieldSize: UPLOAD_LIMITS.fieldSize
        }
      });
      const fields = {};
      const files = [];
      let totalBytes = 0;
      let rejected = false;

      const rejectTooLarge = () => {
        if (rejected) return;
        rejected = true;
        req.unpipe(busboy);
        req.resume();
        res.status(413).json({ success: false, message: 'Fichiers trop volumineux ou trop nombreux', code: 'PAYLOAD_TOO_LARGE' });
      };

      busboy.on('filesLimit', rejectTooLarge);
      busboy.on('fieldsLimit', rejectTooLarge);

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
        file.on('limit', rejectTooLarge);
        file.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > UPLOAD_LIMITS.totalBytes) {
            rejectTooLarge();
            return;
          }
          if (!rejected) chunks.push(chunk);
        });
        file.on('end', () => {
          if (rejected) return;
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
        if (rejected) return;
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
        if (rejected || res.headersSent) return;
        rejected = true;
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de la lecture des fichiers envoyés'
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
// 10 Mo : une page de cours HTML fait au plus 5 Mo (schemas.js), le reste est bien plus petit
const JSON_BODY_LIMIT = envStr('API_JSON_BODY_LIMIT', '10mb');
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Route de santé pour Docker (avant le routeur API, qui exige un jeton)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Utilisation du routeur API
// /api : accès direct au backend (ex. santé, tests)
// / : nginx Synology transmet sans le préfixe /api (proxy_pass .../), donc /auth/family-gate etc.
app.use('/api', handler);
app.use('/', handler);

// Erreurs de parsing (JSON invalide, corps trop gros) : réponse propre, sans détails internes
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Requête trop volumineuse', code: 'PAYLOAD_TOO_LARGE' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON invalide', code: 'BAD_REQUEST' });
  }
  logger.error('Erreur non gérée', { requestId: req.requestId, error: err?.message || String(err) });
  return res.status(500).json({ success: false, message: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' });
});

// Gestion des erreurs 404 pour les routes API non trouvées
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route API non trouvée',
    code: 'NOT_FOUND',
    data: null
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
    }
    // NB : l'ancienne « correction » qui remettait target_profile_id à NULL à chaque démarrage
    // a été retirée : elle réécrivait aussi les leçons créées depuis (cachées puis visibles par tous).
  } catch (error) {
    logger.warn('⚠️ Migration auto-migration (non bloquant):', error.message);
  }

  await ensureCoursePagesTable();
  await ensureQuizResultsCompletedColumn();
}

// Sauvegardes intermédiaires d'une page de cours : exclues des badges tant que la
// session n'est pas terminée. Les résultats existants sont considérés comme terminés.
async function ensureQuizResultsCompletedColumn() {
  try {
    const { pool } = require('./lib/database.js');
    await pool.query(`
      ALTER TABLE quiz_results
      ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT TRUE
    `);
  } catch (error) {
    logger.error('❌ Migration quiz_results.is_completed échouée:', error.message);
  }
}

// Migration automatique : table des pages de cours HTML publiées pour un enfant
async function ensureCoursePagesTable() {
  try {
    const { pool } = require('./lib/database.js');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_pages (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
        target_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100),
        description TEXT,
        html_content TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_course_pages_target_published ON course_pages(target_profile_id, is_published)
    `);
    // Les sessions de révision sur une page de cours sont stockées dans quiz_results
    // (lesson_id NULL, course_page_id renseigné) : stats, badges et historique les voient.
    await pool.query(`
      ALTER TABLE quiz_results
      ADD COLUMN IF NOT EXISTS course_page_id INTEGER REFERENCES course_pages(id) ON DELETE CASCADE
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_results_course_page ON quiz_results(course_page_id)
    `);

  } catch (error) {
    logger.warn('⚠️ Migration course_pages (non bloquant):', error.message);
  }
}

// Démarrage du serveur : migrations d'abord, pour ne pas servir de requêtes sur un schéma incomplet
// (ex. course_pages / is_completed absents → statistiques en erreur 500)
async function start() {
  await runAutoMigrations();

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Serveur TeachDigital démarré sur le port ${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || 'production'}`);
    logger.info(`URL: http://0.0.0.0:${PORT}`);
    if (logger.enableFileLogging) {
      logger.info(`Logs écrits dans: ${logger.logsDirectory}`);
    }
  });

  // Configuration des timeouts pour les opérations IA longues
  // 180 secondes (3 minutes) pour permettre la génération de quiz avec plusieurs documents
  server.timeout = 180000; // Timeout global du serveur
  server.keepAliveTimeout = 185000; // Légèrement plus long que timeout pour éviter les race conditions
  server.headersTimeout = 190000; // Plus long que keepAliveTimeout
}

start();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise: promise.toString(), reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});
