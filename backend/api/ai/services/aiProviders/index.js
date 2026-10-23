/**
 * Factory pour les providers IA
 * Gère l'instanciation et la logique de fallback entre providers
 */

const LocalLLMProvider = require('./localLLM.js');
const OpenAIProvider = require('./openai.js');
const GeminiProvider = require('./gemini.js');
const DeepSeekProvider = require('./deepseek.js');
const GroqProvider = require('./groq.js');
const MistralProvider = require('./mistral.js');
const KimiProvider = require('./kimi.js');
const OpenRouterProvider = require('./openrouter.js');
const { isAbortError, throwIfAborted, callTimeout, toAbortError, isDeadlineReached, createAiTimeoutError } = require('../../utils/requestContext.js');
const logger = require('../../../../lib/logger.js');

/**
 * Crée et retourne tous les providers disponibles dans l'ordre de priorité
 * Ordre: LocalLLM → OpenAI → Gemini → DeepSeek → Groq → Mistral → Kimi → OpenRouter
 * @returns {Array} Liste des providers disponibles
 */
function getAvailableProviders() {
    const providers = [];

    // Configuration optionnelle:
    // - AI_PROVIDER=LocalLLM => force un seul provider
    // - AI_PROVIDERS_ORDER="LocalLLM,OpenAI,..." => définit l'ordre + filtre
    // - AI_DISABLE_PROVIDERS="DeepSeek,OpenAI" => exclut certains providers
    const normalizeName = (s) => String(s || '').trim().toLowerCase();
    const forcedProvider = normalizeName(process.env.AI_PROVIDER);
    const orderList = String(process.env.AI_PROVIDERS_ORDER || '').split(',').map(normalizeName).filter(Boolean);
    const disabledSet = new Set(String(process.env.AI_DISABLE_PROVIDERS || '').split(',').map(normalizeName).filter(Boolean));

    // Helper d'ajout conditionnel
    const maybeAdd = (provider) => {
        const name = normalizeName(provider.getName());
        if (disabledSet.has(name)) return;
        if (forcedProvider && forcedProvider !== name) return;
        if (orderList.length > 0 && !orderList.includes(name)) return;
        if (provider.isAvailable()) providers.push(provider);
    };

    // 1. LLM Local (si disponible, priorité maximale pour économiser les coûts)
    maybeAdd(new LocalLLMProvider());
    // 2. OpenAI (haute qualité, bon fallback)
    maybeAdd(new OpenAIProvider());
    // 3. Gemini (bonne alternative à OpenAI)
    maybeAdd(new GeminiProvider());
    // 4. DeepSeek (bon rapport qualité/prix)
    maybeAdd(new DeepSeekProvider());
    // 5. Groq (très rapide avec Llama 3.3)
    maybeAdd(new GroqProvider());
    // 6. Mistral
    maybeAdd(new MistralProvider());
    // 7. Kimi / Moonshot (API compatible OpenAI)
    maybeAdd(new KimiProvider());
    // 8. OpenRouter (clé et modèle configurables depuis l'interface)
    maybeAdd(new OpenRouterProvider());

    // Si un ordre est fourni, re-trier selon cet ordre
    if (orderList.length > 0) {
        providers.sort((a, b) => orderList.indexOf(normalizeName(a.getName())) - orderList.indexOf(normalizeName(b.getName())));
    }

    return providers;
}

const PROVIDER_CLASSES = {
    LocalLLM: LocalLLMProvider,
    OpenAI: OpenAIProvider,
    Gemini: GeminiProvider,
    DeepSeek: DeepSeekProvider,
    Groq: GroqProvider,
    Mistral: MistralProvider,
    Kimi: KimiProvider,
    OpenRouter: OpenRouterProvider
};

/**
 * Instancie un provider par son nom, sans les filtres AI_PROVIDER / AI_PROVIDERS_ORDER / AI_DISABLE_PROVIDERS
 * (utilisé quand le provider est choisi explicitement depuis l'interface)
 * @param {string} name - Nom du provider (ex: "OpenRouter")
 * @returns {Object|null} Provider, ou null si le nom est inconnu
 */
function getProviderByName(name) {
    const ProviderClass = PROVIDER_CLASSES[name];
    return ProviderClass ? new ProviderClass() : null;
}

// Le message contient « Tous les services IA ont échoué » ; code AI_UNAVAILABLE → 503 côté routes
function createAllProvidersFailedError(reason) {
    logger.warn(reason);
    const error = new Error(`Tous les services IA ont échoué : ${reason}`);
    error.code = 'AI_UNAVAILABLE';
    return error;
}

/**
 * Essaie chaque provider disponible jusqu'au premier succès.
 * S'arrête immédiatement si la requête est annulée (délai global dépassé, client parti) :
 * le provider suivant n'est pas tenté, et aucun provider n'est lancé avec trop peu de temps restant.
 * @param {string} operation - Libellé pour les logs (analyse, quiz)
 * @param {Object} [ctx] - Contexte de la requête
 * @param {Function} call - (provider) => Promise
 */
async function runWithFallback(operation, ctx, call) {
    const providers = getAvailableProviders();

    if (providers.length === 0) {
        throw createAllProvidersFailedError('Aucun provider IA configuré');
    }

    for (const provider of providers) {
        // Lève une erreur d'annulation si la requête est annulée ou s'il ne reste presque plus de temps
        callTimeout(ctx, Infinity);
        try {
            logger.debug(`Tentative ${operation} avec ${provider.getName()}`);
            const result = await call(provider);
            logger.info(`${operation} réussie avec ${provider.getName()}`);
            return result;
        } catch (error) {
            if (isAbortError(error)) throw error;
            if (ctx && ctx.signal && ctx.signal.aborted) throw toAbortError(ctx.signal.reason);
            // Échec dû au délai global (timeout de l'appel = temps restant) : « délai dépassé »
            if (isDeadlineReached(ctx)) throw createAiTimeoutError();
            logger.warn(`Échec ${operation} avec ${provider.getName()}, provider suivant`, { error: error.message });
        }
    }

    // Ne pas renvoyer un faux contenu « démo » comme s'il venait de l'IA : la route répond 503
    throw createAllProvidersFailedError(`Tous les providers IA ont échoué (${operation})`);
}

/**
 * Analyse un texte avec fallback automatique entre providers
 * @param {string} extractedText - Texte à analyser
 * @param {Object} [ctx] - Contexte de la requête (signal, délai)
 * @returns {Promise<Object>} Analyse du texte
 */
async function analyzeWithAI(extractedText, ctx) {
    throwIfAborted(ctx);
    return runWithFallback('analyse', ctx, provider => provider.analyzeText(extractedText, ctx));
}

/**
 * Génère un quiz avec fallback automatique entre providers
 * @param {Object} analysis - Analyse du contenu
 * @param {Object} childProfile - Profil de l'enfant
 * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
 * @param {Object} [ctx] - Contexte de la requête (signal, délai)
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizWithAI(analysis, childProfile, questionCount = 5, ctx) {
    throwIfAborted(ctx);
    logger.debug('Génération de quiz', { questionCount });
    return runWithFallback('génération de quiz', ctx, provider => provider.generateQuiz(analysis, childProfile, questionCount, ctx));
}

module.exports = {
    getAvailableProviders,
    getProviderByName,
    analyzeWithAI,
    generateQuizWithAI
};
