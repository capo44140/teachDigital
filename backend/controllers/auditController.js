const { default: sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

// Handler des logs d'audit
async function handleAudit(req, res) {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // POST /api/audit/logs - Créer un log d'audit
        if (pathname === '/api/audit/logs' && req.method === 'POST') {
            const { action, userId, category, level = 'info', details = {}, ipAddress, userAgent } = req.body;

            if (!action || !category) {
                res.status(400).json({
                    success: false,
                    message: 'Action et category sont requis'
                });
                return;
            }

            // Convertir userId en entier ou NULL si c'est "system" ou une chaîne non numérique
            let safeUserId = null;
            if (userId) {
                if (userId === 'system' || userId === 'unknown') {
                    safeUserId = null; // Les logs système n'ont pas d'user_id
                } else {
                    const userIdNum = parseInt(userId, 10);
                    if (!isNaN(userIdNum)) {
                        safeUserId = userIdNum;
                    } else {
                        // Si userId n'est pas un nombre valide, utiliser NULL
                        safeUserId = null;
                        console.warn(`⚠️ userId invalide reçu: "${userId}", utilisation de NULL`);
                    }
                }
            }

            const result = await withQueryTimeout(
                sql`
          INSERT INTO audit_logs (
            action, user_id, category, level, details, ip_address, user_agent, created_at
          )
          VALUES (
            ${action}, ${safeUserId}, ${category}, ${level}, 
            ${JSON.stringify(details)}::jsonb, ${ipAddress || null}, ${userAgent || null}, 
            CURRENT_TIMESTAMP
          )
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'création du log d\'audit'
            );

            res.status(201).json({
                success: true,
                message: 'Log d\'audit créé avec succès',
                data: { log: result[0] }
            });

            // GET /api/audit/logs - Récupérer les logs d'audit
        } else if (pathname === '/api/audit/logs' && req.method === 'GET') {
            // Authentification requise pour GET
            const user = authenticateToken(req);

            const userId = url.searchParams.get('userId');
            const category = url.searchParams.get('category');
            const level = url.searchParams.get('level');
            const limit = parseInt(url.searchParams.get('limit') || '100', 10);
            const offset = parseInt(url.searchParams.get('offset') || '0', 10);

            // Construire la requête SELECT avec filtres
            let queryText = `
        SELECT id, action, user_id, category, level, details, ip_address, user_agent, created_at 
        FROM audit_logs 
        WHERE 1=1
      `;
            const params = [];

            if (userId) {
                params.push(userId);
                queryText += ` AND user_id = $${params.length}`;
            }
            if (category) {
                params.push(category);
                queryText += ` AND category = $${params.length}`;
            }
            if (level) {
                params.push(level);
                queryText += ` AND level = $${params.length}`;
            }

            params.push(limit);
            params.push(offset);
            queryText += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

            const logs = await withQueryTimeout(
                sql(queryText, params),
                TIMEOUTS.STANDARD,
                'récupération des logs d\'audit'
            );

            // Parser les détails JSON
            const parsedLogs = logs.map(log => ({
                ...log,
                details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
            }));

            res.status(200).json({
                success: true,
                message: 'Logs d\'audit récupérés avec succès',
                data: { logs: parsedLogs }
            });

            // GET /api/audit/stats - Statistiques de sécurité
        } else if (pathname === '/api/audit/stats' && req.method === 'GET') {
            // Authentification requise pour GET
            const user = authenticateToken(req);

            const days = parseInt(url.searchParams.get('days') || '7', 10);

            const stats = await withQueryTimeout(
                sql`
          SELECT 
            COUNT(*) FILTER (WHERE level = 'critical') as critical_count,
            COUNT(*) FILTER (WHERE level = 'error') as error_count,
            COUNT(*) FILTER (WHERE level = 'warning') as warning_count,
            COUNT(*) FILTER (WHERE level = 'info') as info_count,
            COUNT(*) FILTER (WHERE category = 'security') as security_count,
            COUNT(*) FILTER (WHERE category = 'authentication') as auth_count
          FROM audit_logs 
          WHERE created_at >= CURRENT_TIMESTAMP - (INTERVAL '1 day' * ${days})
        `,
                TIMEOUTS.STANDARD,
                'récupération des statistiques d\'audit'
            );

            res.status(200).json({
                success: true,
                message: 'Statistiques d\'audit récupérées avec succès',
                data: stats[0] || {}
            });

            // POST /api/audit/export - Exporter les logs
        } else if (pathname === '/api/audit/export' && req.method === 'POST') {
            // Authentification requise pour export
            const user = authenticateToken(req);

            const { filters = {} } = req.body;

            // Construire la requête avec filtres
            let queryText = `SELECT * FROM audit_logs WHERE 1=1`;
            const params = [];

            if (filters.userId) {
                params.push(filters.userId);
                queryText += ` AND user_id = $${params.length}`;
            }
            if (filters.category) {
                params.push(filters.category);
                queryText += ` AND category = $${params.length}`;
            }
            if (filters.level) {
                params.push(filters.level);
                queryText += ` AND level = $${params.length}`;
            }
            if (filters.startDate) {
                params.push(filters.startDate);
                queryText += ` AND created_at >= $${params.length}`;
            }
            if (filters.endDate) {
                params.push(filters.endDate);
                queryText += ` AND created_at <= $${params.length}`;
            }

            queryText += ` ORDER BY created_at DESC`;

            const logs = await withQueryTimeout(
                sql(queryText, params),
                TIMEOUTS.STANDARD,
                'export des logs d\'audit'
            );

            // Formater en CSV
            const csv = logs.map(log => {
                const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
                return `${log.id},${log.action},${log.user_id},${log.category},${log.level},"${details}",${log.ip_address || ''},${log.user_agent || ''},${log.created_at}`;
            }).join('\n');

            const csvHeader = 'id,action,user_id,category,level,details,ip_address,user_agent,created_at\n';

            res.status(200).json({
                success: true,
                message: 'Logs exportés avec succès',
                data: { export: csvHeader + csv }
            });

        } else {
            res.status(404).json({
                success: false,
                message: 'Endpoint audit non trouvé'
            });
        }

    } catch (error) {
        console.error('❌ Erreur dans handleAudit:', {
            message: error.message,
            stack: error.stack?.substring(0, 500),
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        const errorResponse = handleError(error, 'Erreur lors de la gestion des logs d\'audit');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

module.exports = {
    handleAudit
};
