const { pool } = require('../lib/database.js');
const { scopeForUser, canAccessProfile, visibleProfileCondition } = require('../lib/scope.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');

const ACTIVITY_COLUMNS = 'id, title, description, child_id, priority, due_date, type, status, difficulty_level, estimated_duration, target_age_group, subject_area, is_active, created_at, updated_at';

// Colonnes acceptées en écriture : les corps sont validés et normalisés (alias camelCase
// compris) par activityCreateSchema / activityUpdateSchema sur la route.
const WRITABLE_COLUMNS = new Set([
    'title', 'description', 'child_id', 'priority', 'due_date', 'type', 'status',
    'difficulty_level', 'estimated_duration', 'target_age_group', 'subject_area', 'is_active'
]);

function writableEntries(body) {
    return Object.entries(body || {}).filter(([column, value]) => WRITABLE_COLUMNS.has(column) && value !== undefined);
}

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows || []), timeout, operation);
}

// Une activité sans enfant (child_id NULL) est visible par tous les membres ;
// sinon l'enfant doit être accessible (jeton famille : un enfant ; jeton profil : le sien).
async function canSeeActivity(user, activity) {
    if (scopeForUser(user).isAdmin) return true;
    if (activity.child_id === null || activity.child_id === undefined) return scopeForUser(user).kind !== 'none';
    return canAccessProfile(user, activity.child_id);
}

// GET (activityListQuerySchema) / POST (parent, activityCreateSchema) /api/activities
async function handleActivities(req, res) {
    try {
        if (req.method === 'GET') {
            const { child_id: childFilter, status, priority, search } = req.query || {};
            const params = [];
            const conditions = [];

            if (childFilter !== undefined && childFilter !== '') {
                const childId = parseId(childFilter);
                if (!childId) return sendFailure(res, 400, 'child_id invalide', 'BAD_REQUEST');
                if (!(await canAccessProfile(req.user, childId))) {
                    return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
                }
                params.push(childId);
                conditions.push(`child_id = $${params.length}`);
            }
            if (status !== undefined && status !== '') {
                params.push(status);
                conditions.push(`status = $${params.length}`);
            }
            if (priority !== undefined && priority !== '') {
                params.push(priority);
                conditions.push(`priority = $${params.length}`);
            }
            if (typeof search === 'string' && search.trim()) {
                params.push(`%${search.trim()}%`);
                conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
            }
            // Hors parent : uniquement les activités des profils accessibles (ou sans enfant)
            const visibility = visibleProfileCondition(req.user, 'child_id', params);
            if (visibility) conditions.push(visibility);

            let queryText = `SELECT ${ACTIVITY_COLUMNS} FROM activities`;
            if (conditions.length > 0) queryText += ` WHERE ${conditions.join(' AND ')}`;
            queryText += ' ORDER BY created_at DESC';

            const activities = await query(queryText, params, 'récupération des activités', TIMEOUTS.DEFAULT);
            return res.status(200).json({
                success: true,
                message: 'Activités récupérées avec succès',
                data: { activities }
            });
        }

        if (req.method === 'POST') {
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
            }
            const entries = writableEntries(req.body);
            if (!req.body?.title) {
                return sendFailure(res, 400, 'Le titre est requis', 'VALIDATION_ERROR');
            }

            const rows = await query(
                `INSERT INTO activities (${entries.map(([column]) => column).join(', ')})
                 VALUES (${entries.map((_, index) => `$${index + 1}`).join(', ')})
                 RETURNING ${ACTIVITY_COLUMNS}`,
                entries.map(([, value]) => value),
                'création de l\'activité'
            );
            return res.status(201).json({
                success: true,
                message: 'Activité créée avec succès',
                data: { activity: rows[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des activités');
    }
}

// GET / PUT (parent, activityUpdateSchema) / DELETE (parent) /api/activities/:id
async function handleActivity(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID d\'activité invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            const rows = await query(`SELECT ${ACTIVITY_COLUMNS} FROM activities WHERE id = $1`, [id], 'récupération de l\'activité');
            // 404 aussi pour l'activité d'un profil inaccessible
            if (!rows[0] || !(await canSeeActivity(req.user, rows[0]))) {
                return sendFailure(res, 404, 'Activité non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Activité récupérée avec succès',
                data: { activity: rows[0] }
            });
        }

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
                `UPDATE activities SET ${entries.map(([column], index) => `${column} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $${params.length}
                 RETURNING ${ACTIVITY_COLUMNS}`,
                params,
                'mise à jour de l\'activité'
            );
            if (!rows[0]) {
                return sendFailure(res, 404, 'Activité non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Activité modifiée avec succès',
                data: { activity: rows[0] }
            });
        }

        if (req.method === 'DELETE') {
            const rows = await query('DELETE FROM activities WHERE id = $1 RETURNING id', [id], 'suppression de l\'activité');
            if (!rows[0]) {
                return sendFailure(res, 404, 'Activité non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Activité supprimée avec succès',
                data: { id }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de l\'activité');
    }
}

module.exports = {
    handleActivities,
    handleActivity
};
