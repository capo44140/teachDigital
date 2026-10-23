/**
 * Provider LLM Local pour l'analyse de texte et la génération de quiz
 * Compatible avec LM Studio, Ollama et autres LLMs locaux à API compatible OpenAI
 */

const OpenAICompatibleProvider = require('./openaiCompatible.js');
const { isLocalLLMAvailable } = require('../../utils/validation.js');
const { LOCAL_LLM_TIMEOUT_MS } = require('../../utils/constants.js');
const localLLMConfig = require('./localLLMConfig.js');
const logger = require('../../../../lib/logger.js');

function buildStrictQuizSystemPrompt(childProfile = {}, questionCount = 5) {
    return `Tu es un enseignant expert qui crée des interrogations adaptées à l'âge des enfants.
Objectif: produire un JSON STRICT pour TeachDigital.

Contraintes OBLIGATOIRES:
- Réponds UNIQUEMENT avec du JSON valide (sans backticks, sans markdown, sans texte avant/après).
- Structure EXACTE:
  {
    "title": string,
    "description": string,
    "questions": [
      {
        "question": string,
        "options": [string, string, string, string],
        "correctAnswer": number, // index 0..3 (OBLIGATOIREMENT un entier)
        "explanation": string
      }
    ]
  }
- "questions" doit contenir EXACTEMENT ${questionCount} éléments.
- "options" doit contenir EXACTEMENT 4 chaînes non vides (idéalement uniques).
- "correctAnswer" doit être un ENTIER 0..3 (PAS une lettre A-D, PAS le texte d'une option, PAS 1..4).
- Pas de virgules finales, pas de NaN, pas de commentaires.

Contexte enfant: âge=${childProfile.age || 8}, niveau="${childProfile.level || 'primaire'}".`;
}

function buildStrictQuizUserPrompt(analysis) {
    return `À partir de l'analyse suivante, génère un quiz.

Analyse JSON:
${JSON.stringify(analysis)}

Rappel du format TeachDigital (STRICT):
{"title":"...","description":"...","questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":0,"explanation":"..."}]}

Exemple MINIMAL (ne pas recopier tel quel, c'est juste un exemple de structure):
{"title":"Exemple","description":"...","questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":2,"explanation":"..."}]}`;
}

class LocalLLMProvider extends OpenAICompatibleProvider {
    constructor() {
        super('LocalLLM', {
            baseUrl: localLLMConfig.getBaseUrl(),
            model: localLLMConfig.getActiveModel(),
            // Déjà borné sous le timeout serveur dans constants.js
            timeoutMs: LOCAL_LLM_TIMEOUT_MS,
            // L'URL est saisie depuis l'interface : pas de redirection suivie (SSRF)
            fetchOptions: { redirect: 'error' }
        });
    }

    isAvailable() {
        return !!isLocalLLMAvailable();
    }

    // Pas de clé API pour un LLM local
    buildHeaders() {
        return { 'Content-Type': 'application/json' };
    }

    /**
     * Génère un quiz avec le LLM local (prompt plus strict, température basse :
     * les petits modèles locaux respectent mal le format sinon)
     */
    async generateQuiz(analysis, childProfile, questionCount = 5, ctx) {
        logger.debug('LocalLLM generateQuiz', { model: this.model, questionCount });
        const content = await this.chatText([
            { role: 'system', content: buildStrictQuizSystemPrompt(childProfile, questionCount) },
            { role: 'user', content: buildStrictQuizUserPrompt(analysis) }
        ], { maxTokens: Math.max(1500, questionCount * 300), temperature: 0.2, ctx, operation: 'génération quiz' });
        return this.parseJSONResponse(content);
    }

    /**
     * Extrait le texte d'une image en utilisant la vision du LLM local
     * (modèles vision : llava, qwen-vl, etc.)
     * @param {string} base64Image - Image en base64
     * @param {string} prompt - Prompt pour l'extraction
     * @param {Object} [ctx] - Contexte de la requête
     * @returns {Promise<string>} Texte extrait de l'image
     */
    async extractTextWithVision(base64Image, prompt, ctx) {
        logger.debug('LocalLLM extractTextWithVision', { model: this.model });
        return this.chatText([
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
            }
        ], { maxTokens: 4000, temperature: 0.1, ctx, operation: 'vision OCR', allowEmpty: true });
    }
}

module.exports = LocalLLMProvider;
