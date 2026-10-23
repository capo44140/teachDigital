/**
 * Application Express TeachDigital (middlewares, routes, gestion d'erreurs), sans démarrage :
 * server.js gère le cycle de vie (attente de PostgreSQL, migrations, écoute, arrêt propre).
 * Séparée de server.js pour être testée sans base ni port réel.
 */

const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const logger = require('./lib/logger.js');
const { corsMiddleware } = require('./lib/cors.js');
const { verifyRequestToken, isAdminUser } = require('./lib/auth.js');
const { withQueryTimeout } = require('./lib/queries.js');
const { createErrorResponse } = require('./lib/response.js');

// Normaliser les variables d'environnement (évite les \r des fichiers .env en CRLF)
function envStr(key, fallback = undefined) {
  const val = process.env[key];
  if (val === undefined || val === null || val === '') return fallback;
  return typeof val === 'string' ? val.trim() : val;
}

function envInt(key, fallback) {
  const n = parseInt(envStr(key, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Proxy de confiance (IP client pour le rate limiting et les logs) ─────────
// TRUST_PROXY accepte un nombre de proxys (« 1 » = nginx du conteneur frontend, valeur posée
// par docker-compose.yml), true/false, ou une liste d'adresses / sous-réseaux
// (« loopback, 172.16.0.0/12 »). Défaut hors Docker : loopback (proxy Vite en développement).
const DEFAULT_TRUST_PROXY = 'loopback';

function parseTrustProxy(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return DEFAULT_TRUST_PROXY;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  if (raw.toLowerCase() === 'true') return true;
  if (raw.toLowerCase() === 'false') return false;
  return raw;
}

// ─── Limites des corps de requête ─────────────────────────────────────────────
// 100 ko par défaut ; 10 Mo uniquement pour les routes qui transportent de gros contenus.
const JSON_BODY_LIMIT = envStr('API_JSON_BODY_LIMIT', '100kb');
const JSON_LARGE_BODY_LIMIT = envStr('API_JSON_LARGE_BODY_LIMIT', '10mb');

// Chemins avec ou sans le préfixe /api (nginx relaie /api/x vers /x)
const LARGE_BODY_ROUTES = [
  // Profils : image de profil encodée (jusqu'à 2 Mo, lib/schemas.js)
  { method: 'POST', pattern: /^(?:\/api)?\/profiles\/?$/i },
  { method: 'PUT', pattern: /^(?:\/api)?\/profiles\/\d+\/?$/i },
  // Leçons : quiz complet (jusqu'à plusieurs centaines de Ko)
  { method: 'POST', pattern: /^(?:\/api)?\/lessons\/?$/i },
  { method: 'PUT', pattern: /^(?:\/api)?\/lessons\/\d+\/?$/i },
  // Pages de cours HTML (jusqu'à 5 Mo) : création, aperçu avant publication, modification
  { method: 'POST', pattern: /^(?:\/api)?\/course-pages(?:\/preview)?\/?$/i },
  { method: 'PUT', pattern: /^(?:\/api)?\/course-pages\/\d+\/?$/i },
  // Routes IA en JSON : image en base64, documents, analyses, texte de leçon
  // (le frontend envoie aussi le profil complet de l'enfant, avatar compris)
  { method: 'POST', pattern: /^(?:\/api)?\/ai\/(?:generate-quiz-from-image|generate-quiz-from-documents|extract-text-from-documents|generate-quiz-from-analyses|generate-quiz-from-text)\/?$/i }
];

function isLargeBodyRoute(req) {
  const path = req.path || '';
  return LARGE_BODY_ROUTES.some(route => route.method === req.method && route.pattern.test(path));
}

// Limites d'upload multipart (les fichiers sont gardés en mémoire : il faut les borner)
const UPLOAD_LIMITS = Object.freeze({
  fileSize: envInt('API_UPLOAD_MAX_FILE_BYTES', 15 * 1024 * 1024),
  files: envInt('API_UPLOAD_MAX_FILES', 10),
  fields: 50,
  fieldSize: 1024 * 1024,
  totalBytes: envInt('API_UPLOAD_MAX_TOTAL_BYTES', 25 * 1024 * 1024)
});

// Seules les routes IA reçoivent des fichiers (multipart)
function isUploadRoute(req) {
  const path = req.path || '';
  return /^(?:\/api)?\/ai\//i.test(path);
}

// ─── Identifiant de requête ───────────────────────────────────────────────────
// Repris d'un proxy s'il est sûr (pas d'injection dans les logs), sinon généré.
const INCOMING_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function requestContextMiddleware(state) {
  return (req, res, next) => {
    const startHrTime = process.hrtime.bigint();
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && INCOMING_REQUEST_ID_PATTERN.test(incoming.trim())
      ? incoming.trim()
      : crypto.randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Toute réponse d'erreur JSON ({ success: false, ... }) porte l'identifiant de la requête,
    // à communiquer pour retrouver l'erreur dans les logs du serveur.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body === 'object' && !Array.isArray(body) && body.success === false && body.requestId === undefined) {
        return originalJson({ ...body, requestId });
      }
      return originalJson(body);
    };

    // Arrêt en cours : la connexion keep-alive est fermée après cette réponse
    if (state?.shuttingDown) {
      res.setHeader('Connection', 'close');
    }

    const logRequest = (message) => {
      const durationMs = Number(process.hrtime.bigint() - startHrTime) / 1e6;
      logger.http(message, {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ip: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    };
    res.on('finish', () => logRequest('HTTP request'));
    // Client parti avant la fin de la réponse (onglet fermé, timeout du proxy...)
    res.on('close', () => {
      if (!res.writableFinished) logRequest('HTTP request interrompue par le client');
    });

    next();
  };
}

// ─── Upload multipart (busboy) ────────────────────────────────────────────────
function sendEarlyRejection(res, status, message, code) {
  // Corps non lu : fermer la connexion après la réponse plutôt que de le consommer
  res.setHeader('Connection', 'close');
  return res.status(status).json(createErrorResponse(message, code));
}

/**
 * Lit les envois multipart des routes IA AVANT les autres parsers :
 * - 415 hors des routes IA ;
 * - jeton parent vérifié (signature, révocation, statut admin en base) AVANT de lire le corps :
 *   un client anonyme ne peut pas faire charger de fichiers en mémoire ;
 * - 413 si la taille annoncée, la taille réelle, le nombre de fichiers ou de champs dépasse les limites.
 * Résultat dans req.body et req.parsedFormData : { fields, files: [{ fieldname, filename, mimetype, buffer }] }.
 */
function createMultipartMiddleware(limits = UPLOAD_LIMITS) {
  return async (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return next();
    }
    if (!isUploadRoute(req)) {
      return sendEarlyRejection(res, 415, 'Envoi de fichiers non accepté sur cette route', 'UNSUPPORTED_MEDIA_TYPE');
    }

    let auth;
    try {
      auth = await verifyRequestToken(req);
    } catch (error) {
      return next(error);
    }
    if (!auth.user) {
      return sendEarlyRejection(res, auth.status || 401, auth.message, auth.code || 'UNAUTHORIZED');
    }
    if (!isAdminUser(auth.user)) {
      return sendEarlyRejection(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
    }

    const declaredLength = parseInt(req.headers['content-length'] || '0', 10);
    if (declaredLength > limits.totalBytes) {
      return sendEarlyRejection(res, 413, 'Fichiers trop volumineux', 'PAYLOAD_TOO_LARGE');
    }

    let busboy;
    try {
      const Busboy = require('@fastify/busboy');
      busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: limits.fileSize,
          files: limits.files,
          fields: limits.fields,
          fieldSize: limits.fieldSize
        }
      });
    } catch (error) {
      // En-tête multipart invalide (boundary absente...)
      logger.warn('Requête multipart invalide', { requestId: req.requestId, errorMessage: error.message });
      return sendEarlyRejection(res, 400, 'Requête multipart invalide', 'BAD_REQUEST');
    }

    const fields = {};
    const files = [];
    let totalBytes = 0;
    let rejected = false;

    const reject = (status, message, code) => {
      if (rejected) return;
      rejected = true;
      req.unpipe(busboy);
      req.resume();
      if (!res.headersSent) sendEarlyRejection(res, status, message, code);
    };
    const rejectTooLarge = () => reject(413, 'Fichiers trop volumineux ou trop nombreux', 'PAYLOAD_TOO_LARGE');

    busboy.on('filesLimit', rejectTooLarge);
    busboy.on('fieldsLimit', rejectTooLarge);
    busboy.on('partsLimit', rejectTooLarge);

    // @fastify/busboy 2.x : (fieldname, stream, filename, encoding, mimeType) ;
    // busboy 1.x : (fieldname, stream, { filename, encoding, mimeType })
    busboy.on('file', (fieldname, file, filenameOrInfo, _encoding, mimeTypeArg) => {
      const info = filenameOrInfo && typeof filenameOrInfo === 'object' ? filenameOrInfo : null;
      const filename = (info ? (info.filename || info.name) : filenameOrInfo) || 'unknown';
      const mimetype = (info ? (info.mimeType || info.mimetype) : mimeTypeArg) || 'application/octet-stream';

      const chunks = [];
      file.on('limit', rejectTooLarge);
      file.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > limits.totalBytes) {
          rejectTooLarge();
          return;
        }
        if (!rejected) chunks.push(chunk);
      });
      file.on('end', () => {
        if (rejected) return;
        files.push({ fieldname, filename, mimetype, buffer: Buffer.concat(chunks) });
      });
      file.on('error', (err) => {
        logger.error('Erreur lors de la lecture du fichier', { requestId: req.requestId, errorMessage: err?.message });
      });
    });

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    busboy.on('finish', () => {
      if (rejected) return;
      req.body = { fields, files };
      req.parsedFormData = { fields, files };
      next();
    });

    busboy.on('error', (err) => {
      logger.warn('Erreur lors du parsing FormData', { requestId: req.requestId, errorMessage: err?.message });
      reject(400, 'Erreur lors de la lecture des fichiers envoyés', 'BAD_REQUEST');
    });

    req.pipe(busboy);
  };
}

// ─── Gestion centralisée des erreurs ──────────────────────────────────────────
const BODY_PARSER_ERRORS = {
  'entity.too.large': [413, 'Requête trop volumineuse', 'PAYLOAD_TOO_LARGE'],
  'entity.parse.failed': [400, 'JSON invalide', 'BAD_REQUEST'],
  'encoding.unsupported': [415, 'Encodage de la requête non supporté', 'UNSUPPORTED_MEDIA_TYPE'],
  'charset.unsupported': [415, 'Jeu de caractères non supporté', 'UNSUPPORTED_MEDIA_TYPE'],
  'request.aborted': [400, 'Requête interrompue', 'BAD_REQUEST'],
  'request.size.invalid': [400, 'Taille de requête invalide', 'BAD_REQUEST']
};

/**
 * Dernier middleware : aucune erreur ne renvoie de détail interne au client.
 * Réponse { success: false, message, code, requestId } ; le détail est dans les logs, avec le même requestId.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const requestId = req.requestId;
  const known = err && BODY_PARSER_ERRORS[err.type];

  if (known) {
    const [status, message, code] = known;
    logger.warn('Requête refusée par le parser', { requestId, method: req.method, path: req.originalUrl, type: err.type, status });
    if (res.headersSent) return res.end();
    return res.status(status).json(createErrorResponse(message, code, { requestId }));
  }

  // Autre erreur client signalée par Express ou un middleware (ex. URI mal encodée : 400,
  // trop de paramètres : 413) : son statut est conservé, avec un message générique
  const clientStatus = Number(err?.status || err?.statusCode);
  if (Number.isInteger(clientStatus) && clientStatus >= 400 && clientStatus < 500) {
    logger.warn('Requête refusée', { requestId, method: req.method, path: req.originalUrl, status: clientStatus, type: err?.type || err?.name });
    if (res.headersSent) return res.end();
    return res.status(clientStatus).json(createErrorResponse('Requête invalide', 'BAD_REQUEST', { requestId }));
  }

  logger.error('Erreur non gérée', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    error: err
  });

  if (res.headersSent) {
    // Réponse déjà partiellement envoyée : on ne peut que couper la connexion
    return res.destroy();
  }
  return res.status(500).json(createErrorResponse('Erreur interne du serveur', 'INTERNAL_ERROR', { requestId }));
}

function notFoundHandler(req, res) {
  res.status(404).json(createErrorResponse('Route API non trouvée', 'NOT_FOUND', { requestId: req.requestId }));
}

/**
 * Crée l'application Express.
 * @param {Object} [options]
 * @param {Function} [options.apiRouter] - Routeur API (défaut : api/index.js)
 * @param {Object} [options.state] - État partagé avec server.js ({ ready, shuttingDown })
 * @param {Object} [options.uploadLimits] - Limites multipart (tests)
 * @returns {import('express').Express}
 */
function createApp({ apiRouter, state = { ready: true, shuttingDown: false }, uploadLimits = UPLOAD_LIMITS } = {}) {
  const app = express();
  app.locals.state = state;

  // Adresse IP client fiable (rate limiting, logs) : voir TRUST_PROXY ci-dessus
  app.set('trust proxy', parseTrustProxy(envStr('TRUST_PROXY')));

  // requestId + logs HTTP en premier : toutes les réponses (même d'erreur) sont tracées
  app.use(requestContextMiddleware(state));

  // Headers de sécurité (HSTS, noSniff, frameguard...). CSP servie par le frontend (nginx).
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS centralisé, avant les parsers et les routes
  app.use(corsMiddleware);

  // Multipart (routes IA) avant les parsers JSON
  app.use(createMultipartMiddleware(uploadLimits));

  // JSON : 100 ko par défaut, 10 Mo sur les routes listées dans LARGE_BODY_ROUTES
  const jsonParser = express.json({ limit: JSON_BODY_LIMIT });
  const largeJsonParser = express.json({ limit: JSON_LARGE_BODY_LIMIT });
  app.use((req, res, next) => (isLargeBodyRoute(req) ? largeJsonParser : jsonParser)(req, res, next));
  app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

  // Route de santé pour Docker (avant le routeur API, qui exige un jeton)
  // Liveness : le process répond. Ne teste volontairement pas la base, sinon un
  // incident PostgreSQL ferait redémarrer le conteneur en boucle.
  app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Readiness : le service peut réellement servir des requêtes (base joignable, pas en arrêt).
  // À utiliser par un reverse proxy / une supervision, pas par le restart Docker.
  app.get(['/health/ready', '/api/health/ready'], async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (state.shuttingDown) {
      return res.status(503).json({ status: 'not_ready', reason: 'shutting_down', timestamp: new Date().toISOString() });
    }
    const startedAt = Date.now();
    try {
      // Import paresseux : la config DB est validée au démarrage du serveur
      const { pool } = require('./lib/database.js');
      await withQueryTimeout(pool.query('SELECT 1'), 2000, 'readiness DB');
      return res.status(200).json({
        status: 'ready',
        database: 'ok',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Ne jamais renvoyer le message PostgreSQL au client (hôte, utilisateur, etc.)
      logger.warn('Readiness check en échec', { requestId: req.requestId, errorMessage: error?.message });
      return res.status(503).json({
        status: 'not_ready',
        database: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

  // /api : accès direct au backend ; / : nginx transmet sans le préfixe /api (proxy vers .../)
  const router = apiRouter || require('./api/index.js');
  app.use('/api', router);
  app.use('/', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  createMultipartMiddleware,
  errorHandler,
  isLargeBodyRoute,
  parseTrustProxy,
  UPLOAD_LIMITS,
  JSON_BODY_LIMIT,
  JSON_LARGE_BODY_LIMIT
};
