/**
 * Provider Groq (API compatible OpenAI) pour l'analyse de texte et la génération de quiz
 * Utilise Llama 3.3 70B par défaut
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const { isValidGroqKey } = require('../../utils/validation.js');
const { GROQ_BASE_URL } = require('../../utils/constants.js');
const providerSettings = require('./providerSettings.js');

class GroqProvider extends OpenAICompatibleProvider {
    constructor() {
        super('Groq', {
            baseUrl: GROQ_BASE_URL,
            apiKey: providerSettings.getApiKey('Groq'),
            model: providerSettings.getModel('Groq'),
            isValidKey: isValidGroqKey
        });
    }
}

module.exports = GroqProvider;
