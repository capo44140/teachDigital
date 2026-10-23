/**
 * Service OCR utilisant les LLM avec vision
 * Extrait le texte directement depuis les images en utilisant les APIs de vision
 */

const providerSettings = require('./aiProviders/providerSettings.js');
const { fetchWithTimeout, handleOpenAIResponse } = require('../utils/fetch.js');
const { callGeminiGenerateContent } = require('../utils/gemini.js');
const { OPENAI_BASE_URL, API_TIMEOUT_MS } = require('../utils/constants.js');
const { isAbortError, callTimeout, isDeadlineReached, createAiTimeoutError } = require('../utils/requestContext.js');
const logger = require('../../../lib/logger.js');

const OCR_PROMPT = 'Extrais TOUT le texte visible dans cette image. Retourne UNIQUEMENT le texte brut, sans commentaires, sans formatage, sans explications. Si l\'image contient du texte, retourne-le tel quel. Si l\'image ne contient pas de texte, retourne "Aucun texte détecté dans l\'image."';

function stripDataUrl(base64Image) {
    const value = String(base64Image || '');
    const commaIndex = value.indexOf(',');
    return commaIndex !== -1 ? value.slice(commaIndex + 1) : value;
}

/**
 * Extrait le texte d'une image en utilisant un LLM avec vision
 *
 * @param {string} base64Image - Image en base64 (avec ou sans préfixe data:image)
 * @param {Object} [ctx] - Contexte de la requête (signal d'annulation, délai)
 * @returns {Promise<string>} Texte extrait de l'image par le LLM
 */
async function extractTextFromImageWithLLM(base64Image, ctx) {
    const extractedText = await extractTextWithVisionAPI(stripDataUrl(base64Image), OCR_PROMPT, ctx);

    if (!extractedText || extractedText.trim().length === 0) {
        logger.debug('Aucun texte extrait par le LLM');
        return 'Aucun texte détecté dans l\'image.';
    }

    // Le texte (devoirs d'enfants) n'est jamais journalisé, seulement sa longueur
    logger.debug('Texte extrait par LLM vision', { textLength: extractedText.trim().length });
    return extractedText.trim();
}

/**
 * Extrait le texte d'une image en utilisant les APIs de vision des LLM
 * Priorité: LocalLLM → OpenAI → Gemini. S'arrête dès que la requête est annulée.
 *
 * @param {string} base64Image - Image en base64
 * @param {string} prompt - Prompt pour l'extraction
 * @param {Object} [ctx] - Contexte de la requête
 * @returns {Promise<string>} Texte extrait
 */
async function extractTextWithVisionAPI(base64Image, prompt, ctx) {
    // require local : aiProviders/index.js charge tous les providers
    const { getAvailableProviders } = require('./aiProviders/index.js');
    const attempts = [];

    const localLLMProvider = getAvailableProviders().find(p => p.getName() === 'LocalLLM');
    if (localLLMProvider && typeof localLLMProvider.extractTextWithVision === 'function') {
        attempts.push(['LocalLLM', () => localLLMProvider.extractTextWithVision(base64Image, prompt, ctx)]);
    }
    if (providerSettings.isConfigured('OpenAI')) {
        attempts.push(['OpenAI', () => extractTextWithOpenAIVision(base64Image, prompt, ctx)]);
    }
    if (providerSettings.isConfigured('Gemini')) {
        attempts.push(['Gemini', () => extractTextWithGeminiVision(base64Image, prompt, ctx)]);
    }

    for (const [name, attempt] of attempts) {
        // Lève une erreur d'annulation si la requête est annulée ou presque à court de temps
        callTimeout(ctx, Infinity);
        try {
            const result = await attempt();
            logger.debug(`Extraction OCR réussie avec ${name} Vision`);
            return result;
        } catch (error) {
            if (isAbortError(error)) throw error;
            if (isDeadlineReached(ctx)) throw createAiTimeoutError();
            logger.warn(`${name} Vision a échoué, provider suivant`, { error: error.message });
        }
    }

    const error = new Error('Tous les services IA ont échoué : aucun provider de vision disponible (LocalLLM, OpenAI ou Gemini requis)');
    error.code = 'AI_UNAVAILABLE';
    throw error;
}

/**
 * Extrait le texte avec OpenAI Vision (modèle configuré, gpt-4o par défaut : il doit savoir lire les images)
 */
async function extractTextWithOpenAIVision(base64Image, prompt, ctx) {
    const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${providerSettings.getApiKey('OpenAI')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: providerSettings.getModel('OpenAI'),
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 4000
        }),
        signal: ctx && ctx.signal
    }, callTimeout(ctx, API_TIMEOUT_MS));

    await handleOpenAIResponse(response, 'OpenAI Vision (OCR)');

    const data = await response.json();
    return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

/**
 * Extrait le texte avec Gemini Vision (clé dans l'en-tête x-goog-api-key)
 */
async function extractTextWithGeminiVision(base64Image, prompt, ctx) {
    return callGeminiGenerateContent({
        apiKey: providerSettings.getApiKey('Gemini'),
        model: providerSettings.getModel('Gemini'),
        parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.1 },
        ctx,
        label: 'Gemini Vision'
    });
}

module.exports = {
    extractTextFromImageWithLLM,
    extractTextWithVisionAPI
};
