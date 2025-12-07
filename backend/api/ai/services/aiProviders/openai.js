/**
 * Provider OpenAI pour l'analyse de texte et la génération de quiz
 */

const AIProviderBase = require('./base.js');
const { fetchWithTimeout, handleOpenAIResponse } = require('../../utils/fetch.js');
const { isValidOpenAIKey } = require('../../utils/validation.js');
const { OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL, DEFAULT_MAX_TOKENS } = require('../../utils/constants.js');

class OpenAIProvider extends AIProviderBase {
    constructor() {
        super('OpenAI');
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = DEFAULT_OPENAI_MODEL;
    }

    isAvailable() {
        return isValidOpenAIKey(this.apiKey);
    }

    /**
     * Analyse un texte extrait d'une image avec OpenAI
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText) {
        console.log('🤖 OpenAI analyzeText: Début (texte: ' + extractedText.substring(0, 50) + '...)');

        const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
                    }
                ],
                max_tokens: DEFAULT_MAX_TOKENS
            })
        });

        await handleOpenAIResponse(response, 'OpenAI (analyse texte OCR)');

        const data = await response.json();
        const content = data.choices[0].message.content;

        return this.parseJSONResponse(content);
    }

    /**
     * Génère un quiz avec OpenAI
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, questionCount = 5) {
        console.log(`🎲 OpenAI generateQuiz: Début (${questionCount} questions)`);

        const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`
                    },
                    {
                        role: 'user',
                        content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de ${questionCount} questions avec 4 options chacune. Format de réponse: JSON avec structure {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
                    }
                ],
                max_tokens: Math.max(1500, questionCount * 300) // Ajuster les tokens selon le nombre de questions
            })
        });

        await handleOpenAIResponse(response, 'OpenAI (génération quiz)');

        const data = await response.json();
        const content = data.choices[0].message.content;

        return this.parseJSONResponse(content);
    }
}

module.exports = OpenAIProvider;
