/**
 * Provider LLM Local pour l'analyse de texte et la génération de quiz
 * Compatible avec Ollama et autres LLMs locaux
 */

const AIProviderBase = require('./base.js');
const { fetchWithTimeout } = require('../../utils/fetch.js');
const { isLocalLLMAvailable } = require('../../utils/validation.js');
const { LOCAL_LLM_BASE_URL, DEFAULT_LOCAL_LLM_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } = require('../../utils/constants.js');

class LocalLLMProvider extends AIProviderBase {
    constructor() {
        super('LocalLLM');
        this.baseUrl = process.env.LOCAL_LLM_URL || LOCAL_LLM_BASE_URL;
        this.model = process.env.LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL;
    }

    isAvailable() {
        return isLocalLLMAvailable();
    }

    /**
     * Analyse un texte extrait d'une image avec le LLM local
     * @param {string} extractedText - Texte extrait de l'image par OCR
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText) {
        console.log('🏠 LocalLLM analyzeText: Début (texte: ' + extractedText.substring(0, 50) + '...)');

        const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
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
            throw new Error(`Erreur LLM local: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        return this.parseJSONResponse(responseText);
    }

    /**
     * Génère un quiz avec le LLM local
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @param {number} questionCount - Nombre de questions souhaitées (défaut: 5)
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile, questionCount = 5) {
        console.log(`🏠 LocalLLM generateQuiz: Début (${questionCount} questions)`);

        const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
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
            throw new Error(`Erreur LLM local: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;

        return this.parseJSONResponse(responseText);
    }

    /**
     * Extrait le texte d'une image en utilisant la vision du LLM local
     * Compatible avec Ollama et autres LLMs locaux supportant la vision (llava, bakllava, etc.)
     * @param {string} base64Image - Image en base64
     * @param {string} prompt - Prompt pour l'extraction
     * @returns {Promise<string>} Texte extrait de l'image
     */
    async extractTextWithVision(base64Image, prompt) {
        console.log('🏠 LocalLLM extractTextWithVision: Début');

        const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur LLM local Vision: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        return content;
    }
}

module.exports = LocalLLMProvider;
