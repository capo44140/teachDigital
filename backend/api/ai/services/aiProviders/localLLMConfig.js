/**
 * Configuration runtime pour le LLM local (LM Studio / Ollama)
 * Permet de changer le modèle actif depuis l'interface sans modifier le .env
 * Le modèle revient au défaut du .env au redémarrage du serveur.
 */

const { DEFAULT_LOCAL_LLM_MODEL, LOCAL_LLM_BASE_URL } = require('../../utils/constants.js');

// Variable runtime : null = utilise le défaut du .env
let activeModel = null;

module.exports = {
    /**
     * Retourne le modèle actuellement actif
     * Priorité : variable runtime > env LOCAL_LLM_MODEL > constante par défaut
     */
    getActiveModel() {
        return activeModel || process.env.LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL;
    },

    /**
     * Change le modèle actif en runtime (sans modifier le .env)
     * @param {string|null} modelId - ID du modèle, ou null pour revenir au défaut
     */
    setActiveModel(modelId) {
        activeModel = modelId;
        console.log(`🔄 LocalLLM modèle actif changé: ${modelId || '(défaut .env)'}`);
    },

    /**
     * Retourne la source du modèle actif ('ui' si changé via interface, 'env' sinon)
     */
    getActiveModelSource() {
        return activeModel ? 'ui' : 'env';
    },

    /**
     * Retourne l'URL de base du LLM local
     */
    getBaseUrl() {
        return process.env.LOCAL_LLM_URL || LOCAL_LLM_BASE_URL;
    },

    /**
     * Retourne le modèle défini dans le .env (pour le bouton "restaurer défaut")
     */
    getEnvModel() {
        return process.env.LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL;
    }
};
