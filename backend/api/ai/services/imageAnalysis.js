/**
 * Service d'analyse d'images
 * Orchestre l'extraction OCR et l'analyse IA
 */

const { extractTextFromImage } = require('./ocr.js');
const { analyzeWithAI } = require('./aiProviders/index.js');

/**
 * Analyse une image avec l'IA en utilisant OCR
 * Extrait d'abord le texte avec Tesseract, puis envoie le texte au LLM
 * 
 * @param {string} base64Image - Image en base64
 * @returns {Promise<Object>} Analyse structurée du contenu
 */
async function analyzeImage(base64Image) {
    console.log('🖼️ analyzeImage: Début de l\'analyse');

    try {
        // Extraire le texte de l'image avec OCR
        const extractedText = await extractTextFromImage(base64Image);

        // Analyser le texte extrait avec les LLM (avec fallback automatique)
        const analysis = await analyzeWithAI(extractedText);

        return analysis;
    } catch (error) {
        // Remonter l'erreur : une analyse « démo » serait présentée comme le vrai contenu de l'image
        console.error('❌ Erreur lors de l\'analyse de l\'image:', error);
        throw error;
    }
}

module.exports = {
    analyzeImage
};
