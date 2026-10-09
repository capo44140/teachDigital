const { default: sql } = require('../lib/database.js');
const { authenticateToken, canActForProfile } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

// Handler des notifications
async function handleNotifications(req, res) {
    try {
        if (req.method === 'GET') {
            // Parser les query parameters depuis l'URL
            const url = new URL(req.url, `http://${req.headers.host}`);
            const profileId = url.searchParams.get('profileId');
            const isRead = url.searchParams.get('isRead');
            const type = url.searchParams.get('type');

            let queryText = `
        SELECT 
          n.id, n.type, n.title, n.message, n.data, 
          n.is_read, n.created_at,
          p.name as profile_name
        FROM notifications n
        JOIN profiles p ON n.profile_id = p.id
        WHERE 1=1
      `;
            const params = [];

            // Sans profileId explicite : les notifications du profil connecté
            const targetProfileId = parseInt(profileId || req.user?.profileId, 10);
            if (!Number.isInteger(targetProfileId) || targetProfileId <= 0) {
                res.status(400).json({ success: false, message: 'ID de profil requis' });
                return;
            }
            if (!canActForProfile(req.user, targetProfileId)) {
                res.status(403).json({ success: false, message: 'Accès refusé', code: 'FORBIDDEN' });
                return;
            }
            params.push(targetProfileId);
            queryText += ` AND n.profile_id = $${params.length}`;

            // searchParams.get renvoie null (et non undefined) quand le filtre est absent
            if (isRead !== null) {
                params.push(isRead === 'true');
                queryText += ` AND n.is_read = $${params.length}`;
            }

            if (type) {
                params.push(type);
                queryText += ` AND n.type = $${params.length}`;
            }

            queryText += ` ORDER BY n.created_at DESC`;
            const notifications = await withQueryTimeout(sql(queryText, params), TIMEOUTS.DEFAULT, 'récupération des notifications');

            res.status(200).json({
                success: true,
                message: 'Notifications récupérées avec succès',
                data: { notifications }
            });

        } else if (req.method === 'POST') {
            // Authentification requise pour POST
            const user = authenticateToken(req);

            if (!user.isAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Admin requis'
                });
                return;
            }

            const { profileId, type, title, message, data } = req.body;

            if (!profileId || !type || !title || !message) {
                res.status(400).json({
                    success: false,
                    message: 'profileId, type, title et message requis'
                });
                return;
            }

            const profile = await withQueryTimeout(
                sql`
          SELECT id FROM profiles WHERE id = ${profileId}
        `,
                TIMEOUTS.STANDARD,
                'vérification du profil'
            );

            if (!profile[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Profil non trouvé'
                });
                return;
            }

            const result = await withQueryTimeout(
                sql`
          INSERT INTO notifications (profile_id, type, title, message, data)
          VALUES (${profileId}, ${type}, ${title}, ${message}, ${data ? JSON.stringify(data) : null})
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'création de la notification'
            );

            res.status(201).json({
                success: true,
                message: 'Notification créée avec succès',
                data: { notification: result[0] }
            });

        } else {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
        }

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la gestion des notifications');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler d'une notification spécifique
async function handleNotification(req, res) {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID de notification requis'
            });
            return;
        }

        if (req.method === 'GET') {
            console.log(`🔍 Récupération de la notification ID: ${id} (type: ${typeof id})`);

            const notifications = await withQueryTimeout(
                sql`
          SELECT 
            n.id, n.profile_id, n.type, n.title, n.message, n.data, 
            n.is_read, n.created_at,
            p.name as profile_name
          FROM notifications n
          JOIN profiles p ON n.profile_id = p.id
          WHERE n.id = ${parseInt(id, 10)}
        `,
                TIMEOUTS.STANDARD,
                'récupération de la notification'
            );

            // 404 aussi quand la notification appartient à un autre profil (ne pas révéler son existence)
            if (!notifications[0] || !canActForProfile(req.user, notifications[0].profile_id)) {
                res.status(404).json({
                    success: false,
                    message: 'Notification non trouvée'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Notification récupérée avec succès',
                data: { notification: notifications[0] }
            });

        } else if (req.method === 'PUT') {
            // Authentification requise pour PUT
            const user = authenticateToken(req);

            const { isRead } = req.body;

            const existingNotification = await withQueryTimeout(
                sql`
          SELECT * FROM notifications WHERE id = ${parseInt(id)}
        `,
                TIMEOUTS.STANDARD,
                'vérification de la notification'
            );

            if (!existingNotification[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Notification non trouvée'
                });
                return;
            }

            if (!canActForProfile(user, existingNotification[0].profile_id)) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé'
                });
                return;
            }

            const result = await withQueryTimeout(
                sql`
          UPDATE notifications 
          SET 
            is_read = COALESCE(${isRead}, is_read),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parseInt(id)}
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'mise à jour de la notification'
            );

            res.status(200).json({
                success: true,
                message: 'Notification modifiée avec succès',
                data: { notification: result[0] }
            });

        } else if (req.method === 'DELETE') {
            // Authentification requise pour DELETE
            const user = authenticateToken(req);

            const existingNotification = await withQueryTimeout(
                sql`
          SELECT * FROM notifications WHERE id = ${parseInt(id)}
        `,
                TIMEOUTS.STANDARD,
                'vérification de la notification'
            );

            if (!existingNotification[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Notification non trouvée'
                });
                return;
            }

            if (!canActForProfile(user, existingNotification[0].profile_id)) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé'
                });
                return;
            }

            const result = await withQueryTimeout(
                sql`
          DELETE FROM notifications 
          WHERE id = ${parseInt(id)}
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'suppression de la notification'
            );

            res.status(200).json({
                success: true,
                message: 'Notification supprimée avec succès',
                data: { notification: result[0] }
            });

        } else {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
        }

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la gestion de la notification');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

module.exports = {
    handleNotifications,
    handleNotification
};
