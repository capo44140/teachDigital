/**
 * Fonctions de validation des clés API
 */

const { LOCAL_LLM_BASE_URL } = require('./constants.js');

/**
 * Vérifie si une clé API OpenAI est valide
 * @param {string} apiKey - Clé API à valider
 * @returns {boolean} True si la clé est valide
 */
function isValidOpenAIKey(apiKey) {
    return apiKey &&
        apiKey !== 'sk-your-openai-api-key-here' &&
        apiKey.startsWith('sk-') &&
        apiKey.length > 20;
}

/**
 * Vérifie si une clé API Gemini est valide
 * @param {string} apiKey - Clé API à valider
 * @returns {boolean} True si la clé est valide
 */
function isValidGeminiKey(apiKey) {
    return apiKey &&
        apiKey !== 'your-gemini-api-key-here' &&
        apiKey.length > 20;
}

/**
 * Vérifie si une clé API Groq est valide
 * @param {string} apiKey - Clé API à valider
 * @returns {boolean} True si la clé est valide
 */
function isValidGroqKey(apiKey) {
    return apiKey &&
        apiKey !== 'your-groq-api-key-here' &&
        apiKey.length > 20;
}

/**
 * Vérifie si une clé API DeepSeek est valide
 * @param {string} apiKey - Clé API à valider
 * @returns {boolean} True si la clé est valide
 */
function isValidDeepSeekKey(apiKey) {
    return apiKey &&
        apiKey !== 'your-deepseek-api-key-here' &&
        apiKey.startsWith('sk-') &&
        apiKey.length > 20;
}

/**
 * Vérifie si une clé API Mistral est valide
 * @param {string} apiKey - Clé API à valider
 * @returns {boolean} True si la clé est valide
 */
function isValidMistralKey(apiKey) {
    return apiKey &&
        apiKey !== 'your-mistral-api-key-here' &&
        apiKey.startsWith('mistral-') &&
        apiKey.length > 20;
}

/**
 * Vérifie si une clé API Kimi (Moonshot) est valide
 * @param {string} apiKey - Clé API à valider
 * @returns {boolean} True si la clé est valide
 */
function isValidKimiKey(apiKey) {
    return apiKey &&
        apiKey !== 'your-kimi-api-key-here' &&
        apiKey.startsWith('sk-') &&
        apiKey.length > 20;
}

/**
 * Vérifie si le LLM local est disponible
 * @returns {boolean} True si le LLM local est disponible
 */
function isLocalLLMAvailable() {
    const localLLMUrl = process.env.LOCAL_LLM_URL || LOCAL_LLM_BASE_URL;
    const localLLMEnabled = process.env.LOCAL_LLM_ENABLED !== 'false'; // Activé par défaut si URL configurée
    return localLLMEnabled && localLLMUrl && localLLMUrl !== '';
}

/**
 * Fonction helper pour valider une clé API
 * @param {string} apiType - Type d'API (openai, gemini, deepseek, groq, mistral)
 * @returns {Promise<boolean>} True si la clé est valide
 */
async function validateApiKey(apiType) {
    console.log(`🔑 validateApiKey: ${apiType}`);
    let apiKey;

    switch (apiType) {
        case 'openai':
            apiKey = process.env.OPENAI_API_KEY;
            return isValidOpenAIKey(apiKey);
        case 'gemini':
            apiKey = process.env.GEMINI_API_KEY;
            return isValidGeminiKey(apiKey);
        case 'deepseek':
            apiKey = process.env.DEEPSEEK_API_KEY;
            return isValidDeepSeekKey(apiKey);
        case 'groq':
            apiKey = process.env.GROQ_API_KEY;
            return isValidGroqKey(apiKey);
        case 'mistral':
            apiKey = process.env.MISTRAL_API_KEY;
            return isValidMistralKey(apiKey);
        case 'kimi':
            apiKey = process.env.KIMI_API_KEY;
            return isValidKimiKey(apiKey);
        default:
            return false;
    }
}

/**
 * Fonction helper pour vérifier si au moins une clé API est valide
 * @returns {Promise<boolean>} True si au moins une clé est valide
 */
async function hasAtLeastOneValidKey() {
    console.log('🔑 hasAtLeastOneValidKey: Début');
    const openaiValid = await validateApiKey('openai');
    const geminiValid = await validateApiKey('gemini');
    const deepseekValid = await validateApiKey('deepseek');
    const groqValid = await validateApiKey('groq');
    const mistralValid = await validateApiKey('mistral');
    const kimiValid = await validateApiKey('kimi');

    return openaiValid || geminiValid || deepseekValid || groqValid || mistralValid || kimiValid;
}

/**
 * Analyse démo pour les tests (fallback)
 * @returns {Object} Analyse démo
 */
function getDemoAnalysis() {
    return {
        subject: 'Mathématiques',
        topic: 'Les fractions',
        concepts: ['numérateur', 'dénominateur', 'fraction équivalente', 'comparaison'],
        level: 'CM1',
        keyPoints: [
            'Une fraction représente une partie d\'un tout',
            'Le numérateur indique combien de parts on prend',
            'Le dénominateur indique en combien de parts on divise le tout'
        ]
    };
}

/**
 * Quiz démo pour les tests (fallback)
 * @param {Object} childProfile - Profil de l'enfant
 * @returns {Object} Quiz démo
 */
function getDemoQuiz(childProfile) {
    return {
        title: 'Quiz sur les fractions',
        description: 'Testez vos connaissances sur les fractions',
        subject: 'Mathématiques',
        level: childProfile.age < 10 ? 'Facile' : 'Intermédiaire',
        questions: [
            {
                question: 'Dans la fraction 3/4, que représente le chiffre 3 ?',
                options: [
                    'Le dénominateur',
                    'Le numérateur',
                    'Le diviseur',
                    'Le quotient'
                ],
                correctAnswer: 1,
                explanation: 'Le chiffre 3 est le numérateur, il indique combien de parts on prend.'
            },
            {
                question: 'Quelle fraction est équivalente à 1/2 ?',
                options: [
                    '2/3',
                    '3/6',
                    '1/4',
                    '2/5'
                ],
                correctAnswer: 1,
                explanation: '3/6 = 1/2 car 3÷3 = 1 et 6÷3 = 2.'
            },
            {
                question: 'Si on partage une pizza en 8 parts égales et qu\'on en mange 3, quelle fraction de la pizza a-t-on mangée ?',
                options: [
                    '8/3',
                    '3/8',
                    '3/5',
                    '5/8'
                ],
                correctAnswer: 1,
                explanation: 'On a mangé 3 parts sur 8, donc 3/8 de la pizza.'
            },
            {
                question: 'Quelle est la fraction la plus grande entre 1/3 et 1/4 ?',
                options: [
                    '1/3',
                    '1/4',
                    'Elles sont égales',
                    'On ne peut pas comparer'
                ],
                correctAnswer: 0,
                explanation: '1/3 est plus grand que 1/4 car on prend une part plus grande du tout.'
            },
            {
                question: 'Comment écrit-on "un demi" en fraction ?',
                options: [
                    '1/1',
                    '1/2',
                    '2/1',
                    '1/4'
                ],
                correctAnswer: 1,
                explanation: 'Un demi signifie qu\'on prend 1 part sur 2, donc 1/2.'
            }
        ]
    };
}

module.exports = {
    isValidOpenAIKey,
    isValidGeminiKey,
    isValidGroqKey,
    isValidDeepSeekKey,
    isValidMistralKey,
    isValidKimiKey,
    isLocalLLMAvailable,
    validateApiKey,
    hasAtLeastOneValidKey,
    getDemoAnalysis,
    getDemoQuiz
};
