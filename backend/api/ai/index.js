/**
 * Routeur de l'API IA (monté sur /ai par api/index.js, réservé aux parents)
 * Génération de quiz / pages de cours, OCR, réglages des providers IA.
 *
 * - Chaque route de génération a un délai global (AI_REQUEST_TIMEOUT_MS) et est annulée si le
 *   client se déconnecte : les appels aux providers en cours sont interrompus.
 * - Les entrées sont validées par Zod (utils/schemas.js) : bornes sur le nombre de questions,
 *   la taille des textes et le nombre de documents (coût des appels).
 * - Aucune erreur interne n'est renvoyée au client : message générique + requestId (cf. utils/httpErrors.js).
 */

const express = require('express');
const { createResponse } = require('../../lib/response.js');
const logger = require('../../lib/logger.js');

// Services (appelés via l'objet module : remplaçables dans les tests)
const imageAnalysis = require('./services/imageAnalysis.js');
const ocr = require('./services/ocr.js');
const ocrLLM = require('./services/ocrLLM.js');
const aiProviders = require('./services/aiProviders/index.js');
const quizGenerator = require('./services/quizGenerator.js');
const coursePageGenerator = require('./services/coursePageGenerator.js');
const aiSettingsLoader = require('./services/aiSettingsLoader.js');
const localLLMConfig = require('./services/aiProviders/localLLMConfig.js');
const providerSettings = require('./services/aiProviders/providerSettings.js');
const coursePageConfig = require('./services/coursePageConfig.js');
const { parseFormData, bufferToBase64 } = require('./middleware/formDataParser.js');
const { validateApiKey, hasAtLeastOneValidKey, isLocalLLMAvailable } = require('./utils/validation.js');
const { validateAndNormalizeQuiz } = require('./utils/quizFormat.js');
const fetchUtils = require('./utils/fetch.js');
const { validateLocalLLMUrl } = require('./utils/urlSafety.js');
const { createRequestContext, getAiRequestTimeoutMs, isAbortError } = require('./utils/requestContext.js');
const { AiHttpError, getRequestId, sendClientError, sendAiError } = require('./utils/httpErrors.js');
const {
    fileCountSchema,
    jsonDocumentsSchema,
    quizFromImageSchema,
    quizFromDocumentsSchema,
    quizFromAnalysesSchema,
    quizFromTextSchema,
    coursePageFieldsSchema
} = require('./utils/schemas.js');

const { COURSE_PAGE_TIMEOUT_MS } = coursePageGenerator;

// ==================== CONFIGURATION ====================

/**
 * Mode OCR (variable d'env OCR_MODE) : "llm" (défaut, LLM Vision : LocalLLM, OpenAI, Gemini)
 * ou "tesseract" (Tesseract.js, hors ligne)
 * @returns {boolean} true si LLM Vision
 */
function getDefaultOCRMode() {
    const mode = (process.env.OCR_MODE || 'llm').toLowerCase().trim();
    return mode !== 'tesseract';
}

const QUIZ_MESSAGES = {
    unavailableMessage: 'Impossible de générer le quiz. Tous les services d\'intelligence artificielle ont échoué. Veuillez réessayer plus tard ou vérifier la configuration des clés API.',
    failureMessage: 'Erreur lors de la génération du quiz'
};

const IMAGE_QUIZ_MESSAGES = {
    unavailableMessage: 'Impossible de générer le quiz : aucun service d\'intelligence artificielle disponible. Vérifiez la configuration des clés API.',
    failureMessage: 'Erreur lors de la génération du quiz'
};

const EXTRACTION_MESSAGES = {
    unavailableMessage: 'Impossible d\'analyser les documents : aucun service d\'intelligence artificielle disponible. Vérifiez la configuration IA.',
    failureMessage: 'Erreur lors de l\'extraction du texte des documents'
};

const COURSE_PAGE_MESSAGES = {
    unavailableMessage: 'Impossible de générer la page. Vérifiez la configuration IA (un modèle capable de lire des photos est requis : LM Studio avec un modèle vision, OpenAI, Gemini ou OpenRouter avec un modèle vision).',
    failureMessage: 'Erreur lors de la génération de la page'
};

const PDF_MESSAGE = 'Les fichiers PDF ne sont pas pris en charge : envoyez des photos (JPEG, PNG…) des pages.';
const UNSUPPORTED_FILE_MESSAGE = 'Type de fichier non pris en charge : envoyez des photos (JPEG, PNG…).';

// ==================== ROUTEUR ====================

const router = express.Router();

// Promesses des handlers d'une requête (handleAI les attend : appels directs dans les tests)
const TRACK_PENDING = Symbol('teachdigitalAiPending');

/**
 * Enveloppe un handler async : réglages IA chargés au besoin, erreurs toujours traitées.
 * La promesse est enregistrée de façon synchrone (Express appelle le handler sans attendre).
 */
function route(handler, errorMessages) {
    return (req, res) => {
        const promise = (async () => {
            await aiSettingsLoader.ensureAiSettingsLoaded();
            await handler(req, res);
        })().catch(error => sendAiError(req, res, error, errorMessages));
        if (typeof req[TRACK_PENDING] === 'function') req[TRACK_PENDING](promise);
    };
}

/**
 * Route de génération : contexte avec délai global et annulation sur déconnexion du client
 */
function aiRoute(handler, errorMessages, getTimeoutMs = getAiRequestTimeoutMs) {
    return route(async (req, res) => {
        const ctx = createRequestContext({ res, timeoutMs: getTimeoutMs() });
        try {
            await handler(req, res, ctx);
        } finally {
            ctx.dispose();
        }
    }, errorMessages);
}

/**
 * Résout le nom du provider (insensible à la casse) avant d'appeler le handler
 */
function withProvider(handler) {
    return async (req, res) => {
        const name = providerSettings.resolveName(req.params.name);
        if (!name) {
            return sendClientError(req, res, 404, `Provider inconnu : ${String(req.params.name || '').slice(0, 50)}`, 'NOT_FOUND');
        }
        return handler(name, req, res);
    };
}

// Génération (délai global + annulation)
router.post('/generate-quiz-from-image', aiRoute(handleGenerateQuizFromImage, IMAGE_QUIZ_MESSAGES));
router.post('/generate-quiz-from-documents', aiRoute(handleGenerateQuizFromDocuments, QUIZ_MESSAGES));
router.post('/extract-text-from-documents', aiRoute(handleExtractTextFromDocuments, EXTRACTION_MESSAGES));
router.post('/generate-quiz-from-analyses', aiRoute(handleGenerateQuizFromAnalyses, QUIZ_MESSAGES));
router.post('/generate-quiz-from-text', aiRoute(handleGenerateQuizFromText, QUIZ_MESSAGES));
router.post('/generate-course-page', aiRoute(handleGenerateCoursePage, COURSE_PAGE_MESSAGES, () => COURSE_PAGE_TIMEOUT_MS));

// Clés API
router.get('/validate-key', route(handleValidateKey));
router.get('/has-valid-key', route(handleHasValidKey));

// LM Studio / LocalLLM
router.get('/local-llm/models', route(handleGetLocalLLMModels));
router.get('/local-llm/status', route(handleGetLocalLLMStatus));
router.post('/local-llm/model', route(handleSetLocalLLMModel));
router.post('/local-llm/url', route(handleSetLocalLLMUrl));

// Providers à clé API (clé et modèle enregistrés depuis l'interface)
router.get('/providers/config', route(handleGetProvidersConfig));
router.post('/providers/:name/config', route(withProvider(handleSetProviderConfig)));
router.delete('/providers/:name/key', route(withProvider(handleDeleteProviderKey)));
router.get('/providers/:name/models', route(withProvider(handleGetProviderModels)));
router.get('/providers', route(handleGetProviders));

// Provider IA utilisé pour la génération de pages de cours
router.get('/course-page/provider', route(handleGetCoursePageProvider));
router.post('/course-page/provider', route(handleSetCoursePageProvider));

// Route non trouvée
router.use((req, res) => sendClientError(req, res, 404, 'Endpoint non trouvé', 'NOT_FOUND'));

// Filet de sécurité : aucune erreur ne sort du routeur IA
// eslint-disable-next-line no-unused-vars
router.use((error, req, res, next) => sendAiError(req, res, error));

/**
 * Gestionnaire des routes IA
 * Utilisable comme middleware Express (api/index.js : router.use('/ai', requireAdmin, handleAI))
 * ou appelé directement : la promesse retournée se résout quand le handler a terminé.
 */
function handleAI(req, res, next) {
    const pending = [];
    const previous = req[TRACK_PENDING];
    req[TRACK_PENDING] = promise => pending.push(promise);
    try {
        router(req, res, (error) => {
            // Le routeur se termine par une réponse 404 : n'arrive qu'en cas d'erreur inattendue
            if (error) {
                sendAiError(req, res, error);
            } else if (typeof next === 'function') {
                next();
            }
        });
    } catch (error) {
        sendAiError(req, res, error);
    } finally {
        req[TRACK_PENDING] = previous;
    }
    return Promise.all(pending).then(() => undefined);
}

// ==================== OUTILS ====================

/**
 * Corps JSON de la requête (déjà analysé par express.json)
 */
function getJsonBody(req) {
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body) || {};
        } catch {
            throw new AiHttpError(400, 'Format de données invalide');
        }
    }
    if (Buffer.isBuffer(req.body)) {
        try {
            return JSON.parse(req.body.toString('utf8')) || {};
        } catch {
            throw new AiHttpError(400, 'Format de données invalide');
        }
    }
    return req.body && typeof req.body === 'object' ? req.body : {};
}

function isMultipart(req) {
    return String((req.headers && req.headers['content-type']) || '').includes('multipart/form-data');
}

/**
 * Sépare une data URL (data:image/png;base64,...) en { base64, mimeType }
 */
function splitDataUrl(value) {
    const text = String(value || '');
    const match = text.match(/^data:([^;,]*)(;base64)?,/i);
    if (match) {
        return { base64: text.slice(match[0].length), mimeType: match[1] || '' };
    }
    const commaIndex = text.indexOf(',');
    return { base64: commaIndex !== -1 && commaIndex < 100 ? text.slice(commaIndex + 1) : text, mimeType: '' };
}

function isPdfDocument(doc) {
    const type = String(doc.type || '').toLowerCase().trim();
    if (type === 'pdf' || type === 'application/pdf' || type.endsWith('/pdf')) return true;
    if (/\.pdf$/i.test(String(doc.name || '').trim())) return true;
    // Contenu : signature « %PDF- » (base64 : « JVBERi0 »)
    if (Buffer.isBuffer(doc.buffer) && doc.buffer.subarray(0, 5).toString('latin1') === '%PDF-') return true;
    if (typeof doc.base64 === 'string' && doc.base64.startsWith('JVBERi0')) return true;
    return false;
}

function isImageDocument(doc) {
    const type = String(doc.type || '').toLowerCase().trim();
    return type.startsWith('image/') || type === 'image';
}

/**
 * Seules les images sont acceptées : un PDF (ou autre) est refusé en 415
 * (auparavant les PDF produisaient un faux texte « Contenu PDF extrait » puis un faux quiz)
 */
function assertSupportedDocuments(documents) {
    for (const doc of documents) {
        if (isPdfDocument(doc)) {
            throw new AiHttpError(415, PDF_MESSAGE, 'UNSUPPORTED_FILE_TYPE');
        }
        if (!isImageDocument(doc)) {
            throw new AiHttpError(415, UNSUPPORTED_FILE_MESSAGE, 'UNSUPPORTED_FILE_TYPE');
        }
    }
}

function hasData(doc) {
    return (Buffer.isBuffer(doc.buffer) && doc.buffer.length > 0) || (typeof doc.base64 === 'string' && doc.base64.length > 0);
}

/**
 * Documents envoyés (multipart : file_i + file_i_name / file_i_type + fileCount ;
 * ou JSON : { documents: [{ name, type, base64|data }] }), vérifiés (images uniquement)
 * @returns {Promise<{documents: Array<{name, type, buffer?, base64?}>, fields: Object}>}
 */
async function collectDocuments(req) {
    let documents = [];
    let fields;

    if (isMultipart(req)) {
        const parsed = await parseFormData(req);
        fields = parsed.fields || {};
        const files = parsed.files || [];
        const fileCount = fileCountSchema.parse(fields.fileCount);
        for (let i = 0; i < fileCount; i++) {
            const file = files.find(f => f.fieldname === `file_${i}`);
            if (!file) {
                logger.warn('Fichier annoncé absent de l\'envoi', { requestId: req.requestId, index: i });
                continue;
            }
            documents.push({
                name: fields[`file_${i}_name`] || file.filename,
                type: fields[`file_${i}_type`] || file.mimetype,
                buffer: file.buffer
            });
        }
    } else {
        fields = getJsonBody(req);
        documents = jsonDocumentsSchema.parse(fields.documents).map((doc) => {
            const { base64, mimeType } = splitDataUrl(doc.base64 || doc.data || '');
            return { name: doc.name || null, type: doc.type || mimeType, base64 };
        });
    }

    assertSupportedDocuments(documents);
    documents = documents.filter(hasData);
    if (documents.length === 0) {
        throw new AiHttpError(400, 'Documents requis');
    }
    return { documents, fields };
}

/**
 * OCR (LLM Vision ou Tesseract selon OCR_MODE) puis analyse IA de chaque document.
 * Un document en échec est ignoré ; l'annulation (délai, client parti) arrête tout.
 */
async function analyzeDocuments(req, documents, ctx, emptyMessage) {
    const useLLMOCR = getDefaultOCRMode();
    const extractions = [];
    let lastError = null;

    logger.info('Analyse de documents', { requestId: getRequestId(req), documents: documents.length, ocr: useLLMOCR ? 'llm' : 'tesseract' });

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        ctx.throwIfAborted();
        try {
            const base64 = doc.base64 || bufferToBase64(doc.buffer);
            const extractedText = useLLMOCR
                ? await ocrLLM.extractTextFromImageWithLLM(base64, ctx)
                : await ocr.extractTextFromImage(base64, ctx);
            const analysis = await aiProviders.analyzeWithAI(extractedText, ctx);
            extractions.push({ type: 'image', fileName: doc.name, extractedText, analysis });
        } catch (error) {
            if (isAbortError(error)) throw error;
            lastError = error;
            logger.warn('Document non traité', { requestId: getRequestId(req), index: i + 1, code: error.code, error: error.message });
        }
    }

    if (extractions.length === 0) {
        // Aucun service IA disponible : 503 plutôt qu'un « document invalide »
        if (lastError && lastError.code === 'AI_UNAVAILABLE') throw lastError;
        throw new AiHttpError(400, emptyMessage);
    }
    return extractions;
}

/**
 * Vérifie le format du quiz généré puis répond (422 si le quiz est inexploitable)
 */
function sendQuiz(req, res, quiz, questionCount) {
    const validated = validateAndNormalizeQuiz(quiz, { expectedQuestionCount: Number(questionCount) });
    if (!validated.ok) {
        logger.warn('Quiz généré invalide', { requestId: getRequestId(req), errors: validated.errors.length });
        return res.status(422).json({
            success: false,
            message: 'Quiz généré invalide (format attendu: title, questions[question, options(4), correctAnswer(0..3)]).',
            code: 'INVALID_QUIZ_FORMAT',
            data: null,
            errors: validated.errors,
            warnings: validated.warnings,
            requestId: getRequestId(req)
        });
    }
    return res.status(200).json(createResponse('Quiz généré avec succès', { quiz: validated.quiz, warnings: validated.warnings }));
}

// ==================== HANDLERS DE GÉNÉRATION ====================

/**
 * Génère un quiz à partir d'une image (JSON : image en base64 / data URL)
 */
async function handleGenerateQuizFromImage(req, res, ctx) {
    const { image, childProfile, questionCount } = quizFromImageSchema.parse(getJsonBody(req));
    const { base64, mimeType } = splitDataUrl(image);
    assertSupportedDocuments([{ type: mimeType || 'image/*', base64 }]);

    const analysis = await imageAnalysis.analyzeImage(base64, ctx);
    const quiz = await quizGenerator.generateQuizFromAnalysis(analysis, childProfile, questionCount, ctx);
    return sendQuiz(req, res, quiz, questionCount);
}

/**
 * Génère un quiz à partir de plusieurs documents (multipart, ou JSON en repli)
 */
async function handleGenerateQuizFromDocuments(req, res, ctx) {
    const { documents, fields } = await collectDocuments(req);
    // Validé avant tout appel IA (coût)
    const { childProfile, questionCount } = quizFromDocumentsSchema.parse({
        childProfile: fields.childProfile,
        questionCount: fields.questionCount
    });

    const analyses = await analyzeDocuments(req, documents, ctx, 'Aucun document valide à analyser');
    const quiz = await quizGenerator.generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount, ctx);
    return sendQuiz(req, res, quiz, questionCount);
}

/**
 * Extrait le texte des documents (OCR + analyse, étape 1)
 * Retourne les textes extraits et les analyses pour /generate-quiz-from-analyses
 */
async function handleExtractTextFromDocuments(req, res, ctx) {
    const { documents } = await collectDocuments(req);
    const extractions = await analyzeDocuments(req, documents, ctx, 'Aucun document valide à traiter');
    return res.status(200).json(createResponse('Textes extraits avec succès', {
        extractions,
        count: extractions.length
    }));
}

/**
 * Génère un quiz à partir d'analyses déjà effectuées (étape 2)
 */
async function handleGenerateQuizFromAnalyses(req, res, ctx) {
    const { extractions, childProfile, questionCount } = quizFromAnalysesSchema.parse(getJsonBody(req));

    const analyses = extractions.map(extraction => ({
        type: extraction.type,
        fileName: extraction.fileName,
        analysis: extraction.analysis || {},
        // Utiliser le texte OCR (source) pour enrichir la génération du quiz
        extractedText: extraction.extractedText || extraction.text || extraction.ocrText || null
    }));

    const quiz = await quizGenerator.generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount, ctx);
    return sendQuiz(req, res, quiz, questionCount);
}

/**
 * Génère un quiz à partir d'un texte
 */
async function handleGenerateQuizFromText(req, res, ctx) {
    const { text, childProfile, options } = quizFromTextSchema.parse(getJsonBody(req));
    const quiz = await quizGenerator.generateQuizFromTextWithAI(text, childProfile, options, ctx);
    return sendQuiz(req, res, quiz, options.questionCount);
}

/**
 * Génère une page HTML d'entraînement à partir des photos d'une leçon / d'un contrôle
 * Multipart : file_i (images), fileCount, childProfile (JSON), subject, topic, instructions
 * La page n'est pas publiée ici : le parent la relit puis la publie via /course-pages
 */
async function handleGenerateCoursePage(req, res, ctx) {
    // La génération d'une page complète dépasse le timeout global du serveur (180s)
    if (typeof req.setTimeout === 'function') req.setTimeout(COURSE_PAGE_TIMEOUT_MS + 30000);
    if (typeof res.setTimeout === 'function') res.setTimeout(COURSE_PAGE_TIMEOUT_MS + 30000);

    if (!isMultipart(req)) {
        throw new AiHttpError(400, 'Photos requises (multipart/form-data)');
    }

    const { fields = {}, files = [] } = await parseFormData(req);
    const fileCount = fileCountSchema.parse(fields.fileCount);
    const documents = [];
    for (let i = 0; i < fileCount; i++) {
        const file = files.find(f => f.fieldname === `file_${i}`);
        if (file) {
            documents.push({ name: fields[`file_${i}_name`] || file.filename, type: fields[`file_${i}_type`] || file.mimetype || '', buffer: file.buffer });
        }
    }
    assertSupportedDocuments(documents);
    const images = documents.filter(hasData).map(doc => ({ base64: bufferToBase64(doc.buffer), mimeType: doc.type }));
    if (images.length === 0) {
        throw new AiHttpError(400, 'Au moins une photo (image) est requise');
    }

    const { childProfile, subject, topic, instructions } = coursePageFieldsSchema.parse(fields);
    logger.info('Génération de page de cours', { requestId: getRequestId(req), photos: images.length });

    const result = await coursePageGenerator.generateCoursePageFromImages({
        images,
        childProfile: { name: childProfile.name, level: childProfile.level },
        subject,
        topic,
        instructions
    }, ctx);

    return res.status(200).json(createResponse('Page de cours générée avec succès', result));
}

// ==================== HANDLERS CLÉS API ====================

/**
 * Vérifie si une clé API est configurée pour un type de provider
 */
async function handleValidateKey(req, res) {
    let apiType = req.query && typeof req.query.type === 'string' ? req.query.type : null;
    if (!apiType) {
        try {
            apiType = new URL(req.url, 'http://localhost').searchParams.get('type');
        } catch {
            apiType = null;
        }
    }
    const isValid = await validateApiKey(apiType || 'openai');
    return res.status(200).json(createResponse('Validation effectuée', { isValid }));
}

/**
 * Vérifie si au moins une clé API est configurée
 */
async function handleHasValidKey(req, res) {
    const hasValidKey = await hasAtLeastOneValidKey();
    return res.status(200).json(createResponse('Vérification effectuée', { hasValidKey }));
}

// ==================== HANDLERS LM STUDIO / LOCAL LLM ====================

/**
 * Appelle l'endpoint /models de LM Studio (compatible OpenAI), sans suivre de redirection (SSRF)
 * @returns {Promise<Response|null>} null si aucune URL n'est configurée
 */
async function fetchLocalLLMModels(timeoutMs) {
    const baseUrl = localLLMConfig.getBaseUrl();
    if (!baseUrl) return null;
    return fetchUtils.fetchWithTimeout(`${baseUrl}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'error'
    }, timeoutMs);
}

function localLLMState() {
    return {
        baseUrl: localLLMConfig.getBaseUrl(),
        baseUrlSource: localLLMConfig.getBaseUrlSource(),
        envBaseUrl: localLLMConfig.getEnvBaseUrl(),
        activeModel: localLLMConfig.getActiveModel(),
        activeModelSource: localLLMConfig.getActiveModelSource(),
        envModel: localLLMConfig.getEnvModel()
    };
}

/**
 * Récupère la liste des modèles disponibles dans LM Studio
 */
async function handleGetLocalLLMModels(req, res) {
    let models = [];
    let connected = false;

    try {
        const response = await fetchLocalLLMModels(10000);
        if (response && response.ok) {
            const data = await response.json();
            models = ((data && data.data) || []).map(m => ({
                id: m.id,
                object: m.object || 'model',
                owned_by: m.owned_by || 'local'
            }));
            connected = true;
        }
    } catch (fetchError) {
        logger.warn('LM Studio non joignable', { requestId: getRequestId(req), error: fetchError.message });
    }

    return res.status(200).json(createResponse('Modèles récupérés', { connected, ...localLLMState(), models }));
}

/**
 * Retourne le statut de connexion à LM Studio
 */
async function handleGetLocalLLMStatus(req, res) {
    let connected = false;
    try {
        const response = await fetchLocalLLMModels(5000);
        connected = !!(response && response.ok);
    } catch (_e) {
        connected = false;
    }

    return res.status(200).json(createResponse('Statut LM Studio', {
        connected,
        ...localLLMState(),
        ocrMode: (process.env.OCR_MODE || 'llm').toLowerCase().trim()
    }));
}

/**
 * Change le modèle actif du LLM local
 * Body: { modelId: string|null } (null = retour au modèle du .env)
 */
async function handleSetLocalLLMModel(req, res) {
    const { modelId } = getJsonBody(req);

    if (modelId === null || modelId === undefined) {
        await localLLMConfig.setActiveModel(null);
        return res.status(200).json(createResponse('Modèle restauré au défaut', {
            activeModel: localLLMConfig.getActiveModel(),
            activeModelSource: 'env'
        }));
    }

    if (typeof modelId !== 'string' || modelId.trim().length === 0 || modelId.trim().length > 200) {
        return sendClientError(req, res, 400, 'modelId requis (string non vide de 200 caractères maximum, ou null pour restaurer)');
    }

    await localLLMConfig.setActiveModel(modelId.trim());
    return res.status(200).json(createResponse('Modèle changé avec succès', {
        activeModel: localLLMConfig.getActiveModel(),
        activeModelSource: 'ui'
    }));
}

/**
 * Change l'URL du LLM local
 * Body: { baseUrl: string|null } (null = retour à LOCAL_LLM_URL du .env)
 * Seules les URL http(s) sans identifiants vers une adresse autorisée sont acceptées (cf. utils/urlSafety.js)
 */
async function handleSetLocalLLMUrl(req, res) {
    const body = getJsonBody(req);
    if (!('baseUrl' in body)) {
        return sendClientError(req, res, 400, 'baseUrl requis (null = retour au .env)');
    }
    if (body.baseUrl !== null && typeof body.baseUrl !== 'string') {
        return sendClientError(req, res, 400, 'URL invalide (ex: http://192.168.1.20:1234/v1)');
    }

    const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim().replace(/\/+$/, '') : null;
    if (baseUrl) {
        const check = await validateLocalLLMUrl(baseUrl);
        if (!check.ok) {
            return sendClientError(req, res, 400, check.message);
        }
    }

    await localLLMConfig.setBaseUrl(baseUrl || null);
    return res.status(200).json(createResponse('URL LM Studio enregistrée', {
        baseUrl: localLLMConfig.getBaseUrl(),
        baseUrlSource: localLLMConfig.getBaseUrlSource(),
        envBaseUrl: localLLMConfig.getEnvBaseUrl()
    }));
}

// ==================== HANDLERS PROVIDERS À CLÉ API ====================

/**
 * Retourne les paramètres de chaque provider à clé API (les clés ne sont jamais renvoyées en clair)
 */
async function handleGetProvidersConfig(req, res) {
    return res.status(200).json(createResponse('Configuration des providers', {
        providers: providerSettings.NAMES.map(name => providerSettings.getPublicConfig(name))
    }));
}

/**
 * Enregistre la clé API et/ou le modèle d'un provider
 * Body: { apiKey?: string, model?: string|null } (model null ou vide = retour au défaut)
 * La clé est vérifiée auprès du provider avant d'être enregistrée.
 */
async function handleSetProviderConfig(name, req, res) {
    const label = providerSettings.getLabel(name);
    const body = getJsonBody(req);
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
    const model = typeof body.model === 'string' ? body.model.trim() : body.model;

    if (apiKey === undefined && model === undefined) {
        return sendClientError(req, res, 400, 'apiKey ou model requis');
    }

    if (apiKey !== undefined && !providerSettings.isValidKeyFormat(name, apiKey)) {
        const format = providerSettings.getKeyFormat(name);
        return sendClientError(req, res, 400, `Clé ${label} invalide${format ? ` (${format})` : ''}`);
    }

    if (model !== undefined && model !== null && model !== '' && !providerSettings.isValidModel(name, model)) {
        return sendClientError(req, res, 400, `Modèle invalide (${providerSettings.getModelFormatHint(name)})`);
    }

    if (apiKey !== undefined) {
        const { url, headers } = providerSettings.getCheckRequest(name, apiKey);
        let response;
        try {
            response = await fetchUtils.fetchWithTimeout(url, { method: 'GET', headers }, 10000);
        } catch (fetchError) {
            logger.warn(`${label} injoignable lors de la vérification de la clé`, { requestId: getRequestId(req), error: fetchError.message });
            return sendClientError(req, res, 502, `${label} injoignable, clé non vérifiée. Réessayez plus tard.`, 'BAD_GATEWAY');
        }
        // Gemini répond 400 à une clé invalide, les autres 401 ou 403
        if ([400, 401, 403].includes(response.status)) {
            return sendClientError(req, res, 400, `Clé refusée par ${label}`);
        }
        if (!response.ok) {
            return sendClientError(req, res, 502, `${label} a répondu ${response.status}, clé non enregistrée`, 'BAD_GATEWAY');
        }
        await providerSettings.setApiKey(name, apiKey);
    }

    if (model !== undefined) {
        await providerSettings.setModel(name, model || null);
    }

    return res.status(200).json(createResponse(`Configuration ${label} enregistrée`, providerSettings.getPublicConfig(name)));
}

/**
 * Supprime la clé enregistrée depuis l'interface (retour à la clé du .env)
 */
async function handleDeleteProviderKey(name, req, res) {
    const label = providerSettings.getLabel(name);
    await providerSettings.setApiKey(name, null);
    return res.status(200).json(createResponse(`Clé ${label} supprimée`, providerSettings.getPublicConfig(name)));
}

/**
 * Liste les modèles proposés par un provider (suggestions du champ « Modèle »)
 */
async function handleGetProviderModels(name, req, res) {
    const label = providerSettings.getLabel(name);
    if (!providerSettings.isConfigured(name)) {
        return sendClientError(req, res, 400, `Aucune clé ${label} configurée`);
    }
    try {
        const { url, headers } = providerSettings.getModelsRequest(name);
        const response = await fetchUtils.fetchWithTimeout(url, { method: 'GET', headers }, 15000);
        if (!response.ok) {
            return sendClientError(req, res, 502, `${label} a répondu ${response.status}`, 'BAD_GATEWAY');
        }
        const models = providerSettings.parseModels(name, await response.json());
        return res.status(200).json(createResponse(`Modèles ${label}`, { models }));
    } catch (error) {
        logger.warn(`Liste des modèles ${label} indisponible`, { requestId: getRequestId(req), error: error.message });
        return sendClientError(req, res, 502, `Liste des modèles ${label} indisponible`, 'BAD_GATEWAY');
    }
}

// ==================== HANDLERS PAGE DE COURS ====================

const COURSE_PAGE_PROVIDER_LABELS = {
    LocalLLM: 'LM Studio',
    OpenAI: 'OpenAI',
    Gemini: 'Google Gemini',
    OpenRouter: 'OpenRouter'
};

function getCoursePageProviderPayload() {
    return {
        provider: coursePageConfig.getProvider(),
        options: coursePageConfig.VISION_PROVIDERS.map(name => {
            const instance = aiProviders.getProviderByName(name);
            return {
                name,
                label: COURSE_PAGE_PROVIDER_LABELS[name] || name,
                configured: !!instance?.isAvailable(),
                model: instance?.model || ''
            };
        })
    };
}

/**
 * Retourne le provider choisi pour les pages de cours et les providers vision possibles
 */
async function handleGetCoursePageProvider(req, res) {
    return res.status(200).json(createResponse('Provider des pages de cours', getCoursePageProviderPayload()));
}

/**
 * Enregistre le provider des pages de cours
 * Body: { provider: string|null } (null = automatique)
 */
async function handleSetCoursePageProvider(req, res) {
    const body = getJsonBody(req);
    if (!('provider' in body)) {
        return sendClientError(req, res, 400, 'provider requis (null = automatique)');
    }
    const provider = body.provider || null;
    if (provider !== null && !coursePageConfig.VISION_PROVIDERS.includes(provider)) {
        return sendClientError(req, res, 400, `Provider invalide (valeurs possibles : ${coursePageConfig.VISION_PROVIDERS.join(', ')})`);
    }
    await coursePageConfig.setProvider(provider);
    return res.status(200).json(createResponse('Provider des pages de cours enregistré', getCoursePageProviderPayload()));
}

// ==================== HANDLER PROVIDERS STATUS ====================

/**
 * Retourne le statut de tous les providers IA (clé configurée + joignable)
 */
async function handleGetProviders(req, res) {
    // LM Studio puis les providers à clé API, dans l'ordre de priorité
    const providerDefs = [
        {
            name: 'LocalLLM',
            label: 'LM Studio',
            keyConfigured: !!isLocalLLMAvailable(),
            model: localLLMConfig.getActiveModel(),
            check: () => fetchLocalLLMModels(15000)
        },
        ...providerSettings.NAMES.map(name => ({
            name,
            label: providerSettings.getLabel(name),
            keyConfigured: providerSettings.isConfigured(name),
            model: providerSettings.getModel(name),
            check: () => {
                const { url, headers } = providerSettings.getCheckRequest(name);
                return fetchUtils.fetchWithTimeout(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json', ...headers }
                }, 10000);
            }
        }))
    ];

    // Vérifier la connectivité en parallèle pour chaque provider configuré
    const providers = await Promise.all(providerDefs.map(async (def) => {
        let reachable = false;
        if (def.keyConfigured) {
            try {
                const response = await def.check();
                reachable = !!(response && response.ok);
            } catch (_e) {
                reachable = false;
            }
        }
        return {
            name: def.name,
            label: def.label,
            keyConfigured: def.keyConfigured,
            reachable,
            model: def.model
        };
    }));

    return res.status(200).json(createResponse('Providers IA', { providers }));
}

module.exports = handleAI;
module.exports.router = router;
module.exports.collectDocuments = collectDocuments;
