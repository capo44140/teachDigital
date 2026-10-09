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

/**
 * Crée et retourne tous les providers disponibles dans l'ordre de priorité
 * Ordre: LocalLLM → OpenAI → Gemini → DeepSeek → Groq → Mistral
 * @returns {Array} Liste des providers disponibles
 */
function getAvailableProviders() {
    const providers = [];

    // Configuration optionnelle:
    // - AI_PROVIDER=Localúscm (ex: "LocalLLM") => force un seul provider
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

    // 6. Mistral (dernier fallback avant le mode démo)
    maybeAdd(new MistralProvider());

    // 7. Kimi / Moonshot (API compatible OpenAI)
    maybeAdd(new KimiProvider());

    // Si un ordre est fourni, re-trier selon cet ordre
    if (orderList.length > 0) {
        providers.sort((a, b) => orderList.indexOf(normalizeName(a.getName())) - orderList.indexOf(normalizeName(b.getName())));
    }

    return providers;
}

// Le message contient « Tous les services IA ont échoué » : reconnu par les routes (api/ai/index.js) → 503
function createAllProvidersFailedError(reason) {
    console.warn(`⚠️ ${reason}`);
    const error = new Error(`Tous les services IA ont échoué : ${reason}`);
    error.code = 'AI_UNAVAILABLE';
    return error;
}

/**
 * Analyse un texte avec fallback automatique entre providers
 * @param {string} extractedText - Texte à analyser
 * @returns {Promise<Object>} Analyse du texte
 */
async function analyzeWithAI(extractedText) {
    const providers = getAvailableProviders();

    if (providers.length === 0) {
        throw createAllProvidersFailedError('Aucun provider IA configuré');
    }

    for (const provider of providers) {
        try {
            console.log(`🔄 Tentative d'analyse avec ${provider.getName()}...`);
            const result = await provider.analyzeText(extractedText);
            console.log(`✅ Analyse réussie avec ${provider.getName()}`);
            return result;
        } catch (error) {
            console.warn(`⚠️ Erreur ${provider.getName()}, tentative avec le provider suivant:`, error.message);
            // Continue avec le provider suivant
        }
    }

    // Ne pas renvoyer un faux contenu « démo » comme s'il venait de l'IA : la route répond 503
    throw createAllProvidersFailedError('Tous les providers IA ont échoué (analyse)');
}

/**
 * Génère un quiz avec fallback automatique entre providers
 * @param {Object} analysis - Analyse du contenu
 * @param {Object} childProfile - Profil de l'enfant
 * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizWithAI(analysis, childProfile, questionCount = 5) {
    const providers = getAvailableProviders();

    if (providers.length === 0) {
        throw createAllProvidersFailedError('Aucun provider IA configuré');
    }

    console.log(`🎯 Génération de quiz avec ${questionCount} questions demandées`);

    for (const provider of providers) {
        try {
            console.log(`🔄 Tentative de génération de quiz avec ${provider.getName()}...`);
            const result = await provider.generateQuiz(analysis, childProfile, questionCount);
            console.log(`✅ Quiz généré avec succès avec ${provider.getName()}`);
            return result;
        } catch (error) {
            console.warn(`⚠️ Erreur ${provider.getName()}, tentative avec le provider suivant:`, error.message);
            // Continue avec le provider suivant
        }
    }

    // Ne pas renvoyer un faux quiz « démo » comme s'il venait de l'IA : la route répond 503
    throw createAllProvidersFailedError('Tous les providers IA ont échoué (quiz)');
}

module.exports = {
    getAvailableProviders,
    analyzeWithAI,
    generateQuizWithAI
};
