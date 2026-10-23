/**
 * Configuration persistante de la génération de pages de cours
 * Permet de choisir depuis l'interface le provider IA utilisé (table ai_settings).
 * Aucun provider choisi (null) = automatique : providers vision dans l'ordre de priorité.
 */

const { loadSettings, saveSetting } = require('./aiSettingsStore.js');

const PROVIDER_SETTING = 'course_page_provider';

// Providers capables de lire des photos (API vision)
const VISION_PROVIDERS = ['LocalLLM', 'OpenAI', 'Gemini', 'OpenRouter'];

// Cache mémoire : chargé au démarrage (load), mis à jour à chaque enregistrement
let selectedProvider = null;

module.exports = {
    VISION_PROVIDERS,

    /**
     * Charge la configuration enregistrée depuis la base (appelé au démarrage du serveur)
     */
    async load() {
        const value = (await loadSettings([PROVIDER_SETTING])).get(PROVIDER_SETTING);
        selectedProvider = VISION_PROVIDERS.includes(value) ? value : null;
    },

    /**
     * Retourne le provider choisi, ou null en mode automatique
     */
    getProvider() {
        return selectedProvider;
    },

    /**
     * Enregistre le provider choisi dans l'interface
     * @param {string|null} provider - Nom du provider (ex: "OpenRouter"), ou null pour le mode automatique
     */
    async setProvider(provider) {
        if (provider && !VISION_PROVIDERS.includes(provider)) {
            throw new Error(`Provider non supporté pour les pages de cours : ${provider}`);
        }
        await saveSetting(PROVIDER_SETTING, provider || null);
        selectedProvider = provider || null;
        console.log(`📝 Provider des pages de cours : ${provider || 'automatique'}`);
    }
};
