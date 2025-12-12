/**
 * Middleware de rate limiting (in-memory) pour Express
 * Objectif: protéger la stabilité prod (brute-force / pics de trafic)
 *
 * ⚠️ In-memory: par instance. Suffisant pour Docker/Synology mono-instance.
 * Pour du multi-instance, utiliser Redis / Upstash.
 */

const { createErrorResponse } = require('./response.js');

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    // x-forwarded-for: "client, proxy1, proxy2"
    return xff.split(',')[0].trim();
  }
  if (req.ip) return req.ip;
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  return 'unknown';
}

/**
 * Crée un middleware de rate limiting
 * @param {Object} opts
 * @param {number} opts.windowMs - Fenêtre de temps
 * @param {number} opts.max - Nombre max de requêtes dans la fenêtre
 * @param {(req)=>string} [opts.keyGenerator] - Génère la clé de limitation
 * @param {string} [opts.message] - Message utilisateur
 * @param {string} [opts.code] - Code d'erreur (API)
 */
function createRateLimiter(opts) {
  const windowMs = opts?.windowMs ?? 60_000;
  const max = opts?.max ?? 30;
  const keyGenerator = opts?.keyGenerator ?? ((req) => `${getClientIp(req)}:${req.method}:${req.path}`);
  const message = opts?.message ?? 'Trop de requêtes. Veuillez réessayer plus tard.';
  const code = opts?.code ?? 'RATE_LIMITED';

  // key -> { count, resetAt }
  const store = new Map();
  const MAX_KEYS = 10_000;

  function cleanup(now) {
    if (store.size <= MAX_KEYS) return;
    // Nettoyage simple: supprimer les entrées expirées
    for (const [k, v] of store.entries()) {
      if (!v || now >= v.resetAt) store.delete(k);
      if (store.size <= MAX_KEYS) break;
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    cleanup(now);

    const key = keyGenerator(req);
    const entry = store.get(key);
    const resetAt = entry?.resetAt && now < entry.resetAt ? entry.resetAt : (now + windowMs);
    const count = entry?.resetAt && now < entry.resetAt ? (entry.count + 1) : 1;

    store.set(key, { count, resetAt });

    const remaining = Math.max(0, max - count);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

    // Headers standard-ish (utile pour debug et pour le client)
    try {
      res.setHeader('x-ratelimit-limit', String(max));
      res.setHeader('x-ratelimit-remaining', String(remaining));
      res.setHeader('x-ratelimit-reset', String(Math.ceil(resetAt / 1000)));
    } catch (_) {
      // noop (mock res)
    }

    if (count > max) {
      try {
        res.setHeader('retry-after', String(retryAfterSeconds));
      } catch (_) {
        // noop
      }
      return res.status(429).json(createErrorResponse(message, code, { retryAfterSeconds }));
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
  getClientIp
};


