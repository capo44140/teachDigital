/**
 * Accès à la table ai_settings : paramètres IA enregistrés depuis l'interface
 * Les secrets (clés API) sont chiffrés en AES-256-GCM, clé dérivée de JWT_SECRET.
 */

const crypto = require('crypto');
const { getJwtSecret } = require('../../../lib/auth.js');

const CIPHER_PREFIX = 'v1';

function getPool() {
    return require('../../../lib/database.js').pool;
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
    loadSettings,
    saveSetting
};
