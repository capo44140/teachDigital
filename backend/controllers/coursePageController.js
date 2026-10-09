const { pool } = require('../lib/database.js');
const { authenticateToken, canActForProfile } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const logger = require('../lib/logger.js');

// Colonnes renvoyées dans les listes : sans html_content (trop lourd)
const SUMMARY_COLUMNS = 'id, title, subject, description, is_published, target_profile_id, profile_id, created_at, updated_at';

// Champs modifiables via PUT : clé de l'API → colonne SQL
const UPDATABLE_FIELDS = {
    title: 'title',
    subject: 'subject',
    description: 'description',
    htmlContent: 'html_content',
    targetProfileId: 'target_profile_id',
    isPublished: 'is_published'
};
const NULLABLE_TEXT_FIELDS = ['subject', 'description'];

function query(text, params, operation) {
    return withQueryTimeout(
        pool.query(text, params).then(result => result.rows),
        TIMEOUTS.STANDARD,
        operation
    );
}

function sendError(res, error, defaultMessage) {
    const errorResponse = handleError(error, defaultMessage);
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
}

function parseId(value) {
    const id = parseInt(value, 10);
    return Number.isNaN(id) || id <= 0 ? null : id;
}

function emptyToNull(value) {
    return value === '' ? null : value;
}

// Vérifie le token et les droits parent. Renvoie null si la réponse 403 a déjà été envoyée.
function requireAdmin(req, res) {
    const user = authenticateToken(req);
    if (!user?.isAdmin) {
        res.status(403).json({ success: false, message: 'Accès réservé aux parents' });
        return null;
    }
    return user;
}

// Un parent voit aussi les pages masquées ; un enfant (sans token parent) non.
function isAdminRequest(req) {
    try {
        return authenticateToken(req)?.isAdmin === true;
    } catch (_error) {
        return false;
    }
}

async function ensureChildProfile(profileId, res) {
    const rows = await query(
        'SELECT id FROM profiles WHERE id = $1 AND is_admin = false',
        [profileId],
        'vérification de l\'enfant cible'
    );
    if (!rows[0]) {
        res.status(400).json({ success: false, message: 'Enfant cible introuvable' });
        return false;
    }
    return true;
}

// GET /course-pages?targetProfileId=&published= — POST /course-pages
async function handleCoursePages(req, res) {
    try {
        if (req.method === 'GET') {
            const { targetProfileId, published } = req.query || {};
            const isAdmin = isAdminRequest(req);
            const params = [];
            const conditions = [];

            if (targetProfileId !== undefined) {
                const targetId = parseId(targetProfileId);
                if (!targetId) {
                    res.status(400).json({ success: false, message: 'ID de profil cible invalide' });
                    return;
                }
                params.push(targetId);
                conditions.push(`target_profile_id = $${params.length}`);
            } else if (!isAdmin) {
                res.status(403).json({ success: false, message: 'Accès réservé aux parents' });
                return;
            }

            if (!isAdmin) {
                conditions.push('is_published = true');
            } else if (published !== undefined) {
                params.push(published === 'true' || published === '1');
                conditions.push(`is_published = $${params.length}`);
            }

            let queryText = `SELECT ${SUMMARY_COLUMNS} FROM course_pages`;
            if (conditions.length > 0) {
                queryText += ' WHERE ' + conditions.join(' AND ');
            }
            queryText += ' ORDER BY created_at DESC';

            const coursePages = await query(queryText, params, 'récupération des pages de cours');

            res.status(200).json({
                success: true,
                message: 'Pages de cours récupérées avec succès',
                data: { coursePages }
            });

        } else if (req.method === 'POST') {
            const user = requireAdmin(req, res);
            if (!user) return;

            const { title, subject, description, htmlContent, targetProfileId, isPublished = true } = req.body || {};
            if (!title || !htmlContent || !targetProfileId) {
                res.status(400).json({ success: false, message: 'Titre, contenu HTML et enfant cible requis' });
                return;
            }
            if (!(await ensureChildProfile(targetProfileId, res))) return;

            const rows = await query(
                `INSERT INTO course_pages (profile_id, target_profile_id, title, subject, description, html_content, is_published)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING ${SUMMARY_COLUMNS}`,
                [user.profileId, targetProfileId, title, emptyToNull(subject) ?? null, emptyToNull(description) ?? null, htmlContent, isPublished],
                'création de la page de cours'
            );

            logger.info(`📄 Page de cours publiée: "${title}" pour le profil ${targetProfileId}`);

            res.status(201).json({
                success: true,
                message: 'Page de cours publiée avec succès',
                data: { coursePage: rows[0] }
            });

        } else {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
        }
    } catch (error) {
        sendError(res, error, 'Erreur lors de la gestion des pages de cours');
    }
}

// GET / PUT / DELETE /course-pages/:id
async function handleCoursePage(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            res.status(400).json({ success: false, message: 'ID de page invalide' });
            return;
        }

        if (req.method === 'GET') {
            const rows = await query(
                `SELECT ${SUMMARY_COLUMNS}, html_content FROM course_pages WHERE id = $1`,
                [id],
                'récupération de la page de cours'
            );
            const coursePage = rows[0];

            if (!coursePage || (!coursePage.is_published && !isAdminRequest(req))) {
                res.status(404).json({ success: false, message: 'Page de cours non trouvée' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Page de cours récupérée avec succès',
                data: { coursePage }
            });

        } else if (req.method === 'PUT') {
            if (!requireAdmin(req, res)) return;

            const body = req.body || {};
            const params = [];
            const sets = [];
            for (const [field, column] of Object.entries(UPDATABLE_FIELDS)) {
                if (body[field] === undefined) continue;
                params.push(NULLABLE_TEXT_FIELDS.includes(field) ? emptyToNull(body[field]) : body[field]);
                sets.push(`${column} = $${params.length}`);
            }

            if (sets.length === 0) {
                res.status(400).json({ success: false, message: 'Aucune modification fournie' });
                return;
            }
            if (body.targetProfileId !== undefined && !(await ensureChildProfile(body.targetProfileId, res))) return;

            params.push(id);
            const rows = await query(
                `UPDATE course_pages SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $${params.length}
                 RETURNING ${SUMMARY_COLUMNS}`,
                params,
                'mise à jour de la page de cours'
            );

            if (!rows[0]) {
                res.status(404).json({ success: false, message: 'Page de cours non trouvée' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Page de cours modifiée avec succès',
                data: { coursePage: rows[0] }
            });

        } else if (req.method === 'DELETE') {
            if (!requireAdmin(req, res)) return;

            const rows = await query(
                'DELETE FROM course_pages WHERE id = $1 RETURNING id',
                [id],
                'suppression de la page de cours'
            );

            if (!rows[0]) {
                res.status(404).json({ success: false, message: 'Page de cours non trouvée' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Page de cours supprimée avec succès',
                data: { id }
            });

        } else {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
        }
    } catch (error) {
        sendError(res, error, 'Erreur lors de la gestion de la page de cours');
    }
}

// Résultats d'une session de révision sur une page de cours.
// Une session = une ligne de quiz_results, créée à la première sauvegarde (POST)
// puis mise à jour au fil des réponses (PUT), comme le ferait un quiz classique.
function parseResultBody(body) {
    const profileId = parseId(body?.profileId);
    const score = Number(body?.score);
    const totalQuestions = Number(body?.totalQuestions);
    if (!profileId || !Number.isInteger(score) || !Number.isInteger(totalQuestions)
        || totalQuestions < 1 || score < 0 || score > totalQuestions) {
        return null;
    }
    const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};
    // completed = false pour les sauvegardes intermédiaires (toutes les 5 réponses) :
    // la ligne n'est alors pas prise en compte par les badges ni les statistiques « terminées ».
    // Absent = true (compatibilité avec les anciens clients qui n'envoient que la sauvegarde finale).
    const completed = body?.completed !== false;
    return { profileId, score, totalQuestions, percentage: Math.round((score / totalQuestions) * 100), answers, completed };
}

async function unlockBadges(profileId, coursePage, data) {
    try {
        const badgeService = require('../lib/badgeService.js');
        return await badgeService.checkAndUnlockBadges(profileId, 'quiz_completed', {
            coursePageId: coursePage.id,
            score: data.score,
            totalQuestions: data.totalQuestions,
            percentage: data.percentage,
            subject: coursePage.subject
        });
    } catch (badgeError) {
        // Ne pas bloquer la sauvegarde si la vérification des badges échoue
        console.error('⚠️  Erreur lors de la vérification des badges (non bloquant):', badgeError.message);
        return [];
    }
}

// POST /course-pages/:id/results — PUT /course-pages/:id/results/:resultId
async function handleCoursePageResults(req, res) {
    try {
        const coursePageId = parseId(req.params?.id);
        if (!coursePageId) {
            res.status(400).json({ success: false, message: 'ID de page invalide' });
            return;
        }
        if (req.method !== 'POST' && req.method !== 'PUT') {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
            return;
        }

        const data = parseResultBody(req.body);
        if (!data) {
            res.status(400).json({ success: false, message: 'Données de résultat invalides' });
            return;
        }
        if (!canActForProfile(req.user, data.profileId)) {
            res.status(403).json({ success: false, message: 'Accès refusé', code: 'FORBIDDEN' });
            return;
        }

        // La page doit exister, être visible et destinée à cet enfant
        const pages = await query(
            'SELECT id, subject FROM course_pages WHERE id = $1 AND is_published = true AND target_profile_id = $2',
            [coursePageId, data.profileId],
            'vérification de la page de cours'
        );
        const coursePage = pages[0];
        if (!coursePage) {
            res.status(404).json({ success: false, message: 'Page de cours non trouvée' });
            return;
        }

        let rows;
        if (req.method === 'POST') {
            rows = await query(
                `INSERT INTO quiz_results (course_page_id, profile_id, score, total_questions, percentage, answers, is_completed, completed_at)
                 VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
                 RETURNING *`,
                [coursePageId, data.profileId, data.score, data.totalQuestions, data.percentage, JSON.stringify(data.answers), data.completed],
                'sauvegarde du résultat de page de cours'
            );
        } else {
            const resultId = parseId(req.params?.resultId);
            if (!resultId) {
                res.status(400).json({ success: false, message: 'ID de résultat invalide' });
                return;
            }
            rows = await query(
                `UPDATE quiz_results
                 SET score = $1, total_questions = $2, percentage = $3, answers = $4::jsonb, is_completed = $8, completed_at = NOW()
                 WHERE id = $5 AND course_page_id = $6 AND profile_id = $7
                 RETURNING *`,
                [data.score, data.totalQuestions, data.percentage, JSON.stringify(data.answers), resultId, coursePageId, data.profileId, data.completed],
                'mise à jour du résultat de page de cours'
            );
            if (!rows[0]) {
                res.status(404).json({ success: false, message: 'Résultat non trouvé' });
                return;
            }
        }

        // Badges évalués uniquement sur une session terminée (pas sur un 5/5 intermédiaire)
        const unlockedBadges = data.completed ? await unlockBadges(data.profileId, coursePage, data) : [];

        res.status(req.method === 'POST' ? 201 : 200).json({
            success: true,
            message: 'Résultat sauvegardé avec succès',
            data: {
                result: rows[0],
                unlockedBadges: unlockedBadges.length > 0 ? unlockedBadges : undefined
            }
        });
    } catch (error) {
        sendError(res, error, 'Erreur lors de la sauvegarde du résultat');
    }
}

module.exports = {
    handleCoursePages,
    handleCoursePage,
    handleCoursePageResults
};
