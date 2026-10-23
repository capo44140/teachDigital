/**
 * Provider Gemini pour l'analyse de texte et la génération de quiz
 */

const AIProviderBase = require('./base.js');
const { isValidGeminiKey } = require('../../utils/validation.js');
const { callGeminiGenerateContent } = require('../../utils/gemini.js');
const { isAbortError, throwIfAborted } = require('../../utils/requestContext.js');
const { buildAnalysisPrompt, buildQuizSystemPrompt, buildQuizUserPrompt } = require('../../prompts/quiz.js');
const providerSettings = require('./providerSettings.js');
const logger = require('../../../../lib/logger.js');

const GENERATION_DEFAULTS = { temperature: 0.7, topP: 0.8, topK: 40 };

class GeminiProvider extends AIProviderBase {
    constructor() {
        super('Gemini');
        this.apiKey = providerSettings.getApiKey('Gemini');
        this.model = providerSettings.getModel('Gemini');
        this.maxRetries = 1;
    }

    isAvailable() {
        return !!isValidGeminiKey(this.apiKey);
    }

    /**
     * Appelle Gemini et parse le JSON ; une nouvelle tentative si la réponse est illisible
     * @param {string} prompt
     * @param {number} maxOutputTokens
     * @param {Function} isValid - Vérifie la structure du JSON parsé
     * @param {Object} [ctx] - Contexte de la requête
     */
    async generateJson(prompt, maxOutputTokens, isValid, ctx) {
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            throwIfAborted(ctx);
            // Erreur HTTP / réseau / annulation : propagée telle quelle (pas de nouvelle tentative)
            const text = await callGeminiGenerateContent({
                apiKey: this.apiKey,
                model: this.model,
                parts: [{ text: prompt }],
                generationConfig: { maxOutputTokens, ...GENERATION_DEFAULTS },
                ctx
            });
            try {
                const parsed = this.parseJSONResponse(text);
                if (isValid(parsed)) return parsed;
            } catch (parseError) {
                if (isAbortError(parseError)) throw parseError;
            }
            logger.debug('Gemini : réponse illisible', { attempt: attempt + 1 });
        }
        throw new Error('Impossible de parser la réponse de Gemini');
    }

    /**
     * Analyse un texte extrait d'une image avec Gemini
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @param {Object} [ctx] - Contexte de la requête
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText, ctx) {
        logger.debug('Gemini analyzeText', { model: this.model, textLength: String(extractedText || '').length });
        return this.generateJson(
            buildAnalysisPrompt(extractedText),
            2000,
            parsed => !!(parsed && (parsed.titre_principal || parsed.concepts_cles)),
            ctx
        );
    }

    /**
     * Génère un quiz avec Gemini
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
     * @param {Object} [ctx] - Contexte de la requête
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, questionCount = 5, ctx) {
        logger.debug('Gemini generateQuiz', { model: this.model, questionCount });
        const prompt = `${buildQuizSystemPrompt(childProfile, questionCount)}\n\n${buildQuizUserPrompt(analysis, questionCount)}`;
        return this.generateJson(
            prompt,
            Math.max(3000, questionCount * 400),
            parsed => !!(parsed && Array.isArray(parsed.questions)),
            ctx
        );
    }
}

module.exports = GeminiProvider;
