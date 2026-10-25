/**
 * Provider OpenRouter pour l'analyse de texte et la génération de quiz
 * API compatible OpenAI donnant accès à de nombreux modèles (clé et modèle configurables depuis l'interface)
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const providerSettings = require('./providerSettings.js');
const { isValidOpenRouterKey } = require('../../utils/validation.js');
const { OPENROUTER_BASE_URL, OPENROUTER_PROVIDER_PREFERENCES } = require('../../utils/constants.js');

class OpenRouterProvider extends OpenAICompatibleProvider {
    constructor() {
        super('OpenRouter', {
            baseUrl: OPENROUTER_BASE_URL,
            apiKey: providerSettings.getApiKey('OpenRouter'),
            model: providerSettings.getModel('OpenRouter'),
            isValidKey: isValidOpenRouterKey,
            // En-tête d'attribution recommandé par OpenRouter (optionnel)
            extraHeaders: { 'X-Title': 'TeachDigital' },
            extraBody: { provider: OPENROUTER_PROVIDER_PREFERENCES }
        });
    }
}

module.exports = OpenRouterProvider;
