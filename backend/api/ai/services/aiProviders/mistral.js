/**
 * Provider Mistral (API compatible OpenAI) pour l'analyse de texte et la génération de quiz
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const { isValidMistralKey } = require('../../utils/validation.js');
const { MISTRAL_BASE_URL } = require('../../utils/constants.js');
const providerSettings = require('./providerSettings.js');

class MistralProvider extends OpenAICompatibleProvider {
    constructor() {
        super('Mistral', {
            baseUrl: MISTRAL_BASE_URL,
            apiKey: providerSettings.getApiKey('Mistral'),
            model: providerSettings.getModel('Mistral'),
            isValidKey: isValidMistralKey
        });
    }
}

module.exports = MistralProvider;
