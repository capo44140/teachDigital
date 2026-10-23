/**
 * Chargement des réglages IA enregistrés depuis l'interface (table ai_settings) :
 * clés API et modèles des providers, URL / modèle LM Studio, provider des pages de cours.
 *
 * - loadAiSettings() est appelé au démarrage (server.js, après les migrations) ;
 * - en cas d'échec (base indisponible...), un nouvel essai est programmé avec un délai
 *   croissant (5 s → 10 s → ... → 5 min) au lieu d'ignorer les réglages jusqu'au redémarrage ;
 * - ensureAiSettingsLoaded() est appelé par chaque route IA : si les réglages ne sont pas
 *   encore chargés, la requête déclenche un chargement (limité à un essai toutes les quelques secondes).
 */

const providerSettings = require('./aiProviders/providerSettings.js');
const localLLMConfig = require('./aiProviders/localLLMConfig.js');
const coursePageConfig = require('./coursePageConfig.js');
const logger = require('../../../lib/logger.js');

const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 5 * 60 * 1000;
// Écart minimum entre deux essais déclenchés par des requêtes
const ON_DEMAND_THROTTLE_MS = 5000;

let loaded = false;
let inFlight = null;
let retryTimer = null;
let retryDelayMs = RETRY_MIN_MS;
let lastAttemptAt = 0;

function scheduleRetry() {
    if (retryTimer) return;
    const delay = retryDelayMs;
    retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX_MS);
    retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!loaded) attemptLoad();
    }, delay);
    if (typeof retryTimer.unref === 'function') retryTimer.unref();
    return delay;
}

function attemptLoad() {
    if (inFlight) return inFlight;
    lastAttemptAt = Date.now();
    inFlight = (async () => {
        try {
            await providerSettings.load();
            await localLLMConfig.load();
            await coursePageConfig.load();
            loaded = true;
            retryDelayMs = RETRY_MIN_MS;
            stopAiSettingsRetry();
            logger.info('Réglages IA chargés depuis la base');
            return true;
        } catch (error) {
            const retryInMs = scheduleRetry();
            logger.warn('Réglages IA non chargés : valeurs du .env utilisées en attendant un nouvel essai', {
                error: error && error.message,
                retryInMs
            });
            return false;
        } finally {
            inFlight = null;
        }
    })();
    return inFlight;
}

/**
 * Charge les réglages IA. Ne lève jamais d'erreur.
 * @returns {Promise<boolean>} true si chargés, false si un nouvel essai est programmé
 */
function loadAiSettings() {
    return attemptLoad();
}

/**
 * S'assure que les réglages ont été chargés (appelé au début de chaque route IA).
 * Ne lève jamais d'erreur : en cas d'échec, la requête continue avec les valeurs du .env.
 */
async function ensureAiSettingsLoaded() {
    if (loaded) return;
    if (inFlight) {
        await inFlight;
        return;
    }
    if (Date.now() - lastAttemptAt < ON_DEMAND_THROTTLE_MS) return;
    await attemptLoad();
}

/**
 * Annule le nouvel essai programmé (arrêt du serveur)
 */
function stopAiSettingsRetry() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
}

function isAiSettingsLoaded() {
    return loaded;
}

// Tests uniquement : repart d'un état « jamais chargé »
function resetAiSettingsLoaderForTests() {
    stopAiSettingsRetry();
    loaded = false;
    inFlight = null;
    retryDelayMs = RETRY_MIN_MS;
    lastAttemptAt = 0;
}

module.exports = {
    loadAiSettings,
    ensureAiSettingsLoaded,
    stopAiSettingsRetry,
    isAiSettingsLoaded,
    resetAiSettingsLoaderForTests
};
