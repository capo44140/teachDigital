/**
 * Classe de base abstraite pour les providers IA
 * Définit l'interface commune que tous les providers doivent implémenter
 */

class AIProviderBase {
    constructor(name) {
        if (new.target === AIProviderBase) {
            throw new TypeError('Cannot construct AIProviderBase instances directly');
        }
        this.name = name;
    }

    /**
     * Vérifie si le provider est disponible (clé API valide, etc.)
     * @returns {boolean} True si le provider est disponible
     */
    isAvailable() {
        throw new Error('Method isAvailable() must be implemented');
    }

    /**
     * Retourne le nom du provider
     * @returns {string} Nom du provider
     */
    getName() {
        return this.name;
    }

    /**
     * Analyse un texte extrait d'une image
     * @param {string} extractedText - Texte extrait par OCR
     * @returns {Promise<Object>} Analyse structurée du contenu
     */
    async analyzeText(extractedText) {
        throw new Error('Method analyzeText() must be implemented');
    }

    /**
     * Génère un quiz basé sur une analyse
     * @param {Object} analysis - Analyse du contenu
     * @param {Object} childProfile - Profil de l'enfant
     * @returns {Promise<Object>} Quiz généré
     */
    async generateQuiz(analysis, childProfile) {
        throw new Error('Method generateQuiz() must be implemented');
    }

    /**
     * Helper pour parser une réponse JSON depuis un LLM
     * Les LLMs peuvent retourner du JSON entouré de markdown
     * @param {string} content - Contenu à parser
     * @returns {Object} Objet JSON parsé
     */
    parseJSONResponse(content) {
        let jsonText = content.trim();

        // Nettoyer les backticks markdown
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Essayer d'extraire le JSON avec regex
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }

        try {
            return JSON.parse(jsonText);
        } catch (parseError) {
            console.error(`❌ Erreur de parsing JSON pour ${this.name}:`, parseError);
            throw new Error(`Impossible de parser la réponse ${this.name}`);
        }
    }
}

module.exports = AIProviderBase;
