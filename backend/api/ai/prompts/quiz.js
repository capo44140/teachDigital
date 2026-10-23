/**
 * Prompts communs d'analyse de texte et de génération de quiz (providers compatibles OpenAI, Gemini)
 */

const JSON_ONLY = 'IMPORTANT: Répondez UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte supplémentaire.';

function buildAnalysisPrompt(extractedText) {
    return `Analysez ce texte extrait d'une image de leçon et extrayez les concepts clés, les informations importantes et les sujets abordés. Répondez en français au format JSON. ${JSON_ONLY} Format: {"titre_principal": "...", "concepts_cles": [...], "informations_importantes": [...], "niveau": "...", "matiere": "..."}

Texte extrait de l'image:
${extractedText}`;
}

function buildQuizSystemPrompt(childProfile = {}, questionCount = 5) {
    return `Vous êtes un enseignant expert qui crée des interrogations adaptées à l'âge des enfants. Créez des questions claires, éducatives et adaptées au niveau de l'enfant. L'enfant a ${childProfile.age || 8} ans et son niveau est ${childProfile.level || 'primaire'}. Générez exactement ${questionCount} questions avec 4 options chacune.`;
}

function buildQuizUserPrompt(analysis, questionCount = 5) {
    return `Basé sur cette analyse de leçon: ${JSON.stringify(analysis)}, générez un quiz de ${questionCount} questions avec 4 options chacune. ${JSON_ONLY} Format: {"title": "...", "description": "...", "questions": [{"question": "...", "options": [...], "correctAnswer": 0, "explanation": "..."}]}`;
}

/**
 * Jetons maximum pour un quiz : ~300 par question, au moins 1500
 */
function quizMaxTokens(questionCount = 5) {
    return Math.max(1500, questionCount * 300);
}

module.exports = {
    buildAnalysisPrompt,
    buildQuizSystemPrompt,
    buildQuizUserPrompt,
    quizMaxTokens
};
