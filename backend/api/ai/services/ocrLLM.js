/**
 * Service OCR utilisant les LLM avec vision
 * Extrait le texte directement depuis les images en utilisant les APIs de vision
 */

const { analyzeWithAI } = require('./aiProviders/index.js');

/**
 * Extrait le texte d'une image en utilisant un LLM avec vision
 * 
 * @param {string} base64Image - Image en base64 (avec ou sans préfixe data:image)
 * @returns {Promise<string>} Texte extrait de l'image par le LLM
 */
async function extractTextFromImageWithLLM(base64Image) {
    try {
        console.log('🤖 Début de l\'extraction OCR avec LLM...');

        // Nettoyer le base64 si nécessaire (enlever le préfixe data:image si présent)
        let cleanBase64 = base64Image;
        if (base64Image.includes(',')) {
            cleanBase64 = base64Image.split(',')[1];
        }

        // Utiliser les providers LLM pour extraire le texte
        // On demande au LLM d'extraire tout le texte visible dans l'image
        const prompt = `Extrais TOUT le texte visible dans cette image. Retourne UNIQUEMENT le texte brut, sans commentaires, sans formatage, sans explications. Si l'image contient du texte, retourne-le tel quel. Si l'image ne contient pas de texte, retourne "Aucun texte détecté dans l'image."`;

        // Appeler le LLM avec l'image
        const extractedText = await extractTextWithVisionAPI(cleanBase64, prompt);

        if (!extractedText || extractedText.trim().length === 0) {
            console.warn('⚠️ Aucun texte extrait par le LLM');
            return 'Aucun texte détecté dans l\'image.';
        }

        console.log(`✅ Texte extrait par LLM (${extractedText.length} caractères)`);
        return extractedText.trim();
    } catch (error) {
        console.error('❌ Erreur lors de l\'extraction OCR avec LLM:', error);
        throw new Error(`Erreur OCR LLM: ${error.message}`);
    }
}

/**
 * Extrait le texte d'une image en utilisant les APIs de vision des LLM
 * 
 * @param {string} base64Image - Image en base64
 * @param {string} prompt - Prompt pour l'extraction
 * @returns {Promise<string>} Texte extrait
 */
async function extractTextWithVisionAPI(base64Image, prompt) {
    // Essayer d'abord avec les providers disponibles
    const providers = require('./aiProviders/index.js');
    
    // Essayer OpenAI Vision (GPT-4 Vision)
    if (process.env.OPENAI_API_KEY) {
        try {
            return await extractTextWithOpenAIVision(base64Image, prompt);
        } catch (error) {
            console.warn('⚠️ OpenAI Vision échoué, tentative avec Gemini:', error.message);
        }
    }
    
    // Essayer Gemini Vision
    if (process.env.GEMINI_API_KEY) {
        try {
            return await extractTextWithGeminiVision(base64Image, prompt);
        } catch (error) {
            console.warn('⚠️ Gemini Vision échoué:', error.message);
        }
    }
    
    throw new Error('Aucun provider de vision disponible (OpenAI ou Gemini requis)');
}

/**
 * Extrait le texte avec OpenAI Vision (GPT-4 Vision)
 */
async function extractTextWithOpenAIVision(base64Image, prompt) {
    const { fetchWithTimeout, handleOpenAIResponse } = require('../../utils/fetch.js');
    const { OPENAI_BASE_URL } = require('../../utils/constants.js');
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Utiliser gpt-4o ou gpt-4-turbo qui supportent la vision
    const model = 'gpt-4o';
    
    const response = await fetchWithTimeout(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
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
            max_tokens: 4000
        })
    });

    await handleOpenAIResponse(response, 'OpenAI Vision (OCR)');

    const data = await response.json();
    const content = data.choices[0].message.content;

    return content;
}

/**
 * Extrait le texte avec Gemini Vision
 */
async function extractTextWithGeminiVision(base64Image, prompt) {
    const { fetchWithTimeout } = require('../../utils/fetch.js');
    const { GEMINI_BASE_URL } = require('../../utils/constants.js');
    const apiKey = process.env.GEMINI_API_KEY;
    
    const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/gemini-2.5-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                maxOutputTokens: 4000,
                temperature: 0.1
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Erreur Gemini Vision: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Réponse Gemini Vision incomplète');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    return responseText;
}

module.exports = {
    extractTextFromImageWithLLM,
    extractTextWithVisionAPI
};

