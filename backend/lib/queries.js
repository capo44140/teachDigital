/**
 * Helper pour ajouter un timeout sur les requêtes SQL (évite les timeouts Vercel)
 * Timeout par défaut: 7s (sûr pour plans gratuits Vercel 10s)
 */

const TIMEOUTS = {
    DEFAULT: 7000,
    FAST: 3000,
    STANDARD: 5000,
    LONG: 9000
};

function withQueryTimeout(queryPromise, timeoutMs = TIMEOUTS.DEFAULT, operationName = 'requête') {
    return Promise.race([
        queryPromise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout ${operationName} après ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

module.exports = {
    withQueryTimeout,
    TIMEOUTS
};
