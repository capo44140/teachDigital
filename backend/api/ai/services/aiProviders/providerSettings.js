/**
 * Paramètres des providers IA à clé API (clé et modèle), modifiables depuis l'interface
 * Stockés dans ai_settings : "<provider>_api_key" (chiffrée) et "<provider>_model".
 * Priorité : valeur enregistrée depuis l'interface > variable d'environnement > défaut.
 */

const { encrypt, decryptWithInfo, loadSettings, saveSetting } = require('../aiSettingsStore.js');
const logger = require('../../../../lib/logger.js');
const validation = require('../../utils/validation.js');
const constants = require('../../utils/constants.js');

// Segments alphanumériques séparés par au plus un "/" (ex: gpt-4o, meta-llama/llama-4-scout, ft:gpt-4o-mini:org::id)
const DEFAULT_MODEL_PATTERN = /^[A-Za-z0-9][\w.:-]*(\/[A-Za-z0-9][\w.:-]*)?$/;
const MAX_MODEL_LENGTH = 200;

/**
 * Providers à clé API, dans l'ordre de priorité
 * - auth : 'bearer' (Authorization: Bearer, défaut) ou 'google' (x-goog-api-key)
 * - modelsPath : GET listant les modèles (défaut /models) ; checkPath : GET validant la clé (défaut modelsPath)
 */
const PROVIDERS = {
    OpenAI: {
        label: 'OpenAI',
        envKey: 'OPENAI_API_KEY',
        envModel: 'OPENAI_MODEL',
        defaultModel: constants.DEFAULT_OPENAI_MODEL,
        baseUrl: constants.OPENAI_BASE_URL,
        isValidKey: validation.isValidOpenAIKey,
        keyFormat: 'elle commence par "sk-"',
        keyPlaceholder: 'sk-...',
        keyUrl: 'platform.openai.com/api-keys'
    },
    Gemini: {
        label: 'Google Gemini',
        envKey: 'GEMINI_API_KEY',
        envModel: 'GEMINI_MODEL',
        defaultModel: constants.DEFAULT_GEMINI_MODEL,
        baseUrl: constants.GEMINI_BASE_URL,
        auth: 'google',
        modelsPath: '/models?pageSize=1000',
        // L'identifiant est inséré dans l'URL (/models/<id>:generateContent) : pas de "/"
        modelPattern: /^[A-Za-z0-9][\w.-]*$/,
        parseModels: data => (data.models || [])
            .filter(model => (model.supportedGenerationMethods || []).includes('generateContent'))
            .map(model => String(model.name || '').replace(/^models\//, '')),
        isValidKey: validation.isValidGeminiKey,
        keyPlaceholder: 'AIza...',
        keyUrl: 'aistudio.google.com/apikey'
    },
    DeepSeek: {
        label: 'DeepSeek',
        envKey: 'DEEPSEEK_API_KEY',
        envModel: 'DEEPSEEK_MODEL',
        defaultModel: constants.DEFAULT_DEEPSEEK_MODEL,
        baseUrl: constants.DEEPSEEK_BASE_URL,
        isValidKey: validation.isValidDeepSeekKey,
        keyFormat: 'elle commence par "sk-"',
        keyPlaceholder: 'sk-...',
        keyUrl: 'platform.deepseek.com/api_keys'
    },
    Groq: {
        label: 'Groq',
        envKey: 'GROQ_API_KEY',
        envModel: 'GROQ_MODEL',
        defaultModel: constants.DEFAULT_GROQ_MODEL,
        baseUrl: constants.GROQ_BASE_URL,
        isValidKey: validation.isValidGroqKey,
        keyPlaceholder: 'gsk_...',
        keyUrl: 'console.groq.com/keys'
    },
    Mistral: {
        label: 'Mistral',
        envKey: 'MISTRAL_API_KEY',
        envModel: 'MISTRAL_MODEL',
        defaultModel: constants.DEFAULT_MISTRAL_MODEL,
        baseUrl: constants.MISTRAL_BASE_URL,
        isValidKey: validation.isValidMistralKey,
        keyPlaceholder: '',
        keyUrl: 'console.mistral.ai/api-keys'
    },
    Kimi: {
        label: 'Kimi (Moonshot)',
        envKey: 'KIMI_API_KEY',
        envModel: 'KIMI_MODEL',
        defaultModel: constants.DEFAULT_KIMI_MODEL,
        baseUrl: constants.KIMI_BASE_URL,
        isValidKey: validation.isValidKimiKey,
        keyFormat: 'elle commence par "sk-"',
        keyPlaceholder: 'sk-...',
        keyUrl: 'platform.moonshot.cn'
    },
    OpenRouter: {
        label: 'OpenRouter',
        envKey: 'OPENROUTER_API_KEY',
        envModel: 'OPENROUTER_MODEL',
        defaultModel: constants.DEFAULT_OPENROUTER_MODEL,
        baseUrl: constants.OPENROUTER_BASE_URL,
        // /models est public : /key est le seul endpoint qui vérifie la clé
        checkPath: '/key',
        modelPattern: /^[\w.-]+\/[\w.:-]+$/,
        modelFormat: 'fournisseur/modele',
        isValidKey: validation.isValidOpenRouterKey,
        keyFormat: 'elle commence par "sk-or-"',
        keyPlaceholder: 'sk-or-v1-...',
        keyUrl: 'openrouter.ai/keys'
    }
};

const NAMES = Object.keys(PROVIDERS);

// Cache mémoire : chargé au démarrage (load), mis à jour à chaque enregistrement
const uiValues = Object.fromEntries(NAMES.map(name => [name, { apiKey: null, model: null }]));

const apiKeySetting = name => `${name.toLowerCase()}_api_key`;
const modelSetting = name => `${name.toLowerCase()}_model`;

function getDefinition(name) {
    const definition = PROVIDERS[name];
    if (!definition) throw new Error(`Provider inconnu : ${name}`);
    return definition;
}

/**
 * Retourne le nom exact d'un provider (insensible à la casse), ou null s'il n'a pas de clé API
 */
function resolveName(name) {
    const lower = String(name || '').toLowerCase();
    return NAMES.find(candidate => candidate.toLowerCase() === lower) || null;
}

/**
 * Re-chiffre avec AI_SETTINGS_KEY une clé encore chiffrée avec la clé dérivée de JWT_SECRET
 * (best effort : en cas d'échec, la clé reste lisible et sera re-chiffrée au prochain chargement)
 */
async function reencryptApiKey(name, apiKey) {
    try {
        await saveSetting(apiKeySetting(name), encrypt(apiKey));
        logger.info(`Clé ${name} re-chiffrée avec AI_SETTINGS_KEY`);
    } catch (error) {
        logger.warn(`Re-chiffrement de la clé ${name} impossible`, { error: error.message });
    }
}

/**
 * Charge les paramètres enregistrés depuis la base (au démarrage du serveur, cf. aiSettingsLoader.js)
 */
async function load() {
    const settings = await loadSettings(NAMES.flatMap(name => [apiKeySetting(name), modelSetting(name)]));
    for (const name of NAMES) {
        let apiKey = null;
        const storedKey = settings.get(apiKeySetting(name));
        if (storedKey) {
            try {
                const { value, needsReencrypt } = decryptWithInfo(storedKey);
                apiKey = value;
                if (needsReencrypt) await reencryptApiKey(name, apiKey);
            } catch (error) {
                // JWT_SECRET / AI_SETTINGS_KEY changé depuis l'enregistrement : la clé doit être ressaisie
                logger.warn(`Clé ${name} enregistrée illisible (JWT_SECRET ou AI_SETTINGS_KEY modifié ?)`, { error: error.message });
            }
        }
        uiValues[name] = { apiKey, model: settings.get(modelSetting(name)) || null };
    }
}

function getApiKey(name) {
    return uiValues[name]?.apiKey || process.env[getDefinition(name).envKey] || '';
}

/**
 * @returns {'ui'|'env'|null} Origine de la clé active
 */
function getApiKeySource(name) {
    if (uiValues[name]?.apiKey) return 'ui';
    return process.env[getDefinition(name).envKey] ? 'env' : null;
}

function isValidKeyFormat(name, apiKey) {
    return !!getDefinition(name).isValidKey(apiKey);
}

/**
 * Le provider a-t-il une clé utilisable (format valide) ?
 */
function isConfigured(name) {
    return isValidKeyFormat(name, getApiKey(name));
}

/**
 * Enregistre (chiffrée) la clé saisie dans l'interface
 * @param {string|null} apiKey - Clé API, ou null pour supprimer et revenir au .env
 */
async function setApiKey(name, apiKey) {
    getDefinition(name);
    await saveSetting(apiKeySetting(name), apiKey ? encrypt(apiKey) : null);
    uiValues[name] = { ...uiValues[name], apiKey: apiKey || null };
    logger.info(`Clé ${name} ${apiKey ? 'enregistrée depuis l\'interface' : 'supprimée (retour au .env)'}`);
}

function getDefaultModel(name) {
    const definition = getDefinition(name);
    return process.env[definition.envModel] || definition.defaultModel;
}

function getModel(name) {
    return uiValues[name]?.model || getDefaultModel(name);
}

function getModelSource(name) {
    return uiValues[name]?.model ? 'ui' : 'env';
}

function isValidModel(name, model) {
    const pattern = getDefinition(name).modelPattern || DEFAULT_MODEL_PATTERN;
    return typeof model === 'string' && model.length <= MAX_MODEL_LENGTH && pattern.test(model);
}

/**
 * Message d'erreur pour un identifiant de modèle invalide
 */
function getModelFormatHint(name) {
    const definition = getDefinition(name);
    return `${definition.modelFormat ? `format attendu : ${definition.modelFormat}, ` : ''}ex: ${definition.defaultModel}`;
}

/**
 * Enregistre le modèle choisi dans l'interface
 * @param {string|null} model - Identifiant du modèle, ou null pour revenir au défaut
 */
async function setModel(name, model) {
    getDefinition(name);
    await saveSetting(modelSetting(name), model || null);
    uiValues[name] = { ...uiValues[name], model: model || null };
    logger.info(`Modèle ${name} : ${model || '(défaut)'}`);
}

function authHeaders(definition, apiKey) {
    return definition.auth === 'google' ? { 'x-goog-api-key': apiKey } : { Authorization: `Bearer ${apiKey}` };
}

/**
 * Requête GET validant la clé (avant enregistrement et pour le statut « en ligne »)
 * @returns {{url: string, headers: Object}}
 */
function getCheckRequest(name, apiKey = getApiKey(name)) {
    const definition = getDefinition(name);
    const path = definition.checkPath || definition.modelsPath || '/models';
    return { url: `${definition.baseUrl}${path}`, headers: authHeaders(definition, apiKey) };
}

/**
 * Requête GET listant les modèles proposés par le provider
 * @returns {{url: string, headers: Object}}
 */
function getModelsRequest(name, apiKey = getApiKey(name)) {
    const definition = getDefinition(name);
    return { url: `${definition.baseUrl}${definition.modelsPath || '/models'}`, headers: authHeaders(definition, apiKey) };
}

/**
 * Extrait les identifiants de modèles de la réponse de getModelsRequest
 * @returns {string[]} Identifiants triés, sans doublon
 */
function parseModels(name, data) {
    const definition = getDefinition(name);
    const ids = definition.parseModels
        ? definition.parseModels(data || {})
        : ((data && data.data) || []).map(model => model.id);
    return [...new Set(ids.filter(id => typeof id === 'string' && id))].sort();
}

function maskApiKey(apiKey) {
    if (!apiKey) return '';
    return apiKey.length <= 12 ? '••••' : `${apiKey.slice(0, 9)}…${apiKey.slice(-4)}`;
}

/**
 * Paramètres affichables dans l'interface (la clé n'est jamais renvoyée en clair)
 */
function getPublicConfig(name) {
    const definition = getDefinition(name);
    const keyConfigured = isConfigured(name);
    return {
        name,
        label: definition.label,
        keyConfigured,
        keySource: keyConfigured ? getApiKeySource(name) : null,
        maskedKey: keyConfigured ? maskApiKey(getApiKey(name)) : '',
        keyPlaceholder: definition.keyPlaceholder,
        keyUrl: definition.keyUrl,
        model: getModel(name),
        modelSource: getModelSource(name),
        defaultModel: getDefaultModel(name)
    };
}

module.exports = {
    NAMES,
    resolveName,
    getLabel: name => getDefinition(name).label,
    getKeyFormat: name => getDefinition(name).keyFormat || '',
    load,
    getApiKey,
    getApiKeySource,
    isValidKeyFormat,
    isConfigured,
    setApiKey,
    getDefaultModel,
    getModel,
    getModelSource,
    isValidModel,
    getModelFormatHint,
    setModel,
    getCheckRequest,
    getModelsRequest,
    parseModels,
    getPublicConfig
};
