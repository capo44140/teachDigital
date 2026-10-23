const { pool } = require('../lib/database.js');
const { scopeForUser, canAccessProfile, visibleProfileCondition } = require('../lib/scope.js');
const { notifyParents, buildQuizCompletionNotification } = require('../lib/notify.js');
const { recordAuditEvent } = require('../lib/auditLog.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');
const logger = require('../lib/logger.js');

// Colonnes des listes : sans quiz_data (contient les bonnes réponses, et lourd)
const LESSON_LIST_COLUMNS = 'id, title, description, subject, level, image_filename, is_published, created_at, updated_at, profile_id, target_profile_id';

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows), timeout, operation);
}

// 'true' / '1' / true -> true ; 'false' / '0' / false -> false ; sinon undefined
function parsePublished(value) {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return undefined;
}

/**
 * Une leçon est visible :
 * - par un parent : toujours (brouillons compris) ;
 * - sinon : publiée ET non ciblée (tous les enfants) ou ciblée sur un profil accessible
 *   (jeton famille : profil non admin ; jeton profil : le sien).
 */
async function canSeeLesson(user, lesson) {
    if (scopeForUser(user).isAdmin) return true;
    if (lesson.is_published !== true) return false;
    if (lesson.target_profile_id === null || lesson.target_profile_id === undefined) {
        return scopeForUser(user).kind !== 'none';
    }
    return canAccessProfile(user, lesson.target_profile_id);
}

// Enfant ciblé par une leçon : null (tous les enfants) ou un profil enfant existant.
// Renvoie false (réponse 400 déjà envoyée) si la cible n'est pas un enfant.
async function ensureChildTarget(targetId, res) {
    if (targetId === null) return true;
    const rows = await query(
        'SELECT id FROM profiles WHERE id = $1 AND is_admin = false',
        [targetId],
        'vérification de l\'enfant cible'
    );
    if (!rows[0]) {
        sendFailure(res, 400, 'Enfant cible introuvable', 'BAD_REQUEST');
        return false;
    }
    return true;
}

// Clés d'une question qui révèlent la réponse : jamais envoyées à un enfant avant
// l'enregistrement de ses réponses (la correction est renvoyée par POST quiz-results)
const ANSWER_KEYS = ['correctAnswer', 'correct_answer', 'correctIndex', 'answer', 'explanation'];

function withoutAnswers(quizData) {
    const questions = quizQuestions(quizData);
    let data = quizData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (_error) {
            data = {};
        }
    }
    if (typeof data !== 'object' || data === null) data = {};
    return {
        ...data,
        questions: questions.map(question => {
            const copy = { ...question };
            for (const key of ANSWER_KEYS) delete copy[key];
            return copy;
        })
    };
}

// GET /lessons (lessonListQuerySchema) — POST /lessons (parent, lessonCreateSchema)
async function handleLessons(req, res) {
    try {
        if (req.method === 'GET') {
            const { profileId, targetProfileId, published } = req.query || {};
            const scope = scopeForUser(req.user);
            const params = [];
            const conditions = [];

            // targetProfileId : quiz ciblés sur cet enfant + quiz non ciblés (dashboard enfant)
            // profileId : quiz créés par ce profil ou ciblés sur lui
            const filterId = targetProfileId !== undefined ? parseId(targetProfileId) : (profileId !== undefined ? parseId(profileId) : null);
            if ((targetProfileId !== undefined || profileId !== undefined) && !filterId) {
                return sendFailure(res, 400, 'ID de profil invalide', 'BAD_REQUEST');
            }
            if (filterId && !(await canAccessProfile(req.user, filterId))) {
                return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
            }
            if (filterId) {
                params.push(filterId);
                conditions.push(targetProfileId !== undefined
                    ? `(target_profile_id = $${params.length} OR target_profile_id IS NULL)`
                    : `(profile_id = $${params.length} OR target_profile_id = $${params.length})`);
            }

            if (scope.isAdmin) {
                const isPublished = parsePublished(published);
                if (isPublished !== undefined) {
                    params.push(isPublished);
                    conditions.push(`is_published = $${params.length}`);
                }
            } else {
                // Jamais de brouillon, jamais de leçon ciblée sur un profil inaccessible
                conditions.push('is_published = true');
                conditions.push(visibleProfileCondition(req.user, 'target_profile_id', params));
            }

            let queryText = `SELECT ${LESSON_LIST_COLUMNS} FROM lessons`;
            if (conditions.length > 0) {
                queryText += ' WHERE ' + conditions.join(' AND ');
            }
            queryText += ' ORDER BY created_at DESC LIMIT 100';

            const lessons = await query(queryText, params, 'récupération des leçons');
            return res.status(200).json({
                success: true,
                message: 'Leçons récupérées avec succès',
                data: { lessons }
            });
        }

        if (req.method === 'POST') {
            // requireAdmin est appliqué par le routeur ; double garde ici
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
            }
            const body = req.body || {};
            if (!body.title || !body.quizData) {
                return sendFailure(res, 400, 'Titre et données de quiz requis', 'VALIDATION_ERROR');
            }
            const creatorId = parseId(req.user.profileId);
            if (!creatorId) {
                return sendFailure(res, 400, 'ID de profil manquant', 'BAD_REQUEST');
            }

            // target_profile_id = enfant ciblé, ou NULL (tous les enfants) si absent
            const targetId = body.targetProfileId == null ? null : parseId(body.targetProfileId);
            if (!(await ensureChildTarget(targetId, res))) return;
            const insertParams = [
                creatorId, body.title, body.description || null, body.subject || null, body.level || null,
                body.imageFilename || null, JSON.stringify(body.quizData), body.isPublished !== false, targetId
            ];
            // Les séquences sont resynchronisées par la migration 0001 (anciens imports de données)
            const result = await query(
                `INSERT INTO lessons (profile_id, title, description, subject, level, image_filename, quiz_data, is_published, target_profile_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) RETURNING *`,
                insertParams,
                'création de la leçon'
            );

            logger.info(`📝 Leçon créée par le profil ${creatorId} pour ${targetId ? `le profil ${targetId}` : 'tous les enfants'}`);
            return res.status(201).json({
                success: true,
                message: 'Leçon créée avec succès',
                data: { lesson: result[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des leçons');
    }
}

// GET / PUT / DELETE /lessons/:id
async function handleLesson(req, res) {
    try {
        const lessonIdNum = parseId(req.params?.id);
        if (!lessonIdNum) {
            return sendFailure(res, 400, 'ID de leçon invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            const lessons = await query(
                `SELECT l.id, l.title, l.description, l.subject, l.level, l.image_filename, l.quiz_data,
                        l.is_published, l.created_at, l.updated_at, l.target_profile_id,
                        p.name as profile_name, p.id as profile_id
                 FROM lessons l JOIN profiles p ON l.profile_id = p.id
                 WHERE l.id = $1`,
                [lessonIdNum],
                'récupération de la leçon'
            );

            // 404 aussi pour une leçon invisible (brouillon, autre enfant) : ne pas révéler son existence
            if (!lessons[0] || !(await canSeeLesson(req.user, lessons[0]))) {
                return sendFailure(res, 404, 'Leçon non trouvée', 'NOT_FOUND');
            }
            const lesson = lessons[0];
            if (!scopeForUser(req.user).isAdmin) {
                lesson.quiz_data = withoutAnswers(lesson.quiz_data);
            }
            return res.status(200).json({
                success: true,
                message: 'Leçon récupérée avec succès',
                data: { lesson }
            });
        }

        // PUT / DELETE : parents uniquement (requireAdmin sur la route)
        if (req.user?.isAdmin !== true) {
            return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
        }

        if (req.method === 'PUT') {
            const body = req.body || {};
            // targetProfileId : absent = inchangé ; null = tous les enfants ; id = cet enfant
            const changeTarget = body.targetProfileId !== undefined;
            const targetId = body.targetProfileId === null ? null : parseId(body.targetProfileId);
            if (changeTarget && !(await ensureChildTarget(targetId, res))) return;
            const result = await query(
                `UPDATE lessons SET
                   title = COALESCE($1, title),
                   description = COALESCE($2, description),
                   subject = COALESCE($3, subject),
                   level = COALESCE($4, level),
                   image_filename = COALESCE($5, image_filename),
                   quiz_data = COALESCE($6::jsonb, quiz_data),
                   is_published = COALESCE($7::boolean, is_published),
                   target_profile_id = CASE WHEN $10::boolean THEN $8::int ELSE target_profile_id END,
                   updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9
                 RETURNING *`,
                [
                    body.title ?? null, body.description ?? null, body.subject ?? null, body.level ?? null,
                    body.imageFilename ?? null, body.quizData ? JSON.stringify(body.quizData) : null,
                    typeof body.isPublished === 'boolean' ? body.isPublished : null,
                    targetId, lessonIdNum, changeTarget
                ],
                'mise à jour de la leçon'
            );
            if (!result[0]) {
                return sendFailure(res, 404, 'Leçon non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Leçon modifiée avec succès',
                data: { lesson: result[0] }
            });
        }

        if (req.method === 'DELETE') {
            const result = await query('DELETE FROM lessons WHERE id = $1 RETURNING *', [lessonIdNum], 'suppression de la leçon');
            if (!result[0]) {
                return sendFailure(res, 404, 'Leçon non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Leçon supprimée avec succès',
                data: { lesson: result[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de la leçon');
    }
}

// Questions d'un quiz stocké (quiz_data peut avoir été enregistré comme chaîne JSON)
function quizQuestions(quizData) {
    let data = quizData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (_error) {
            return [];
        }
    }
    return Array.isArray(data?.questions) ? data.questions : [];
}

// Index de la bonne réponse (nombre ou chaîne de chiffres), sinon null
function correctAnswerIndex(question) {
    const raw = question?.correctAnswer;
    const value = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : raw;
    return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Score recalculé par le serveur : answers[i] (index choisi ou null) est comparé à
 * quiz_data.questions[i].correctAnswer. Une question sans réponse compte comme fausse.
 */
function scoreQuiz(questions, answers) {
    let score = 0;
    questions.forEach((question, index) => {
        const expected = correctAnswerIndex(question);
        const given = answers[index];
        if (expected !== null && Number.isInteger(given) && given === expected) score++;
    });
    const totalQuestions = questions.length;
    return { score, totalQuestions, percentage: Math.round((score / totalQuestions) * 100) };
}

// Badges, notification des parents et journal : ne bloquent jamais l'enregistrement du résultat
async function afterQuizCompleted(req, { lesson, profileId, childName, computed, result }) {
    let unlockedBadges = [];
    try {
        const badgeService = require('../lib/badgeService.js');
        unlockedBadges = await badgeService.checkAndUnlockBadges(profileId, 'quiz_completed', {
            lessonId: lesson.id,
            score: computed.score,
            totalQuestions: computed.totalQuestions,
            percentage: computed.percentage,
            subject: lesson.subject
        });
    } catch (badgeError) {
        logger.warn(`⚠️  Vérification des badges impossible (non bloquant): ${badgeError?.message || badgeError}`);
    }

    try {
        const content = buildQuizCompletionNotification({
            childName,
            lessonTitle: lesson.title,
            ...computed
        });
        await notifyParents(null, {
            ...content,
            data: {
                childProfileId: profileId,
                childName,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                resultId: result.id,
                score: computed.score,
                totalQuestions: computed.totalQuestions,
                percentage: computed.percentage,
                completedAt: new Date().toISOString()
            }
        });
    } catch (notificationError) {
        logger.warn(`⚠️  Notification « quiz terminé » non créée (non bloquant): ${notificationError?.message || notificationError}`);
    }

    recordAuditEvent({
        action: 'QUIZ_COMPLETED',
        category: 'data_access',
        level: 'info',
        userId: profileId,
        details: {
            dataType: 'quiz_completion',
            lessonId: lesson.id,
            resultId: result.id,
            score: computed.score,
            totalQuestions: computed.totalQuestions,
            percentage: computed.percentage,
            actorScope: req.user?.scope || null,
            actorProfileId: parseId(req.user?.profileId)
        },
        req
    });

    return unlockedBadges;
}

/**
 * POST /lessons/:id/quiz-results (lessonQuizResultSchema)
 * Corps : { profileId, answers } — answers[i] = index de l'option choisie (ou null).
 * Les champs score / totalQuestions / percentage du client sont ignorés.
 */
async function saveQuizResult(req, res, lessonIdNum) {
    const profileId = parseId(req.body?.profileId);
    const answers = req.body?.answers;
    if (!profileId || !Array.isArray(answers)) {
        return sendFailure(res, 400, 'Données de résultat invalides', 'VALIDATION_ERROR');
    }
    if (!(await canAccessProfile(req.user, profileId))) {
        return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
    }

    const lessons = await query(
        `SELECT l.id, l.title, l.subject, l.quiz_data, l.is_published, l.target_profile_id,
                (SELECT name FROM profiles WHERE id = $2) AS child_name
         FROM lessons l WHERE l.id = $1`,
        [lessonIdNum, profileId],
        'récupération de la leçon'
    );
    const lesson = lessons[0];
    // La leçon doit être destinée à ce profil (ou à tous) et publiée (sauf pour un parent)
    const isAdmin = scopeForUser(req.user).isAdmin;
    const visibleForProfile = lesson
        && (lesson.target_profile_id === null || lesson.target_profile_id === profileId)
        && (lesson.is_published === true || isAdmin);
    if (!visibleForProfile) {
        return sendFailure(res, 404, 'Leçon non trouvée', 'NOT_FOUND');
    }

    const questions = quizQuestions(lesson.quiz_data);
    if (questions.length === 0) {
        return sendFailure(res, 400, 'Ce quiz ne contient aucune question', 'EMPTY_QUIZ');
    }
    if (answers.length > questions.length) {
        return sendFailure(res, 400, 'Plus de réponses que de questions dans ce quiz', 'VALIDATION_ERROR');
    }

    const computed = scoreQuiz(questions, answers);
    const rows = await query(
        `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
         RETURNING *`,
        [lessonIdNum, profileId, computed.score, computed.totalQuestions, computed.percentage, JSON.stringify(answers)],
        'sauvegarde du résultat de quiz'
    );

    const unlockedBadges = await afterQuizCompleted(req, {
        lesson,
        profileId,
        childName: lesson.child_name,
        computed,
        result: rows[0]
    });

    return res.status(201).json({
        success: true,
        message: 'Résultat sauvegardé avec succès',
        data: {
            result: rows[0],
            score: computed.score,
            totalQuestions: computed.totalQuestions,
            percentage: computed.percentage,
            // Correction, révélée seulement une fois les réponses enregistrées
            correction: questions.map(question => ({
                correctAnswer: correctAnswerIndex(question),
                explanation: typeof question?.explanation === 'string' ? question.explanation : null
            })),
            unlockedBadges: unlockedBadges.length > 0 ? unlockedBadges : undefined
        }
    });
}

// GET / POST /lessons/:id/quiz-results
async function handleQuizResults(req, res) {
    try {
        const lessonIdNum = parseId(req.params?.id);
        if (!lessonIdNum) {
            return sendFailure(res, 400, 'ID de leçon invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            const profileIdNum = parseId(req.query?.profileId);
            if (!profileIdNum) {
                return sendFailure(res, 400, 'ID de profil requis', 'BAD_REQUEST');
            }
            if (!(await canAccessProfile(req.user, profileIdNum))) {
                return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
            }

            const results = await query(
                'SELECT * FROM quiz_results WHERE lesson_id = $1 AND profile_id = $2 ORDER BY completed_at DESC',
                [lessonIdNum, profileIdNum],
                'récupération des résultats de quiz'
            );
            return res.status(200).json({
                success: true,
                message: 'Résultats récupérés avec succès',
                data: { results }
            });
        }

        if (req.method === 'POST') {
            return await saveQuizResult(req, res, lessonIdNum);
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des résultats de quiz');
    }
}

// Statistiques globales (parent, requireAdmin sur la route)
async function handleGlobalLessonStats(req, res) {
    try {
        if (req.method !== 'GET') {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }
        if (req.user?.isAdmin !== true) {
            return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
        }

        const rows = await query(
            `SELECT
               (SELECT COUNT(*)::int FROM lessons WHERE is_published = true) AS total_lessons,
               (SELECT COUNT(*)::int FROM quiz_results) AS total_quizzes_completed,
               (SELECT COALESCE(AVG(percentage), 0)::float FROM quiz_results) AS average_score`,
            [],
            'statistiques globales'
        );

        return res.status(200).json({
            success: true,
            message: 'Statistiques globales récupérées avec succès',
            data: {
                stats: {
                    total_lessons: rows[0]?.total_lessons ?? 0,
                    total_quizzes_completed: rows[0]?.total_quizzes_completed ?? 0,
                    average_score: rows[0]?.average_score ?? 0
                }
            }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la récupération des statistiques globales');
    }
}

module.exports = {
    handleLessons,
    handleLesson,
    handleQuizResults,
    handleGlobalLessonStats,
    scoreQuiz
};
