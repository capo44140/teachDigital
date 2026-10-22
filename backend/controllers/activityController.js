const { pool } = require('../lib/database.js');
const { handleError, createErrorResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

const ACTIVITY_COLUMNS = 'id, title, description, child_id, priority, due_date, type, status, difficulty_level, estimated_duration, target_age_group, subject_area, is_active, created_at, updated_at';

const STATUSES = new Set(['active', 'paused', 'completed', 'cancelled']);
const PRIORITIES = new Set(['low', 'medium', 'high']);

// Clé API (camelCase ou snake_case) → colonne SQL
const UPDATABLE_FIELDS = {
    title: 'title',
    description: 'description',
    child_id: 'child_id',
    childId: 'child_id',
    priority: 'priority',
    due_date: 'due_date',
    dueDate: 'due_date',
    status: 'status',
    type: 'type',
    difficulty_level: 'difficulty_level',
    difficultyLevel: 'difficulty_level',
    estimated_duration: 'estimated_duration',
    estimatedDuration: 'estimated_duration',
    target_age_group: 'target_age_group',
    targetAgeGroup: 'target_age_group',
    subject_area: 'subject_area',
    subjectArea: 'subject_area',
    is_active: 'is_active',
    isActive: 'is_active'
};

const MAX_LENGTHS = {
    title: 255,
    description: 10000,
    type: 50,
    difficulty_level: 20,
    target_age_group: 20,
    subject_area: 100
};

function parseId(value) {
    const id = parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function parseText(value, field, { allowEmpty = true } = {}) {
    if (value === null) return { value: null };
    if (typeof value !== 'string') return { error: `Le champ ${field} doit être une chaîne de caractères` };
    const text = value.trim();
    if (!allowEmpty && !text) return { error: `Le champ ${field} est requis` };
    if (text.length > MAX_LENGTHS[field]) {
        return { error: `Le champ ${field} est trop long (${MAX_LENGTHS[field]} caractères maximum)` };
    }
    return { value: text };
}

function parseDate(value, field) {
    if (value === null || value === undefined || value === '') return { value: null };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { error: `Le champ ${field} n'est pas une date valide` };
    return { value: date };
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return null;
}

// Valide et normalise les champs d'une activité.
// partial = true pour PUT : seuls les champs fournis sont renvoyés.
function parseActivityPayload(body, { partial = false } = {}) {
    const source = body && typeof body === 'object' ? body : {};
    const values = {};

    for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
        if (source[key] === undefined) continue;
        const raw = source[key];

        if (column === 'title') {
            const parsed = parseText(raw, 'title', { allowEmpty: false });
            if (parsed.error) return parsed;
            values.title = parsed.value;
        } else if (column === 'description') {
            const parsed = parseText(raw, 'description');
            if (parsed.error) return parsed;
            values.description = parsed.value ?? '';
        } else if (column === 'child_id') {
            if (raw === null || raw === '') {
                values.child_id = null;
            } else {
                const id = parseId(raw);
                if (!id) return { error: 'child_id doit être un identifiant valide' };
                values.child_id = id;
            }
        } else if (column === 'due_date') {
            const parsed = parseDate(raw, 'due_date');
            if (parsed.error) return parsed;
            values.due_date = parsed.value;
        } else if (column === 'priority') {
            if (!PRIORITIES.has(raw)) return { error: 'priority doit valoir low, medium ou high' };
            values.priority = raw;
        } else if (column === 'status') {
            if (!STATUSES.has(raw)) return { error: 'status doit valoir active, paused, completed ou cancelled' };
            values.status = raw;
        } else if (column === 'estimated_duration') {
            const duration = parseInt(raw, 10);
            if (!Number.isInteger(duration) || duration < 0 || duration > 10000) {
                return { error: 'estimated_duration doit être un entier positif' };
            }
            values.estimated_duration = duration;
        } else if (column === 'is_active') {
            const parsed = parseBoolean(raw);
            if (parsed === null) return { error: 'is_active doit être un booléen' };
            values.is_active = parsed;
        } else {
            const parsed = parseText(raw, column);
            if (parsed.error) return parsed;
            values[column] = parsed.value ?? '';
        }
    }

    if (!partial) {
        if (!values.title) return { error: 'Le titre est requis' };
        // Valeurs par défaut : compatibilité avec les anciens clients (type/difficulty...)
        values.description = values.description ?? '';
        values.priority = values.priority || 'medium';
        values.status = values.status || 'active';
        values.type = values.type || 'task';
        values.difficulty_level = values.difficulty_level || 'medium';
        values.estimated_duration = values.estimated_duration ?? 30;
        values.target_age_group = values.target_age_group || '6-12';
        values.subject_area = values.subject_area || 'general';
        values.is_active = values.is_active !== false;
        values.child_id = values.child_id ?? null;
        values.due_date = values.due_date ?? null;
    }

    return { values };
}

function sendError(res, error, message) {
    const errorResponse = handleError(error, message);
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
}

// GET / POST /api/activities
async function handleActivities(req, res) {
    try {
        if (req.method === 'GET') {
            const params = [];
            const conditions = [];

            if (req.query?.child_id !== undefined && req.query.child_id !== '') {
                const childId = parseId(req.query.child_id);
                if (!childId) return res.status(400).json(createErrorResponse('child_id invalide', 'BAD_REQUEST'));
                params.push(childId);
                conditions.push(`child_id = $${params.length}`);
            }
            if (req.query?.status !== undefined && req.query.status !== '') {
                if (!STATUSES.has(req.query.status)) {
                    return res.status(400).json(createErrorResponse('status invalide', 'BAD_REQUEST'));
                }
                params.push(req.query.status);
                conditions.push(`status = $${params.length}`);
            }
            if (req.query?.priority !== undefined && req.query.priority !== '') {
                if (!PRIORITIES.has(req.query.priority)) {
                    return res.status(400).json(createErrorResponse('priority invalide', 'BAD_REQUEST'));
                }
                params.push(req.query.priority);
                conditions.push(`priority = $${params.length}`);
            }
            if (typeof req.query?.search === 'string' && req.query.search.trim()) {
                params.push(`%${req.query.search.trim()}%`);
                conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
            }

            let queryText = `SELECT ${ACTIVITY_COLUMNS} FROM activities`;
            if (conditions.length > 0) queryText += ` WHERE ${conditions.join(' AND ')}`;
            queryText += ' ORDER BY created_at DESC';

            const result = await withQueryTimeout(
                pool.query(queryText, params),
                TIMEOUTS.DEFAULT,
                'récupération des activités'
            );

            return res.status(200).json({
                success: true,
                message: 'Activités récupérées avec succès',
                data: { activities: result.rows || [] }
            });
        }

        if (req.method === 'POST') {
            if (req.user?.isAdmin !== true) {
                return res.status(403).json(createErrorResponse('Accès refusé - Admin requis', 'FORBIDDEN'));
            }

            const parsed = parseActivityPayload(req.body, { partial: false });
            if (parsed.error) {
                return res.status(400).json(createErrorResponse(parsed.error, 'VALIDATION_ERROR'));
            }

            const entries = Object.entries(parsed.values);
            const params = entries.map(([, value]) => value);
            const columns = entries.map(([column]) => column);
            const placeholders = entries.map((_, index) => `$${index + 1}`);

            const result = await withQueryTimeout(
                pool.query(
                    `INSERT INTO activities (${columns.join(', ')})
                     VALUES (${placeholders.join(', ')})
                     RETURNING ${ACTIVITY_COLUMNS}`,
                    params
                ),
                TIMEOUTS.STANDARD,
                'création de l\'activité'
            );

            return res.status(201).json({
                success: true,
                message: 'Activité créée avec succès',
                data: { activity: result.rows[0] }
            });
        }

        return res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des activités');
    }
}

// GET / PUT / DELETE /api/activities/:id
async function handleActivity(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return res.status(400).json(createErrorResponse('ID d\'activité invalide', 'BAD_REQUEST'));
        }

        if (req.method === 'GET') {
            const result = await withQueryTimeout(
                pool.query(`SELECT ${ACTIVITY_COLUMNS} FROM activities WHERE id = $1`, [id]),
                TIMEOUTS.STANDARD,
                'récupération de l\'activité'
            );

            if (!result.rows[0]) {
                return res.status(404).json(createErrorResponse('Activité non trouvée', 'NOT_FOUND'));
            }

            return res.status(200).json({
                success: true,
                message: 'Activité récupérée avec succès',
                data: { activity: result.rows[0] }
            });
        }

        if (req.user?.isAdmin !== true) {
            return res.status(403).json(createErrorResponse('Accès refusé - Admin requis', 'FORBIDDEN'));
        }

        if (req.method === 'PUT') {
            const parsed = parseActivityPayload(req.body, { partial: true });
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

            const result = await withQueryTimeout(
                pool.query(
                    `UPDATE activities SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $${params.length}
                     RETURNING ${ACTIVITY_COLUMNS}`,
                    params
                ),
                TIMEOUTS.STANDARD,
                'mise à jour de l\'activité'
            );

            if (!result.rows[0]) {
                return res.status(404).json(createErrorResponse('Activité non trouvée', 'NOT_FOUND'));
            }

            return res.status(200).json({
                success: true,
                message: 'Activité modifiée avec succès',
                data: { activity: result.rows[0] }
            });
        }

        if (req.method === 'DELETE') {
            const result = await withQueryTimeout(
                pool.query('DELETE FROM activities WHERE id = $1 RETURNING id', [id]),
                TIMEOUTS.STANDARD,
                'suppression de l\'activité'
            );

            if (!result.rows[0]) {
                return res.status(404).json(createErrorResponse('Activité non trouvée', 'NOT_FOUND'));
            }

            return res.status(200).json({
                success: true,
                message: 'Activité supprimée avec succès',
                data: { id }
            });
        }

        return res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de l\'activité');
    }
}

module.exports = {
    handleActivities,
    handleActivity
};
