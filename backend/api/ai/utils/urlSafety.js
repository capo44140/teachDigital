/**
 * Validation de l'URL du LLM local (LM Studio / Ollama) saisie depuis l'interface
 *
 * L'URL désigne un poste du réseau local : seules les URL http(s) sans identifiants sont
 * acceptées, et jamais une adresse « link-local » ou de métadonnées cloud (169.254.169.254,
 * fd00:ec2::254...) : le backend s'en servirait sinon pour lire des données internes (SSRF).
 */

const net = require('net');
const dns = require('dns');
const logger = require('../../../lib/logger.js');

const MAX_URL_LENGTH = 2048;
const DNS_TIMEOUT_MS = 2000;

// Noms d'hôtes des services de métadonnées cloud
const FORBIDDEN_HOSTNAMES = new Set(['metadata.google.internal', 'metadata.goog', 'metadata', 'instance-data', 'instance-data.ec2.internal']);

function isForbiddenIPv4(address) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const [a, b] = parts;
    // 169.254.0.0/16 : link-local (métadonnées cloud) ; 0.0.0.0/8 : « cette machine »
    return (a === 169 && b === 254) || a === 0;
}

/**
 * Décompose une adresse IPv6 en 8 groupes de 16 bits (null si invalide)
 */
function parseIPv6(address) {
    let value = address.toLowerCase();
    const zoneIndex = value.indexOf('%');
    if (zoneIndex !== -1) value = value.slice(0, zoneIndex);

    // IPv4 embarquée en fin d'adresse (::ffff:1.2.3.4)
    const lastColon = value.lastIndexOf(':');
    const tail = value.slice(lastColon + 1);
    if (tail.includes('.')) {
        if (net.isIP(tail) !== 4) return null;
        const [a, b, c, d] = tail.split('.').map(Number);
        value = `${value.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
    }

    const halves = value.split('::');
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(':') : [];
    const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = 8 - head.length - rest.length;
    if (halves.length === 1 && missing !== 0) return null;
    if (missing < 0) return null;
    const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest].map(group => parseInt(group, 16));
    if (groups.length !== 8 || groups.some(group => !Number.isInteger(group) || group < 0 || group > 0xffff)) return null;
    return groups;
}

function isForbiddenIPv6(address) {
    const groups = parseIPv6(address);
    if (!groups) return false;
    // :: (adresse non spécifiée)
    if (groups.every(group => group === 0)) return true;
    // fe80::/10 : link-local
    if ((groups[0] & 0xffc0) === 0xfe80) return true;
    // fd00:ec2::254 : service de métadonnées AWS (IPv6)
    if (groups[0] === 0xfd00 && groups[1] === 0x0ec2 && groups.slice(2, 7).every(group => group === 0) && groups[7] === 0x254) return true;
    // IPv4 mappée (::ffff:a.b.c.d) : on vérifie l'IPv4 embarquée
    const isMapped = groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff;
    if (isMapped) {
        const ipv4 = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join('.');
        return isForbiddenIPv4(ipv4);
    }
    return false;
}

/**
 * Adresse IP interdite (link-local, métadonnées cloud, non spécifiée) ?
 */
function isForbiddenAddress(address) {
    const family = net.isIP(address);
    if (family === 4) return isForbiddenIPv4(address);
    if (family === 6) return isForbiddenIPv6(address);
    return false;
}

async function lookupAll(hostname) {
    let timer = null;
    try {
        return await Promise.race([
            dns.promises.lookup(hostname, { all: true }),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Délai de résolution DNS dépassé')), DNS_TIMEOUT_MS);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Vérifie l'URL du LLM local
 * @param {string} baseUrl - URL saisie (sans "/" final)
 * @returns {Promise<{ok: true, url: string}|{ok: false, message: string}>}
 */
async function validateLocalLLMUrl(baseUrl) {
    if (typeof baseUrl !== 'string' || !baseUrl || baseUrl.length > MAX_URL_LENGTH) {
        return { ok: false, message: 'URL invalide (ex: http://192.168.1.20:1234/v1)' };
    }

    let parsed;
    try {
        parsed = new URL(baseUrl);
    } catch {
        return { ok: false, message: 'URL invalide (ex: http://192.168.1.20:1234/v1)' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, message: 'URL invalide : seules les adresses http:// ou https:// sont acceptées (ex: http://192.168.1.20:1234/v1)' };
    }
    if (parsed.username || parsed.password) {
        return { ok: false, message: 'URL invalide : elle ne doit pas contenir d\'identifiants' };
    }

    const forbidden = { ok: false, message: 'Adresse non autorisée : indiquez l\'adresse du poste LM Studio sur le réseau local (adresses link-local et de métadonnées cloud refusées)' };

    // [fd00:ec2::254] → fd00:ec2::254 ; nom d'hôte sans point final
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (FORBIDDEN_HOSTNAMES.has(hostname)) return forbidden;

    if (net.isIP(hostname)) {
        return isForbiddenAddress(hostname) ? forbidden : { ok: true, url: baseUrl };
    }

    // Nom d'hôte : on vérifie les adresses vers lesquelles il pointe
    try {
        const addresses = await lookupAll(hostname);
        if (addresses.some(entry => isForbiddenAddress(entry.address))) {
            return forbidden;
        }
    } catch (error) {
        // Nom non résolu depuis le conteneur (nom du réseau local...) : accepté, l'appel échouera simplement
        logger.warn('URL LM Studio : nom d\'hôte non résolu, accepté sans vérification des adresses', { error: error.code || error.message });
    }
    return { ok: true, url: baseUrl };
}

module.exports = {
    validateLocalLLMUrl,
    isForbiddenAddress
};
