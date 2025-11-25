/**
 * Service OCR pour l'extraction de texte depuis des images
 * Utilise Tesseract.js pour la reconnaissance optique de caractères
 */

const Tesseract = require('tesseract.js');
const { OCR_LANGUAGES } = require('../utils/constants.js');

/**
 * Extrait le texte d'une image en utilisant Tesseract OCR
 * 
 * @param {string} base64Image - Image en base64
 * @returns {Promise<string>} Texte extrait de l'image
 */
async function extractTextFromImage(base64Image) {
    try {
        console.log('🔍 Début de l\'extraction OCR...');

        // Convertir base64 en buffer
        const imageBuffer = Buffer.from(base64Image, 'base64');

        // Utiliser Tesseract pour extraire le texte
        // Configuration pour le français et l'anglais
        const { data: { text } } = await Tesseract.recognize(imageBuffer, OCR_LANGUAGES, {
            logger: (info) => {
                if (info.status === 'recognizing text') {
                    console.log(`📝 OCR: ${Math.round(info.progress * 100)}%`);
                }
            }
        });

        const extractedText = text.trim();
        console.log(`✅ Texte extrait (${extractedText.length} caractères)`);
        console.log('📄 Texte extrait:', extractedText);

        if (!extractedText || extractedText.length === 0) {
            console.warn('⚠️ Aucun texte extrait de l\'image');
            return 'Aucun texte détecté dans l\'image.';
        }

        return extractedText;
    } catch (error) {
        console.error('❌ Erreur lors de l\'extraction OCR:', error);
        throw new Error(`Erreur OCR: ${error.message}`);
    }
}

module.exports = {
    extractTextFromImage
};
