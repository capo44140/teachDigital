/**
 * Utilitaires pour les appels HTTP avec timeout
 */

const { API_TIMEOUT_MS } = require('./constants.js');

/**
 * Fonction helper pour fetch avec timeout
 * Évite les timeouts Vercel en limitant la durée des appels API externes
 * Suit les bonnes pratiques avec AbortController et finally block
 * 
 * @param {string} url - URL à appeler
 * @param {Object} options - Options fetch
 * @param {number} timeoutMs - Timeout en millisecondes
 * @returns {Promise<Response>} Réponse HTTP
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    console.log(`🌐 fetchWithTimeout: ${url.substring(0, 50)}... (timeout: ${timeoutMs}ms)`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } catch (error) {
        // Gérer les erreurs d'abort (timeout)
        if (error.name === 'AbortError') {
            throw new Error(`Timeout API après ${timeoutMs}ms`);
        }
        // Propager les autres erreurs
        throw error;
    } finally {
        // Toujours nettoyer le timeout, même en cas d'erreur
        clearTimeout(timeoutId);
    }
}

/**
 * Gère les erreurs de réponse OpenAI avec gestion spécifique du rate limiting (429)
 * 
 * @param {Response} response - Réponse HTTP
 * @param {string} operation - Nom de l'opération pour les logs
 * @returns {Promise<Response>} Réponse HTTP si OK
 * @throws {Error} Si la réponse n'est pas OK
 */
async function handleOpenAIResponse(response, operation = 'OpenAI') {
    console.log(`🔍 handleOpenAIResponse: ${operation} (status: ${response.status})`);
    if (!response.ok) {
        // Gérer spécifiquement l'erreur 429 (Rate Limit)
        if (response.status === 429) {
            const errorData = await response.json().catch(() => ({}));
            const retryAfter = response.headers.get('retry-after');
            const message = errorData.error?.message || 'Limite de requêtes atteinte';
            console.warn(`⚠️ ${operation} Rate Limit (429): ${message}${retryAfter ? ` - Retry after ${retryAfter}s` : ''}`);
            throw new Error(`OpenAI Rate Limit: ${message}. Basculement vers alternative...`);
        }

        // Autres erreurs HTTP
        const errorText = await response.text().catch(() => '');
        console.error(`❌ Erreur ${operation} ${response.status}:`, errorText.substring(0, 200));
        throw new Error(`Erreur ${operation}: ${response.status} - ${response.statusText}`);
    }
    return response;
}

module.exports = {
    fetchWithTimeout,
    handleOpenAIResponse
};
