/**
 * Middleware pour parser FormData
 * Gère le parsing FormData pour Vercel Functions et Express
 */

/**
 * Parse FormData pour Vercel Functions
 * Vercel Functions avec @vercel/node peut parser FormData automatiquement
 * Cette fonction gère les deux cas : parsing automatique et manuel
 * 
 * @param {Object} req - Requête HTTP
 * @returns {Promise<Object>} Objet contenant { fields, files }
 */
async function parseFormData(req) {
    console.log('📦 parseFormData: Début du parsing');
    // Vérifier si c'est déjà un objet parsé (Express middleware ou Vercel)
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        // Si le body contient déjà les champs parsés par Express (format { fields, files })
        if (req.body.fields && req.body.files) {
            return req.body;
        }
        // Si le body contient déjà les champs, c'est que Vercel l'a déjà parsé
        if (req.body.file_0 || req.body.childProfile) {
            return req.body;
        }
    }

    // Vérifier si parsedFormData est disponible (parsed par Express middleware)
    if (req.parsedFormData && req.parsedFormData.fields && req.parsedFormData.files) {
        return req.parsedFormData;
    }

    // Si le body est un buffer ou une string, essayer de parser avec busboy
    let Busboy;
    try {
        // Essayer d'abord @fastify/busboy (recommandé pour Vercel)
        Busboy = require('@fastify/busboy');
        console.log('✅ @fastify/busboy chargé avec succès');
    } catch (e) {
        console.warn('⚠️ @fastify/busboy non disponible, tentative avec busboy standard...');
        // Si @fastify/busboy n'est pas disponible, essayer avec busboy standard
        try {
            Busboy = require('busboy');
            console.log('✅ busboy standard chargé avec succès');
        } catch (e2) {
            console.error('❌ Erreur lors du chargement de busboy:', e2.message);
            throw new Error('Impossible de parser FormData: busboy non disponible. Veuillez installer @fastify/busboy avec: npm install @fastify/busboy');
        }
    }

    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const fields = {};
        const files = [];

        busboy.on('file', (fieldname, file, info) => {
            // @fastify/busboy peut avoir différentes signatures selon la version
            // Support pour les deux formats possibles
            let filename, mimetype;
            if (info) {
                filename = info.filename || info.name || 'unknown';
                mimetype = info.mimeType || info.mimetype || 'application/octet-stream';
            } else {
                // Si info n'est pas fourni, utiliser les valeurs par défaut
                filename = 'unknown';
                mimetype = 'application/octet-stream';
            }

            const chunks = [];
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            file.on('end', () => {
                files.push({
                    fieldname,
                    filename,
                    mimetype,
                    buffer: Buffer.concat(chunks)
                });
            });
            file.on('error', (err) => {
                reject(err);
            });
        });

        busboy.on('field', (fieldname, value) => {
            fields[fieldname] = value;
        });

        busboy.on('finish', () => {
            resolve({ fields, files });
        });

        busboy.on('error', (err) => {
            reject(err);
        });

        // Parser le body
        // Pour Vercel Functions, le body peut être dans différentes formes
        if (req.body) {
            if (Buffer.isBuffer(req.body)) {
                // Body est un Buffer
                busboy.end(req.body);
            } else if (typeof req.body === 'string') {
                // Body est une string, convertir en Buffer
                busboy.end(Buffer.from(req.body, 'binary'));
            } else if (req.body instanceof Uint8Array) {
                // Body est un Uint8Array (cas Vercel)
                busboy.end(Buffer.from(req.body));
            } else {
                // Si c'est déjà un objet, essayer de le convertir
                console.warn('⚠️ Body est un objet, tentative de résolution directe');
                resolve(req.body);
            }
        } else {
            // Pour Vercel Functions, le body peut être dans req directement
            // Vérifier si req est un stream
            if (req.on && typeof req.pipe === 'function') {
                // req est un stream, le pipe vers busboy
                req.pipe(busboy);
            } else if (req.rawBody) {
                // Vercel peut mettre le body brut dans rawBody
                if (Buffer.isBuffer(req.rawBody)) {
                    busboy.end(req.rawBody);
                } else if (typeof req.rawBody === 'string') {
                    busboy.end(Buffer.from(req.rawBody, 'binary'));
                } else {
                    reject(new Error('rawBody dans un format non supporté'));
                }
            } else {
                // Aucun body disponible
                reject(new Error('Body vide et pas de stream disponible. Vérifiez que la requête contient bien des données FormData.'));
            }
        }
    });
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
