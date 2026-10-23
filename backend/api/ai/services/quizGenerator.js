/**
 * Service de génération de quiz
 * Orchestre la génération de quiz à partir d'analyses
 */

const { generateQuizWithAI } = require('./aiProviders/index.js');
const logger = require('../../../lib/logger.js');

/**
 * Génère un quiz basé sur une analyse
 * @param {Object} analysis - Analyse du contenu
 * @param {Object} childProfile - Profil de l'enfant
 * @param {number} questionCount - Nombre de questions souhaitées
 * @param {Object} [ctx] - Contexte de la requête (signal d'annulation, délai)
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizFromAnalysis(analysis, childProfile, questionCount = 5, ctx) {
    logger.debug('generateQuizFromAnalysis', { level: childProfile?.level || null, questionCount });
    return generateQuizWithAI(analysis, childProfile, questionCount, ctx);
}

/**
 * Génère un quiz à partir de plusieurs analyses
 * Combine les analyses et génère un quiz unifié
 *
 * @param {Array} analyses - Liste des analyses
 * @param {Object} childProfile - Profil de l'enfant
 * @param {number} questionCount - Nombre de questions souhaitées
 * @param {Object} [ctx] - Contexte de la requête (signal d'annulation, délai)
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizFromMultipleAnalyses(analyses, childProfile, questionCount, ctx) {
    logger.debug('generateQuizFromMultipleAnalyses', { analyses: analyses.length, questionCount });

    // Combiner toutes les analyses en une seule
    const combinedAnalysis = {
        subject: 'Multi-matières',
        topic: `Synthèse de ${analyses.length} documents`,
        concepts: [],
        level: childProfile.level || 'Primaire',
        keyPoints: []
    };

    const normalizeText = (text) => String(text || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const clip = (text, maxChars) => {
      const t = normalizeText(text);
      if (!t) return '';
      return t.length > maxChars ? (t.slice(0, maxChars) + '…') : t;
    };

    const asArray = (value) => (Array.isArray(value) ? value : []);

    // Agréger les concepts et points clés de toutes les analyses
    for (const item of analyses) {
        const analysis = item.analysis || {};
        combinedAnalysis.concepts.push(...asArray(analysis.concepts), ...asArray(analysis.concepts_cles));
        combinedAnalysis.keyPoints.push(...asArray(analysis.keyPoints), ...asArray(analysis.informations_importantes));

        // IMPORTANT: utiliser aussi le texte OCR (source brute) pour la génération du quiz.
        // Cela aide le LLM à garder les détails exacts présents dans le document.
        if (item.extractedText) {
            const name = item.fileName || item.type || 'document';
            const snippet = clip(item.extractedText, 2000);
            if (snippet) {
                combinedAnalysis.keyPoints.push(`Texte OCR (${name}): ${snippet}`);
            }
        }
    }

    // Dédupliquer les concepts
    combinedAnalysis.concepts = [...new Set(combinedAnalysis.concepts)];
    combinedAnalysis.keyPoints = [...new Set(combinedAnalysis.keyPoints)];

    // Générer le quiz avec l'analyse combinée et le nombre de questions demandé
    return generateQuizWithAI(combinedAnalysis, childProfile, questionCount, ctx);
}

/**
 * Génère un quiz à partir d'un texte brut
 * Analyse d'abord le texte puis génère le quiz
 *
 * @param {string} inputText - Texte source
 * @param {Object} childProfile - Profil de l'enfant
 * @param {Object} options - Options de génération (questionCount, subject)
 * @param {Object} [ctx] - Contexte de la requête (signal d'annulation, délai)
 * @returns {Promise<Object>} Quiz généré
 */
async function generateQuizFromTextWithAI(inputText, childProfile, options = {}, ctx) {
    const questionCount = options.questionCount || 5;
    // Le texte de l'enfant n'est pas journalisé, seulement sa longueur
    logger.debug('generateQuizFromTextWithAI', { textLength: String(inputText || '').length, questionCount });

    // Créer une analyse simple à partir du texte
    const analysis = {
        subject: options.subject || 'Général',
        topic: inputText.substring(0, 100),
        concepts: [],
        level: childProfile.level || 'Primaire',
        keyPoints: [inputText]
    };

    return generateQuizWithAI(analysis, childProfile, questionCount, ctx);
}

module.exports = {
    generateQuizFromAnalysis,
    generateQuizFromMultipleAnalyses,
    generateQuizFromTextWithAI
};
