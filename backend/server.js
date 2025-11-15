/**
 * Serveur Express pour TeachDigital Backend
 * Remplace le handler Vercel Functions pour le déploiement Docker
 */

const express = require('express');
const handler = require('./api/index.js');
const logger = require('./lib/logger.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration CORS - Middleware personnalisé pour un contrôle total
// DOIT être défini AVANT tous les autres middlewares
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Construire la liste des origines autorisées
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://teach-digital.vercel.app',
    'https://teachdigital.vercel.app'
  ];
  
  // Ajouter FRONTEND_URL si défini
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Ajouter ALLOWED_ORIGIN si défini (peut contenir plusieurs URLs séparées par des virgules)
  if (process.env.ALLOWED_ORIGIN) {
    const additionalOrigins = process.env.ALLOWED_ORIGIN.split(',')
      .map(url => url.trim())
      .filter(Boolean);
    allowedOrigins.push(...additionalOrigins);
  }
  
  // Autoriser localhost en développement
  const isLocalhost = origin && origin.startsWith('http://localhost');
  const isAllowedOrigin = origin && (allowedOrigins.includes(origin) || isLocalhost);
  
  // Définir l'origine CORS : utiliser l'origine si elle est autorisée, sinon '*'
  // Note: '*' ne peut pas être utilisé avec credentials: true
  const corsOrigin = (origin && isAllowedOrigin) ? origin : (process.env.NODE_ENV === 'development' ? '*' : null);
  
  // Log pour le débogage
  if (req.method === 'OPTIONS') {
    logger.debug(`Requête OPTIONS (preflight) - Origin: ${origin}, Allowed: ${isAllowedOrigin}, CORS Origin: ${corsOrigin}`);
    logger.debug(`Origines autorisées: ${allowedOrigins.join(', ')}`);
  }
  
  // Définir les en-têtes CORS sur toutes les réponses
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Credentials', corsOrigin !== '*' ? 'true' : 'false');
    res.setHeader('Vary', 'Origin');
  } else if (origin) {
    // Si l'origine est définie mais non autorisée, logger un avertissement
    // Ne pas logger si origin est undefined (requêtes directes, curl, etc.)
    logger.warn(`Origine non autorisée: ${origin}`);
  }
  // Si origin est undefined, c'est probablement une requête directe (pas depuis un navigateur)
  // On ne définit pas les en-têtes CORS mais on ne bloque pas non plus la requête
  
  // Gérer les requêtes OPTIONS (preflight) - DOIT retourner immédiatement
  if (req.method === 'OPTIONS') {
    logger.debug(`En-têtes CORS définis pour OPTIONS: Access-Control-Allow-Origin=${corsOrigin || 'none'}`);
    return res.status(corsOrigin ? 200 : 403).end();
  }
  
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
          logger.error('Erreur lors de la lecture du fichier', err);
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
        logger.error('Erreur lors du parsing FormData', err);
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

// Middleware pour convertir les requêtes Express en format compatible avec le handler Vercel
app.use('*', async (req, res) => {
  // Les requêtes OPTIONS sont déjà gérées par le middleware CORS précédent
  
  // Créer un objet de requête compatible avec le handler Vercel
  const contentType = req.headers['content-type'] || '';
  const isFormData = contentType.includes('multipart/form-data');
  
  const vercelReq = {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: req.headers,
    body: req.body, // Contient les données parsées (JSON, URL-encoded, ou FormData)
    query: req.query,
    params: req.params,
    // Pour FormData, ajouter les données parsées dans le format attendu par le handler
    ...(isFormData && req.parsedFormData && {
      parsedFormData: req.parsedFormData
    })
  };
  
  // Créer un objet de réponse compatible avec Express
  // Le handler utilise directement res.status(), res.json(), etc.
  // donc on peut passer directement res
  try {
    await handler(vercelReq, res);
  } catch (error) {
    logger.error('Erreur dans le handler', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Erreur serveur interne: ' + error.message
      });
    }
  }
});

// Route de santé pour Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Serveur TeachDigital démarré sur le port ${PORT}`);
  logger.info(`Mode: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`URL: http://0.0.0.0:${PORT}`);
  if (logger.enableFileLogging) {
    logger.info(`Logs écrits dans: ${logger.logsDirectory}`);
  }
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise: promise.toString(), reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

