/**
 * Contexte d'une requête IA : délai global (deadline) + AbortController
 *
 * Toute la chaîne (OCR, providers, boucle de repli entre providers) reçoit ce contexte
 * (paramètre optionnel `ctx`) : quand le délai est dépassé ou que le client se déconnecte,
 * les appels en cours sont annulés et aucun provider suivant n'est tenté.
 */

const { SERVER_REQUEST_TIMEOUT_MS } = require('./constants.js');

// Délai global par défaut d'une requête IA : sous le timeout du serveur (180 s)
const DEFAULT_AI_REQUEST_TIMEOUT_MS = 170000;
const MAX_AI_REQUEST_TIMEOUT_MS = SERVER_REQUEST_TIMEOUT_MS - 5000;
// Temps minimum restant pour lancer un appel à un provider (sinon : délai dépassé)
const MIN_PROVIDER_BUDGET_MS = 3000;

/**
 * Délai global des routes IA (AI_REQUEST_TIMEOUT_MS), borné sous le timeout serveur.
 * Lu à chaque requête : modifiable sans redémarrer les tests.
 */
function getAiRequestTimeoutMs() {
    const raw = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '', 10);
    const value = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_AI_REQUEST_TIMEOUT_MS;
    return Math.min(value, MAX_AI_REQUEST_TIMEOUT_MS);
}

function createAiTimeoutError() {
    const error = new Error('Délai de la requête IA dépassé');
    error.code = 'AI_TIMEOUT';
    error.isAbort = true;
    return error;
}

function createClientClosedError() {
    const error = new Error('Client déconnecté pendant la requête IA');
    error.code = 'CLIENT_CLOSED';
    error.isAbort = true;
    return error;
}

/**
 * Annulation (délai dépassé ou client parti) : à propager, jamais à « rattraper »
 * en essayant le provider suivant.
 */
function isAbortError(error) {
    return !!error && (error.isAbort === true || error.code === 'AI_TIMEOUT' || error.code === 'CLIENT_CLOSED');
}

/**
 * Convertit la raison d'un AbortSignal en erreur d'annulation exploitable par les routes
 */
function toAbortError(reason) {
    return isAbortError(reason) ? reason : createAiTimeoutError();
}

function remainingMs(ctx) {
    if (!ctx) return Infinity;
    if (typeof ctx.remainingMs === 'function') return ctx.remainingMs();
    if (Number.isFinite(ctx.deadline)) return Math.max(0, ctx.deadline - Date.now());
    return Infinity;
}

function throwIfAborted(ctx) {
    const signal = ctx && ctx.signal;
    if (signal && signal.aborted) {
        throw toAbortError(signal.reason);
    }
}

function minBudgetMs(ctx) {
    return ctx && Number.isFinite(ctx.minBudgetMs) ? ctx.minBudgetMs : MIN_PROVIDER_BUDGET_MS;
}

/**
 * Requête annulée, ou délai global (presque) atteint ?
 * Après l'échec d'un provider, permet de répondre « délai dépassé » plutôt que
 * « aucun service disponible » quand l'échec vient du délai lui-même.
 */
function isDeadlineReached(ctx) {
    if (!ctx) return false;
    if (ctx.signal && ctx.signal.aborted) return true;
    const remaining = remainingMs(ctx);
    return remaining !== Infinity && remaining < minBudgetMs(ctx);
}

/**
 * Timeout à utiliser pour un appel à un provider : min(timeout de l'appel, temps restant).
 * Lève une erreur d'annulation si la requête est déjà annulée ou s'il ne reste presque plus de temps.
 */
function callTimeout(ctx, perCallTimeoutMs) {
    throwIfAborted(ctx);
    const remaining = remainingMs(ctx);
    if (remaining !== Infinity && remaining < minBudgetMs(ctx)) {
        throw createAiTimeoutError();
    }
    return Math.max(1, Math.min(perCallTimeoutMs, remaining));
}

/**
 * Crée le contexte d'une requête IA
 * @param {Object} options
 * @param {Object} [options.res] - Réponse Express (détection de la déconnexion du client)
 * @param {number} [options.timeoutMs] - Délai global (défaut : AI_REQUEST_TIMEOUT_MS)
 */
function createRequestContext({ res, timeoutMs = getAiRequestTimeoutMs() } = {}) {
    const controller = new AbortController();
    const deadline = Date.now() + timeoutMs;
    const abort = (error) => {
        if (!controller.signal.aborted) controller.abort(error);
    };

    const timer = setTimeout(() => abort(createAiTimeoutError()), timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    // Déconnexion du client : sur Node ≥ 16, req 'close' est émis dès que le corps de la
    // requête a été lu (même quand le client attend encore la réponse). On écoute donc la
    // fermeture de la RÉPONSE : si elle se ferme avant d'avoir été envoyée, le client est parti.
    let onResponseClose = null;
    if (res && typeof res.on === 'function') {
        onResponseClose = () => {
            if (!res.writableEnded) abort(createClientClosedError());
        };
        res.on('close', onResponseClose);
    }

    return {
        signal: controller.signal,
        deadline,
        // Pas de budget minimum supérieur à 10 % du délai total (délais courts en test)
        minBudgetMs: Math.min(MIN_PROVIDER_BUDGET_MS, Math.floor(timeoutMs / 10)),
        remainingMs: () => Math.max(0, deadline - Date.now()),
        throwIfAborted() {
            if (controller.signal.aborted) throw toAbortError(controller.signal.reason);
        },
        abort,
        dispose() {
            clearTimeout(timer);
            if (onResponseClose && typeof res.removeListener === 'function') {
                res.removeListener('close', onResponseClose);
            }
        }
    };
}

/**
 * Attend une promesse, en la rejetant si le contexte est annulé avant
 */
function raceWithAbort(promise, ctx) {
    const signal = ctx && ctx.signal;
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(toAbortError(signal.reason));
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(toAbortError(signal.reason));
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then(
            (value) => {
                signal.removeEventListener('abort', onAbort);
                resolve(value);
            },
            (error) => {
                signal.removeEventListener('abort', onAbort);
                reject(error);
            }
        );
    });
}

module.exports = {
    DEFAULT_AI_REQUEST_TIMEOUT_MS,
    MIN_PROVIDER_BUDGET_MS,
    getAiRequestTimeoutMs,
    createRequestContext,
    createAiTimeoutError,
    createClientClosedError,
    isAbortError,
    toAbortError,
    remainingMs,
    throwIfAborted,
    isDeadlineReached,
    callTimeout,
    raceWithAbort
};
