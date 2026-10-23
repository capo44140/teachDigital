const { pool } = require('../lib/database.js');
const { scopeForUser, canAccessProfile } = require('../lib/scope.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');
const coursePageView = require('../lib/coursePageView.js');
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

function emptyToNull(value) {
    return value === '' ? null : value;
}

function parsePublished(value) {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return undefined;
}

async function ensureChildProfile(profileId, res) {
    const rows = await query(
        'SELECT id FROM profiles WHERE id = $1 AND is_admin = false',
        [profileId],
        'vérification de l\'enfant cible'
    );
    if (!rows[0]) {
        sendFailure(res, 400, 'Enfant cible introuvable', 'BAD_REQUEST');
        return false;
    }
    return true;
}

// Une page est visible par un parent (brouillons compris) ; sinon publiée et destinée
// à un profil accessible (jeton famille : un enfant ; jeton profil : le sien).
async function canSeeCoursePage(user, coursePage) {
    if (scopeForUser(user).isAdmin) return true;
    return coursePage.is_published === true && canAccessProfile(user, coursePage.target_profile_id);
}

// GET /course-pages?targetProfileId=&published= (coursePageListQuerySchema)
// POST /course-pages (parent, coursePageCreateSchema)
async function handleCoursePages(req, res) {
    try {
        if (req.method === 'GET') {
            const { targetProfileId, published } = req.query || {};
            const scope = scopeForUser(req.user);
            const params = [];
            const conditions = [];

            if (targetProfileId !== undefined) {
                const targetId = parseId(targetProfileId);
                if (!targetId) {
                    return sendFailure(res, 400, 'ID de profil cible invalide', 'BAD_REQUEST');
                }
                if (!(await canAccessProfile(req.user, targetId))) {
                    return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
                }
                params.push(targetId);
                conditions.push(`target_profile_id = $${params.length}`);
            } else if (!scope.isAdmin) {
                return sendFailure(res, 403, 'Accès réservé aux parents', 'FORBIDDEN');
            }

            if (!scope.isAdmin) {
                // Un enfant ne voit jamais les pages masquées (le profil cible, obligatoire,
                // a été vérifié ci-dessus)
                conditions.push('is_published = true');
            } else {
                const isPublished = parsePublished(published);
                if (isPublished !== undefined) {
                    params.push(isPublished);
                    conditions.push(`is_published = $${params.length}`);
                }
            }

            let queryText = `SELECT ${SUMMARY_COLUMNS} FROM course_pages`;
            if (conditions.length > 0) {
                queryText += ' WHERE ' + conditions.join(' AND ');
            }
            queryText += ' ORDER BY created_at DESC';

            const coursePages = await query(queryText, params, 'récupération des pages de cours');
            return res.status(200).json({
                success: true,
                message: 'Pages de cours récupérées avec succès',
                data: { coursePages }
            });
        }

        if (req.method === 'POST') {
            // requireAdmin est appliqué par le routeur ; double garde ici
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès réservé aux parents', 'FORBIDDEN');
            }

            const { title, subject, description, htmlContent, targetProfileId, isPublished = true } = req.body || {};
            if (!title || !htmlContent || !targetProfileId) {
                return sendFailure(res, 400, 'Titre, contenu HTML et enfant cible requis', 'VALIDATION_ERROR');
            }
            if (!(await ensureChildProfile(targetProfileId, res))) return;

            const rows = await query(
                `INSERT INTO course_pages (profile_id, target_profile_id, title, subject, description, html_content, is_published)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING ${SUMMARY_COLUMNS}`,
                [req.user.profileId, targetProfileId, title, emptyToNull(subject) ?? null, emptyToNull(description) ?? null, htmlContent, isPublished],
                'création de la page de cours'
            );

            logger.info(`📄 Page de cours publiée: "${title}" pour le profil ${targetProfileId}`);
            return res.status(201).json({
                success: true,
                message: 'Page de cours publiée avec succès',
                data: { coursePage: rows[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des pages de cours');
    }
}

// GET / PUT / DELETE /course-pages/:id
async function handleCoursePage(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID de page invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            const rows = await query(
                `SELECT ${SUMMARY_COLUMNS}, html_content FROM course_pages WHERE id = $1`,
                [id],
                'récupération de la page de cours'
            );
            const coursePage = rows[0];

            // 404 aussi pour une page invisible : ne pas révéler son existence
            if (!coursePage || !(await canSeeCoursePage(req.user, coursePage))) {
                return sendFailure(res, 404, 'Page de cours non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Page de cours récupérée avec succès',
                data: { coursePage }
            });
        }

        // PUT / DELETE : parents uniquement (requireAdmin sur la route)
        if (req.user?.isAdmin !== true) {
            return sendFailure(res, 403, 'Accès réservé aux parents', 'FORBIDDEN');
        }

        if (req.method === 'PUT') {
            const body = req.body || {};
            const params = [];
            const sets = [];
            for (const [field, column] of Object.entries(UPDATABLE_FIELDS)) {
                if (body[field] === undefined) continue;
                params.push(NULLABLE_TEXT_FIELDS.includes(field) ? emptyToNull(body[field]) : body[field]);
                sets.push(`${column} = $${params.length}`);
            }

            if (sets.length === 0) {
                return sendFailure(res, 400, 'Aucune modification fournie', 'BAD_REQUEST');
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
                return sendFailure(res, 404, 'Page de cours non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Page de cours modifiée avec succès',
                data: { coursePage: rows[0] }
            });
        }

        if (req.method === 'DELETE') {
            const rows = await query('DELETE FROM course_pages WHERE id = $1 RETURNING id', [id], 'suppression de la page de cours');
            if (!rows[0]) {
                return sendFailure(res, 404, 'Page de cours non trouvée', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Page de cours supprimée avec succès',
                data: { id }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion de la page de cours');
    }
}

// ─── Affichage isolé (cf. lib/coursePageView.js) ────────────────────────────────

function sendViewUrl(res, target) {
    const token = coursePageView.signViewToken(target);
    return res.status(200).json({
        success: true,
        data: {
            url: coursePageView.viewUrl(token),
            expiresIn: coursePageView.VIEW_TOKEN_EXPIRES_IN_SECONDS
        }
    });
}

// POST /course-pages/:id/view : URL d'affichage d'une page visible par l'utilisateur
async function handleCoursePageView(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID de page invalide', 'BAD_REQUEST');
        }
        const rows = await query(
            'SELECT id, is_published, target_profile_id FROM course_pages WHERE id = $1',
            [id],
            'vérification de la page de cours'
        );
        if (!rows[0] || !(await canSeeCoursePage(req.user, rows[0]))) {
            return sendFailure(res, 404, 'Page de cours non trouvée', 'NOT_FOUND');
        }
        // Un parent peut afficher un brouillon ; pour un enfant, la publication est revérifiée au rendu
        return sendViewUrl(res, { pageId: id, requirePublished: !scopeForUser(req.user).isAdmin });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de l\'ouverture de la page de cours');
    }
}

// POST /course-pages/preview (parent) : URL d'aperçu d'un brouillon non publié
function handleCoursePagePreview(req, res) {
    try {
        const previewId = coursePageView.createPreview(req.body.htmlContent);
        return sendViewUrl(res, { previewId });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la préparation de l\'aperçu');
    }
}

// GET /course-pages/render?t=<jeton> (sans en-tête Authorization : chargé par l'iframe)
async function handleCoursePageRender(req, res) {
    try {
        const target = coursePageView.verifyViewToken(req.query?.t);
        if (!target) {
            return coursePageView.sendRenderError(res, 401, 'Lien expiré : rouvrez la page de cours.');
        }
        if (target.previewId) {
            const html = coursePageView.getPreview(target.previewId);
            if (!html) {
                return coursePageView.sendRenderError(res, 404, 'Aperçu expiré : relancez l\'aperçu.');
            }
            return coursePageView.sendCoursePageHtml(res, html);
        }
        const rows = await query(
            'SELECT html_content, is_published FROM course_pages WHERE id = $1',
            [target.pageId],
            'affichage de la page de cours'
        );
        if (!rows[0] || (target.requirePublished && rows[0].is_published !== true)) {
            return coursePageView.sendRenderError(res, 404, 'Page de cours introuvable.');
        }
        return coursePageView.sendCoursePageHtml(res, rows[0].html_content);
    } catch (error) {
        logger.error('Erreur lors de l\'affichage de la page de cours', error);
        return coursePageView.sendRenderError(res, 500, 'Page de cours indisponible.');
    }
}

// Résultats d'une session de révision sur une page de cours.
// Une session = une ligne de quiz_results, créée à la première sauvegarde (POST)
// puis mise à jour au fil des réponses (PUT), comme le ferait un quiz classique.
// Le quiz vit dans le HTML généré : le score ne peut pas être recalculé par le serveur,
// seules ses bornes sont vérifiées (coursePageResultSchema + ici).
function parseResultBody(body) {
    const profileId = parseId(body?.profileId);
    const score = Number(body?.score);
    const totalQuestions = Number(body?.totalQuestions);
    if (!profileId || !Number.isInteger(score) || !Number.isInteger(totalQuestions)
        || totalQuestions < 1 || totalQuestions > 1000 || score < 0 || score > totalQuestions) {
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
        logger.warn(`⚠️  Erreur lors de la vérification des badges (non bloquant): ${badgeError?.message || badgeError}`);
        return [];
    }
}

// POST /course-pages/:id/results — PUT /course-pages/:id/results/:resultId
async function handleCoursePageResults(req, res) {
    try {
        const coursePageId = parseId(req.params?.id);
        if (!coursePageId) {
            return sendFailure(res, 400, 'ID de page invalide', 'BAD_REQUEST');
        }
        if (req.method !== 'POST' && req.method !== 'PUT') {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }

        const data = parseResultBody(req.body);
        if (!data) {
            return sendFailure(res, 400, 'Données de résultat invalides', 'VALIDATION_ERROR');
        }
        if (!(await canAccessProfile(req.user, data.profileId))) {
            return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
        }

        // La page doit exister, être publiée et destinée à cet enfant
        const pages = await query(
            'SELECT id, subject FROM course_pages WHERE id = $1 AND is_published = true AND target_profile_id = $2',
            [coursePageId, data.profileId],
            'vérification de la page de cours'
        );
        const coursePage = pages[0];
        if (!coursePage) {
            return sendFailure(res, 404, 'Page de cours non trouvée', 'NOT_FOUND');
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
                return sendFailure(res, 400, 'ID de résultat invalide', 'BAD_REQUEST');
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
                return sendFailure(res, 404, 'Résultat non trouvé', 'NOT_FOUND');
            }
        }

        // Badges évalués uniquement sur une session terminée (pas sur un 5/5 intermédiaire)
        const unlockedBadges = data.completed ? await unlockBadges(data.profileId, coursePage, data) : [];

        return res.status(req.method === 'POST' ? 201 : 200).json({
            success: true,
            message: 'Résultat sauvegardé avec succès',
            data: {
                result: rows[0],
                unlockedBadges: unlockedBadges.length > 0 ? unlockedBadges : undefined
            }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la sauvegarde du résultat');
    }
}

module.exports = {
    handleCoursePages,
    handleCoursePage,
    handleCoursePageView,
    handleCoursePagePreview,
    handleCoursePageRender,
    handleCoursePageResults
};
