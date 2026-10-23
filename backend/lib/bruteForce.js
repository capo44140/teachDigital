/**
 * Verrouillage après échecs répétés d'un code (PIN profil, code familial).
 *
 * Deux compteurs par cible (profil ou code familial) :
 * - par (cible, IP) : seuil bas. Un enfant qui tape des PIN au hasard sur la tablette
 *   ne verrouille que sa propre adresse, pas le parent connecté depuis son téléphone ;
 * - global par cible : seuil beaucoup plus haut, pour borner une attaque distribuée
 *   (changement d'IP) quelle que soit l'origine.
 *
 * Verrouillage progressif par (cible, IP) : 15 min, puis 1 h, puis 24 h si les
 * verrouillages se répètent. Un succès remet la clé à zéro ; l'escalade est oubliée
 * 24 h après la fin du dernier verrouillage.
 * Le plafond global, lui, ne s'escalade pas (15 min à chaque fois) : il bloque toute la
 * famille (y compris le parent), il ne doit pas devenir un moyen de la bloquer 24 h.
 *
 * ⚠️ In-memory : par instance (suffisant pour Docker/Synology mono-instance).
 * Un redémarrage du backend lève tous les verrouillages.
 */

const { createErrorResponse } = require('./response.js');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DEFAULT_LOCK_DURATIONS_MS = [15 * MINUTE, HOUR, 24 * HOUR];
const DEFAULT_GLOBAL_LOCK_DURATIONS_MS = [15 * MINUTE];
const MAX_KEYS = 10_000;

function parseIntEnv(name, fallback) {
  const value = parseInt(process.env[name] || '', 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

// « 15 min », « 1 h », « 24 h »
function formatDelay(seconds) {
  if (seconds < 3600) return `${Math.max(1, Math.ceil(seconds / 60))} min`;
  return `${Math.ceil(seconds / 3600)} h`;
}

function createFailureLimiter(opts = {}) {
  const maxFailures = opts.maxFailures ?? 10;
  // Fenêtre de comptage des échecs (hors verrouillage)
  const windowMs = opts.windowMs ?? 15 * MINUTE;
  const lockDurationsMs = opts.lockDurationsMs ?? DEFAULT_LOCK_DURATIONS_MS;
  const escalationResetMs = opts.escalationResetMs ?? 24 * HOUR;

  // key -> { failures, windowStart, lockCount, lockedUntil }
  const store = new Map();

  function getEntry(key, now) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.lockedUntil && now >= entry.lockedUntil + escalationResetMs) {
      // Plus de verrouillage depuis longtemps : l'escalade repart de zéro
      store.delete(key);
      return null;
    }
    if (!entry.lockedUntil || now >= entry.lockedUntil) {
      if (now - entry.windowStart >= windowMs) {
        entry.failures = 0;
        entry.windowStart = now;
      }
    }
    return entry;
  }

  function cleanup(now) {
    if (store.size <= MAX_KEYS) return;
    for (const [key, entry] of store.entries()) {
      const idle = !entry.lockedUntil
        ? now - entry.windowStart >= windowMs
        : now >= entry.lockedUntil + escalationResetMs;
      if (idle) store.delete(key);
      if (store.size <= MAX_KEYS) break;
    }
  }

  return {
    maxFailures,

    // Renvoie le nombre de secondes d'attente si la clé est verrouillée, sinon 0
    lockedFor (key, now = Date.now()) {
      const entry = getEntry(key, now);
      if (!entry || !entry.lockedUntil || now >= entry.lockedUntil) return 0;
      return Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000));
    },

    // Enregistre un échec. Renvoie { failures, locked, lockCount, lockMs }
    // (locked = true si CET échec déclenche le verrouillage).
    recordFailure (key, now = Date.now()) {
      cleanup(now);
      const entry = getEntry(key, now) || { failures: 0, windowStart: now, lockCount: 0, lockedUntil: 0 };
      entry.failures += 1;
      let locked = false;
      let lockMs = 0;
      if (entry.failures >= maxFailures) {
        lockMs = lockDurationsMs[Math.min(entry.lockCount, lockDurationsMs.length - 1)];
        entry.lockCount += 1;
        entry.lockedUntil = now + lockMs;
        entry.failures = 0;
        entry.windowStart = entry.lockedUntil;
        locked = true;
      }
      store.set(key, entry);
      return { failures: entry.failures, locked, lockCount: entry.lockCount, lockMs };
    },

    recordSuccess (key) {
      store.delete(key);
    },

    reset () {
      store.clear();
    }
  };
}

/**
 * Garde d'une famille de cibles (PIN des profils, code familial) :
 * compteur par (cible, IP) + plafond global par cible.
 */
function createTargetGuard(opts) {
  const perIp = createFailureLimiter({
    maxFailures: opts.maxFailuresPerIp,
    windowMs: opts.windowMs,
    lockDurationsMs: opts.lockDurationsMs
  });
  const global = createFailureLimiter({
    maxFailures: opts.maxFailuresGlobal,
    windowMs: opts.globalWindowMs ?? opts.windowMs,
    lockDurationsMs: opts.globalLockDurationsMs ?? DEFAULT_GLOBAL_LOCK_DURATIONS_MS
  });
  const ipKey = (target, ip) => `${target}|ip:${ip || 'unknown'}`;

  return {
    // Secondes d'attente (0 si la cible est utilisable depuis cette IP)
    lockedFor (target, ip, now = Date.now()) {
      return Math.max(perIp.lockedFor(ipKey(target, ip), now), global.lockedFor(target, now));
    },

    // Répond 429 et renvoie true si la cible est verrouillée (pour cette IP ou globalement)
    rejectIfLocked (target, ip, res) {
      const retryAfterSeconds = this.lockedFor(target, ip);
      if (!retryAfterSeconds) return false;
      try {
        res.setHeader('retry-after', String(retryAfterSeconds));
      } catch (_) {
        // noop (mock res)
      }
      res.status(429).json(createErrorResponse(
        `${opts.message} Réessayez dans ${formatDelay(retryAfterSeconds)}.`,
        opts.code,
        { retryAfterSeconds }
      ));
      return true;
    },

    // Renvoie { locked, scope: 'ip' | 'global' | null, lockCount, lockMs }
    recordFailure (target, ip, now = Date.now()) {
      const byIp = perIp.recordFailure(ipKey(target, ip), now);
      const byTarget = global.recordFailure(target, now);
      if (byTarget.locked) return { locked: true, scope: 'global', lockCount: byTarget.lockCount, lockMs: byTarget.lockMs };
      if (byIp.locked) return { locked: true, scope: 'ip', lockCount: byIp.lockCount, lockMs: byIp.lockMs };
      return { locked: false, scope: null, lockCount: byIp.lockCount, lockMs: 0 };
    },

    recordSuccess (target, ip) {
      perIp.recordSuccess(ipKey(target, ip));
      global.recordSuccess(target);
    },

    reset () {
      perIp.reset();
      global.reset();
    }
  };
}

const windowMs = parseIntEnv('API_PIN_LOCK_WINDOW_MS', 15 * MINUTE);
const maxFailuresPerIp = parseIntEnv('API_PIN_LOCK_MAX_FAILURES', 10);
const maxFailuresGlobal = parseIntEnv('API_PIN_LOCK_GLOBAL_MAX_FAILURES', 100);
const globalWindowMs = parseIntEnv('API_PIN_LOCK_GLOBAL_WINDOW_MS', HOUR);

// Partagé par /auth/login et /profiles/:id/pin : mêmes PIN, mêmes compteurs.
// Cible : `profile:<id>`.
const pinFailures = createTargetGuard({
  maxFailuresPerIp,
  maxFailuresGlobal,
  windowMs,
  globalWindowMs,
  code: 'PIN_LOCKED',
  message: 'Trop de codes PIN incorrects pour ce profil.'
});

// Cible : `family`
const familyGateFailures = createTargetGuard({
  maxFailuresPerIp,
  maxFailuresGlobal,
  windowMs,
  globalWindowMs,
  code: 'FAMILY_GATE_LOCKED',
  message: 'Trop de codes incorrects.'
});

module.exports = {
  DEFAULT_LOCK_DURATIONS_MS,
  DEFAULT_GLOBAL_LOCK_DURATIONS_MS,
  createFailureLimiter,
  createTargetGuard,
  pinFailures,
  familyGateFailures
};
