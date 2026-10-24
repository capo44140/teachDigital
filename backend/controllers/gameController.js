const { pool } = require('../lib/database.js');
const { canAccessProfile } = require('../lib/scope.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');
const { computeStreaksFromDayKeys, startOfDay, startOfWeekMonday } = require('../lib/streaks.js');
const {
    GAMES,
    HEARTBEAT_MAX_GAP_SECONDS,
    findGame,
    normalizeRule,
    evaluateGameAccess,
    listConditionTypes
} = require('../lib/games.js');

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows || []), timeout, operation);
}

const toInt = value => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
};

// Tout ce qu'il faut pour évaluer l'accès aux jeux d'un profil, en une requête :
// statistiques des quiz terminés ($2 = début du jour, $3 = début de la semaine),
// règles fixées par le parent, temps joué aujourd'hui et meilleur score par jeu.
const PROFILE_GAME_STATE_SQL = `
    WITH results AS (
      SELECT percentage, completed_at
      FROM quiz_results
      WHERE profile_id = $1 AND is_completed IS NOT FALSE
    )
    SELECT
      (SELECT COUNT(*) FROM results WHERE completed_at >= $2::timestamptz)::int AS quizzes_today,
      (SELECT COUNT(*) FROM results WHERE completed_at >= $3::timestamptz)::int AS quizzes_week,
      (SELECT COALESCE(AVG(percentage), 0) FROM results WHERE completed_at >= $3::timestamptz)::float AS average_score_week,
      (SELECT COALESCE(json_agg(d.day_key ORDER BY d.day_key DESC), '[]'::json)
         FROM (SELECT DISTINCT to_char(DATE(completed_at), 'YYYY-MM-DD') AS day_key
               FROM results WHERE completed_at IS NOT NULL
               ORDER BY day_key DESC LIMIT 366) d) AS day_keys,
      (SELECT COALESCE(json_agg(r), '[]'::json)
         FROM (SELECT game_key, is_enabled, condition_type, condition_value, daily_limit_minutes
               FROM game_access_rules WHERE profile_id = $1) r) AS rules,
      (SELECT COALESCE(json_agg(s), '[]'::json)
         FROM (SELECT game_key,
                      COALESCE(SUM(duration_seconds) FILTER (WHERE started_at >= $2::timestamptz), 0)::int AS used_seconds_today,
                      COALESCE(MAX(score), 0)::int AS best_score
               FROM game_sessions WHERE profile_id = $1
               GROUP BY game_key) s) AS sessions
`;

const byGameKey = list => new Map((Array.isArray(list) ? list : []).map(item => [item.game_key, item]));

async function loadProfileGameState(profileId, now = new Date()) {
    const rows = await query(
        PROFILE_GAME_STATE_SQL,
        [profileId, startOfDay(now).toISOString(), startOfWeekMonday(now).toISOString()],
        'état des jeux du profil'
    );
    const row = rows[0] || {};
    return {
        stats: {
            quizzesToday: toInt(row.quizzes_today),
            quizzesThisWeek: toInt(row.quizzes_week),
            averageScoreThisWeek: Number(row.average_score_week) || 0,
            currentStreak: computeStreaksFromDayKeys(row.day_keys || [], now).current
        },
        rules: byGameKey(row.rules),
        sessions: byGameKey(row.sessions)
    };
}

// Un jeu tel que vu par un profil : règle du parent, accès évalué, meilleur score
function describeGame(game, state) {
    const rule = normalizeRule(state.rules.get(game.key));
    const sessions = state.sessions.get(game.key);
    return {
        key: game.key,
        title: game.title,
        description: game.description,
        rule,
        access: evaluateGameAccess(rule, state.stats, sessions?.used_seconds_today),
        bestScore: toInt(sessions?.best_score)
    };
}

const sessionPayload = row => ({
    id: row.id,
    gameKey: row.game_key,
    durationSeconds: toInt(row.duration_seconds),
    score: toInt(row.score),
    ended: row.ended_at !== null && row.ended_at !== undefined
});

// GET /api/games?profileId= (gameListQuerySchema) : jeux d'un profil et état de leur accès
async function handleGames(req, res) {
    try {
        const { profileId } = req.query;
        if (!(await canAccessProfile(req.user, profileId))) {
            return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
        }
        const state = await loadProfileGameState(profileId);
        return res.status(200).json({
            success: true,
            message: 'Jeux récupérés avec succès',
            data: {
                profileId,
                games: GAMES.map(game => describeGame(game, state)),
                conditionTypes: listConditionTypes()
            }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la récupération des jeux');
    }
}

// PUT /api/games/:gameKey/rules/:profileId (parent, gameRuleUpdateSchema) : règle d'accès d'un enfant
async function handleGameRule(req, res) {
    try {
        // Le routeur applique requireAdmin (revérifié en base) ; double garde ici
        if (req.user?.isAdmin !== true) {
            return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
        }
        const game = findGame(req.params?.gameKey);
        if (!game) {
            return sendFailure(res, 404, 'Jeu inconnu', 'NOT_FOUND');
        }
        const profileId = parseId(req.params?.profileId);
        if (!profileId) {
            return sendFailure(res, 400, 'ID de profil invalide', 'BAD_REQUEST');
        }

        // Les règles ne concernent que les enfants et adolescents
        const profiles = await query(
            'SELECT id FROM profiles WHERE id = $1 AND is_admin IS NOT TRUE',
            [profileId],
            'vérification du profil enfant'
        );
        if (!profiles[0]) {
            return sendFailure(res, 404, 'Profil enfant introuvable', 'NOT_FOUND');
        }

        const { is_enabled, condition_type, condition_value, daily_limit_minutes } = req.body;
        await query(
            `INSERT INTO game_access_rules (profile_id, game_key, is_enabled, condition_type, condition_value, daily_limit_minutes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (profile_id, game_key) DO UPDATE SET
               is_enabled = EXCLUDED.is_enabled,
               condition_type = EXCLUDED.condition_type,
               condition_value = EXCLUDED.condition_value,
               daily_limit_minutes = EXCLUDED.daily_limit_minutes,
               updated_at = CURRENT_TIMESTAMP`,
            [profileId, game.key, is_enabled, condition_type, condition_value, daily_limit_minutes],
            'enregistrement de la règle du jeu'
        );

        const state = await loadProfileGameState(profileId);
        return res.status(200).json({
            success: true,
            message: 'Règle du jeu enregistrée',
            data: { game: describeGame(game, state) }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de l\'enregistrement de la règle du jeu');
    }
}

// POST /api/games/:gameKey/sessions (gameSessionStartSchema) : début d'une partie, si l'accès est ouvert
async function handleGameSessionStart(req, res) {
    try {
        const game = findGame(req.params?.gameKey);
        if (!game) {
            return sendFailure(res, 404, 'Jeu inconnu', 'NOT_FOUND');
        }
        const { profileId } = req.body;
        if (!(await canAccessProfile(req.user, profileId))) {
            return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
        }

        const { access, bestScore } = describeGame(game, await loadProfileGameState(profileId));
        if (!access.unlocked) {
            // 409 et non 403 : l'utilisateur a bien les droits, c'est le jeu qui est verrouillé
            return sendFailure(res, 409, access.message, 'GAME_LOCKED', { access });
        }

        const rows = await query(
            'INSERT INTO game_sessions (profile_id, game_key) VALUES ($1, $2) RETURNING id, game_key, duration_seconds, score, ended_at',
            [profileId, game.key],
            'début de la partie'
        );
        return res.status(201).json({
            success: true,
            message: 'Partie commencée',
            data: { session: sessionPayload(rows[0]), access, bestScore }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors du démarrage de la partie');
    }
}

// PUT /api/games/sessions/:id (gameSessionUpdateSchema) : signal de vie pendant la partie, ou fin.
// Chaque signal ajoute le temps écoulé depuis le précédent, borné (sauf idle : reprise après une pause).
// Réponse stop = true : la partie est terminée (fin demandée, temps écoulé, jeu refermé par un parent…)
async function handleGameSession(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID de partie invalide', 'BAD_REQUEST');
        }

        const sessions = await query(
            'SELECT id, profile_id, game_key, duration_seconds, score, ended_at FROM game_sessions WHERE id = $1',
            [id],
            'récupération de la partie'
        );
        // 404 aussi pour la partie d'un profil inaccessible
        if (!sessions[0] || !(await canAccessProfile(req.user, sessions[0].profile_id))) {
            return sendFailure(res, 404, 'Partie introuvable', 'NOT_FOUND');
        }
        const current = sessions[0];
        const game = findGame(current.game_key);

        // Partie déjà terminée : rien n'est plus compté (fin envoyée deux fois, temps écoulé…)
        let session = current;
        if (current.ended_at === null || current.ended_at === undefined) {
            const { score, ended, idle } = req.body;
            const rows = await query(
                `UPDATE game_sessions SET
                   duration_seconds = duration_seconds + CASE WHEN $5::boolean THEN 0
                     ELSE LEAST(GREATEST(EXTRACT(EPOCH FROM (NOW() - last_seen_at)), 0), $2::int)::int END,
                   last_seen_at = NOW(),
                   score = GREATEST(score, $3::int),
                   ended_at = CASE WHEN $4::boolean THEN NOW() ELSE ended_at END
                 WHERE id = $1 AND ended_at IS NULL
                 RETURNING id, game_key, duration_seconds, score, ended_at`,
                [id, HEARTBEAT_MAX_GAP_SECONDS, score, ended, idle],
                'mise à jour de la partie'
            );
            session = rows[0] || current;
        }

        // Accès réévalué : temps du jour épuisé, jeu refermé par un parent entre-temps...
        const access = game ? describeGame(game, await loadProfileGameState(current.profile_id)).access : null;
        let payload = sessionPayload(session);
        if (!payload.ended && !access?.unlocked) {
            const rows = await query(
                'UPDATE game_sessions SET ended_at = NOW() WHERE id = $1 AND ended_at IS NULL RETURNING id, game_key, duration_seconds, score, ended_at',
                [id],
                'fin de la partie'
            );
            payload = rows[0] ? sessionPayload(rows[0]) : { ...payload, ended: true };
        }

        return res.status(200).json({
            success: true,
            message: payload.ended ? 'Partie terminée' : 'Partie mise à jour',
            data: { session: payload, access, stop: payload.ended }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la mise à jour de la partie');
    }
}

module.exports = {
    handleGames,
    handleGameRule,
    handleGameSessionStart,
    handleGameSession,
    loadProfileGameState
};
