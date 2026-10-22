const cors = require('cors');

/**
 * Configuration CORS centralisée.
 *
 * Principe : liste blanche stricte. Une origine inconnue ne reçoit aucun en-tête
 * CORS (le navigateur bloque la lecture de la réponse) — on ne renvoie plus « * ».
 *
 * Origines autorisées :
 * - FRONTEND_URL (une URL) ;
 * - ALLOWED_ORIGIN (une ou plusieurs URL séparées par des virgules) ;
 * - en développement uniquement : localhost / 127.0.0.1 sur les ports Vite.
 *
 * En production (NODE_ENV=production ou DOCKER_ENV=true), localhost n'est pas
 * autorisé par défaut : il faut le déclarer explicitement dans FRONTEND_URL /
 * ALLOWED_ORIGIN si un front local doit joindre une API distante.
 */

// Ports utilisés par le front en développement (Vite 3000 par défaut, 5173 en secours)
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

function isProduction() {
  return String(process.env.NODE_ENV || '').trim() === 'production' ||
    String(process.env.DOCKER_ENV || '').trim() === 'true';
}

// Normalise une origine : espaces, slash final, casse de l'hôte
function normalizeOrigin(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).origin;
  } catch {
    // Valeur non parsable (ex. « * ») : ignorée plutôt qu'ajoutée telle quelle
    return '';
  }
}

function envOrigins() {
  const raw = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGIN]
    .filter(Boolean)
    .join(',');
  return raw.split(',').map(normalizeOrigin).filter(Boolean);
}

function getAllowedOrigins() {
  const origins = new Set();

  if (!isProduction()) {
    for (const origin of DEV_ORIGINS) origins.add(origin);
  }
  for (const origin of envOrigins()) origins.add(origin);

  return [...origins];
}

function isOriginAllowed(origin) {
  if (typeof origin !== 'string' || !origin) return false;
  // « Origin: null » (iframe sandbox, file://) n'est jamais autorisé
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return getAllowedOrigins().includes(normalized);
}

const corsOptions = {
  origin(origin, callback) {
    // Pas d'en-tête Origin : requête serveur-à-serveur (curl, healthcheck Docker)
    // ou même-origine sans préflight. Rien à filtrer.
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      // Origine de confiance : on la reflète (obligatoire avec credentials)
      return callback(null, origin);
    }

    // Origine inconnue : pas d'en-tête CORS. Ne pas lever d'erreur ici, sinon
    // Express renverrait 500 pour une simple requête cross-origin non autorisée.
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'Accept'],
  // En-têtes que le front peut lire dans la réponse (rate limiting, debug, retry)
  exposedHeaders: ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
  optionsSuccessStatus: 204
};

// Wrapper pour les handlers « serverless » (api/ai, api/badges)
const runCors = (req, res) => {
  return new Promise((resolve, reject) => {
    cors(corsOptions)(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve(result);
    });
  });
};

module.exports = {
  corsOptions,
  runCors,
  corsMiddleware: cors(corsOptions),
  getAllowedOrigins,
  isOriginAllowed,
  isProduction
};
