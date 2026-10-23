/**
 * Provider Kimi (Moonshot AI) pour l'analyse de texte et la génération de quiz
 * API compatible OpenAI - https://platform.moonshot.cn
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const { isValidKimiKey } = require('../../utils/validation.js');
const { KIMI_BASE_URL } = require('../../utils/constants.js');
const providerSettings = require('./providerSettings.js');

class KimiProvider extends OpenAICompatibleProvider {
    constructor() {
        super('Kimi', {
            baseUrl: KIMI_BASE_URL,
            apiKey: providerSettings.getApiKey('Kimi'),
            model: providerSettings.getModel('Kimi'),
            isValidKey: isValidKimiKey
        });
    }
}

module.exports = KimiProvider;
