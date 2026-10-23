/**
 * Configuration du LLM local (LM Studio / Ollama) : URL et modèle actif modifiables depuis l'interface
 * Enregistrés dans ai_settings (local_llm_url, local_llm_model), donc conservés au redémarrage.
 * Priorité : valeur enregistrée depuis l'interface > .env (LOCAL_LLM_URL / LOCAL_LLM_MODEL) > défaut.
 */

const { loadSettings, saveSetting } = require('../aiSettingsStore.js');
const { DEFAULT_LOCAL_LLM_MODEL, LOCAL_LLM_BASE_URL } = require('../../utils/constants.js');
const logger = require('../../../../lib/logger.js');

const MODEL_SETTING = 'local_llm_model';
const URL_SETTING = 'local_llm_url';

// null = utilise le .env
let activeModel = null;
let uiBaseUrl = null;

function getEnvModel() {
    return process.env.LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL;
}

function getEnvBaseUrl() {
    return process.env.LOCAL_LLM_URL || LOCAL_LLM_BASE_URL;
}

module.exports = {
    /**
     * Charge l'URL et le modèle enregistrés depuis la base (cf. aiSettingsLoader.js)
     */
    async load() {
        const settings = await loadSettings([MODEL_SETTING, URL_SETTING]);
        activeModel = settings.get(MODEL_SETTING) || null;
        uiBaseUrl = settings.get(URL_SETTING) || null;
    },

    /**
     * Retourne le modèle actuellement actif
     * Priorité : interface > env LOCAL_LLM_MODEL > constante par défaut
     */
    getActiveModel() {
        return activeModel || getEnvModel();
    },

    /**
     * Change le modèle actif (enregistré en base)
     * @param {string|null} modelId - ID du modèle, ou null pour revenir au défaut
     */
    async setActiveModel(modelId) {
        await saveSetting(MODEL_SETTING, modelId || null);
        activeModel = modelId || null;
        logger.info(`LocalLLM : modèle actif ${modelId || '(défaut .env)'}`);
    },

    /**
     * Retourne la source du modèle actif ('ui' si changé via interface, 'env' sinon)
     */
    getActiveModelSource() {
        return activeModel ? 'ui' : 'env';
    },

    /**
     * Retourne l'URL de base du LLM local (vide = LLM local désactivé)
     */
    getBaseUrl() {
        return uiBaseUrl || getEnvBaseUrl();
    },

    getBaseUrlSource() {
        return uiBaseUrl ? 'ui' : 'env';
    },

    getEnvBaseUrl,

    /**
     * Change l'URL du LLM local (enregistrée en base)
     * @param {string|null} baseUrl - URL de l'API compatible OpenAI (ex: http://192.168.1.20:1234/v1), ou null pour le .env
     */
    async setBaseUrl(baseUrl) {
        await saveSetting(URL_SETTING, baseUrl || null);
        uiBaseUrl = baseUrl || null;
        logger.info(`LocalLLM : URL ${baseUrl ? 'enregistrée depuis l\'interface' : 'du .env'}`);
    },

    /**
     * Retourne le modèle défini dans le .env (pour le bouton "restaurer défaut")
     */
    getEnvModel
};
