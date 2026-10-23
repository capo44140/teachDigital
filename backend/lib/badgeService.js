const { sql, pool } = require('./database.js');
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');
const logger = require('./logger.js');
const { computeStreaksFromDayKeys } = require('./streaks.js');
const {
    SUPPORTED_CONDITION_TYPES,
    UNSUPPORTED_CONDITION_TYPES,
    getConditionSupport
} = require('./badgeConditions.js');

/**
 * Service de gestion automatique des badges
 * Vérifie et débloque les badges selon les actions utilisateur.
 *
 * Nombre de requêtes constant, quel que soit le nombre de badges :
 * 1. badges actifs + état du profil (une requête) ;
 * 2. statistiques du profil nécessaires à tous les critères (une requête) ;
 * 3. mise à jour de toutes les progressions (un seul UPSERT).
 */

// Avertissement une seule fois par type et par processus (pas à chaque quiz)
const warnedConditionTypes = new Set();

function warnUnsupported(badge, reason) {
    if (warnedConditionTypes.has(badge.condition_type)) return;
    warnedConditionTypes.add(badge.condition_type);
    logger.warn('⚠️  Badge à critère non évaluable : jamais débloqué automatiquement', {
        badgeId: badge.id,
        conditionType: badge.condition_type,
        reason
    });
}

const toInt = value => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Statistiques d'un profil utiles à tous les critères de badges, en une seule requête.
 * Seules les sessions terminées comptent (sauvegardes intermédiaires de page de cours exclues).
 * @param {number} profileId
 * @returns {Promise<{quizCompleted: number, perfectScore: number, subjectsVariety: number,
 *   recentPercentages: number[], subjectCounts: Object<string, number>, dayKeys: string[]}>}
 */
async function loadProfileBadgeStats(profileId) {
    const rows = await withQueryTimeout(
        sql`
      WITH results AS (
        SELECT qr.percentage, qr.completed_at, COALESCE(l.subject, cp.subject) AS subject
        FROM quiz_results qr
        LEFT JOIN lessons l ON l.id = qr.lesson_id
        LEFT JOIN course_pages cp ON cp.id = qr.course_page_id
        WHERE qr.profile_id = ${profileId} AND qr.is_completed IS NOT FALSE
      )
      SELECT
        (SELECT COUNT(*) FROM results)::int AS quiz_completed,
        (SELECT COUNT(*) FROM results WHERE percentage = 100)::int AS perfect_score,
        (SELECT COUNT(DISTINCT subject) FROM results WHERE subject IS NOT NULL)::int AS subjects_variety,
        (SELECT COALESCE(json_agg(r.percentage ORDER BY r.completed_at DESC), '[]'::json)
           FROM (SELECT percentage, completed_at FROM results ORDER BY completed_at DESC LIMIT 50) r) AS recent_percentages,
        (SELECT COALESCE(json_object_agg(s.subject_key, s.quiz_count), '{}'::json)
           FROM (SELECT LOWER(subject) AS subject_key, COUNT(*)::int AS quiz_count
                 FROM results WHERE subject IS NOT NULL GROUP BY 1) s) AS subject_counts,
        (SELECT COALESCE(json_agg(d.day_key ORDER BY d.day_key DESC), '[]'::json)
           FROM (SELECT DISTINCT to_char(DATE(completed_at), 'YYYY-MM-DD') AS day_key
                 FROM results WHERE completed_at IS NOT NULL) d) AS day_keys
    `,
        TIMEOUTS.STANDARD,
        'statistiques des badges du profil'
    );

    const row = rows?.[0] || {};
    return {
        quizCompleted: toInt(row.quiz_completed),
        perfectScore: toInt(row.perfect_score),
        subjectsVariety: toInt(row.subjects_variety),
        recentPercentages: Array.isArray(row.recent_percentages) ? row.recent_percentages.map(Number) : [],
        subjectCounts: row.subject_counts && typeof row.subject_counts === 'object' ? row.subject_counts : {},
        dayKeys: Array.isArray(row.day_keys) ? row.day_keys : []
    };
}

/**
 * Série actuelle de bons scores (>= 80 %), du plus récent au plus ancien
 */
function computeScoreStreak(recentPercentages) {
    let streak = 0;
    for (const percentage of recentPercentages) {
        if (percentage >= 80) {
            streak++;
        } else {
            break; // La série est interrompue
        }
    }
    return streak;
}

/**
 * Calcule la progression d'un badge à partir des statistiques du profil (sans requête)
 * @param {object} badge - Badge (condition_type, condition_value, subject_filter...)
 * @param {object} stats - Résultat de loadProfileBadgeStats
 * @returns {{progress: number, isComplete: boolean, supported: boolean, reason?: string}}
 */
function computeBadgeProgress(badge, stats) {
    const support = getConditionSupport(badge.condition_type);
    if (!support.supported) {
        return { progress: 0, isComplete: false, supported: false, reason: support.reason };
    }

    let progress = 0;
    switch (badge.condition_type) {
        case 'quiz_completed':
            progress = stats.quizCompleted;
            break;

        case 'perfect_score':
            progress = stats.perfectScore;
            break;

        case 'score_streak':
            progress = computeScoreStreak(stats.recentPercentages);
            break;

        case 'subjects_variety':
            progress = stats.subjectsVariety;
            break;

        case 'subject_specific': {
            // Champ subject_filter du badge si disponible, sinon déduit du nom / de la description
            const subject = badge.subject_filter || extractSubjectFromBadge(badge);
            if (!subject) {
                warnUnsupported(badge, 'badge subject_specific sans matière identifiable (subject_filter)');
                progress = 0;
            } else {
                progress = toInt(stats.subjectCounts[String(subject).toLowerCase()]);
            }
            break;
        }

        case 'daily_streak':
            // Plus longue série de jours consécutifs avec au moins un quiz terminé
            // (« Complète un quiz pendant 7 jours consécutifs »)
            progress = computeStreaksFromDayKeys(stats.dayKeys).best;
            break;

        default:
            progress = 0;
    }

    const target = Number(badge.condition_value);
    return {
        progress,
        isComplete: Number.isFinite(target) && progress >= target,
        supported: true
    };
}

/**
 * Calcule la progression d'un badge pour un profil (charge les statistiques)
 * @param {number} profileId - ID du profil
 * @param {object} badge - Objet badge avec condition_type et condition_value
 * @returns {Promise<{progress: number, isComplete: boolean, supported: boolean, reason?: string}>}
 */
async function calculateBadgeProgress(profileId, badge) {
    if (!getConditionSupport(badge.condition_type).supported) {
        return computeBadgeProgress(badge, null);
    }
    return computeBadgeProgress(badge, await loadProfileBadgeStats(profileId));
}

// Un seul UPSERT pour tous les badges. « unlocked_now » : débloqué par CETTE requête
// (unlocked_at = NOW() de la transaction) — exact même si deux requêtes concurrentes
// évaluent le même badge : une seule le voit passer à « débloqué ».
const UPSERT_PROGRESS_SQL = `
    INSERT INTO profile_badges (profile_id, badge_id, progress, is_unlocked, unlocked_at, created_at, updated_at)
    SELECT $1, t.badge_id, t.progress, t.is_complete, CASE WHEN t.is_complete THEN NOW() END, NOW(), NOW()
    FROM unnest($2::int[], $3::int[], $4::boolean[]) AS t(badge_id, progress, is_complete)
    ON CONFLICT (profile_id, badge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_unlocked = COALESCE(profile_badges.is_unlocked, false) OR EXCLUDED.is_unlocked,
        unlocked_at = CASE
            WHEN COALESCE(profile_badges.is_unlocked, false) THEN profile_badges.unlocked_at
            ELSE EXCLUDED.unlocked_at
        END,
        updated_at = NOW()
    RETURNING badge_id, is_unlocked, unlocked_at,
        (COALESCE(is_unlocked, false) AND unlocked_at IS NOT NULL AND unlocked_at = NOW()) AS unlocked_now
`;

/**
 * Point d'entrée principal - Vérifie et débloque les badges pour un profil
 * @param {number} profileId - ID du profil
 * @param {string} actionType - Type d'action (quiz_completed, etc.)
 * @param {object} actionData - Données contextuelles de l'action
 * @returns {Promise<Array>} Liste des badges nouvellement débloqués
 */
// eslint-disable-next-line no-unused-vars
async function checkAndUnlockBadges(profileId, actionType, actionData = {}) {
    logger.debug('🏆 Vérification des badges', { profileId, actionType });

    // 1. Badges actifs pas encore débloqués par ce profil
    const rows = await withQueryTimeout(
        sql`
      SELECT b.*, pb.is_unlocked AS profile_is_unlocked
      FROM badges b
      LEFT JOIN profile_badges pb ON pb.badge_id = b.id AND pb.profile_id = ${profileId}
      WHERE b.is_active = true
    `,
        TIMEOUTS.STANDARD,
        'récupération des badges actifs'
    );

    const pendingBadges = [];
    for (const row of rows) {
        if (row.profile_is_unlocked === true) continue;
        const { profile_is_unlocked: _ignored, ...badge } = row;
        const support = getConditionSupport(badge.condition_type);
        if (!support.supported) {
            warnUnsupported(badge, support.reason);
            continue;
        }
        pendingBadges.push(badge);
    }

    if (pendingBadges.length === 0) {
        return [];
    }

    // 2. Statistiques du profil (une requête pour tous les critères)
    const stats = await loadProfileBadgeStats(profileId);
    const evaluations = pendingBadges.map(badge => ({ badge, ...computeBadgeProgress(badge, stats) }));

    // 3. Progressions enregistrées en une seule requête (atomique)
    const result = await withQueryTimeout(
        pool.query(UPSERT_PROGRESS_SQL, [
            profileId,
            evaluations.map(e => e.badge.id),
            evaluations.map(e => e.progress),
            evaluations.map(e => e.isComplete)
        ]),
        TIMEOUTS.STANDARD,
        'mise à jour des badges du profil'
    );

    const unlockedNow = new Map(
        (result.rows || []).filter(r => r.unlocked_now === true).map(r => [r.badge_id, r.unlocked_at])
    );
    const unlockedBadges = evaluations
        .filter(e => unlockedNow.has(e.badge.id))
        .map(e => ({ ...e.badge, unlocked_at: unlockedNow.get(e.badge.id) }));

    if (unlockedBadges.length > 0) {
        logger.info('✨ Badge(s) débloqué(s)', { profileId, badges: unlockedBadges.map(b => b.name) });
    }
    return unlockedBadges;
}

/**
 * Extrait le nom de la matière depuis le badge
 * Utilise le nom du badge pour déduire la matière
 */
function extractSubjectFromBadge(badge) {
    const name = String(badge.name || '').toLowerCase();
    const description = String(badge.description || '').toLowerCase();

    // Mapping des noms de badges vers les matières
    const subjectMappings = {
        'mathématique': 'mathématiques',
        'mathématicien': 'mathématiques',
        'scientifique': 'sciences',
        'science': 'sciences',
        'historien': 'histoire',
        'histoire': 'histoire',
        'géographe': 'géographie',
        'géographie': 'géographie',
        'littéraire': 'français',
        'français': 'français',
        'anglais': 'anglais',
        'english': 'anglais'
    };

    // Chercher dans le nom du badge
    for (const [key, value] of Object.entries(subjectMappings)) {
        if (name.includes(key) || description.includes(key)) {
            return value;
        }
    }

    return null;
}

module.exports = {
    SUPPORTED_CONDITION_TYPES,
    UNSUPPORTED_CONDITION_TYPES,
    getConditionSupport,
    checkAndUnlockBadges,
    calculateBadgeProgress,
    computeBadgeProgress,
    loadProfileBadgeStats
};
