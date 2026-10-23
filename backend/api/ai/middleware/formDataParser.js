/**
 * Accès aux données multipart (FormData) des routes IA
 *
 * Le corps multipart est lu par le middleware de server.js (busboy, avec authentification
 * préalable et limites de taille) : il est disponible dans req.parsedFormData / req.body
 * sous la forme { fields, files }. Ce module ne relit jamais le flux de la requête.
 */

/**
 * @param {Object} req - Requête HTTP
 * @returns {Promise<{fields: Object, files: Array<{fieldname, filename, mimetype, buffer}>}>}
 */
async function parseFormData(req) {
    if (req.parsedFormData && req.parsedFormData.fields && req.parsedFormData.files) {
        return req.parsedFormData;
    }
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && req.body.fields && req.body.files) {
        return req.body;
    }
    const error = new Error('Données multipart non disponibles (corps non analysé par le serveur)');
    error.status = 400;
    error.publicMessage = 'Fichiers envoyés illisibles';
    error.code = 'BAD_REQUEST';
    throw error;
}

/**
 * Convertit un buffer en base64
 * @param {Buffer} buffer - Buffer à convertir
 * @returns {string} String base64
 */
function bufferToBase64(buffer) {
    return buffer.toString('base64');
}

module.exports = {
    parseFormData,
    bufferToBase64
};
