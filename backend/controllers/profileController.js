const { NativeHashService } = require('../lib/nativeHash.js');
const { pool } = require('../lib/database.js');
const { generateToken, clearAuthCache } = require('../lib/auth.js');
const { canAccessProfile } = require('../lib/scope.js');
const { rejectIfPinLocked, recordPinSuccess, recordPinFailure, rehashLegacyPin } = require('../lib/pinAttempts.js');
const { checkNewPin } = require('../lib/pinPolicy.js');
const { notifyParents } = require('../lib/notify.js');
const { withTransaction } = require('../lib/transaction.js');
const { recordAuditEvent } = require('../lib/auditLog.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const { parseId, sendError, sendFailure } = require('../lib/http.js');
const crypto = require('crypto');

// Colonnes renvoyées au client (jamais token_version ni les PIN)
const PROFILE_COLUMNS = `
  id, name, description, type, is_admin, is_child, is_teen,
  is_active, is_locked, color, avatar_class, avatar_content,
  image_url, image_data, image_type, level, created_at, updated_at
`;

// Indicateurs dérivés du type : un profil ne peut pas être « admin » sans être de type admin
function flagsForType(type) {
    return {
        is_admin: type === 'admin',
        is_child: type === 'child',
        is_teen: type === 'teen'
    };
}

function query(text, params, operation, timeout = TIMEOUTS.STANDARD) {
    return withQueryTimeout(pool.query(text, params).then(result => result.rows), timeout, operation);
}

// GET /profiles (tout membre : sélecteur de profils) — POST /profiles (parent, profileCreateSchema)
async function handleProfiles(req, res) {
    try {
        if (req.method === 'GET') {
            const profiles = await query(
                `SELECT ${PROFILE_COLUMNS} FROM profiles ORDER BY created_at DESC`,
                [],
                'récupération des profils',
                TIMEOUTS.DEFAULT
            );
            return res.status(200).json({
                success: true,
                message: 'Profils récupérés avec succès',
                data: { profiles }
            });
        }

        if (req.method === 'POST') {
            // requireAdmin est appliqué par le routeur ; double garde ici
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
            }
            const body = req.body || {};
            if (!body.name || !body.type) {
                return sendFailure(res, 400, 'Nom et type requis', 'VALIDATION_ERROR');
            }
            const flags = flagsForType(body.type);

            const rows = await query(
                `INSERT INTO profiles (
                    name, description, type, color, avatar_class, avatar_content, level,
                    image_url, image_data, image_type, is_admin, is_child, is_teen, is_active
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
                 RETURNING ${PROFILE_COLUMNS}`,
                [
                    body.name, body.description ?? null, body.type, body.color || 'purple',
                    body.avatar_class ?? null, body.avatar_content ?? null, body.level ?? null,
                    body.image_url ?? null, body.image_data ?? null, body.image_type ?? null,
                    flags.is_admin, flags.is_child, flags.is_teen
                ],
                'création du profil'
            );
            // Un « profil inexistant » a pu être mis en cache pour cet id
            if (rows[0]) clearAuthCache(rows[0].id);

            return res.status(201).json({
                success: true,
                message: 'Profil créé avec succès',
                data: { profile: rows[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion des profils');
    }
}

// Mise à jour partielle (profileUpdateSchema). Changer le type recalcule is_admin /
// is_child / is_teen ; un changement de type ou une désactivation révoque les jetons
// du profil (token_version + 1).
async function updateProfile(req, res, id) {
    if (req.user?.isAdmin !== true) {
        return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
    }
    const body = req.body || {};
    const type = body.type ?? null;
    const isActive = typeof body.is_active === 'boolean' ? body.is_active : null;

    const rows = await query(
        `UPDATE profiles
         SET
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           avatar_class = COALESCE($4, avatar_class),
           avatar_content = COALESCE($5, avatar_content),
           level = COALESCE($6, level),
           image_data = COALESCE($7, image_data),
           image_type = COALESCE($8, image_type),
           image_url = COALESCE($9, image_url),
           type = COALESCE($10::varchar, type),
           is_admin = CASE WHEN $10::varchar IS NULL THEN is_admin ELSE $10::varchar = 'admin' END,
           is_child = CASE WHEN $10::varchar IS NULL THEN is_child ELSE $10::varchar = 'child' END,
           is_teen = CASE WHEN $10::varchar IS NULL THEN is_teen ELSE $10::varchar = 'teen' END,
           is_active = COALESCE($11::boolean, is_active),
           token_version = token_version + CASE
             WHEN $10::varchar IS NOT NULL AND $10::varchar IS DISTINCT FROM type THEN 1
             WHEN $11::boolean = false AND is_active IS DISTINCT FROM false THEN 1
             ELSE 0
           END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $12
         RETURNING ${PROFILE_COLUMNS}`,
        [
            body.name ?? null, body.description ?? null, body.color ?? null,
            body.avatar_class ?? null, body.avatar_content ?? null, body.level ?? null,
            body.image_data ?? null, body.image_type ?? null, body.image_url ?? null,
            type, isActive, id
        ],
        'mise à jour du profil'
    );
    clearAuthCache(id);

    if (!rows[0]) {
        return sendFailure(res, 404, 'Profil non trouvé', 'NOT_FOUND');
    }
    return res.status(200).json({
        success: true,
        message: 'Profil modifié avec succès',
        data: { profile: rows[0] }
    });
}

// GET / PUT / DELETE /profiles/:id
async function handleProfile(req, res) {
    try {
        const id = parseId(req.params?.id);
        if (!id) {
            return sendFailure(res, 400, 'ID de profil invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            // Mêmes informations que la liste du sélecteur de profils
            const profiles = await query(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = $1`, [id], 'récupération du profil');
            if (!profiles[0]) {
                return sendFailure(res, 404, 'Profil non trouvé', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Profil récupéré avec succès',
                data: { profile: profiles[0] }
            });
        }

        if (req.method === 'PUT') {
            return await updateProfile(req, res, id);
        }

        if (req.method === 'DELETE') {
            if (req.user?.isAdmin !== true) {
                return sendFailure(res, 403, 'Accès refusé - Admin requis', 'FORBIDDEN');
            }
            const rows = await query(`DELETE FROM profiles WHERE id = $1 RETURNING ${PROFILE_COLUMNS}`, [id], 'suppression du profil');
            clearAuthCache(id);
            if (!rows[0]) {
                return sendFailure(res, 404, 'Profil non trouvé', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Profil supprimé avec succès',
                data: { profile: rows[0] }
            });
        }

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion du profil');
    }
}

// Handler des statistiques des profils (parent)
async function handleProfileStats(req, res) {
    try {
        if (req.method !== 'GET') {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }

        const rows = await query(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE is_active = true)::int AS active,
               COUNT(*) FILTER (WHERE is_child = true)::int AS children,
               COUNT(*) FILTER (WHERE is_teen = true)::int AS teens,
               COUNT(*) FILTER (WHERE is_admin = true)::int AS admins
             FROM profiles`,
            [],
            'statistiques des profils'
        );

        return res.status(200).json({
            success: true,
            message: 'Statistiques des profils récupérées avec succès',
            data: rows[0]
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la récupération des statistiques des profils');
    }
}

// Handler des statistiques d'apprentissage d'un profil (leçons/quiz)
// Parent : tous les profils ; appareil familial : les enfants ; profil : le sien.
async function handleProfileLearningStats(req, res) {
    try {
        if (req.method !== 'GET') {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }

        const profileIdNum = parseId(req.params?.id);
        if (!profileIdNum) {
            return sendFailure(res, 400, 'ID de profil invalide', 'BAD_REQUEST');
        }
        if (!(await canAccessProfile(req.user, profileIdNum))) {
            return sendFailure(res, 403, 'Accès refusé', 'FORBIDDEN');
        }

        const [totalsRes, lessonsRes, quizHistoryRes] = await Promise.all([
            query(
                `SELECT
                   (SELECT COUNT(*)::int FROM lessons
                     WHERE is_published = true AND (target_profile_id = $1 OR target_profile_id IS NULL)) AS total_lessons,
                   (SELECT COUNT(*)::int FROM quiz_results WHERE profile_id = $1) AS total_quizzes_completed,
                   (SELECT COALESCE(AVG(percentage), 0)::float FROM quiz_results WHERE profile_id = $1) AS average_score`,
                [profileIdNum],
                'stats (totaux)'
            ),
            query(
                `SELECT
                    l.id, l.title, l.description, l.subject, l.level,
                    l.image_filename, l.is_published, l.created_at, l.updated_at,
                    (COUNT(qr.id) > 0) as quiz_completed,
                    COALESCE(MAX(qr.percentage), 0)::float as best_score,
                    COUNT(qr.id)::int as total_attempts,
                    MAX(qr.completed_at) as last_attempt
                 FROM lessons l
                 LEFT JOIN quiz_results qr
                    ON qr.lesson_id = l.id
                    AND qr.profile_id = $1
                 WHERE l.is_published = true
                    AND (l.target_profile_id = $1 OR l.target_profile_id IS NULL)
                 GROUP BY l.id
                 ORDER BY l.created_at DESC
                 LIMIT 200`,
                [profileIdNum],
                'stats (lessons with completion)',
                TIMEOUTS.LONG
            ),
            query(
                `SELECT
                    qr.id,
                    qr.lesson_id,
                    qr.course_page_id,
                    COALESCE(l.title, cp.title) as lesson_title,
                    qr.score,
                    qr.total_questions,
                    qr.percentage,
                    qr.completed_at
                 FROM quiz_results qr
                 LEFT JOIN lessons l ON l.id = qr.lesson_id
                 LEFT JOIN course_pages cp ON cp.id = qr.course_page_id
                 WHERE qr.profile_id = $1
                 ORDER BY qr.completed_at DESC
                 LIMIT 20`,
                [profileIdNum],
                'stats (quiz history)'
            )
        ]);

        const stats = {
            total_lessons: totalsRes?.[0]?.total_lessons ?? 0,
            total_quizzes_completed: totalsRes?.[0]?.total_quizzes_completed ?? 0,
            average_score: totalsRes?.[0]?.average_score ?? 0
        };

        // Format attendu par le frontend (camelCase + flags UI)
        const detailedStats = {
            totalLessons: stats.total_lessons,
            totalQuizzes: stats.total_quizzes_completed,
            averageScore: stats.average_score,
            lessons: (lessonsRes || []).map(l => ({
                id: l.id,
                title: l.title,
                description: l.description,
                subject: l.subject,
                level: l.level,
                image_filename: l.image_filename,
                is_published: l.is_published,
                created_at: l.created_at,
                updated_at: l.updated_at,
                quizCompleted: !!l.quiz_completed,
                bestScore: Number(l.best_score) || 0,
                totalAttempts: Number(l.total_attempts) || 0,
                lastAttempt: l.last_attempt
            })),
            quizHistory: (quizHistoryRes || []).map(q => ({
                id: q.id,
                lessonId: q.lesson_id,
                coursePageId: q.course_page_id,
                source: q.course_page_id ? 'course_page' : 'lesson',
                lessonTitle: q.lesson_title,
                correctAnswers: q.score,
                totalQuestions: q.total_questions,
                score: q.percentage,
                completedAt: q.completed_at
            }))
        };

        return res.status(200).json({
            success: true,
            message: 'Statistiques d\'apprentissage récupérées avec succès',
            data: {
                stats,
                detailedStats
            }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la récupération des statistiques d\'apprentissage');
    }
}

// Profil + PIN courant (null si le profil ou son PIN n'existe pas)
async function loadProfilePin(profileId) {
    const rows = await query(
        `SELECT p.id, p.name, p.is_admin, pc.pin_code
         FROM profiles p
         JOIN pin_codes pc ON pc.profile_id = p.id
         WHERE p.id = $1
         ORDER BY pc.created_at DESC
         LIMIT 1`,
        [profileId],
        'récupération du PIN'
    );
    return rows[0] || null;
}

// POST /profiles/:id/pin : vérifie un PIN (mêmes compteurs de verrouillage que /auth/login)
async function verifyPin(req, res, profileId) {
    const { pin } = req.body || {};
    if (!pin) {
        return sendFailure(res, 400, 'Code PIN requis', 'BAD_REQUEST');
    }
    if (rejectIfPinLocked(req, res, profileId)) {
        return;
    }

    const profilePin = await loadProfilePin(profileId);
    if (!profilePin) {
        return sendFailure(res, 404, 'Code PIN non trouvé', 'NOT_FOUND');
    }

    const isValidPin = await NativeHashService.verifyPin(pin, profilePin.pin_code);
    if (isValidPin) {
        recordPinSuccess(req, profileId);
        rehashLegacyPin(pin, profilePin.pin_code, profileId);
    } else {
        recordPinFailure(req, profilePin);
    }

    return res.status(200).json({
        success: true,
        message: isValidPin ? 'Code PIN valide' : 'Code PIN invalide',
        data: { isValid: isValidPin }
    });
}

/**
 * PUT /profiles/:id/pin (requireAdmin + pinUpdateSchema sur la route).
 * Corps : { newPin, currentPin? } — currentPin obligatoire pour changer son propre PIN.
 * Politique : WEAK_PIN (code trivial), PIN_TOO_SHORT (profil parent < 6 chiffres).
 * Les jetons du profil sont révoqués ; si le parent change son propre PIN, la réponse
 * contient un nouveau jeton (data.token) qui remplace l'ancien.
 */
async function updatePin(req, res, profileId) {
    const { newPin, currentPin } = req.body || {};
    if (!newPin) {
        return sendFailure(res, 400, 'Nouveau code PIN requis', 'BAD_REQUEST');
    }

    const targets = await query('SELECT id, name, type, is_admin FROM profiles WHERE id = $1', [profileId], 'récupération du profil');
    const target = targets[0];
    if (!target) {
        return sendFailure(res, 404, 'Profil non trouvé', 'NOT_FOUND');
    }

    const policy = checkNewPin(newPin, { isAdmin: target.is_admin === true });
    if (!policy.ok) {
        return sendFailure(res, 400, policy.message, policy.code);
    }

    // Un parent peut réinitialiser le PIN d'un autre profil ; pour changer le sien,
    // le PIN actuel est exigé (session parent laissée ouverte sur la tablette).
    const isOwnProfile = parseId(req.user?.profileId) === profileId;
    if (isOwnProfile && !currentPin) {
        return sendFailure(res, 400, 'Code PIN actuel requis', 'CURRENT_PIN_REQUIRED');
    }

    if (currentPin) {
        if (rejectIfPinLocked(req, res, profileId)) {
            return;
        }
        const profilePin = await loadProfilePin(profileId);
        if (profilePin) {
            const isValidCurrentPin = await NativeHashService.verifyPin(currentPin, profilePin.pin_code);
            if (!isValidCurrentPin) {
                recordPinFailure(req, profilePin);
                return sendFailure(res, 401, 'Code PIN actuel incorrect', 'INVALID_CURRENT_PIN');
            }
            recordPinSuccess(req, profileId);
        }
    }

    const hashedPin = await NativeHashService.hashPin(newPin);

    // PIN et révocation des jetons dans la même transaction
    const { pinRow, tokenVersion } = await withTransaction(async (client) => {
        const pinResult = await client.query(
            `INSERT INTO pin_codes (profile_id, pin_code)
             VALUES ($1, $2)
             ON CONFLICT (profile_id) DO UPDATE SET
               pin_code = EXCLUDED.pin_code,
               updated_at = CURRENT_TIMESTAMP
             RETURNING created_at, updated_at`,
            [profileId, hashedPin]
        );
        const versionResult = await client.query(
            'UPDATE profiles SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version',
            [profileId]
        );
        return { pinRow: pinResult.rows[0], tokenVersion: versionResult.rows[0]?.token_version };
    }, { operation: 'mise à jour du PIN' });
    clearAuthCache(profileId);

    recordAuditEvent({
        action: 'PIN_CHANGED',
        category: 'security',
        level: 'info',
        userId: parseId(req.user?.profileId),
        details: { profileId, ownProfile: isOwnProfile },
        req
    });

    const data = {
        profileId,
        updatedAt: pinRow?.updated_at || pinRow?.created_at || null
    };
    if (isOwnProfile) {
        data.token = generateToken({
            profileId: target.id,
            name: target.name,
            type: target.type,
            isAdmin: target.is_admin,
            tokenVersion
        });
    }

    // Ne jamais renvoyer le hash du PIN
    return res.status(200).json({
        success: true,
        message: 'Code PIN mis à jour avec succès',
        data
    });
}

// Handler des codes PIN : GET (parent), POST (vérification), PUT (modification, parent)
async function handlePin(req, res) {
    try {
        const profileId = parseId(req.params?.id);
        if (!profileId) {
            return sendFailure(res, 400, 'ID de profil invalide', 'BAD_REQUEST');
        }

        if (req.method === 'GET') {
            const pinData = await query(
                'SELECT created_at, updated_at FROM pin_codes WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 1',
                [profileId],
                'récupération du PIN'
            );
            if (!pinData[0]) {
                return sendFailure(res, 404, 'Code PIN non trouvé', 'NOT_FOUND');
            }
            return res.status(200).json({
                success: true,
                message: 'Code PIN récupéré avec succès',
                data: {
                    hasPin: true,
                    createdAt: pinData[0].created_at,
                    updatedAt: pinData[0].updated_at
                }
            });
        }
        if (req.method === 'POST') return await verifyPin(req, res, profileId);
        if (req.method === 'PUT') return await updatePin(req, res, profileId);

        return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    } catch (error) {
        return sendError(res, error, 'Erreur lors de la gestion du code PIN');
    }
}

// Demande de création de profil (tout membre, profileCreationRequestSchema) -> notification
// à chaque parent actif, dans une seule transaction (toutes ou aucune).
async function handleProfileCreationRequest(req, res) {
    try {
        if (req.method !== 'POST') {
            return sendFailure(res, 405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
        }

        const { name, type } = req.body || {};
        if (!name) {
            return sendFailure(res, 400, 'Nom invalide (2 à 40 caractères requis).', 'INVALID_NAME');
        }
        const safeType = type === 'teen' ? 'teen' : 'child';

        const requestId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
        const notification = {
            type: 'profile_request',
            title: 'Demande de création de profil',
            message: `Un nouveau profil "${name}" a été demandé. Validation requise.`,
            data: {
                requestId,
                requestedName: name,
                requestedType: safeType,
                createdAt: new Date().toISOString()
            }
        };

        const adminIds = await withTransaction(
            client => notifyParents(client, notification),
            { operation: 'création des notifications profile_request' }
        );

        if (adminIds.length === 0) {
            return sendFailure(res, 500, 'Aucun profil parent/admin disponible pour validation.', 'NO_ADMIN_AVAILABLE');
        }

        return res.status(201).json({
            success: true,
            message: 'Demande envoyée au profil parent pour validation',
            data: { requestId }
        });
    } catch (error) {
        return sendError(res, error, 'Erreur lors de l\'envoi de la demande de profil');
    }
}

module.exports = {
    handleProfiles,
    handleProfile,
    handleProfileStats,
    handlePin,
    handleProfileLearningStats,
    handleProfileCreationRequest
};
