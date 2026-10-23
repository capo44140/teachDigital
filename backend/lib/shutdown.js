/**
 * Arrêt propre du serveur HTTP (SIGTERM envoyé par `docker stop`, SIGINT en développement).
 *
 * 1. Le service se déclare « non prêt » (/health/ready → 503) et n'accepte plus de connexions.
 * 2. Les requêtes en cours peuvent se terminer, dans la limite de timeoutMs ;
 *    les connexions keep-alive inactives sont fermées au fil de l'eau.
 * 3. Passé ce délai, les connexions restantes sont coupées.
 * 4. Les ressources sont libérées dans l'ordre (pool PostgreSQL, worker OCR, logs...).
 *
 * Docker envoie SIGKILL après stop_grace_period (30 s dans docker-compose.yml) :
 * timeoutMs + nettoyage doit rester en dessous.
 */

const defaultLogger = require('./logger.js');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runWithTimeout(promiseFactory, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(promiseFactory),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`délai de ${timeoutMs} ms dépassé`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {Object} options
 * @param {import('http').Server} [options.server] - Serveur HTTP (absent si l'arrêt survient avant l'écoute)
 * @param {Object} [options.state] - État partagé avec l'application ({ ready, shuttingDown })
 * @param {number} [options.timeoutMs=25000] - Attente max des requêtes en cours
 * @param {Array<[string, Function]>} [options.cleanup] - Étapes de nettoyage [nom, fonction async]
 * @param {number} [options.cleanupTimeoutMs=5000] - Durée max de chaque étape de nettoyage
 * @param {Object} [options.log] - Logger
 * @param {(code: number) => void} [options.exit] - Sortie du processus (injectable pour les tests)
 * @returns {(signal: string) => Promise<void>} Fonction d'arrêt idempotente
 */
function createShutdownHandler({
  server = null,
  state = null,
  timeoutMs = 25000,
  cleanup = [],
  cleanupTimeoutMs = 5000,
  log = defaultLogger,
  exit = code => process.exit(code)
} = {}) {
  let shutdownPromise = null;

  return function shutdown(signal = 'shutdown', exitCode = 0) {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      const startedAt = Date.now();
      if (state) {
        state.shuttingDown = true;
        state.ready = false;
      }

      const httpServer = typeof server === 'function' ? server() : server;
      if (httpServer && httpServer.listening) {
        log.info('🛑 Arrêt demandé : plus de nouvelles connexions, attente des requêtes en cours', { signal, timeoutMs });

        const closed = new Promise(resolve => httpServer.close(() => resolve('closed')));
        // Les connexions keep-alive inactives empêcheraient server.close() d'aboutir
        httpServer.closeIdleConnections?.();
        const idleSweeper = setInterval(() => httpServer.closeIdleConnections?.(), 250);

        let timer;
        const timedOut = new Promise(resolve => {
          timer = setTimeout(() => resolve('timeout'), timeoutMs);
        });
        const outcome = await Promise.race([closed, timedOut]);
        clearTimeout(timer);
        clearInterval(idleSweeper);

        if (outcome === 'timeout') {
          log.warn('⏱️ Requêtes encore en cours après le délai d\'arrêt : connexions coupées', { timeoutMs });
          httpServer.closeAllConnections?.();
          await Promise.race([closed, sleep(1000)]);
        }
      } else {
        log.info('🛑 Arrêt demandé avant la mise en écoute du serveur', { signal });
      }

      for (const [name, fn] of cleanup) {
        try {
          await runWithTimeout(fn, cleanupTimeoutMs);
        } catch (error) {
          log.warn(`Nettoyage « ${name} » en échec pendant l'arrêt`, { errorMessage: error?.message });
        }
      }

      log.info('👋 Serveur arrêté', { signal, durationMs: Date.now() - startedAt });
      exit(exitCode);
    })();

    return shutdownPromise;
  };
}

module.exports = { createShutdownHandler };
