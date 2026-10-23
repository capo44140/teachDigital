/**
 * Provider OpenRouter pour l'analyse de texte et la génération de quiz
 * API compatible OpenAI donnant accès à de nombreux modèles (clé et modèle configurables depuis l'interface)
 */

const AIProviderBase = require('./base.js');
const providerSettings = require('./providerSettings.js');
const { fetchWithTimeout } = require('../../utils/fetch.js');
const { isValidOpenRouterKey } = require('../../utils/validation.js');
const { OPENROUTER_BASE_URL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } = require('../../utils/constants.js');

class OpenRouterProvider extends AIProviderBase {
    constructor() {
        super('OpenRouter');
        this.apiKey = providerSettings.getApiKey('OpenRouter');
        this.model = providerSettings.getModel('OpenRouter');
    }

    isAvailable() {
        return isValidOpenRouterKey(this.apiKey);
    }

    /**
     * Appelle l'endpoint chat/completions d'OpenRouter et retourne le JSON parsé
     * @param {Array} messages - Messages au format OpenAI
     * @param {number} maxTokens - Nombre maximum de tokens générés
     * @returns {Promise<Object>} Réponse JSON parsée
     */
    async chat(messages, maxTokens) {
        const response = await fetchWithTimeout(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                // En-têtes d'attribution recommandés par OpenRouter (optionnels)
                'X-Title': 'TeachDigital'
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                max_tokens: maxTokens,
                temperature: DEFAULT_TEMPERATURE
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur OpenRouter: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error('Réponse OpenRouter vide');
        }

        return this.parseJSONResponse(responseText);
    }

    /**
     * Analyse un texte extrait d'une image avec OpenRouter
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText) {
        console.log(`🤖 OpenRouter analyzeText (${this.model}): Début (texte: ` + extractedText.substring(0, 50) + '...)');

        return this.chat([
            {
                role: 'user',
                content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
            }
        ], DEFAULT_MAX_TOKENS);
    }

    /**
     * Génère un quiz avec OpenRouter
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, questionCount = 5) {
        console.log(`🎲 OpenRouter generateQuiz (${this.model}): Début (${questionCount} questions)`);

        return this.chat([
            {
                role: 'system',
                content: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`
            },
            {
                role: 'user',
                content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de ${questionCount} questions avec 4 options chacune. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
            }
        ], Math.max(1500, questionCount * 300));
    }
}

module.exports = OpenRouterProvider;
