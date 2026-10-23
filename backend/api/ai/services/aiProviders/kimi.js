/**
 * Provider Kimi (Moonshot AI) pour l'analyse de texte et la génération de quiz
 * API compatible OpenAI - https://platform.moonshot.cn
 */

const AIProviderBase = require('./base.js');
const { fetchWithTimeout } = require('../../utils/fetch.js');
const { isValidKimiKey } = require('../../utils/validation.js');
const { KIMI_BASE_URL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } = require('../../utils/constants.js');
const providerSettings = require('./providerSettings.js');

class KimiProvider extends AIProviderBase {
    constructor() {
        super('Kimi');
        this.apiKey = providerSettings.getApiKey('Kimi');
        this.model = providerSettings.getModel('Kimi');
    }

    isAvailable() {
        return isValidKimiKey(this.apiKey);
    }

    /**
     * Analyse un texte extrait d'une image avec Kimi
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText) {
        console.log('🌙 Kimi analyzeText: Début (texte: ' + extractedText.substring(0, 50) + '...)');

        const response = await fetchWithTimeout(`${KIMI_BASE_URL}/chat/completions`, {
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
                        content: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
                    }
                ],
                max_tokens: DEFAULT_MAX_TOKENS,
                temperature: DEFAULT_TEMPERATURE
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur Kimi: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        return this.parseJSONResponse(responseText);
    }

    /**
     * Génère un quiz avec Kimi
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, questionCount = 5) {
        console.log(`🌙 Kimi generateQuiz: Début (${questionCount} questions)`);

        const response = await fetchWithTimeout(`${KIMI_BASE_URL}/chat/completions`, {
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
                        content: `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de ${questionCount} questions avec 4 options chacune. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
                    }
                ],
                max_tokens: Math.max(1500, questionCount * 300),
                temperature: DEFAULT_TEMPERATURE
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur Kimi: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        return this.parseJSONResponse(responseText);
    }
}

module.exports = KimiProvider;
