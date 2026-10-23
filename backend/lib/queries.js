/**
 * Timeout applicatif sur les requêtes SQL : l'API répond 504 au lieu d'attendre indéfiniment.
 *
 * La requête abandonnée n'est pas annulée côté client (pg ne le permet pas sur une requête
 * en cours) : c'est le statement_timeout de PostgreSQL (DB_STATEMENT_TIMEOUT_MS, 10 s par
 * défaut, lib/database.js) qui l'interrompt côté serveur. Les timeouts ci-dessous restent
 * donc inférieurs à ce statement_timeout.
 */

const logger = require('./logger.js');

// Timeouts configurables via variables d'environnement (stabilité prod)
// - API_DB_TIMEOUT_DEFAULT_MS, API_DB_TIMEOUT_FAST_MS, API_DB_TIMEOUT_STANDARD_MS, API_DB_TIMEOUT_LONG_MS
const TIMEOUTS = {
    DEFAULT: parseInt(process.env.API_DB_TIMEOUT_DEFAULT_MS || '7000', 10),
    FAST: parseInt(process.env.API_DB_TIMEOUT_FAST_MS || '3000', 10),
    STANDARD: parseInt(process.env.API_DB_TIMEOUT_STANDARD_MS || '5000', 10),
    LONG: parseInt(process.env.API_DB_TIMEOUT_LONG_MS || '9000', 10)
};

function createTimeoutError(operationName, timeoutMs) {
    const err = new Error(`Timeout ${operationName} après ${timeoutMs}ms`);
    err.code = 'GATEWAY_TIMEOUT';
    err.isTimeout = true;
    err.timeoutMs = timeoutMs;
    err.operation = operationName;
    return err;
}

/**
 * Rejette avec une erreur GATEWAY_TIMEOUT si la requête dépasse timeoutMs.
 * - Le minuteur est toujours annulé dès que la requête se termine (succès ou erreur).
 * - Après un timeout, le résultat tardif de la requête est ignoré (et son éventuelle
 *   erreur absorbée : pas de « unhandled rejection »).
 *
 * @param {Promise|PromiseLike} queryPromise - Requête (Promise, ou sql`...` paresseux)
 * @param {number} [timeoutMs]
 * @param {string} [operationName]
 * @returns {Promise<*>}
 */
function withQueryTimeout(queryPromise, timeoutMs = TIMEOUTS.DEFAULT, operationName = 'requête') {
    const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : TIMEOUTS.DEFAULT;

    return new Promise((resolve, reject) => {
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(createTimeoutError(operationName, ms));
        }, ms);

        // Promise.resolve() déclenche aussi l'exécution d'une requête sql`...` paresseuse
        Promise.resolve(queryPromise).then(
            (value) => {
                if (settled) {
                    logger.debug('Requête terminée après son timeout (résultat ignoré)', { operation: operationName, timeoutMs: ms });
                    return;
                }
                settled = true;
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                if (settled) {
                    logger.debug('Requête en erreur après son timeout (erreur ignorée)', {
                        operation: operationName,
                        timeoutMs: ms,
                        errorCode: error?.code
                    });
                    return;
                }
                settled = true;
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

module.exports = {
    withQueryTimeout,
    TIMEOUTS
};
