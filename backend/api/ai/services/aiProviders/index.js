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
const { getDemoAnalysis, getDemoQuiz } = require('../../utils/validation.js');

/**
 * Crée et retourne tous les providers disponibles dans l'ordre de priorité
 * Ordre: LocalLLM → OpenAI → Gemini → DeepSeek → Groq → Mistral
 * @returns {Array} Liste des providers disponibles
 */
function getAvailableProviders() {
    const providers = [];

    // 1. LLM Local (si disponible, priorité maximale pour économiser les coûts)
    const localLLM = new LocalLLMProvider();
    if (localLLM.isAvailable()) {
        providers.push(localLLM);
    }

    // 2. OpenAI (haute qualité, bon fallback)
    const openai = new OpenAIProvider();
    if (openai.isAvailable()) {
        providers.push(openai);
    }

    // 3. Gemini (bonne alternative à OpenAI)
    const gemini = new GeminiProvider();
    if (gemini.isAvailable()) {
        providers.push(gemini);
    }

    // 4. DeepSeek (bon rapport qualité/prix)
    const deepseek = new DeepSeekProvider();
    if (deepseek.isAvailable()) {
        providers.push(deepseek);
    }

    // 5. Groq (très rapide avec Llama 3.3)
    const groq = new GroqProvider();
    if (groq.isAvailable()) {
        providers.push(groq);
    }

    // 6. Mistral (dernier fallback avant le mode démo)
    const mistral = new MistralProvider();
    if (mistral.isAvailable()) {
        providers.push(mistral);
    }

    return providers;
}

/**
 * Analyse un texte avec fallback automatique entre providers
 * @param {string} extractedText - Texte à analyser
 * @returns {Promise<Object>} Analyse du texte
 */
async function analyzeWithAI(extractedText) {
    const providers = getAvailableProviders();

    if (providers.length === 0) {
        console.warn('⚠️ Aucun provider IA disponible, utilisation du mode démo');
        return getDemoAnalysis();
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

    // Si tous les providers ont échoué, utiliser le mode démo
    console.warn('⚠️ Tous les providers IA ont échoué, utilisation du mode démo');
    return getDemoAnalysis();
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
        console.warn('⚠️ Aucun provider IA disponible, utilisation du mode démo');
        return getDemoQuiz(childProfile);
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

    // Si tous les providers ont échoué, utiliser le mode démo
    console.warn('⚠️ Tous les providers IA ont échoué, utilisation du mode démo');
    return getDemoQuiz(childProfile);
}

module.exports = {
    getAvailableProviders,
    analyzeWithAI,
    generateQuizWithAI
};
