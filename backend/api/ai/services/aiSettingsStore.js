/**
 * Accès à la table ai_settings : paramètres IA enregistrés depuis l'interface
 *
 * Les secrets (clés API) sont chiffrés en AES-256-GCM. Format : "<version>:<iv>:<tag>:<données>"
 * - v2 : clé dérivée de AI_SETTINGS_KEY (variable dédiée, recommandée) ;
 * - v1 : clé dérivée de JWT_SECRET (format historique, utilisé si AI_SETTINGS_KEY est absente).
 * Une valeur v1 reste lisible ; si AI_SETTINGS_KEY est définie, elle est re-chiffrée en v2
 * au chargement (providerSettings.load) et à chaque enregistrement.
 */

const crypto = require('crypto');
const { getJwtSecret } = require('../../../lib/auth.js');
const logger = require('../../../lib/logger.js');

const PREFIX_JWT = 'v1';
const PREFIX_DEDICATED = 'v2';
const MIN_AI_SETTINGS_KEY_LENGTH = 32;

let shortKeyWarned = false;

function getPool() {
    return require('../../../lib/database.js').pool;
}

/**
 * Secret dédié AI_SETTINGS_KEY, ou null s'il est absent ou trop court (ignoré)
 */
function getDedicatedSecret() {
    const raw = String(process.env.AI_SETTINGS_KEY || '').trim();
    if (!raw) return null;
    if (raw.length < MIN_AI_SETTINGS_KEY_LENGTH) {
        if (!shortKeyWarned) {
            shortKeyWarned = true;
            logger.error(`AI_SETTINGS_KEY ignorée : ${MIN_AI_SETTINGS_KEY_LENGTH} caractères minimum (openssl rand -hex 32). Clé dérivée de JWT_SECRET utilisée.`);
        }
        return null;
    }
    return raw;
}

/**
 * AI_SETTINGS_KEY est-elle configurée (et valide) ?
 */
function hasDedicatedKey() {
    return getDedicatedSecret() !== null;
}

function getCipherKey(prefix) {
    if (prefix === PREFIX_DEDICATED) {
        const secret = getDedicatedSecret();
        if (!secret) throw new Error('AI_SETTINGS_KEY manquante : impossible de lire cette clé API');
        return crypto.createHash('sha256').update(`teachdigital-ai-settings-key:${secret}`).digest();
    }
    const secret = getJwtSecret();
    if (!secret) throw new Error('JWT_SECRET manquant : impossible de chiffrer la clé API');
    return crypto.createHash('sha256').update(`teachdigital-ai-settings:${secret}`).digest();
}

function encrypt(plainText) {
    const prefix = hasDedicatedKey() ? PREFIX_DEDICATED : PREFIX_JWT;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getCipherKey(prefix), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [prefix, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * Déchiffre une valeur et indique si elle doit être re-chiffrée avec AI_SETTINGS_KEY
 * @returns {{ value: string, needsReencrypt: boolean }}
 */
function decryptWithInfo(stored) {
    const [prefix, iv, tag, encrypted] = String(stored).split(':');
    if (![PREFIX_JWT, PREFIX_DEDICATED].includes(prefix) || !iv || !tag || !encrypted) {
        throw new Error('Format de clé chiffrée inconnu');
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', getCipherKey(prefix), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const value = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
    return { value, needsReencrypt: prefix === PREFIX_JWT && hasDedicatedKey() };
}

function decrypt(stored) {
    return decryptWithInfo(stored).value;
}

/**
 * @param {string[]} keys
 * @returns {Promise<Map<string, string>>} Valeurs enregistrées (clés absentes = non enregistrées)
 */
async function loadSettings(keys) {
    const result = await getPool().query('SELECT key, value FROM ai_settings WHERE key = ANY($1)', [keys]);
    return new Map(result.rows.map(row => [row.key, row.value]));
}

/**
 * Enregistre une valeur, ou la supprime si elle est vide (retour au .env / défaut)
 */
async function saveSetting(key, value) {
    if (!value) {
        await getPool().query('DELETE FROM ai_settings WHERE key = $1', [key]);
        return;
    }
    await getPool().query(`
        INSERT INTO ai_settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `, [key, value]);
}

module.exports = {
    encrypt,
    decrypt,
    decryptWithInfo,
    hasDedicatedKey,
    loadSettings,
    saveSetting
};
