/**
 * Utilitaires pour les appels HTTP avec timeout
 */

const { API_TIMEOUT_MS } = require('./constants.js');
const { toAbortError } = require('./requestContext.js');
const logger = require('../../../lib/logger.js');

/**
 * URL sans identifiants ni paramètres, pour les logs
 */
function describeUrl(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return '(URL invalide)';
    }
}

/**
 * fetch avec timeout
 * Suit les bonnes pratiques avec AbortController et finally block
 *
 * @param {string} url - URL à appeler
 * @param {Object} options - Options fetch ; `options.signal` (facultatif) = signal de la requête IA
 *   (délai global / déconnexion du client), combiné avec le timeout de l'appel
 * @param {number} timeoutMs - Timeout en millisecondes
 * @returns {Promise<Response>} Réponse HTTP
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    const { signal: externalSignal, ...fetchOptions } = options || {};
    if (externalSignal && externalSignal.aborted) {
        throw toAbortError(externalSignal.reason);
    }

    logger.debug('Appel API IA', { url: describeUrl(url), timeoutMs });
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    // Le listener reste attaché après la réception des en-têtes : une annulation de la
    // requête interrompt aussi la lecture du corps (il est retiré dès qu'il s'est déclenché)
    const onExternalAbort = () => controller.abort();
    if (externalSignal) externalSignal.addEventListener('abort', onExternalAbort, { once: true });

    try {
        return await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
    } catch (error) {
        if (externalSignal && externalSignal.aborted) {
            throw toAbortError(externalSignal.reason);
        }
        // Gérer les erreurs d'abort (timeout de l'appel)
        if (timedOut || error.name === 'AbortError') {
            throw new Error(`Timeout API après ${timeoutMs}ms`);
        }
        // Propager les autres erreurs
        throw error;
    } finally {
        // Toujours nettoyer le timeout, même en cas d'erreur
        clearTimeout(timeoutId);
    }
}

/**
 * Gère les erreurs de réponse OpenAI avec gestion spécifique du rate limiting (429)
 *
 * @param {Response} response - Réponse HTTP
 * @param {string} operation - Nom de l'opération pour les logs
 * @returns {Promise<Response>} Réponse HTTP si OK
 * @throws {Error} Si la réponse n'est pas OK
 */
async function handleOpenAIResponse(response, operation = 'OpenAI') {
    if (!response.ok) {
        // Gérer spécifiquement l'erreur 429 (Rate Limit)
        if (response.status === 429) {
            const retryAfter = response.headers && typeof response.headers.get === 'function'
                ? response.headers.get('retry-after')
                : null;
            logger.warn(`${operation} : limite de requêtes atteinte (429)`, { retryAfterSeconds: retryAfter || undefined });
            throw new Error(`${operation} : limite de requêtes atteinte (429)`);
        }

        // Autres erreurs HTTP (le corps n'est pas journalisé : il peut reprendre la requête)
        logger.warn(`${operation} : réponse HTTP ${response.status}`);
        throw new Error(`Erreur ${operation}: ${response.status} - ${response.statusText}`);
    }
    return response;
}

module.exports = {
    fetchWithTimeout,
    handleOpenAIResponse,
    describeUrl
};
