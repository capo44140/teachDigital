/**
 * Appel à l'API Gemini (generateContent)
 * La clé API est transmise dans l'en-tête x-goog-api-key, jamais dans l'URL
 * (une URL se retrouve dans les logs des proxys et dans les messages d'erreur).
 */

const { fetchWithTimeout } = require('./fetch.js');
const { GEMINI_BASE_URL, API_TIMEOUT_MS } = require('./constants.js');
const { callTimeout } = require('./requestContext.js');

/**
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {string} options.model - Identifiant du modèle (sans "/", vérifié par providerSettings)
 * @param {Array} options.parts - Parties du contenu (texte, inline_data)
 * @param {Object} [options.generationConfig]
 * @param {Object} [options.ctx] - Contexte de la requête (signal, délai)
 * @param {number} [options.timeoutMs] - Timeout de l'appel (borné par le délai de la requête)
 * @param {string} [options.label] - Libellé pour les erreurs
 * @returns {Promise<string>} Texte de la réponse (parties concaténées)
 */
async function callGeminiGenerateContent({ apiKey, model, parts, generationConfig, ctx, timeoutMs = API_TIMEOUT_MS, label = 'Gemini' }) {
    const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{ parts }],
            ...(generationConfig ? { generationConfig } : {})
        }),
        signal: ctx && ctx.signal
    }, callTimeout(ctx, timeoutMs));

    if (!response.ok) {
        throw new Error(`Erreur ${label}: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const responseParts = data && data.candidates && data.candidates[0] && data.candidates[0].content
        ? data.candidates[0].content.parts
        : null;
    if (!Array.isArray(responseParts) || responseParts.length === 0) {
        throw new Error(`Réponse ${label} incomplète`);
    }
    return responseParts.map(part => part.text || '').join('');
}

module.exports = {
    callGeminiGenerateContent
};
