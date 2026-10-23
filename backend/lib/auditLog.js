/**
 * Écriture du journal d'audit (table audit_logs).
 * - insertAuditLog : écriture attendue (POST /audit/logs) ;
 * - recordAuditEvent : journalisation serveur « fire and forget » (connexions,
 *   verrouillages, quiz terminés) qui n'échoue jamais.
 * L'IP et le user-agent viennent toujours de la requête, jamais du corps.
 */
const { pool } = require('./database.js');
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');
const { getClientIp } = require('./rateLimit.js');

const MAX_DETAILS_LEN = 4000; // taille max du JSON sérialisé
const MAX_USER_AGENT_LEN = 512;
const MAX_IP_LEN = 45; // VARCHAR(45)

// JSON borné : au-delà de maxLength, on garde un extrait marqué « truncated »
function serializeDetails(details, maxLength = MAX_DETAILS_LEN) {
  let serialized;
  try {
    serialized = JSON.stringify(details ?? {});
  } catch (_error) {
    return '{}';
  }
  if (typeof serialized !== 'string') return '{}';
  if (serialized.length <= maxLength) return serialized;
  return JSON.stringify({ truncated: true, excerpt: serialized.slice(0, Math.max(0, maxLength - 64)) });
}

function requestMeta(req) {
  if (!req) return { ip: null, userAgent: null };
  const ip = getClientIp(req);
  const rawUserAgent = req.headers?.['user-agent'];
  return {
    ip: ip && ip !== 'unknown' ? String(ip).slice(0, MAX_IP_LEN) : null,
    userAgent: typeof rawUserAgent === 'string' && rawUserAgent ? rawUserAgent.slice(0, MAX_USER_AGENT_LEN) : null
  };
}

async function insertAuditLog({ action, category, level = 'info', userId = null, details = {}, req = null, maxDetailsLength = MAX_DETAILS_LEN }) {
  const { ip, userAgent } = requestMeta(req);
  const result = await withQueryTimeout(
    pool.query(
      `INSERT INTO audit_logs (action, user_id, category, level, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [action, userId ?? null, category, level, serializeDetails(details, maxDetailsLength), ip, userAgent]
    ),
    TIMEOUTS.STANDARD,
    'création du log d\'audit'
  );
  return result.rows[0];
}

function recordAuditEvent(event) {
  Promise.resolve()
    .then(() => insertAuditLog(event))
    .catch(error => console.error(`⚠️ Journal d'audit non enregistré (${event?.action}):`, error?.message || error));
}

module.exports = {
  MAX_DETAILS_LEN,
  serializeDetails,
  insertAuditLog,
  recordAuditEvent
};
