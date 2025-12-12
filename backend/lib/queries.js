/**
 * Helper pour ajouter un timeout sur les requêtes SQL (évite les timeouts Vercel)
 * Timeout par défaut: 7s (sûr pour plans gratuits Vercel 10s)
 */

// Timeouts configurables via variables d'environnement (stabilité prod)
// - API_DB_TIMEOUT_DEFAULT_MS, API_DB_TIMEOUT_FAST_MS, API_DB_TIMEOUT_STANDARD_MS, API_DB_TIMEOUT_LONG_MS
// Si non fournis, on garde des valeurs conservatrices (compatibilité Vercel).
const TIMEOUTS = {
    DEFAULT: parseInt(process.env.API_DB_TIMEOUT_DEFAULT_MS || '7000', 10),
    FAST: parseInt(process.env.API_DB_TIMEOUT_FAST_MS || '3000', 10),
    STANDARD: parseInt(process.env.API_DB_TIMEOUT_STANDARD_MS || '5000', 10),
    LONG: parseInt(process.env.API_DB_TIMEOUT_LONG_MS || '9000', 10)
};

function withQueryTimeout(queryPromise, timeoutMs = TIMEOUTS.DEFAULT, operationName = 'requête') {
    return Promise.race([
        queryPromise,
        new Promise((_, reject) => {
            setTimeout(() => {
                const err = new Error(`Timeout ${operationName} après ${timeoutMs}ms`);
                err.code = 'GATEWAY_TIMEOUT';
                err.isTimeout = true;
                err.timeoutMs = timeoutMs;
                err.operation = operationName;
                reject(err);
            }, timeoutMs);
        })
    ]);
}

module.exports = {
    withQueryTimeout,
    TIMEOUTS
};
