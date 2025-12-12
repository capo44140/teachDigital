const { default: sql } = require('../lib/database.js');
const { handleError, createErrorResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

// Handler des vidéos YouTube
async function handleYoutubeVideos(req, res) {
    try {
        if (req.method === 'GET') {
            const videos = await withQueryTimeout(
                sql`
          SELECT 
            id, url, video_id, title, description, category,
            age_group, is_active, created_at, updated_at
          FROM youtube_videos 
          WHERE is_active = true
          ORDER BY created_at DESC
        `,
                TIMEOUTS.DEFAULT,
                'récupération des vidéos YouTube'
            );

            res.status(200).json({
                success: true,
                message: 'Vidéos YouTube récupérées avec succès',
                data: {
                    videos: videos || []
                }
            });

        } else if (req.method === 'POST') {
            const {
                url,
                video_id,
                title,
                description,
                category,
                age_group
            } = req.body;

            if (!url || !video_id || !title) {
                res.status(400).json({
                    success: false,
                    message: 'URL, video_id et titre sont requis'
                });
                return;
            }

            const newVideo = await withQueryTimeout(
                sql`
          INSERT INTO youtube_videos (
            url, video_id, title, description, category, age_group, is_active
          )
          VALUES (
            ${url}, ${video_id}, ${title}, ${description || ''}, 
            ${category || 'general'}, ${age_group || '6-12'}, true
          )
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'création de la vidéo YouTube'
            );

            res.status(201).json({
                success: true,
                message: 'Vidéo YouTube créée avec succès',
                data: {
                    video: newVideo[0]
                }
            });

        } else {
            res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
        }

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la gestion des vidéos YouTube');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

module.exports = {
    handleYoutubeVideos
};
