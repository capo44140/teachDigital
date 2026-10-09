/**
 * Verrouillage après échecs répétés d'un code (PIN profil, code familial).
 *
 * Contrairement au rate limiting par IP (contournable en changeant d'adresse ou
 * d'en-tête X-Forwarded-For), le compteur est tenu par cible : après N échecs sur
 * le même profil, toute nouvelle tentative est refusée jusqu'à la fin de la fenêtre,
 * quelle que soit l'origine. Un succès remet le compteur à zéro.
 *
 * ⚠️ In-memory : par instance. Suffisant pour Docker/Synology mono-instance.
 */

const { createErrorResponse } = require('./response.js');

function createFailureLimiter(opts = {}) {
  const maxFailures = opts.maxFailures ?? 10;
  const windowMs = opts.windowMs ?? 15 * 60 * 1000;
  const code = opts.code ?? 'TOO_MANY_FAILURES';
  const message = opts.message ?? 'Trop de tentatives incorrectes. Réessayez plus tard.';

  // key -> { failures, resetAt }
  const store = new Map();

  function getEntry(key, now) {
    const entry = store.get(key);
    if (!entry) return null;
    if (now >= entry.resetAt) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  return {
    // Renvoie le nombre de secondes d'attente si la cible est verrouillée, sinon 0
    lockedFor (key, now = Date.now()) {
      const entry = getEntry(key, now);
      if (!entry || entry.failures < maxFailures) return 0;
      return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    },

    recordFailure (key, now = Date.now()) {
      const entry = getEntry(key, now) || { failures: 0, resetAt: now + windowMs };
      entry.failures += 1;
      store.set(key, entry);
      return entry.failures;
    },

    recordSuccess (key) {
      store.delete(key);
    },

    // Répond 429 et renvoie true si la cible est verrouillée
    rejectIfLocked (key, res) {
      const retryAfterSeconds = this.lockedFor(key);
      if (!retryAfterSeconds) return false;
      try {
        res.setHeader('retry-after', String(retryAfterSeconds));
      } catch (_) {
        // noop (mock res)
      }
      res.status(429).json(createErrorResponse(message, code, { retryAfterSeconds }));
      return true;
    },

    reset () {
      store.clear();
    }
  };
}

const failureWindowMs = parseInt(process.env.API_PIN_LOCK_WINDOW_MS || String(15 * 60 * 1000), 10);
const maxFailures = parseInt(process.env.API_PIN_LOCK_MAX_FAILURES || '10', 10);

// Partagé par /auth/login et /profiles/:id/pin : mêmes PIN, même compteur
const pinFailures = createFailureLimiter({
  maxFailures,
  windowMs: failureWindowMs,
  code: 'PIN_LOCKED',
  message: 'Trop de codes PIN incorrects pour ce profil. Réessayez dans quelques minutes.'
});

const familyGateFailures = createFailureLimiter({
  maxFailures,
  windowMs: failureWindowMs,
  code: 'FAMILY_GATE_LOCKED',
  message: 'Trop de codes incorrects. Réessayez dans quelques minutes.'
});

module.exports = {
  createFailureLimiter,
  pinFailures,
  familyGateFailures
};
