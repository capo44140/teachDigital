const { pool } = require('../lib/database.js');
const { canAccessProfile } = require('../lib/scope.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');

// Les notifications d'un profil parent (demandes de profil, alertes de sécurité,
// résultats des enfants) ne sont jamais accessibles avec un jeton famille ou enfant :
// toutes les routes passent par canAccessProfile.

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows), timeout, operation);
}

function parseIsRead(value) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
}

// GET /notifications (notificationListQuerySchema) — POST /notifications (parent)
async function handleNotifications(req, res) {
    try {
        if (req.method === 'GET') {
            const { profileId, isRead, type } = req.query || {};

            // Sans profileId explicite : les notifications du profil connecté
            const targetProfileId = parseId(profileId ?? req.user?.profileId);
            if (!targetProfileId) {
                return sendFailure(res, 400, 'ID de profil requis', 'BAD_REQUEST');
            }
            if (!(await canAccessProfile(req.user, targetProfileId))) {
                return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
            }

            const params = [targetProfileId];
            let queryText = `
                SELECT n.id, n.type, n.title, n.message, n.data, n.is_read, n.created_at,
                       p.name as profile_name
                FROM notifications n
                JOIN profiles p ON n.profile_id = p.id
                WHERE n.profile_id = $1`;

            const readFilter = parseIsRead(isRead);
            if (readFilter !== undefined) {
                params.push(readFilter);
                queryText += ` AND n.is_read = $${params.length}`;
            }
            if (typeof type === 'string' && type) {
                params.push(type);
                queryText += ` AND n.type = $${params.length}`;
            }
            queryText += ' ORDER BY n.created_at DESC LIMIT 500';

            const notifications = await query(queryText, params, 'récupération des notifications', TIMEOUTS.DEFAULT);
            return res.status(200).json({
                success: true,
                message: 'Notifications récupérées avec succès',
                data: { notifications }
            });
        }

        if (req.method === 'POST') {
            // requireAdmin + notificationCreateSchema sur la route ; double garde ici
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
            }
            const { profileId, type, title, message, data } = req.body || {};
            const targetId = parseId(profileId);
            if (!targetId || !type || !title || !message) {
                return sendFailure(res, 400, 'profileId, type, title et message requis', 'VALIDATION_ERROR');
            }

            const profile = await query('SELECT id FROM profiles WHERE id = $1', [targetId], 'vérification du profil');
            if (!profile[0]) {
                return sendFailure(res, 404, 'Profil non trouvé', 'NOT_FOUND');
            }

            const result = await query(
                `INSERT INTO notifications (profile_id, type, title, message, data)
                 VALUES ($1, $2, $3, $4, $5::jsonb)
                 RETURNING *`,
                [targetId, type, title, message, data === undefined || data === null ? null : JSON.stringify(data)],
                'création de la notification'
            );
            return res.status(201).json({
                success: true,
                message: 'Notification créée avec succès',
                data: { notification: result[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des notifications');
    }
}

// GET / PUT (notificationUpdateSchema) / DELETE /notifications/:id
async function handleNotification(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID de notification invalide', 'BAD_REQUEST');
        }
        if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }

        const rows = await query(
            `SELECT n.id, n.profile_id, n.type, n.title, n.message, n.data, n.is_read, n.created_at,
                    p.name as profile_name
             FROM notifications n
             JOIN profiles p ON n.profile_id = p.id
             WHERE n.id = $1`,
            [id],
            'récupération de la notification'
        );

        // 404 aussi quand la notification appartient à un profil inaccessible
        // (ne pas révéler son existence)
        if (!rows[0] || !(await canAccessProfile(req.user, rows[0].profile_id))) {
            return sendFailure(res, 404, 'Notification non trouvée', 'NOT_FOUND');
        }

        if (req.method === 'GET') {
            return res.status(200).json({
                success: true,
                message: 'Notification récupérée avec succès',
                data: { notification: rows[0] }
            });
        }

        if (req.method === 'PUT') {
            const isRead = parseIsRead(req.body?.isRead);
            if (isRead === undefined) {
                return sendFailure(res, 400, 'isRead doit être un booléen', 'VALIDATION_ERROR');
            }
            const result = await query(
                `UPDATE notifications SET is_read = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [isRead, id],
                'mise à jour de la notification'
            );
            return res.status(200).json({
                success: true,
                message: 'Notification modifiée avec succès',
                data: { notification: result[0] }
            });
        }

        const result = await query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id], 'suppression de la notification');
        return res.status(200).json({
            success: true,
            message: 'Notification supprimée avec succès',
            data: { notification: result[0] }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de la notification');
    }
}

// POST /api/notifications/mark-all-read (markAllNotificationsReadSchema)
// Marque comme lues toutes les notifications d'un profil (le sien par défaut).
async function handleMarkAllNotificationsRead(req, res) {
    try {
        if (req.method !== 'POST') {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }

        const profileId = parseId(req.body?.profileId ?? req.user?.profileId);
        if (!profileId) {
            return sendFailure(res, 400, 'ID de profil requis', 'BAD_REQUEST');
        }
        if (!(await canAccessProfile(req.user, profileId))) {
            return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
        }

        const rows = await query(
            `UPDATE notifications
             SET is_read = true, updated_at = CURRENT_TIMESTAMP
             WHERE profile_id = $1 AND is_read = false
             RETURNING id`,
            [profileId],
            'marquage de toutes les notifications comme lues'
        );

        return res.status(200).json({
            success: true,
            message: 'Notifications marquées comme lues',
            data: { profileId, updated: rows.length }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors du marquage des notifications');
    }
}

module.exports = {
    handleNotifications,
    handleNotification,
    handleMarkAllNotificationsRead
};
