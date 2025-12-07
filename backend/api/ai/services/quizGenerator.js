/**
 * Service de génération de quiz
 * Orchestre la génération de quiz à partir d'analyses
 */

const { generateQuizWithAI } = require('./aiProviders/index.js');

/**
 * Génère un quiz basé sur une analyse
 * @param {Object} analysis - Analyse du contenu
 * @param {Object} childProfile - Profil de l'enfant
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizFromAnalysis(analysis, childProfile, questionCount = 5) {
    console.log('🎯 generateQuizFromAnalysis: Début (age: ' + (childProfile?.age || 'N/A') + ', level: ' + (childProfile?.level || 'N/A') + ', questions: ' + questionCount + ')');

    return await generateQuizWithAI(analysis, childProfile, questionCount);
}

/**
 * Génère un quiz à partir de plusieurs analyses
 * Combine les analyses et génère un quiz unifié
 * 
 * @param {Array} analyses - Liste des analyses
 * @param {Object} childProfile - Profil de l'enfant
 * @param {number} questionCount - Nombre de questions souhaitées
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount) {
    console.log(`🎯 generateQuizFromMultipleAnalyses: Début (${analyses.length} analyses, ${questionCount} questions)`);

    // Combiner toutes les analyses en une seule
    const combinedAnalysis = {
        subject: 'Multi-matières',
        topic: `Synthèse de ${analyses.length} documents`,
        concepts: [],
        level: childProfile.level || 'Primaire',
        keyPoints: []
    };

    // Agréger les concepts et points clés de toutes les analyses
    for (const item of analyses) {
        const analysis = item.analysis;
        if (analysis.concepts) {
            combinedAnalysis.concepts.push(...analysis.concepts);
        }
        if (analysis.concepts_cles) {
            combinedAnalysis.concepts.push(...analysis.concepts_cles);
        }
        if (analysis.keyPoints) {
            combinedAnalysis.keyPoints.push(...analysis.keyPoints);
        }
        if (analysis.informations_importantes) {
            combinedAnalysis.keyPoints.push(...analysis.informations_importantes);
        }
    }

    // Dédupliquer les concepts
    combinedAnalysis.concepts = [...new Set(combinedAnalysis.concepts)];
    combinedAnalysis.keyPoints = [...new Set(combinedAnalysis.keyPoints)];

    // Générer le quiz avec l'analyse combinée et le nombre de questions demandé
    return await generateQuizWithAI(combinedAnalysis, childProfile, questionCount);
}

/**
 * Génère un quiz à partir d'un texte brut
 * Analyse d'abord le texte puis génère le quiz
 * 
 * @param {string} inputText - Texte source
 * @param {Object} childProfile - Profil de l'enfant
 * @param {Object} options - Options de génération
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizFromTextWithAI(inputText, childProfile, options = {}) {
    const questionCount = options.questionCount || 5;
    console.log(`📝 generateQuizFromTextWithAI: Début (texte: ${inputText.substring(0, 50)}..., questions: ${questionCount})`);

    // Créer une analyse simple à partir du texte
    const analysis = {
        subject: options.subject || 'Général',
        topic: inputText.substring(0, 100),
        concepts: [],
        level: childProfile.level || 'Primaire',
        keyPoints: [inputText]
    };

    return await generateQuizWithAI(analysis, childProfile, questionCount);
}

module.exports = {
    generateQuizFromAnalysis,
    generateQuizFromMultipleAnalyses,
    generateQuizFromTextWithAI
};
