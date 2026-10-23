/**
 * Configuration persistante pour OpenRouter
 * Permet d'enregistrer la clé API et le modèle depuis l'interface (table ai_settings).
 * La clé est chiffrée en base (AES-256-GCM, clé dérivée de JWT_SECRET).
 * Priorité : valeur enregistrée depuis l'interface > variable d'environnement > défaut.
 */

const crypto = require('crypto');
const { getJwtSecret } = require('../../../../lib/auth.js');
const { DEFAULT_OPENROUTER_MODEL } = require('../../utils/constants.js');

const API_KEY_SETTING = 'openrouter_api_key';
const MODEL_SETTING = 'openrouter_model';
const CIPHER_PREFIX = 'v1';

// Cache mémoire : chargé au démarrage (load), mis à jour à chaque enregistrement
let uiApiKey = null;
let uiModel = null;

function getPool() {
    return require('../../../../lib/database.js').pool;
}

function getCipherKey() {
    const secret = getJwtSecret();
    if (!secret) throw new Error('JWT_SECRET manquant : impossible de chiffrer la clé API');
    return crypto.createHash('sha256').update(`teachdigital-ai-settings:${secret}`).digest();
}

function encrypt(plainText) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getCipherKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [CIPHER_PREFIX, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

function decrypt(stored) {
    const [prefix, iv, tag, encrypted] = String(stored).split(':');
    if (prefix !== CIPHER_PREFIX || !iv || !tag || !encrypted) throw new Error('Format de clé chiffrée inconnu');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getCipherKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}

async function saveSetting(key, value) {
    await getPool().query(`
        INSERT INTO ai_settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `, [key, value]);
}

async function deleteSetting(key) {
    await getPool().query('DELETE FROM ai_settings WHERE key = $1', [key]);
}

module.exports = {
    /**
     * Charge la configuration enregistrée depuis la base (appelé au démarrage du serveur)
     */
    async load() {
        const result = await getPool().query(
            'SELECT key, value FROM ai_settings WHERE key = ANY($1)',
            [[API_KEY_SETTING, MODEL_SETTING]]
        );
        uiApiKey = null;
        uiModel = null;
        for (const row of result.rows) {
            if (row.key === MODEL_SETTING) uiModel = row.value || null;
            if (row.key === API_KEY_SETTING) {
                try {
                    uiApiKey = decrypt(row.value);
                } catch (error) {
                    // JWT_SECRET changé depuis l'enregistrement : la clé doit être ressaisie
                    console.warn('⚠️ Clé OpenRouter enregistrée illisible (JWT_SECRET modifié ?) :', error.message);
                }
            }
        }
    },

    /**
     * Retourne la clé API active (interface > OPENROUTER_API_KEY)
     */
    getApiKey() {
        return uiApiKey || process.env.OPENROUTER_API_KEY || '';
    },

    /**
     * Retourne la source de la clé : 'ui', 'env' ou null si aucune clé
     */
    getApiKeySource() {
        if (uiApiKey) return 'ui';
        return process.env.OPENROUTER_API_KEY ? 'env' : null;
    },

    /**
     * Retourne la clé masquée pour affichage (ex: sk-or-v1-…a1b2)
     */
    getMaskedApiKey() {
        const key = this.getApiKey();
        if (!key) return '';
        return key.length <= 12 ? '••••' : `${key.slice(0, 9)}…${key.slice(-4)}`;
    },

    /**
     * Enregistre (chiffrée) la clé API saisie dans l'interface
     * @param {string|null} apiKey - Clé API, ou null pour supprimer et revenir au .env
     */
    async setApiKey(apiKey) {
        if (apiKey) {
            await saveSetting(API_KEY_SETTING, encrypt(apiKey));
        } else {
            await deleteSetting(API_KEY_SETTING);
        }
        uiApiKey = apiKey || null;
        console.log(`🔑 Clé OpenRouter ${apiKey ? 'enregistrée depuis l\'interface' : 'supprimée (retour au .env)'}`);
    },

    /**
     * Retourne le modèle actif (interface > OPENROUTER_MODEL > défaut)
     */
    getModel() {
        return uiModel || this.getDefaultModel();
    },

    getModelSource() {
        return uiModel ? 'ui' : 'env';
    },

    getDefaultModel() {
        return process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    },

    /**
     * Enregistre le modèle choisi dans l'interface
     * @param {string|null} model - Identifiant OpenRouter (ex: "openai/gpt-4o-mini"), ou null pour le défaut
     */
    async setModel(model) {
        if (model) {
            await saveSetting(MODEL_SETTING, model);
        } else {
            await deleteSetting(MODEL_SETTING);
        }
        uiModel = model || null;
        console.log(`🔄 Modèle OpenRouter : ${model || '(défaut .env)'}`);
    }
};
