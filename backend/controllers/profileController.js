const { NativeHashService } = require('../lib/nativeHash.js');
const { default: sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { handleError, createErrorResponse } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const crypto = require('crypto');

// Handler des profils
async function handleProfiles(req, res) {
    try {
        if (req.method === 'GET') {
            // GET est public - récupérer tous les profils
            // Requête optimisée sans retry pour éviter les timeouts
            const startTime = Date.now();

            try {
                // Timeout explicite sur la requête pour éviter les blocages
                const profiles = await withQueryTimeout(
                    sql`
            SELECT 
              id, name, description, type, is_admin, is_child, is_teen, 
              is_active, is_locked, color, avatar_class, avatar_content, 
              image_url, image_data, image_type, level, created_at, updated_at
            FROM profiles 
            ORDER BY created_at DESC
          `,
                    TIMEOUTS.DEFAULT,
                    'récupération des profils'
                );

                const duration = Date.now() - startTime;
                console.log(`✅ Profils récupérés: ${profiles.length} en ${duration}ms`);

                res.status(200).json({
                    success: true,
                    message: 'Profils récupérés avec succès',
                    data: { profiles }
                });
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`❌ Erreur récupération profils après ${duration}ms:`, error.message);
                throw error;
            }

        } else if (req.method === 'POST') {
            // POST requiert l'authentification
            const user = authenticateToken(req);

            if (!user.isAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Admin requis'
                });
                return;
            }

            const { name, description, type, color, avatar_class, avatar_content, level } = req.body;

            if (!name || !type) {
                res.status(400).json({
                    success: false,
                    message: 'Nom et type requis'
                });
                return;
            }

            const is_admin = type === 'admin';
            const is_child = type === 'child';
            const is_teen = type === 'teen';

            const result = await withQueryTimeout(
                sql`
          INSERT INTO profiles (
            name, description, type, color, avatar_class, avatar_content, 
            level, is_admin, is_child, is_teen, is_active
          )
          VALUES (
            ${name}, ${description}, ${type}, ${color || 'purple'}, 
            ${avatar_class}, ${avatar_content}, ${level}, 
            ${is_admin}, ${is_child}, ${is_teen}, true
          )
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'création du profil'
            );

            res.status(201).json({
                success: true,
                message: 'Profil créé avec succès',
                data: { profile: result[0] }
            });
        } else {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
        }

    } catch (error) {
        // Uniformiser le timeout au format standard (success/message/code/data)
        if (error?.isTimeout === true || error?.code === 'GATEWAY_TIMEOUT' || error.message?.includes('Query timeout')) {
            console.error('⏱️ Timeout lors de la récupération des profils:', error.message);
            res.status(504).json(createErrorResponse(
                'La requête a pris trop de temps. Veuillez réessayer.',
                'GATEWAY_TIMEOUT'
            ));
            return;
        }
        const errorResponse = handleError(error, 'Erreur lors de la gestion des profils');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler d'un profil spécifique
async function handleProfile(req, res) {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID de profil requis'
            });
            return;
        }

        // Note: Les routes imbriquées comme /pin sont maintenant gérées par le routeur principal
        // qui appelle handlePin directement. Donc handleProfile ne gère que le profil lui-même.


        // Gérer les routes standard du profil
        if (req.method === 'GET') {
            console.log(`🔍 Récupération du profil ID: ${id} (type: ${typeof id})`);

            try {
                const profiles = await withQueryTimeout(
                    sql`
            SELECT 
              id, name, description, type, is_admin, is_child, is_teen, 
              is_active, is_locked, color, avatar_class, avatar_content, 
              image_url, image_data, image_type, level, created_at, updated_at
            FROM profiles 
            WHERE id = ${parseInt(id)}
          `,
                    TIMEOUTS.STANDARD,
                    'récupération du profil'
                );

                console.log(`✅ Profil récupéré: ${profiles.length} résultat(s)`);

                if (!profiles[0]) {
                    res.status(404).json({
                        success: false,
                        message: 'Profil non trouvé'
                    });
                    return;
                }

                res.status(200).json({
                    success: true,
                    message: 'Profil récupéré avec succès',
                    data: { profile: profiles[0] }
                });
            } catch (sqlError) {
                console.error('❌ Erreur SQL lors de la récupération du profil:', {
                    message: sqlError.message,
                    code: sqlError.code,
                    detail: sqlError.detail,
                    hint: sqlError.hint,
                    id: id
                });
                throw sqlError;
            }

        } else if (req.method === 'PUT') {
            // Authentification requise pour PUT
            const user = authenticateToken(req);

            if (!user.isAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Admin requis'
                });
                return;
            }

            const { name, description, type, color, avatar_class, avatar_content, level, is_active, image_data, image_type, image_url } = req.body;

            const result = await withQueryTimeout(
                sql`
          UPDATE profiles 
          SET 
            name = COALESCE(${name}, name),
            description = COALESCE(${description}, description),
            type = COALESCE(${type}, type),
            color = COALESCE(${color}, color),
            avatar_class = COALESCE(${avatar_class}, avatar_class),
            avatar_content = COALESCE(${avatar_content}, avatar_content),
            level = COALESCE(${level}, level),
            is_active = COALESCE(${is_active}, is_active),
            image_data = COALESCE(${image_data}, image_data),
            image_type = COALESCE(${image_type}, image_type),
            image_url = COALESCE(${image_url}, image_url),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'mise à jour du profil'
            );

            if (!result[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Profil non trouvé'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Profil modifié avec succès',
                data: { profile: result[0] }
            });

        } else if (req.method === 'DELETE') {
            // Authentification requise pour DELETE
            const user = authenticateToken(req);

            if (!user.isAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Admin requis'
                });
                return;
            }

            const result = await withQueryTimeout(
                sql`
          DELETE FROM profiles 
          WHERE id = ${id}
          RETURNING *
        `,
                TIMEOUTS.STANDARD,
                'suppression du profil'
            );

            if (!result[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Profil non trouvé'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Profil supprimé avec succès',
                data: { profile: result[0] }
            });

        } else {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
        }

    } catch (error) {
        console.error('❌ Erreur dans handleProfile:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            pathname: req.url
        });
        const errorResponse = handleError(error, 'Erreur lors de la gestion du profil');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler d'un profil spécifique (route imbriquée pour le pin)
async function handleProfilePin(req, res, profileId) {
    try {
        if (req.method === 'GET') {
            // GET /api/profiles/:id/pin - Récupérer le statut du PIN (admin seulement)
            const user = authenticateToken(req);

            if (!user.isAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'Accès refusé - Admin requis'
                });
                return;
            }

            const pinData = await withQueryTimeout(
                sql`
          SELECT pin_code, created_at FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
        `,
                TIMEOUTS.STANDARD,
                'récupération du PIN'
            );

            if (!pinData[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Code PIN non trouvé pour ce profil'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Code PIN récupéré avec succès',
                data: {
                    profileId,
                    created_at: pinData[0].created_at
                }
            });

        } else if (req.method === 'POST') {
            // POST /api/profiles/:id/pin - Vérifier le PIN
            const { pin } = req.body;

            if (!pin) {
                res.status(400).json({
                    success: false,
                    message: 'Code PIN requis'
                });
                return;
            }

            const existingPin = await withQueryTimeout(
                sql`
          SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
        `,
                TIMEOUTS.STANDARD,
                'vérification du PIN'
            );

            if (!existingPin[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Code PIN non trouvé pour ce profil'
                });
                return;
            }

            const isValidPin = await NativeHashService.verifyPin(pin, existingPin[0].pin_code);
            if (!isValidPin) {
                res.status(401).json({
                    success: false,
                    message: 'Code PIN incorrect'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Code PIN vérifié avec succès'
            });

        } else if (req.method === 'PUT') {
            // PUT /api/profiles/:id/pin - Mettre à jour le PIN (authentification requise)
            const user = authenticateToken(req);
            const { newPin, currentPin } = req.body;

            if (!newPin) {
                res.status(400).json({
                    success: false,
                    message: 'Nouveau code PIN requis'
                });
                return;
            }

            // Vérifier que le profil existe
            const profile = await withQueryTimeout(
                sql`
          SELECT id FROM profiles WHERE id = ${profileId}
        `,
                TIMEOUTS.STANDARD,
                'vérification du profil'
            );

            if (!profile[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Profil non trouvé'
                });
                return;
            }

            // Vérifier le PIN actuel si fourni (sécurité additionnelle)
            if (currentPin) {
                const existingPin = await withQueryTimeout(
                    sql`
            SELECT pin_code FROM pin_codes WHERE profile_id = ${profileId} ORDER BY created_at DESC LIMIT 1
          `,
                    TIMEOUTS.STANDARD,
                    'vérification du PIN actuel'
                );

                if (!existingPin[0]) {
                    res.status(404).json({
                        success: false,
                        message: 'Code PIN non trouvé pour ce profil'
                    });
                    return;
                }

                const isValidPin = await NativeHashService.verifyPin(currentPin, existingPin[0].pin_code);
                if (!isValidPin) {
                    res.status(401).json({
                        success: false,
                        message: 'Code PIN actuel incorrect'
                    });
                    return;
                }
            }

            // Hacher le nouveau PIN
            const hashedPin = await NativeHashService.hashPin(newPin);

            // Mettre à jour ou créer le PIN
            const result = await withQueryTimeout(
                sql`
          INSERT INTO pin_codes (profile_id, pin_code)
          VALUES (${profileId}, ${hashedPin})
          RETURNING profile_id, created_at
        `,
                TIMEOUTS.STANDARD,
                'mise à jour du PIN'
            );

            res.status(200).json({
                success: true,
                message: 'Code PIN mis à jour avec succès',
                data: {
                    profileId,
                    created_at: result[0].created_at
                }
            });

        } else {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
        }

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la gestion du code PIN du profil');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler des statistiques des profils
async function handleProfileStats(req, res) {
    try {
        if (req.method !== 'GET') {
            res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
            return;
        }

        const [totalProfiles, activeProfiles, childProfiles, teenProfiles, adminProfiles] = await Promise.all([
            withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles`, TIMEOUTS.STANDARD, 'stats total profils'),
            withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_active = true`, TIMEOUTS.STANDARD, 'stats profils actifs'),
            withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_child = true`, TIMEOUTS.STANDARD, 'stats profils enfants'),
            withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_teen = true`, TIMEOUTS.STANDARD, 'stats profils ados'),
            withQueryTimeout(sql`SELECT COUNT(*) as count FROM profiles WHERE is_admin = true`, TIMEOUTS.STANDARD, 'stats profils admin')
        ]);

        res.status(200).json({
            success: true,
            message: 'Statistiques des profils récupérées avec succès',
            data: {
                total: totalProfiles[0].count,
                active: activeProfiles[0].count,
                children: childProfiles[0].count,
                teens: teenProfiles[0].count,
                admins: adminProfiles[0].count
            }
        });

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la récupération des statistiques des profils');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler des statistiques d'apprentissage d'un profil (leçons/quiz)
// Utilisé par l'admin parent pour voir les interrogations éligibles et le compteur de quiz par enfant.
async function handleProfileLearningStats(req, res) {
    try {
        if (req.method !== 'GET') {
            res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'));
            return;
        }

        const id = req.params.id;
        const profileIdNum = parseInt(id, 10);
        if (!id || isNaN(profileIdNum)) {
            res.status(400).json(createErrorResponse('ID de profil invalide', 'BAD_REQUEST'));
            return;
        }

        const user = authenticateToken(req);
        // Admin: accès à tous; sinon accès uniquement à son propre profil
        if (!user?.isAdmin && user?.profileId !== profileIdNum) {
            res.status(403).json(createErrorResponse('Accès refusé', 'FORBIDDEN'));
            return;
        }

        const [totalLessonsRes, quizzesCountRes, avgScoreRes, lessonsRes, quizHistoryRes] = await Promise.all([
            withQueryTimeout(
                sql`SELECT COUNT(*)::int as total_lessons FROM lessons WHERE is_published = true`,
                TIMEOUTS.STANDARD,
                'stats (total lessons)'
            ),
            withQueryTimeout(
                sql`SELECT COUNT(*)::int as total_quizzes_completed FROM quiz_results WHERE profile_id = ${profileIdNum}`,
                TIMEOUTS.STANDARD,
                'stats (total quizzes)'
            ),
            withQueryTimeout(
                sql`SELECT COALESCE(AVG(percentage), 0)::float as average_score FROM quiz_results WHERE profile_id = ${profileIdNum}`,
                TIMEOUTS.STANDARD,
                'stats (average score)'
            ),
            withQueryTimeout(
                sql`
                    SELECT 
                        l.id, l.title, l.description, l.subject, l.level,
                        l.image_filename, l.is_published, l.created_at, l.updated_at,
                        (COUNT(qr.id) > 0) as quiz_completed,
                        COALESCE(MAX(qr.percentage), 0)::float as best_score,
                        COUNT(qr.id)::int as total_attempts,
                        MAX(qr.completed_at) as last_attempt
                    FROM lessons l
                    LEFT JOIN quiz_results qr
                        ON qr.lesson_id = l.id
                        AND qr.profile_id = ${profileIdNum}
                    WHERE l.is_published = true
                    GROUP BY l.id
                    ORDER BY l.created_at DESC
                    LIMIT 200
                `,
                TIMEOUTS.LONG,
                'stats (lessons with completion)'
            ),
            withQueryTimeout(
                sql`
                    SELECT
                        qr.id,
                        qr.lesson_id,
                        l.title as lesson_title,
                        qr.score,
                        qr.total_questions,
                        qr.percentage,
                        qr.completed_at
                    FROM quiz_results qr
                    JOIN lessons l ON l.id = qr.lesson_id
                    WHERE qr.profile_id = ${profileIdNum}
                    ORDER BY qr.completed_at DESC
                    LIMIT 20
                `,
                TIMEOUTS.STANDARD,
                'stats (quiz history)'
            )
        ]);

        const stats = {
            total_lessons: totalLessonsRes?.[0]?.total_lessons ?? 0,
            total_quizzes_completed: quizzesCountRes?.[0]?.total_quizzes_completed ?? 0,
            average_score: avgScoreRes?.[0]?.average_score ?? 0
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
                lessonTitle: q.lesson_title,
                correctAnswers: q.score,
                totalQuestions: q.total_questions,
                score: q.percentage,
                completedAt: q.completed_at
            }))
        };

        res.status(200).json({
            success: true,
            message: 'Statistiques d\'apprentissage récupérées avec succès',
            data: {
                stats,
                detailedStats
            }
        });
    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la récupération des statistiques d\'apprentissage');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler des codes PIN (route directe)
async function handlePin(req, res) {
    try {
        // Utiliser req.params.id fourni par Express Router
        const profileId = req.params.id;

        // Validation et conversion de l'ID
        const profileIdNum = parseInt(profileId, 10);

        if (!profileId || isNaN(profileIdNum)) {
            res.status(400).json({
                success: false,
                message: 'ID de profil invalide'
            });
            return;
        }

        if (req.method === 'GET') {
            // Récupérer le code PIN (pour vérification)
            const pinData = await withQueryTimeout(
                sql`
          SELECT pin_code, created_at, updated_at 
          FROM pin_codes 
          WHERE profile_id = ${profileIdNum} 
          ORDER BY created_at DESC LIMIT 1
        `,
                TIMEOUTS.STANDARD,
                'récupération du PIN'
            );

            if (!pinData[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Code PIN non trouvé'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Code PIN récupéré avec succès',
                data: {
                    hasPin: true,
                    createdAt: pinData[0].created_at,
                    updatedAt: pinData[0].updated_at
                }
            });

        } else if (req.method === 'POST') {
            // Vérifier un code PIN
            const { pin } = req.body;

            if (!pin) {
                res.status(400).json({
                    success: false,
                    message: 'Code PIN requis'
                });
                return;
            }

            console.log(`🔐 Vérification PIN pour profil ${profileIdNum} (PIN fourni: ${pin ? 'OUI' : 'NON'})`);

            const pinData = await withQueryTimeout(
                sql`SELECT pin_code FROM pin_codes WHERE profile_id = ${profileIdNum} ORDER BY created_at DESC LIMIT 1`,
                TIMEOUTS.STANDARD,
                'vérification du PIN'
            );

            if (!pinData[0]) {
                res.status(404).json({
                    success: false,
                    message: 'Code PIN non trouvé'
                });
                return;
            }

            const isValidPin = await NativeHashService.verifyPin(pin, pinData[0].pin_code);

            res.status(200).json({
                success: true,
                message: isValidPin ? 'Code PIN valide' : 'Code PIN invalide',
                data: { isValid: isValidPin }
            });

        } else if (req.method === 'PUT') {
            // Mettre à jour un code PIN
            const { newPin, currentPin } = req.body;

            if (!newPin) {
                res.status(400).json({
                    success: false,
                    message: 'Nouveau code PIN requis'
                });
                return;
            }

            // Vérifier le code PIN actuel si fourni
            if (currentPin) {
                const pinData = await withQueryTimeout(
                    sql`
            SELECT pin_code 
            FROM pin_codes 
            WHERE profile_id = ${profileIdNum} 
            ORDER BY created_at DESC LIMIT 1
          `,
                    TIMEOUTS.STANDARD,
                    'vérification du PIN actuel'
                );

                if (pinData[0]) {
                    const isValidCurrentPin = await NativeHashService.verifyPin(currentPin, pinData[0].pin_code);
                    if (!isValidCurrentPin) {
                        res.status(401).json({
                            success: false,
                            message: 'Code PIN actuel incorrect'
                        });
                        return;
                    }
                }
            }

            // Valider le nouveau code PIN
            if (newPin.length < 4 || newPin.length > 8) {
                res.status(400).json({
                    success: false,
                    message: 'Le code PIN doit contenir entre 4 et 8 caractères'
                });
                return;
            }

            // Hacher le nouveau code PIN
            const hashedPin = await NativeHashService.hashPin(newPin);

            // Vérifier si un code PIN existe déjà
            const existingPin = await withQueryTimeout(
                sql`SELECT id FROM pin_codes WHERE profile_id = ${profileIdNum}`,
                TIMEOUTS.STANDARD,
                'vérification PIN existant'
            );

            let result;
            if (existingPin[0]) {
                // Mettre à jour le code PIN existant
                result = await withQueryTimeout(
                    sql`
            UPDATE pin_codes 
            SET pin_code = ${hashedPin}, updated_at = CURRENT_TIMESTAMP 
            WHERE profile_id = ${profileIdNum} 
            RETURNING *
          `,
                    TIMEOUTS.STANDARD,
                    'mise à jour du PIN'
                );
            } else {
                // Créer un nouveau code PIN
                result = await withQueryTimeout(
                    sql`
            INSERT INTO pin_codes (profile_id, pin_code) 
            VALUES (${profileIdNum}, ${hashedPin}) 
            RETURNING *
          `,
                    TIMEOUTS.STANDARD,
                    'création du PIN'
                );
            }

            res.status(200).json({
                success: true,
                message: 'Code PIN mis à jour avec succès',
                data: { pin: result[0] }
            });

        } else {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
        }

    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de la gestion du code PIN');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Demande publique de création de profil (pas d'auth) -> notification aux admins
async function handleProfileCreationRequest(req, res) {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({
                success: false,
                message: 'Méthode non autorisée'
            });
            return;
        }

        const rawName = req.body?.name;
        const rawType = req.body?.type;

        const name = (typeof rawName === 'string' ? rawName : String(rawName || '')).replace(/\r/g, '').trim();
        const type = (typeof rawType === 'string' ? rawType : 'child').replace(/\r/g, '').trim() || 'child';

        // Validation simple (sécurité + UX)
        if (!name || name.length < 2 || name.length > 40) {
            res.status(400).json(createErrorResponse(
                'Nom invalide (2 à 40 caractères requis).',
                'INVALID_NAME'
            ));
            return;
        }
        // Autoriser lettres (unicode), chiffres, espace, tiret, apostrophe, underscore
        if (!/^[\p{L}0-9 _'’-]{2,40}$/u.test(name)) {
            res.status(400).json(createErrorResponse(
                'Nom invalide (caractères non autorisés).',
                'INVALID_NAME'
            ));
            return;
        }

        const allowedTypes = new Set(['child', 'teen']);
        const safeType = allowedTypes.has(type) ? type : 'child';

        const admins = await withQueryTimeout(
            sql`SELECT id FROM profiles WHERE is_admin = true AND is_active = true ORDER BY id ASC`,
            TIMEOUTS.STANDARD,
            'récupération des admins'
        );

        if (!admins || admins.length === 0) {
            res.status(500).json(createErrorResponse(
                'Aucun profil parent/admin disponible pour validation.',
                'NO_ADMIN_AVAILABLE'
            ));
            return;
        }

        const requestId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
        const nowIso = new Date().toISOString();

        const title = 'Demande de création de profil';
        const message = `Un nouveau profil "${name}" a été demandé. Validation requise.`;
        const data = {
            requestId,
            requestedName: name,
            requestedType: safeType,
            createdAt: nowIso
        };

        // Créer une notification pour chaque admin
        await Promise.all(admins.map((a) => withQueryTimeout(
            sql`
        INSERT INTO notifications (profile_id, type, title, message, data)
        VALUES (${a.id}, ${'profile_request'}, ${title}, ${message}, ${JSON.stringify(data)}::jsonb)
      `,
            TIMEOUTS.STANDARD,
            'création notification profile_request'
        )));

        res.status(201).json({
            success: true,
            message: 'Demande envoyée au profil parent pour validation',
            data: { requestId }
        });
    } catch (error) {
        const errorResponse = handleError(error, 'Erreur lors de l\'envoi de la demande de profil');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

module.exports = {
    handleProfiles,
    handleProfile,
    handleProfileStats,
    handleProfilePin,
    handlePin,
    handleProfileLearningStats,
    handleProfileCreationRequest
};
