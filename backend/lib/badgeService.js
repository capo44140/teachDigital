const { sql, pool } = require('./database.js');
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');

/**
 * Service de gestion automatique des badges
 * Vérifie et débloque les badges selon les actions utilisateur
 */

/**
 * Point d'entrée principal - Vérifie et débloque les badges pour un profil
 * @param {number} profileId - ID du profil
 * @param {string} actionType - Type d'action (quiz_completed, etc.)
 * @param {object} actionData - Données contextuelles de l'action
 * @returns {Promise<Array>} Liste des badges nouvellement débloqués
 */
async function checkAndUnlockBadges(profileId, actionType, actionData = {}) {
    console.log(`🏆 Vérification des badges pour profil ${profileId}, action: ${actionType}`);

    // 1. Lectures (hors transaction) : chaque requête emprunte puis rend une connexion du pool.
    //    Ne pas garder une connexion ouverte pendant ces lectures : avec un pool de 10,
    //    une dizaine de quiz simultanés bloqueraient toutes les connexions.
    const [badges, profileBadges] = await Promise.all([
        withQueryTimeout(
            sql`SELECT * FROM badges WHERE is_active = true`,
            TIMEOUTS.STANDARD,
            'récupération des badges actifs'
        ),
        withQueryTimeout(
            sql`SELECT * FROM profile_badges WHERE profile_id = ${profileId}`,
            TIMEOUTS.STANDARD,
            'récupération des badges du profil'
        )
    ]);

    // Map pour accès O(1) (évite N+1)
    const profileBadgesMap = new Map();
    for (const pb of profileBadges) {
        profileBadgesMap.set(pb.badge_id, pb);
    }

    const pending = [];
    for (const badge of badges) {
        const profileBadge = profileBadgesMap.get(badge.id);
        // Si déjà débloqué, passer au suivant
        if (profileBadge && profileBadge.is_unlocked) {
            continue;
        }
        const { progress, isComplete } = await calculateBadgeProgress(profileId, badge, actionData);
        pending.push({ badge, profileBadge, progress, isComplete });
    }

    if (pending.length === 0) {
        return [];
    }

    // 2. Écritures : une seule connexion, transaction courte
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const unlockedBadges = [];

        for (const { badge, profileBadge, progress, isComplete } of pending) {
            // UPSERT atomique (évite les doublons en cas de requêtes concurrentes)
            const result = await client.query(
                `INSERT INTO profile_badges (profile_id, badge_id, progress, is_unlocked, unlocked_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                 ON CONFLICT (profile_id, badge_id) 
                 DO UPDATE SET 
                     progress = EXCLUDED.progress,
                     is_unlocked = CASE 
                         WHEN profile_badges.is_unlocked = true THEN true
                         ELSE EXCLUDED.is_unlocked
                     END,
                     unlocked_at = CASE 
                         WHEN profile_badges.is_unlocked = true THEN profile_badges.unlocked_at
                         ELSE EXCLUDED.unlocked_at
                     END,
                     updated_at = NOW()
                 RETURNING *`,
                [profileId, badge.id, progress, isComplete, isComplete ? new Date() : null]
            );

            const updatedBadge = result.rows[0];

            // Vérifier si c'est un nouveau déblocage (pas déjà débloqué avant)
            const wasAlreadyUnlocked = profileBadge && profileBadge.is_unlocked;
            if (isComplete && !wasAlreadyUnlocked) {
                console.log(`✨ Badge débloqué: "${badge.name}" pour profil ${profileId}`);
                unlockedBadges.push({
                    ...badge,
                    unlocked_at: updatedBadge.unlocked_at
                });
            } else if (!isComplete) {
                console.log(`📊 Progression badge "${badge.name}": ${progress}/${badge.condition_value}`);
            }
        }

        await client.query('COMMIT');
        console.log(`🎉 ${unlockedBadges.length} badge(s) débloqué(s)`);
        return unlockedBadges;

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Erreur lors de la vérification des badges:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Calcule la progression pour un badge donné
 * @param {number} profileId - ID du profil
 * @param {object} badge - Objet badge avec condition_type et condition_value
 * @param {object} actionData - Données contextuelles
 * @returns {Promise<{progress: number, isComplete: boolean}>}
 */
async function calculateBadgeProgress(profileId, badge, actionData) {
    let progress = 0;

    switch (badge.condition_type) {
        case 'quiz_completed':
            progress = await calculateQuizCompletedProgress(profileId);
            break;

        case 'perfect_score':
            progress = await calculatePerfectScoreProgress(profileId);
            break;

        case 'score_streak':
            progress = await calculateScoreStreakProgress(profileId);
            break;

        case 'subjects_variety':
            progress = await calculateSubjectsVarietyProgress(profileId);
            break;

        case 'subject_specific':
            // AMÉLIORATION: Utiliser le champ subject_filter du badge si disponible
            // Sinon, fallback sur l'extraction depuis le nom
            const subject = badge.subject_filter || extractSubjectFromBadge(badge);
            if (!subject) {
                console.warn(`⚠️  Badge "${badge.name}" de type subject_specific sans subject_filter défini`);
                progress = 0;
            } else {
                progress = await calculateSubjectSpecificProgress(profileId, subject);
            }
            break;

        case 'learning_time':
            // TODO: Implémenter le tracking du temps d'apprentissage
            progress = 0;
            console.warn(`⚠️  Type de badge "${badge.condition_type}" non encore implémenté`);
            break;

        case 'daily_streak':
            // TODO: Implémenter le tracking des jours consécutifs
            progress = 0;
            console.warn(`⚠️  Type de badge "${badge.condition_type}" non encore implémenté`);
            break;

        default:
            console.warn(`⚠️  Type de badge inconnu: ${badge.condition_type}`);
            progress = 0;
    }

    const isComplete = progress >= badge.condition_value;

    return { progress, isComplete };
}

/**
 * Calcule le nombre de quiz complétés
 */
async function calculateQuizCompletedProgress(profileId) {
    const result = await withQueryTimeout(
        sql`SELECT COUNT(*) as count FROM quiz_results WHERE profile_id = ${profileId} AND is_completed IS NOT FALSE`,
        TIMEOUTS.STANDARD,
        'calcul quiz complétés'
    );

    // Vérification de sécurité
    if (!result || !result[0]) {
        console.warn(`⚠️  Aucun résultat pour calculateQuizCompletedProgress (profileId: ${profileId})`);
        return 0;
    }

    return parseInt(result[0].count, 10) || 0;
}

/**
 * Calcule le nombre de scores parfaits (100%)
 */
async function calculatePerfectScoreProgress(profileId) {
    const result = await withQueryTimeout(
        sql`SELECT COUNT(*) as count FROM quiz_results WHERE profile_id = ${profileId} AND percentage = 100 AND is_completed IS NOT FALSE`,
        TIMEOUTS.STANDARD,
        'calcul scores parfaits'
    );

    // Vérification de sécurité
    if (!result || !result[0]) {
        console.warn(`⚠️  Aucun résultat pour calculatePerfectScoreProgress (profileId: ${profileId})`);
        return 0;
    }

    return parseInt(result[0].count, 10) || 0;
}

/**
 * Calcule la série actuelle de bons scores (>80%)
 */
async function calculateScoreStreakProgress(profileId) {
    const results = await withQueryTimeout(
        sql`
      SELECT percentage 
      FROM quiz_results 
      WHERE profile_id = ${profileId} AND is_completed IS NOT FALSE
      ORDER BY completed_at DESC
      LIMIT 50
    `,
        TIMEOUTS.STANDARD,
        'calcul série de scores'
    );

    // Calculer la série actuelle (scores consécutifs > 80%)
    let streak = 0;
    for (const result of results) {
        if (result.percentage >= 80) {
            streak++;
        } else {
            break; // La série est interrompue
        }
    }

    return streak;
}

/**
 * Calcule le nombre de matières différentes étudiées
 */
async function calculateSubjectsVarietyProgress(profileId) {
    const result = await withQueryTimeout(
        sql`
      SELECT COUNT(DISTINCT COALESCE(l.subject, cp.subject)) as count
      FROM quiz_results qr
      LEFT JOIN lessons l ON qr.lesson_id = l.id
      LEFT JOIN course_pages cp ON cp.id = qr.course_page_id
      WHERE qr.profile_id = ${profileId} AND qr.is_completed IS NOT FALSE AND COALESCE(l.subject, cp.subject) IS NOT NULL
    `,
        TIMEOUTS.STANDARD,
        'calcul variété de matières'
    );

    // Vérification de sécurité
    if (!result || !result[0]) {
        console.warn(`⚠️  Aucun résultat pour calculateSubjectsVarietyProgress (profileId: ${profileId})`);
        return 0;
    }

    return parseInt(result[0].count, 10) || 0;
}

/**
 * Calcule le nombre de quiz complétés dans une matière spécifique
 */
async function calculateSubjectSpecificProgress(profileId, subject) {
    if (!subject) {
        return 0;
    }

    const result = await withQueryTimeout(
        sql`
      SELECT COUNT(*) as count
      FROM quiz_results qr
      LEFT JOIN lessons l ON qr.lesson_id = l.id
      LEFT JOIN course_pages cp ON cp.id = qr.course_page_id
      WHERE qr.profile_id = ${profileId} AND qr.is_completed IS NOT FALSE AND LOWER(COALESCE(l.subject, cp.subject)) = LOWER(${subject})
    `,
        TIMEOUTS.STANDARD,
        'calcul quiz par matière'
    );

    // Vérification de sécurité
    if (!result || !result[0]) {
        console.warn(`⚠️  Aucun résultat pour calculateSubjectSpecificProgress (profileId: ${profileId}, subject: ${subject})`);
        return 0;
    }

    return parseInt(result[0].count, 10) || 0;
}

/**
 * Extrait le nom de la matière depuis le badge
 * Utilise le nom du badge pour déduire la matière
 */
function extractSubjectFromBadge(badge) {
    const name = badge.name.toLowerCase();
    const description = badge.description.toLowerCase();

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
    checkAndUnlockBadges,
    calculateBadgeProgress,
    calculateQuizCompletedProgress,
    calculatePerfectScoreProgress,
    calculateScoreStreakProgress,
    calculateSubjectsVarietyProgress,
    calculateSubjectSpecificProgress
};
