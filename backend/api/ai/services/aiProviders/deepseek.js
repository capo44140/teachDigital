/**
 * Provider DeepSeek (API compatible OpenAI) pour l'analyse de texte et la génération de quiz
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const { isValidDeepSeekKey } = require('../../utils/validation.js');
const { DEEPSEEK_BASE_URL } = require('../../utils/constants.js');
const providerSettings = require('./providerSettings.js');

class DeepSeekProvider extends OpenAICompatibleProvider {
    constructor() {
        super('DeepSeek', {
            baseUrl: DEEPSEEK_BASE_URL,
            apiKey: providerSettings.getApiKey('DeepSeek'),
            model: providerSettings.getModel('DeepSeek'),
            isValidKey: isValidDeepSeekKey
        });
    }
}

module.exports = DeepSeekProvider;
