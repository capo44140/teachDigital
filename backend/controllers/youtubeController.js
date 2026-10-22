const { pool } = require('../lib/database.js');
const { handleError, createErrorResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

const VIDEO_COLUMNS = 'id, url, video_id, title, description, category, age_group, is_active, created_at, updated_at';

// Champs modifiables via PUT : clé API (camelCase ou snake_case) → colonne SQL
const UPDATABLE_FIELDS = {
    url: 'url',
    videoId: 'video_id',
    video_id: 'video_id',
    title: 'title',
    description: 'description',
    category: 'category',
    ageGroup: 'age_group',
    age_group: 'age_group',
    isActive: 'is_active',
    is_active: 'is_active'
};

// Longueurs maximales : évite les payloads géants et les erreurs SQL obscures
const MAX_LENGTHS = {
    url: 2048,
    video_id: 64,
    title: 255,
    description: 5000,
    category: 100,
    age_group: 50
};

function parseId(value) {
    const id = parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return null;
}

function parseText(value, field) {
    if (value === null) return null;
    if (typeof value !== 'string') return { error: `Le champ ${field} doit être une chaîne de caractères` };
    const text = value.trim();
    if (text.length > MAX_LENGTHS[field]) {
        return { error: `Le champ ${field} est trop long (${MAX_LENGTHS[field]} caractères maximum)` };
    }
    return { value: text };
}

// Valide et normalise les champs fournis. `partial` = PUT (tous les champs optionnels).
function parseVideoPayload(body, { partial = false } = {}) {
    const source = body && typeof body === 'object' ? body : {};
    const values = {};

    for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
        if (source[key] === undefined) continue;

        if (column === 'is_active') {
            const parsed = parseBoolean(source[key]);
            if (parsed === null) return { error: 'is_active doit être un booléen' };
            values[column] = parsed;
            continue;
        }

        const parsed = parseText(source[key], column);
        if (parsed.error) return { error: parsed.error };
        if (!partial && column !== 'description' && !parsed.value) {
            return { error: `Le champ ${column} est requis` };
        }
        values[column] = parsed.value;
    }

    if (!partial) {
        for (const required of ['url', 'video_id', 'title']) {
            if (!values[required]) return { error: 'URL, video_id et titre sont requis' };
        }
    }

    return { values };
}

function sendError(res, error, message) {
    const errorResponse = handleError(error, message);
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
}

// GET / POST /api/youtube-videos
async function handleYoutubeVideos(req, res) {
    try {
        if (req.method === 'GET') {
            const rows = await withQueryTimeout(
                pool.query(`SELECT ${VIDEO_COLUMNS} FROM youtube_videos WHERE is_active = true ORDER BY created_at DESC`),
                TIMEOUTS.DEFAULT,
                'récupération des vidéos YouTube'
            );

            return res.status(200).json({
                success: true,
                message: 'Vidéos YouTube récupérées avec succès',
                data: { videos: rows.rows || [] }
            });
        }

        if (req.method === 'POST') {
            // Le routeur applique requireAdmin (revérifié en base) ; double garde ici
            if (req.user?.isAdmin !== true) {
                return res.status(403).json(createErrorResponse('Accès refusé - Admin requis', 'FORBIDDEN'));
            }

            const parsed = parseVideoPayload(req.body, { partial: false });
            if (parsed.error) {
                return res.status(400).json(createErrorResponse(parsed.error, 'VALIDATION_ERROR'));
            }

            const { url, video_id, title, description, category, age_group, is_active } = parsed.values;
            const rows = await withQueryTimeout(
                pool.query(
                    `INSERT INTO youtube_videos (url, video_id, title, description, category, age_group, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING ${VIDEO_COLUMNS}`,
                    [url, video_id, title, description ?? '', category || 'general', age_group || '6-12', is_active !== false]
                ),
                TIMEOUTS.STANDARD,
                'création de la vidéo YouTube'
            );

            return res.status(201).json({
                success: true,
                message: 'Vidéo YouTube créée avec succès',
                data: { video: rows.rows[0] }
            });
        }

        return res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des vidéos YouTube');
    }
}

// GET / PUT / DELETE /api/youtube-videos/:id
async function handleYoutubeVideo(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return res.status(400).json(createErrorResponse('ID de vidéo invalide', 'BAD_REQUEST'));
        }

        if (req.method === 'GET') {
            // Un enfant ne voit pas les vidéos désactivées par le parent
            const includeInactive = req.user?.isAdmin === true;
            const rows = await withQueryTimeout(
                pool.query(
                    `SELECT ${VIDEO_COLUMNS} FROM youtube_videos WHERE id = $1${includeInactive ? '' : ' AND is_active = true'}`,
                    [id]
                ),
                TIMEOUTS.STANDARD,
                'récupération de la vidéo YouTube'
            );

            if (!rows.rows[0]) {
                return res.status(404).json(createErrorResponse('Vidéo non trouvée', 'NOT_FOUND'));
            }

            return res.status(200).json({
                success: true,
                message: 'Vidéo YouTube récupérée avec succès',
                data: { video: rows.rows[0] }
            });
        }

        // PUT / DELETE : parents uniquement (requireAdmin sur la route)
        if (req.user?.isAdmin !== true) {
            return res.status(403).json(createErrorResponse('Accès refusé - Admin requis', 'FORBIDDEN'));
        }

        if (req.method === 'PUT') {
            const parsed = parseVideoPayload(req.body, { partial: true });
            if (parsed.error) {
                return res.status(400).json(createErrorResponse(parsed.error, 'VALIDATION_ERROR'));
            }

            const entries = Object.entries(parsed.values);
            if (entries.length === 0) {
                return res.status(400).json(createErrorResponse('Aucune modification fournie', 'BAD_REQUEST'));
            }

            const params = entries.map(([, value]) => value);
            const sets = entries.map(([column], index) => `${column} = $${index + 1}`);
            params.push(id);

            const rows = await withQueryTimeout(
                pool.query(
                    `UPDATE youtube_videos SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $${params.length}
                     RETURNING ${VIDEO_COLUMNS}`,
                    params
                ),
                TIMEOUTS.STANDARD,
                'mise à jour de la vidéo YouTube'
            );

            if (!rows.rows[0]) {
                return res.status(404).json(createErrorResponse('Vidéo non trouvée', 'NOT_FOUND'));
            }

            return res.status(200).json({
                success: true,
                message: 'Vidéo YouTube modifiée avec succès',
                data: { video: rows.rows[0] }
            });
        }

        if (req.method === 'DELETE') {
            const rows = await withQueryTimeout(
                pool.query('DELETE FROM youtube_videos WHERE id = $1 RETURNING id', [id]),
                TIMEOUTS.STANDARD,
                'suppression de la vidéo YouTube'
            );

            if (!rows.rows[0]) {
                return res.status(404).json(createErrorResponse('Vidéo non trouvée', 'NOT_FOUND'));
            }

            return res.status(200).json({
                success: true,
                message: 'Vidéo YouTube supprimée avec succès',
                data: { id }
            });
        }

        return res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de la vidéo YouTube');
    }
}

module.exports = {
    handleYoutubeVideos,
    handleYoutubeVideo
};
