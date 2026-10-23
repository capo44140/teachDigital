/**
 * Service OCR pour l'extraction de texte depuis des images (Tesseract.js)
 *
 * - Un seul worker Tesseract, créé à la première utilisation puis réutilisé
 *   (créer un worker par image recharge les données de langue à chaque fois) ;
 * - reconnaissances sérialisées (le worker traite une image à la fois) ;
 * - données de langue mises en cache dans TESSERACT_CACHE_DIR (volume persistant en Docker,
 *   sinon elles sont retéléchargées à chaque redéploiement) ;
 * - délai maximum OCR_TIMEOUT_MS : au-delà, le worker est arrêté (recréé à l'appel suivant) ;
 * - le texte reconnu (devoirs d'enfants) n'est jamais journalisé, seulement sa longueur.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const Tesseract = require('tesseract.js');
const { OCR_LANGUAGES } = require('../utils/constants.js');
const { throwIfAborted, remainingMs, toAbortError, createAiTimeoutError } = require('../utils/requestContext.js');
const logger = require('../../../lib/logger.js');

const DEFAULT_OCR_TIMEOUT_MS = 60000;

let workerPromise = null;
let queue = Promise.resolve();
let cacheDir = null;

function getOcrTimeoutMs() {
    const raw = parseInt(process.env.OCR_TIMEOUT_MS || '', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_OCR_TIMEOUT_MS;
}

function isDockerOrProduction() {
    return String(process.env.DOCKER_ENV || '').trim() === 'true'
        || String(process.env.NODE_ENV || '').trim() === 'production';
}

/**
 * Dossier de cache des données de langue (créé si besoin, repli sur le dossier temporaire)
 */
function getTesseractCacheDir() {
    if (cacheDir) return cacheDir;
    const configured = String(process.env.TESSERACT_CACHE_DIR || '').trim();
    const preferred = configured
        || (isDockerOrProduction() ? '/tesseract-cache' : path.join(__dirname, '..', '..', '..', '.cache', 'tesseract'));
    try {
        fs.mkdirSync(preferred, { recursive: true });
        fs.accessSync(preferred, fs.constants.W_OK);
        cacheDir = preferred;
    } catch (error) {
        cacheDir = path.join(os.tmpdir(), 'teachdigital-tesseract');
        fs.mkdirSync(cacheDir, { recursive: true });
        logger.warn('Cache Tesseract non accessible en écriture, repli sur le dossier temporaire (données de langue retéléchargées après redémarrage)', {
            preferred,
            fallback: cacheDir,
            error: error.code || error.message
        });
    }
    return cacheDir;
}

function getWorker() {
    if (!workerPromise) {
        const cachePath = getTesseractCacheDir();
        logger.info('Création du worker Tesseract', { languages: OCR_LANGUAGES, cachePath });
        workerPromise = Promise.resolve()
            .then(() => Tesseract.createWorker(OCR_LANGUAGES, 1, {
                cachePath,
                // Pas de journalisation de la progression (bruit)
                logger: () => {},
                errorHandler: (error) => logger.warn('Erreur du worker Tesseract', { error: String(error && error.message || error) })
            }))
            .catch((error) => {
                workerPromise = null;
                throw error;
            });
    }
    return workerPromise;
}

/**
 * Arrête le worker Tesseract (arrêt du serveur, ou après un dépassement de délai).
 * Ne lève jamais d'erreur.
 */
async function terminateOcrWorker() {
    const pending = workerPromise;
    workerPromise = null;
    if (!pending) return;
    try {
        const worker = await pending;
        await worker.terminate();
    } catch (error) {
        logger.warn('Arrêt du worker Tesseract impossible', { error: error && error.message });
    }
}

function stripDataUrl(base64Image) {
    const value = String(base64Image || '');
    const commaIndex = value.indexOf(',');
    return value.startsWith('data:') && commaIndex !== -1 ? value.slice(commaIndex + 1) : value;
}

async function recognize(base64Image, ctx) {
    throwIfAborted(ctx);
    const timeoutMs = Math.min(getOcrTimeoutMs(), remainingMs(ctx));
    if (timeoutMs <= 0) throw createAiTimeoutError();

    const imageBuffer = Buffer.from(stripDataUrl(base64Image), 'base64');
    const startedAt = Date.now();

    let timer = null;
    let onAbort = null;
    const signal = ctx && ctx.signal;
    try {
        const work = getWorker().then(worker => worker.recognize(imageBuffer));
        // Évite un rejet non géré si le délai expire avant la fin de la reconnaissance
        work.catch(() => {});
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                const error = new Error(`Délai OCR dépassé (${timeoutMs} ms)`);
                error.code = 'OCR_TIMEOUT';
                reject(error);
            }, timeoutMs);
        });
        const aborted = new Promise((_, reject) => {
            if (!signal) return;
            onAbort = () => reject(toAbortError(signal.reason));
            signal.addEventListener('abort', onAbort, { once: true });
        });

        const { data } = await Promise.race([work, timeout, aborted]);
        const text = String((data && data.text) || '').trim();
        logger.debug('OCR Tesseract terminé', { textLength: text.length, durationMs: Date.now() - startedAt });
        return text;
    } catch (error) {
        if (error.code === 'OCR_TIMEOUT' || (signal && signal.aborted)) {
            // Worker occupé par une reconnaissance devenue inutile : on l'arrête (recréé au prochain appel)
            logger.warn('OCR Tesseract interrompu', { reason: error.code || 'annulation', durationMs: Date.now() - startedAt });
            await terminateOcrWorker();
        }
        throw error;
    } finally {
        clearTimeout(timer);
        if (signal && onAbort) signal.removeEventListener('abort', onAbort);
    }
}

/**
 * Extrait le texte d'une image en utilisant Tesseract OCR
 *
 * @param {string} base64Image - Image en base64 (avec ou sans préfixe data:)
 * @param {Object} [ctx] - Contexte de la requête (signal d'annulation, délai)
 * @returns {Promise<string>} Texte extrait de l'image
 */
function extractTextFromImage(base64Image, ctx) {
    // Une reconnaissance à la fois sur le worker partagé
    const run = queue.then(() => recognize(base64Image, ctx));
    queue = run.catch(() => {});
    return run.then((text) => {
        if (!text) {
            logger.debug('Aucun texte extrait de l\'image (Tesseract)');
            return 'Aucun texte détecté dans l\'image.';
        }
        return text;
    });
}

module.exports = {
    extractTextFromImage,
    terminateOcrWorker,
    getTesseractCacheDir
};
