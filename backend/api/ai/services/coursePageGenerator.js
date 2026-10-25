/**
 * Génère une page HTML d'entraînement à partir des photos d'une leçon / d'un contrôle
 * Provider choisi dans l'interface (coursePageConfig) : seul ce provider est utilisé.
 * Sinon (automatique) : ordre de la configuration IA, en ne gardant que les providers
 * capables de lire des images (LocalLLM, OpenAI, Gemini, OpenRouter).
 * Dans les deux cas, le provider doit être autorisé pour les données des enfants.
 * Le prénom de l'enfant n'est pas envoyé : le modèle écrit un marqueur, remplacé ici.
 */

const { getAvailableProviders, getProviderByName, isAllowedForChildData, createNoProviderError } = require('./aiProviders/index.js');
const coursePageConfig = require('./coursePageConfig.js');
const { recordAiCall, usageFromOpenAI } = require('./aiUsage.js');
const { fetchWithTimeout, handleOpenAIResponse } = require('../utils/fetch.js');
const { callGeminiGenerateContent } = require('../utils/gemini.js');
const { AiHttpError } = require('../utils/httpErrors.js');
const { OPENAI_BASE_URL, OPENROUTER_BASE_URL, OPENROUTER_PROVIDER_PREFERENCES } = require('../utils/constants.js');
const { isAbortError, throwIfAborted, toAbortError, createAiTimeoutError } = require('../utils/requestContext.js');
const { buildCoursePagePrompt, parseCoursePageResponse, fillChildName } = require('../prompts/coursePageHtml.js');
const logger = require('../../../lib/logger.js');

const { VISION_PROVIDERS } = coursePageConfig;

// Une page complète (leçon + banque de 40 questions) demande beaucoup plus de jetons qu'un quiz
const COURSE_PAGE_MAX_TOKENS = parseInt(process.env.COURSE_PAGE_MAX_TOKENS || '16000', 10) || 16000;
// Budget total de génération, sous le proxy_read_timeout de nginx (600s)
const COURSE_PAGE_TIMEOUT_MS = parseInt(process.env.COURSE_PAGE_TIMEOUT_MS || '540000', 10) || 540000;
// Temps minimum pour lancer la génération avec un provider
const MIN_PROVIDER_BUDGET_MS = 30000;

const toDataUrl = image => `data:${image.mimeType || 'image/jpeg'};base64,${image.base64}`;

// API compatible OpenAI (OpenAI, OpenRouter, LM Studio, Ollama)
async function callChatCompletions({ provider, baseUrl, apiKey, model, prompt, images, timeoutMs, label, extraHeaders = {}, extraBody = {}, signal, fetchOptions = {} }) {
    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            ...extraHeaders
        },
        body: JSON.stringify({
            ...extraBody,
            model,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    ...images.map(image => ({ type: 'image_url', image_url: { url: toDataUrl(image) } }))
                ]
            }],
            max_tokens: COURSE_PAGE_MAX_TOKENS,
            temperature: 0.4
        }),
        signal,
        ...fetchOptions
    }, timeoutMs);

    await handleOpenAIResponse(response, label);
    const data = await response.json();
    await recordAiCall(provider, usageFromOpenAI(data.usage));
    return data.choices?.[0]?.message?.content || '';
}

// Gemini : clé API dans l'en-tête x-goog-api-key (jamais dans l'URL)
function callGemini({ apiKey, model, prompt, images, timeoutMs, signal }) {
    return callGeminiGenerateContent({
        apiKey,
        model,
        parts: [
            { text: prompt },
            ...images.map(image => ({ inline_data: { mime_type: image.mimeType || 'image/jpeg', data: image.base64 } }))
        ],
        // Marge pour le raisonnement interne des modèles Gemini récents
        generationConfig: { maxOutputTokens: COURSE_PAGE_MAX_TOKENS * 2, temperature: 0.4 },
        ctx: signal ? { signal } : undefined,
        timeoutMs
    });
}

function callProvider(provider, request) {
    const name = provider.getName();
    if (name === 'LocalLLM') {
        // URL saisie depuis l'interface : pas de redirection suivie (SSRF)
        return callChatCompletions({ ...request, provider: name, baseUrl: provider.baseUrl, model: provider.model, label: 'LocalLLM (page de cours)', fetchOptions: { redirect: 'error' } });
    }
    if (name === 'OpenAI') {
        return callChatCompletions({ ...request, provider: name, baseUrl: OPENAI_BASE_URL, apiKey: provider.apiKey, model: provider.model, label: 'OpenAI (page de cours)' });
    }
    if (name === 'OpenRouter') {
        return callChatCompletions({
            ...request,
            provider: name,
            baseUrl: OPENROUTER_BASE_URL,
            apiKey: provider.apiKey,
            model: provider.model,
            label: 'OpenRouter (page de cours)',
            extraHeaders: { 'X-Title': 'TeachDigital' },
            extraBody: { provider: OPENROUTER_PROVIDER_PREFERENCES }
        });
    }
    return callGemini({ ...request, apiKey: provider.apiKey, model: provider.model });
}

function getCoursePageProviders() {
    const selected = coursePageConfig.getProvider();
    if (selected) {
        const provider = getProviderByName(selected);
        if (!provider || !provider.isAvailable()) {
            const error = new Error(`Tous les services IA ont échoué : le provider choisi pour les pages de cours (${selected}) n'est pas configuré`);
            error.code = 'AI_UNAVAILABLE';
            throw error;
        }
        if (!isAllowedForChildData(selected)) {
            throw new AiHttpError(
                409,
                `Le service choisi pour les pages de cours (${selected}) n'est pas autorisé à recevoir les devoirs des enfants. Autorisez-le dans Configuration IA ou choisissez un autre service.`,
                'AI_CHILD_DATA_NOT_ALLOWED'
            );
        }
        return [provider];
    }

    const providers = getAvailableProviders().filter(provider => VISION_PROVIDERS.includes(provider.getName()));
    if (providers.length === 0) {
        throw createNoProviderError(
            'aucun service IA capable de lire des photos n\'est configuré (LM Studio, OpenAI, Gemini ou OpenRouter)',
            VISION_PROVIDERS
        );
    }
    return providers;
}

/**
 * @param {Object} options
 * @param {Array<{base64: string, mimeType: string}>} options.images - Photos de la leçon
 * @param {Object} options.childProfile - Profil de l'enfant
 * @param {string} [options.subject]
 * @param {string} [options.topic]
 * @param {string} [options.instructions]
 * @param {Object} [ctx] - Contexte de la requête : signal d'annulation et délai global
 *   (défaut : COURSE_PAGE_TIMEOUT_MS à partir de maintenant)
 * @returns {Promise<{html: string, summary: string, provider: string, model: string}>}
 */
async function generateCoursePageFromImages({ images, childProfile, subject, topic, instructions }, ctx) {
    const providers = getCoursePageProviders();

    const prompt = buildCoursePagePrompt({ childProfile, subject, topic, instructions, photoCount: images.length });
    const deadline = ctx && Number.isFinite(ctx.deadline) ? ctx.deadline : Date.now() + COURSE_PAGE_TIMEOUT_MS;
    const signal = ctx && ctx.signal;
    const failures = [];

    for (const provider of providers) {
        throwIfAborted(ctx);
        const timeoutMs = deadline - Date.now();
        if (timeoutMs < MIN_PROVIDER_BUDGET_MS) {
            // Plus assez de temps pour un nouvel essai : délai dépassé
            if (failures.length > 0) logger.warn('Génération de page de cours : délai dépassé', { failures: failures.length });
            throw createAiTimeoutError();
        }
        const name = provider.getName();
        try {
            logger.info(`Génération de page de cours avec ${name}`, { model: provider.model, photos: images.length });
            const raw = await callProvider(provider, { prompt, images, timeoutMs, signal });
            const { html, summary, complete } = parseCoursePageResponse(raw);
            if (!complete) {
                // Réponse coupée (limite de jetons) : la page ne fonctionnerait pas
                throw new Error('page HTML incomplète (réponse tronquée)');
            }
            logger.info(`Page de cours générée avec ${name}`, { htmlLength: html.length });
            return {
                html: fillChildName(html, childProfile && childProfile.name),
                summary: fillChildName(summary, childProfile && childProfile.name),
                provider: name,
                model: provider.model
            };
        } catch (error) {
            if (isAbortError(error)) throw error;
            if (signal && signal.aborted) throw toAbortError(signal.reason);
            logger.warn(`Génération de page avec ${name} échouée`, { error: error.message });
            failures.push(`${name} : ${error.message}`);
        }
    }

    // Les détails (failures) restent dans le message pour les logs, jamais renvoyés au client
    const error = new Error(`Tous les services IA ont échoué : ${failures.join(' ; ') || 'délai dépassé'}`);
    error.code = 'AI_UNAVAILABLE';
    throw error;
}

module.exports = {
    COURSE_PAGE_TIMEOUT_MS,
    generateCoursePageFromImages
};
