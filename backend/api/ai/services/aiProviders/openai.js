/**
 * Provider OpenAI pour l'analyse de texte et la génération de quiz
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const { isValidOpenAIKey } = require('../../utils/validation.js');
const { OPENAI_BASE_URL } = require('../../utils/constants.js');
const providerSettings = require('./providerSettings.js');

class OpenAIProvider extends OpenAICompatibleProvider {
    constructor() {
        super('OpenAI', {
            baseUrl: OPENAI_BASE_URL,
            apiKey: providerSettings.getApiKey('OpenAI'),
            model: providerSettings.getModel('OpenAI'),
            isValidKey: isValidOpenAIKey,
            // Température par défaut du modèle (certains modèles n'acceptent que 1)
            temperature: null,
            // Erreurs OpenAI : 429 (limite de requêtes) journalisé à part
            openAIErrors: true
        });
    }
}

module.exports = OpenAIProvider;
