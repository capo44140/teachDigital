const { pool } = require('../lib/database.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');

const VIDEO_COLUMNS = 'id, url, video_id, title, description, category, age_group, is_active, created_at, updated_at';

// Colonnes acceptées en écriture : les corps sont validés et normalisés (alias camelCase
// compris) par youtubeVideoCreateSchema / youtubeVideoUpdateSchema sur la route.
const WRITABLE_COLUMNS = new Set(['url', 'video_id', 'title', 'description', 'category', 'age_group', 'is_active']);

function writableEntries(body) {
    return Object.entries(body || {}).filter(([column, value]) => WRITABLE_COLUMNS.has(column) && value !== undefined);
}

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows || []), timeout, operation);
}

// GET / POST (parent, youtubeVideoCreateSchema) /api/youtube-videos
// GET ?includeInactive=true : vidéos désactivées comprises, pour un parent seulement
// (gestion des vidéos : sans elles, une vidéo désactivée ne pourrait plus être réactivée)
async function handleYoutubeVideos(req, res) {
    try {
        if (req.method === 'GET') {
            const includeInactive = req.user?.isAdmin === true && req.query?.includeInactive === 'true';
            const videos = await query(
                `SELECT ${VIDEO_COLUMNS} FROM youtube_videos${includeInactive ? '' : ' WHERE is_active = true'} ORDER BY created_at DESC`,
                [],
                'récupération des vidéos YouTube',
                TIMEOUTS.DEFAULT
            );
            return res.status(200).json({
                success: true,
                message: 'Vidéos YouTube récupérées avec succès',
                data: { videos }
            });
        }

        if (req.method === 'POST') {
            // Le routeur applique requireAdmin (revérifié en base) ; double garde ici
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
            }
            const body = req.body || {};
            if (!body.url || !body.video_id || !body.title) {
                return sendFailure(res, 400, 'URL, video_id et titre sont requis', 'VALIDATION_ERROR');
            }
            const entries = writableEntries(body);
            const rows = await query(
                `INSERT INTO youtube_videos (${entries.map(([column]) => column).join(', ')})
                 VALUES (${entries.map((_, index) => `$${index + 1}`).join(', ')})
                 RETURNING ${VIDEO_COLUMNS}`,
                entries.map(([, value]) => value),
                'création de la vidéo YouTube'
            );
            return res.status(201).json({
                success: true,
                message: 'Vidéo YouTube créée avec succès',
                data: { video: rows[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des vidéos YouTube');
    }
}

// GET / PUT (parent, youtubeVideoUpdateSchema) / DELETE (parent) /api/youtube-videos/:id
async function handleYoutubeVideo(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID de vidéo invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            // Un enfant ne voit pas les vidéos désactivées par le parent
            const includeInactive = req.user?.isAdmin === true;
            const rows = await query(
                `SELECT ${VIDEO_COLUMNS} FROM youtube_videos WHERE id = $1${includeInactive ? '' : ' AND is_active = true'}`,
                [id],
                'récupération de la vidéo YouTube'
            );
            if (!rows[0]) {
                return sendFailure(res, 404, 'Vidéo non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Vidéo YouTube récupérée avec succès',
                data: { video: rows[0] }
            });
        }

        // PUT / DELETE : parents uniquement (requireAdmin sur la route)
        if (req.user?.isAdmin !== true) {
            return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
        }

        if (req.method === 'PUT') {
            const entries = writableEntries(req.body);
            if (entries.length === 0) {
                return sendFailure(res, 400, 'Aucune modification fournie', 'BAD_REQUEST');
            }
            const params = entries.map(([, value]) => value);
            params.push(id);

            const rows = await query(
                `UPDATE youtube_videos SET ${entries.map(([column], index) => `${column} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $${params.length}
                 RETURNING ${VIDEO_COLUMNS}`,
                params,
                'mise à jour de la vidéo YouTube'
            );
            if (!rows[0]) {
                return sendFailure(res, 404, 'Vidéo non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Vidéo YouTube modifiée avec succès',
                data: { video: rows[0] }
            });
        }

        if (req.method === 'DELETE') {
            const rows = await query('DELETE FROM youtube_videos WHERE id = $1 RETURNING id', [id], 'suppression de la vidéo YouTube');
            if (!rows[0]) {
                return sendFailure(res, 404, 'Vidéo non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Vidéo YouTube supprimée avec succès',
                data: { id }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de la vidéo YouTube');
    }
}

module.exports = {
    handleYoutubeVideos,
    handleYoutubeVideo
};
