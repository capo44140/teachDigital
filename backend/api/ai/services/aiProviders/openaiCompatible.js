/**
 * Base commune des providers à API compatible OpenAI (/chat/completions)
 * DeepSeek, Groq, Mistral, Kimi, OpenRouter, OpenAI (et le LLM local) n'en diffèrent
 * que par leur URL, leur clé, quelques en-têtes et le traitement des erreurs.
 */

const AIProviderBase = require('./base.js');
const { fetchWithTimeout, handleOpenAIResponse } = require('../../utils/fetch.js');
const { callTimeout } = require('../../utils/requestContext.js');
const { API_TIMEOUT_MS, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } = require('../../utils/constants.js');
const { buildAnalysisPrompt, buildQuizSystemPrompt, buildQuizUserPrompt, quizMaxTokens } = require('../../prompts/quiz.js');
const { recordAiCall, usageFromOpenAI } = require('../aiUsage.js');
const logger = require('../../../../lib/logger.js');

class OpenAICompatibleProvider extends AIProviderBase {
    /**
     * @param {string} name - Nom du provider (ex: "DeepSeek")
     * @param {Object} options
     * @param {string} options.baseUrl - URL de base de l'API (sans /chat/completions)
     * @param {string} [options.apiKey] - Clé API (Authorization: Bearer)
     * @param {string} options.model - Modèle utilisé
     * @param {Function} [options.isValidKey] - Validation du format de la clé
     * @param {Object} [options.extraHeaders] - En-têtes supplémentaires
     * @param {number|null} [options.temperature] - null = paramètre non envoyé
     * @param {boolean} [options.openAIErrors] - Traitement des erreurs OpenAI (429...)
     * @param {number} [options.timeoutMs] - Timeout d'un appel (borné par le délai de la requête)
     * @param {Object} [options.fetchOptions] - Options fetch supplémentaires (ex: redirect)
     * @param {Object} [options.extraBody] - Champs ajoutés au corps de chaque requête
     */
    constructor(name, {
        baseUrl,
        apiKey = '',
        model,
        isValidKey = () => false,
        extraHeaders = {},
        temperature = DEFAULT_TEMPERATURE,
        openAIErrors = false,
        timeoutMs = API_TIMEOUT_MS,
        fetchOptions = {},
        extraBody = {}
    } = {}) {
        super(name);
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.isValidKey = isValidKey;
        this.extraHeaders = extraHeaders;
        this.temperature = temperature;
        this.openAIErrors = openAIErrors;
        this.timeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : API_TIMEOUT_MS;
        this.fetchOptions = fetchOptions;
        this.extraBody = extraBody;
    }

    isAvailable() {
        return !!this.isValidKey(this.apiKey);
    }

    buildHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...this.extraHeaders
        };
    }

    /**
     * Appelle /chat/completions et retourne le texte de la réponse
     * @param {Array} messages - Messages au format OpenAI
     * @param {Object} options - { maxTokens, temperature, ctx, operation, allowEmpty }
     * @returns {Promise<string>}
     */
    async chatText(messages, { maxTokens = DEFAULT_MAX_TOKENS, temperature = this.temperature, ctx, operation = 'chat', allowEmpty = false } = {}) {
        const timeoutMs = callTimeout(ctx, this.timeoutMs);
        const body = { ...this.extraBody, model: this.model, messages, max_tokens: maxTokens };
        if (temperature !== null && temperature !== undefined) body.temperature = temperature;

        const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
            signal: ctx && ctx.signal,
            ...this.fetchOptions
        }, timeoutMs);

        if (this.openAIErrors) {
            await handleOpenAIResponse(response, `${this.name} (${operation})`);
        } else if (!response.ok) {
            throw new Error(`Erreur ${this.name}: ${response.status}`);
        }

        const data = await response.json();
        await recordAiCall(this.name, usageFromOpenAI(data && data.usage));
        const content = data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : '';
        if (!content) {
            if (allowEmpty) return '';
            throw new Error(`Réponse ${this.name} vide`);
        }
        return content;
    }

    /**
     * Appelle /chat/completions et parse la réponse JSON
     */
    async chat(messages, maxTokens, ctx, operation) {
        return this.parseJSONResponse(await this.chatText(messages, { maxTokens, ctx, operation }));
    }

    /**
     * Analyse un texte extrait d'une image
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @param {Object} [ctx] - Contexte de la requête (signal, délai)
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText, ctx) {
        logger.debug(`${this.name} analyzeText`, { model: this.model, textLength: String(extractedText || '').length });
        return this.chat([
            { role: 'user', content: buildAnalysisPrompt(extractedText) }
        ], DEFAULT_MAX_TOKENS, ctx, 'analyse texte OCR');
    }

    /**
     * Génère un quiz
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
     * @param {Object} [ctx] - Contexte de la requête (signal, délai)
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, questionCount = 5, ctx) {
        logger.debug(`${this.name} generateQuiz`, { model: this.model, questionCount });
        return this.chat([
            { role: 'system', content: buildQuizSystemPrompt(childProfile, questionCount) },
            { role: 'user', content: buildQuizUserPrompt(analysis, questionCount) }
        ], quizMaxTokens(questionCount), ctx, 'génération quiz');
    }
}

module.exports = OpenAICompatibleProvider;
