/**
 * Provider Gemini pour l'analyse de texte et la génération de quiz
 */

const AIProviderBase = require('./base.js');
const { fetchWithTimeout } = require('../../utils/fetch.js');
const { isValidGeminiKey } = require('../../utils/validation.js');
const { GEMINI_BASE_URL, DEFAULT_GEMINI_MODEL } = require('../../utils/constants.js');

class GeminiProvider extends AIProviderBase {
    constructor() {
        super('Gemini');
        this.apiKey = process.env.GEMINI_API_KEY;
        this.model = DEFAULT_GEMINI_MODEL;
        this.maxRetries = 1;
    }

    isAvailable() {
        return isValidGeminiKey(this.apiKey);
    }

    /**
     * Analyse un texte extrait d'une image avec Gemini
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @param {number} retryCount - Nombre de tentatives
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText, retryCount = 0) {
        console.log(`🤖 Gemini analyzeText: Début (retry: ${retryCount}, texte: ${extractedText.substring(0, 50)}...)`);

        try {
            const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.5-flash-exp:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire. Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 2000,
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Réponse Gemini incomplète');
            }

            const responseText = data.candidates[0].content.parts[0].text;

            try {
                const parsed = this.parseJSONResponse(responseText);

                if (!parsed.titre_principal && !parsed.concepts_cles) {
                    throw new Error('Structure JSON invalide');
                }

                return parsed;
            } catch (parseError) {
                if (retryCount < this.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return this.analyzeText(extractedText, retryCount + 1);
                }
                throw new Error('Impossible de parser la réponse de Gemini');
            }
        } catch (error) {
            if (retryCount < this.maxRetries && error.message.includes('tronquée')) {
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.analyzeText(extractedText, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * Génère un quiz avec Gemini
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} retryCount - Nombre de tentatives
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, retryCount = 0) {
        console.log(`🎲 Gemini generateQuiz: Début (retry: ${retryCount})`);

        try {
            const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.5-flash-exp:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}.

Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de 5 questions avec 4 options chacune.

IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire.

Format de réponse: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 3000,
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur Gemini: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Réponse Gemini incomplète');
            }

            const responseText = data.candidates[0].content.parts[0].text;

            try {
                const parsed = this.parseJSONResponse(responseText);

                if (!parsed.questions || !Array.isArray(parsed.questions)) {
                    throw new Error('Structure de quiz invalide');
                }

                return parsed;
            } catch (parseError) {
                if (retryCount < this.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return this.generateQuiz(analysis, childProfile, retryCount + 1);
                }
                throw new Error('Impossible de parser la réponse de Gemini');
            }
        } catch (error) {
            if (retryCount < this.maxRetries && error.message.includes('tronquée')) {
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.generateQuiz(analysis, childProfile, retryCount + 1);
            }
            throw error;
        }
    }
}

module.exports = GeminiProvider;
