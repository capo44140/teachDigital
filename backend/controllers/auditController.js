const { pool } = require('../lib/database.js');
const { TOKEN_SCOPES } = require('../lib/auth.js');
const { insertAuditLog, MAX_DETAILS_LEN } = require('../lib/auditLog.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');

// Erreurs JavaScript remontées par le frontend : détails plus courts
const MAX_CLIENT_ERROR_DETAILS_LEN = 2000;
// Nombre maximal de lignes d'un export CSV
const MAX_EXPORT_ROWS = 10000;

const CSV_COLUMNS = ['id', 'action', 'user_id', 'category', 'level', 'details', 'ip_address', 'user_agent', 'created_at'];

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows), timeout, operation);
}

/**
 * Cellule CSV sûre : toujours entre guillemets (guillemets internes doublés), et
 * préfixée d'une apostrophe si elle commence par = + - @ tabulation ou retour chariot
 * (sinon un tableur l'interpréterait comme une formule : injection CSV).
 */
function csvCell(value) {
    let text;
    if (value === null || value === undefined) {
        text = '';
    } else if (value instanceof Date) {
        text = value.toISOString();
    } else if (typeof value === 'object') {
        text = JSON.stringify(value);
    } else {
        text = String(value);
    }
    if (/^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
    const lines = rows.map(row => CSV_COLUMNS.map(column => csvCell(row[column])).join(','));
    return [CSV_COLUMNS.join(','), ...lines].join('\n');
}

// Filtres communs (valeurs déjà validées par les schémas Zod de la route)
function buildFilters(filters, params) {
    const conditions = [];
    const userId = parseId(filters.userId);
    if (userId) {
        params.push(userId);
        conditions.push(`user_id = $${params.length}`);
    }
    if (filters.category) {
        params.push(filters.category);
        conditions.push(`category = $${params.length}`);
    }
    if (filters.level) {
        params.push(filters.level);
        conditions.push(`level = $${params.length}`);
    }
    if (filters.startDate) {
        params.push(filters.startDate);
        conditions.push(`created_at >= $${params.length}`);
    }
    if (filters.endDate) {
        params.push(filters.endDate);
        conditions.push(`created_at <= $${params.length}`);
    }
    return conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * POST /audit/logs (requireMember + limites de débit + auditLogCreateSchema).
 * Corps : { action, category, level?, details? } — action dans la liste blanche
 * (dont CLIENT_ERROR). userId vient du jeton (null pour un jeton famille) ;
 * userId / ipAddress / userAgent envoyés par le client sont ignorés.
 */
async function handleCreateAuditLog(req, res) {
    try {
        const { action, category, level = 'info', details } = req.body || {};
        if (!action || !category) {
            return sendFailure(res, 400, 'Action et catégorie requises', 'VALIDATION_ERROR');
        }
        const userId = req.user?.scope === TOKEN_SCOPES.PROFILE ? parseId(req.user.profileId) : null;

        const log = await insertAuditLog({
            action,
            category,
            level,
            userId,
            details: details ?? {},
            req,
            maxDetailsLength: action === 'CLIENT_ERROR' ? MAX_CLIENT_ERROR_DETAILS_LEN : MAX_DETAILS_LEN
        });

        return res.status(201).json({
            success: true,
            message: 'Log d\'audit créé avec succès',
            data: { log: { id: log?.id, action: log?.action, created_at: log?.created_at } }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la création du log d\'audit');
    }
}

// GET /audit/logs (parent, auditLogsQuerySchema : limit 1..500, offset borné)
async function handleAuditLogs(req, res) {
    try {
        const { limit = 100, offset = 0, ...filters } = req.query || {};
        const params = [];
        let queryText = `SELECT id, action, user_id, category, level, details, ip_address, user_agent, created_at
                         FROM audit_logs${buildFilters(filters, params)}`;
        params.push(Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500));
        params.push(Math.max(parseInt(offset, 10) || 0, 0));
        queryText += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const logs = await query(queryText, params, 'récupération des logs d\'audit');
        return res.status(200).json({
            success: true,
            message: 'Logs d\'audit récupérés avec succès',
            data: { logs }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la récupération des logs d\'audit');
    }
}

// GET /audit/stats (parent, auditStatsQuerySchema : days 1..365)
async function handleAuditStats(req, res) {
    try {
        const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 7, 1), 365);
        const stats = await query(
            `SELECT
               COUNT(*) FILTER (WHERE level = 'critical') as critical_count,
               COUNT(*) FILTER (WHERE level = 'error') as error_count,
               COUNT(*) FILTER (WHERE level = 'warning') as warning_count,
               COUNT(*) FILTER (WHERE level = 'info') as info_count,
               COUNT(*) FILTER (WHERE category = 'security') as security_count,
               COUNT(*) FILTER (WHERE category = 'authentication') as auth_count
             FROM audit_logs
             WHERE created_at >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * $1)`,
            [days],
            'récupération des statistiques d\'audit'
        );
        return res.status(200).json({
            success: true,
            message: 'Statistiques d\'audit récupérées avec succès',
            data: stats[0] || {}
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la récupération des statistiques d\'audit');
    }
}

// POST /audit/export (parent, auditExportSchema) : CSV échappé, au plus MAX_EXPORT_ROWS lignes
async function handleAuditExport(req, res) {
    try {
        const params = [];
        const queryText = `SELECT ${CSV_COLUMNS.join(', ')} FROM audit_logs${buildFilters(req.body?.filters || {}, params)}
                           ORDER BY created_at DESC LIMIT ${MAX_EXPORT_ROWS}`;
        const logs = await query(queryText, params, 'export des logs d\'audit', TIMEOUTS.LONG);
        return res.status(200).json({
            success: true,
            message: 'Logs exportés avec succès',
            data: { export: toCsv(logs) }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de l\'export des logs d\'audit');
    }
}

module.exports = {
    handleCreateAuditLog,
    handleAuditLogs,
    handleAuditStats,
    handleAuditExport,
    csvCell,
    toCsv
};
