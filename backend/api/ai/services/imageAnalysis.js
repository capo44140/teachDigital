/**
 * Service d'analyse d'images
 * Orchestre l'extraction OCR et l'analyse IA
 */

const { extractTextFromImage } = require('./ocr.js');
const { analyzeWithAI } = require('./aiProviders/index.js');

/**
 * Analyse une image avec l'IA en utilisant OCR
 * Extrait d'abord le texte avec Tesseract, puis envoie le texte au LLM.
 * Les erreurs sont remontées : une analyse « démo » serait présentée comme le vrai contenu de l'image.
 *
 * @param {string} base64Image - Image en base64
 * @param {Object} [ctx] - Contexte de la requête (signal d'annulation, délai)
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeImage(base64Image, ctx) {
    const extractedText = await extractTextFromImage(base64Image, ctx);
    return analyzeWithAI(extractedText, ctx);
}

module.exports = {
    analyzeImage
};
