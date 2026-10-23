/**
 * Réponses d'erreur des routes IA
 *
 * Le détail technique (message d'erreur, échecs des providers, pile) est journalisé avec le
 * requestId ; le client ne reçoit qu'un message générique en français + ce requestId.
 */

const crypto = require('crypto');
const { ZodError } = require('zod');
const { createErrorResponse } = require('../../../lib/response.js');
const validation = require('../../../lib/validation.js');
const logger = require('../../../lib/logger.js');

const DEFAULT_UNAVAILABLE_MESSAGE = 'Impossible de traiter la demande : aucun service d\'intelligence artificielle n\'a pu répondre. Vérifiez la configuration IA ou réessayez plus tard.';
const DEFAULT_FAILURE_MESSAGE = 'Erreur lors du traitement de la demande IA';
const TIMEOUT_MESSAGE = 'La génération a pris trop de temps. Réessayez avec moins de documents ou de questions.';

/**
 * Erreur dont le message peut être renvoyé au client (validation, fichier refusé...)
 */
class AiHttpError extends Error {
    constructor(status, publicMessage, code = 'BAD_REQUEST') {
        super(publicMessage);
        this.name = 'AiHttpError';
        this.status = status;
        this.publicMessage = publicMessage;
        this.code = code;
    }
}

function getRequestId(req) {
    if (!req.requestId) {
        req.requestId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    }
    return req.requestId;
}

function canRespond(res) {
    return !res.headersSent && !res.writableEnded && !res.destroyed;
}

function zodErrorBody(error) {
    if (typeof validation.validationErrorBody === 'function') {
        return validation.validationErrorBody(error);
    }
    const errors = error.issues.map(issue => ({ path: issue.path.join('.'), code: issue.code, message: issue.message }));
    return { success: false, message: errors[0]?.message || 'Données invalides', code: 'VALIDATION_ERROR', data: null, errors };
}

/**
 * Répond 4xx avec un message destiné au client (jamais un message d'erreur interne)
 */
function sendClientError(req, res, status, message, code = 'BAD_REQUEST') {
    if (!canRespond(res)) return;
    res.status(status).json(createErrorResponse(message, code, { requestId: getRequestId(req) }));
}

/**
 * Journalise une erreur de route IA et répond avec un message générique
 * @param {Object} options
 * @param {string} [options.unavailableMessage] - Message 503 (aucun service IA disponible)
 * @param {string} [options.failureMessage] - Message 500
 */
function sendAiError(req, res, error, { unavailableMessage = DEFAULT_UNAVAILABLE_MESSAGE, failureMessage = DEFAULT_FAILURE_MESSAGE } = {}) {
    try {
        const requestId = getRequestId(req);
        const context = { requestId, method: req.method, path: req.originalUrl || req.url };

        if (error instanceof ZodError) {
            if (canRespond(res)) res.status(400).json({ ...zodErrorBody(error), requestId });
            return;
        }

        if (error && error.publicMessage && Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
            logger.debug('Requête IA refusée', { ...context, status: error.status, code: error.code });
            sendClientError(req, res, error.status, error.publicMessage, error.code || 'BAD_REQUEST');
            return;
        }

        const code = error && error.code;
        if (code === 'CLIENT_CLOSED') {
            // Le client est parti : rien à lui répondre
            logger.info('Requête IA abandonnée par le client', context);
            return;
        }

        if (code === 'AI_TIMEOUT') {
            logger.warn('Requête IA : délai dépassé', context);
            if (canRespond(res)) res.status(504).json(createErrorResponse(TIMEOUT_MESSAGE, 'AI_TIMEOUT', { requestId }));
            return;
        }

        if (code === 'AI_UNAVAILABLE') {
            // Le message contient le détail des échecs des providers : journalisé seulement
            logger.warn('Requête IA : aucun service IA disponible', { ...context, error: error.message });
            if (canRespond(res)) res.status(503).json(createErrorResponse(unavailableMessage, 'AI_UNAVAILABLE', { requestId }));
            return;
        }

        logger.error('Erreur route IA', {
            ...context,
            errorName: error && error.name,
            errorCode: code,
            error: error && error.message,
            stack: error && error.stack
        });
        if (canRespond(res)) res.status(500).json(createErrorResponse(failureMessage, 'INTERNAL_ERROR', { requestId }));
    } catch (unexpected) {
        // Ne jamais laisser une erreur s'échapper du gestionnaire d'erreurs
        logger.error('Erreur dans le gestionnaire d\'erreurs IA', { error: unexpected && unexpected.message });
    }
}

module.exports = {
    AiHttpError,
    getRequestId,
    sendClientError,
    sendAiError,
    TIMEOUT_MESSAGE
};
