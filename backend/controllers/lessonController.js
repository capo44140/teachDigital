const { default: sql, pool } = require('../lib/database.js');
const { authenticateToken, canActForProfile } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');
const logger = require('../lib/logger.js');

// Handler des leçons
async function handleLessons(req, res) {
    try {
        if (req.method === 'GET') {
            // Parser les query parameters
            const { profileId, targetProfileId, published } = req.query || {};

            logger.info(`🔍 Récupération des leçons - profileId: ${profileId}, targetProfileId: ${targetProfileId}, published: ${published}`);
            const startTime = Date.now();

            logger.debug('handleLessons GET start - v2');
            // Construire la requête dynamiquement (méthode robuste)
            let queryText = 'SELECT id, title, description, subject, level, image_filename, is_published, created_at, updated_at, profile_id, target_profile_id FROM lessons';
            const params = [];
            const conditions = [];

            // targetProfileId : filtre par enfant ciblé (prioritaire pour le dashboard enfant)
            // NULL = quiz non ciblé (ancien quiz), visible par tous les enfants
            if (targetProfileId) {
                const targetIdNum = parseInt(targetProfileId, 10);
                if (isNaN(targetIdNum)) {
                    res.status(400).json({ success: false, message: 'ID de profil cible invalide' });
                    return;
                }
                params.push(targetIdNum);
                conditions.push(`(target_profile_id = $${params.length} OR target_profile_id IS NULL)`);
            } else if (profileId) {
                const profileIdNum = parseInt(profileId, 10);
                if (isNaN(profileIdNum)) {
                    res.status(400).json({ success: false, message: 'ID de profil invalide' });
                    return;
                }
                params.push(profileIdNum);
                conditions.push(`(profile_id = $${params.length} OR target_profile_id = $${params.length})`);
            }

            if (published !== null && published !== undefined) {
                const isPublished = published === 'true' || published === true || published === '1';
                params.push(isPublished);
                conditions.push(`is_published = $${params.length}`);
            }

            if (conditions.length > 0) {
                queryText += ' WHERE ' + conditions.join(' AND ');
            }

            queryText += ' ORDER BY created_at DESC LIMIT 100';

            logger.debug('🔍 SQL:', { query: queryText });
            logger.debug('🔍 PARAMS:', { params });

            // Utilisation directe de pool.query pour éviter les problèmes avec le tag sql
            const lessons = await withQueryTimeout(
                pool.query(queryText, params).then(res => res.rows),
                TIMEOUTS.STANDARD,
                'récupération des leçons'
            );

            const totalTime = Date.now() - startTime;
            logger.info(`✅ Leçons récupérées: ${lessons.length} résultat(s) en ${totalTime}ms`);

            res.status(200).json({
                success: true,
                message: 'Leçons récupérées avec succès',
                data: { lessons }
            });

        } else if (req.method === 'POST') {
            // Authentification + contrôle admin requis pour POST
            // (création de leçons/quiz : réservé aux parents/admins)
            const user = authenticateToken(req);
            if (!user.isAdmin) {
                res.status(403).json({ success: false, message: 'Accès refusé - Admin requis', code: 'FORBIDDEN', data: null });
                return;
            }

            const {
                title, description, subject, level,
                imageFilename, imageData, quizData, isPublished = true,
                targetProfileId
            } = req.body;

            if (!title || !quizData) {
                res.status(400).json({ success: false, message: 'Titre et données de quiz requis' });
                return;
            }

            if (!user.profileId) {
                res.status(400).json({ success: false, message: 'ID de profil manquant' });
                return;
            }

            // Nettoyage des données
            const safeDescription = description || null;
            const safeSubject = subject || null;
            const safeLevel = level || null;
            const safeImageFilename = imageFilename || null;

            // Nettoyer quizData
            const safeQuizData = quizData ? (() => {
                try {
                    if (typeof quizData === 'string') {
                        const parsed = JSON.parse(quizData);
                        return JSON.parse(JSON.stringify(parsed, (key, value) => value === undefined ? null : value));
                    }
                    return JSON.parse(JSON.stringify(quizData, (key, value) => value === undefined ? null : value));
                } catch (e) {
                    return quizData;
                }
            })() : null;

            const safeIsPublished = isPublished !== undefined ? isPublished : true;
            
            // target_profile_id = enfant ciblé (si fourni), sinon le créateur
            const safeTargetProfileId = targetProfileId ? parseInt(targetProfileId, 10) : user.profileId;

            // Requête INSERT avec template literal
            console.log(`📝 Création leçon par profil ${user.profileId} pour profil cible ${safeTargetProfileId}: ${title}`);
            
            let result;
            try {
                result = await withQueryTimeout(
                    sql`INSERT INTO lessons (profile_id, title, description, subject, level, image_filename, quiz_data, is_published, target_profile_id) VALUES (${user.profileId}, ${title}, ${safeDescription}, ${safeSubject}, ${safeLevel}, ${safeImageFilename}, ${safeQuizData}::jsonb, ${safeIsPublished}, ${safeTargetProfileId}) RETURNING *`,
                    TIMEOUTS.STANDARD,
                    'création de la leçon'
                );
            } catch (insertError) {
                // Si erreur de séquence désynchronisée, corriger et réessayer
                if (insertError.message && insertError.message.includes('duplicate key value violates unique constraint') && insertError.message.includes('lessons_pkey')) {
                    console.warn('⚠️  Séquence désynchronisée détectée, correction automatique...');
                    try {
                        // Synchroniser la séquence
                        const maxIdResult = await withQueryTimeout(
                            sql`SELECT COALESCE(MAX(id), 0) as max_id FROM lessons`,
                            TIMEOUTS.STANDARD,
                            'récupération max ID'
                        );
                        const maxId = parseInt(maxIdResult[0].max_id, 10);
                        const nextId = maxId + 1;
                        
                        await withQueryTimeout(
                            sql`SELECT setval('lessons_id_seq', ${nextId}, false)`,
                            TIMEOUTS.STANDARD,
                            'correction séquence'
                        );
                        
                        console.log(`✅ Séquence corrigée, prochain ID: ${nextId}`);
                        
                        // Réessayer l'insertion
                        result = await withQueryTimeout(
                            sql`INSERT INTO lessons (profile_id, title, description, subject, level, image_filename, quiz_data, is_published, target_profile_id) VALUES (${user.profileId}, ${title}, ${safeDescription}, ${safeSubject}, ${safeLevel}, ${safeImageFilename}, ${safeQuizData}::jsonb, ${safeIsPublished}, ${safeTargetProfileId}) RETURNING *`,
                            TIMEOUTS.STANDARD,
                            'création de la leçon (après correction)'
                        );
                    } catch (fixError) {
                        console.error('❌ Erreur lors de la correction de la séquence:', fixError);
                        throw insertError; // Relancer l'erreur originale
                    }
                } else {
                    throw insertError; // Relancer l'erreur si ce n'est pas une erreur de séquence
                }
            }

            res.status(201).json({
                success: true,
                message: 'Leçon créée avec succès',
                data: { lesson: result[0] }
            });

        } else {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
        }

    } catch (error) {
        console.error('❌ Erreur dans handleLessons:', error);
        const errorResponse = handleError(error, 'Erreur lors de la gestion des leçons');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler d'une leçon spécifique
async function handleLesson(req, res) {
    try {
        const id = req.params.id;

        if (!id) {
            res.status(400).json({ success: false, message: 'ID de leçon requis' });
            return;
        }

        const lessonIdNum = parseInt(id, 10);
        if (isNaN(lessonIdNum)) {
            res.status(400).json({ success: false, message: 'ID de leçon invalide' });
            return;
        }

        if (req.method === 'GET') {
            console.log(`🔍 Récupération leçon ${lessonIdNum}`);
            const lessons = await withQueryTimeout(
                sql`SELECT l.id, l.title, l.description, l.subject, l.level, l.image_filename, l.quiz_data, l.is_published, l.created_at, l.updated_at, p.name as profile_name, p.id as profile_id FROM lessons l JOIN profiles p ON l.profile_id = p.id WHERE l.id = ${lessonIdNum}`,
                TIMEOUTS.STANDARD,
                'récupération de la leçon'
            );


            if (!lessons[0]) {
                res.status(404).json({ success: false, message: 'Leçon non trouvée' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Leçon récupérée avec succès',
                data: { lesson: lessons[0] }
            });

        } else if (req.method === 'PUT') {
            const user = authenticateToken(req);
            const {
                title, description, subject, level,
                imageFilename, quizData, isPublished
            } = req.body;

            // Vérification existence et droits
            const existingLesson = await withQueryTimeout(
                sql`SELECT * FROM lessons WHERE id = ${lessonIdNum}`,
                TIMEOUTS.STANDARD,
                'vérification de la leçon'
            );

            if (!existingLesson[0]) {
                res.status(404).json({ success: false, message: 'Leçon non trouvée' });
                return;
            }

            if (!user.isAdmin && existingLesson[0].profile_id !== user.profileId) {
                res.status(403).json({ success: false, message: 'Accès refusé' });
                return;
            }

            console.log(`✏️ Mise à jour leçon ${lessonIdNum}`);
            const result = await withQueryTimeout(
                sql`UPDATE lessons SET title = COALESCE(${title}, title), description = COALESCE(${description}, description), subject = COALESCE(${subject}, subject), level = COALESCE(${level}, level), image_filename = COALESCE(${imageFilename}, image_filename), quiz_data = COALESCE(${quizData ? JSON.stringify(quizData) : null}::jsonb, quiz_data), is_published = COALESCE(${isPublished}, is_published), updated_at = CURRENT_TIMESTAMP WHERE id = ${lessonIdNum} RETURNING *`,
                TIMEOUTS.STANDARD,
                'mise à jour de la leçon'
            );


            res.status(200).json({
                success: true,
                message: 'Leçon modifiée avec succès',
                data: { lesson: result[0] }
            });

        } else if (req.method === 'DELETE') {
            const user = authenticateToken(req);

            const existingLesson = await withQueryTimeout(
                sql`SELECT * FROM lessons WHERE id = ${lessonIdNum}`,
                TIMEOUTS.STANDARD,
                'vérification de la leçon'
            );

            if (!existingLesson[0]) {
                res.status(404).json({ success: false, message: 'Leçon non trouvée' });
                return;
            }

            if (!user.isAdmin && existingLesson[0].profile_id !== user.profileId) {
                res.status(403).json({ success: false, message: 'Accès refusé' });
                return;
            }

            console.log(`🗑️ Suppression leçon ${lessonIdNum}`);
            const result = await withQueryTimeout(
                sql`DELETE FROM lessons WHERE id = ${lessonIdNum} RETURNING *`,
                TIMEOUTS.STANDARD,
                'suppression de la leçon'
            );

            res.status(200).json({
                success: true,
                message: 'Leçon supprimée avec succès',
                data: { lesson: result[0] }
            });

        } else {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
        }

    } catch (error) {
        console.error('❌ Erreur dans handleLesson:', error);
        const errorResponse = handleError(error, 'Erreur lors de la gestion de la leçon');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Handler des résultats de quiz
async function handleQuizResults(req, res) {
    try {
        const lessonId = req.params.id;

        if (!lessonId) {
            res.status(400).json({ success: false, message: 'ID de leçon requis' });
            return;
        }

        const lessonIdNum = parseInt(lessonId, 10);
        if (isNaN(lessonIdNum)) {
            res.status(400).json({ success: false, message: 'ID de leçon invalide' });
            return;
        }

        if (req.method === 'GET') {
            // Récupérer le profileId depuis la query string
            const url = new URL(req.url, `http://${req.headers.host}`);
            const profileId = url.searchParams.get('profileId');

            if (!profileId) {
                res.status(400).json({ success: false, message: 'ID de profil requis' });
                return;
            }

            const profileIdNum = parseInt(profileId, 10);
            if (isNaN(profileIdNum)) {
                res.status(400).json({ success: false, message: 'ID de profil invalide' });
                return;
            }
            if (!canActForProfile(req.user, profileIdNum)) {
                res.status(403).json({ success: false, message: 'Accès refusé', code: 'FORBIDDEN' });
                return;
            }

            console.log(`🔍 Récupération résultats quiz - lessonId: ${lessonIdNum}, profileId: ${profileIdNum}`);

            const results = await withQueryTimeout(
                sql`
                    SELECT * FROM quiz_results 
                    WHERE lesson_id = ${lessonIdNum} AND profile_id = ${profileIdNum}
                    ORDER BY completed_at DESC
                `,
                TIMEOUTS.STANDARD,
                'récupération des résultats de quiz'
            );

            res.status(200).json({
                success: true,
                message: 'Résultats récupérés avec succès',
                data: { results }
            });

        } else if (req.method === 'POST') {
            // Sauvegarder un résultat de quiz
            // Valider les types : chaque valeur interpolée dans sql`...` doit être un scalaire
            const profileId = parseInt(req.body?.profileId, 10);
            const score = Number(req.body?.score);
            const totalQuestions = Number(req.body?.totalQuestions);
            const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : null;

            if (!Number.isInteger(profileId) || profileId <= 0
                || !Number.isInteger(score) || !Number.isInteger(totalQuestions)
                || totalQuestions < 1 || totalQuestions > 1000 || score < 0 || score > totalQuestions) {
                res.status(400).json({ success: false, message: 'Données de résultat invalides' });
                return;
            }
            if (!canActForProfile(req.user, profileId)) {
                res.status(403).json({ success: false, message: 'Accès refusé', code: 'FORBIDDEN' });
                return;
            }

            const percentage = Math.round((score / totalQuestions) * 100);

            console.log(`📝 Sauvegarde résultat quiz - lessonId: ${lessonIdNum}, profileId: ${profileId}, score: ${score}/${totalQuestions}`);

            const result = await withQueryTimeout(
                sql`
                    INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers, completed_at)
                    VALUES (${lessonIdNum}, ${profileId}, ${score}, ${totalQuestions}, ${percentage}, ${JSON.stringify(answers)}::jsonb, NOW())
                    RETURNING *
                `,
                TIMEOUTS.STANDARD,
                'sauvegarde du résultat de quiz'
            );

            // Vérifier et débloquer les badges automatiquement
            let unlockedBadges = [];
            try {
                const badgeService = require('../lib/badgeService.js');

                // Récupérer les informations de la leçon pour le contexte
                const lessonInfo = await withQueryTimeout(
                    sql`SELECT subject FROM lessons WHERE id = ${lessonIdNum}`,
                    TIMEOUTS.STANDARD,
                    'récupération info leçon'
                );

                unlockedBadges = await badgeService.checkAndUnlockBadges(
                    profileId,
                    'quiz_completed',
                    {
                        lessonId: lessonIdNum,
                        score,
                        totalQuestions,
                        percentage,
                        subject: lessonInfo[0]?.subject
                    }
                );

                if (unlockedBadges.length > 0) {
                    console.log(`🎉 ${unlockedBadges.length} badge(s) débloqué(s) pour le profil ${profileId}`);
                }
            } catch (badgeError) {
                // Ne pas bloquer la sauvegarde du résultat si la vérification des badges échoue
                console.error('⚠️  Erreur lors de la vérification des badges (non bloquant):', badgeError.message);
            }

            res.status(201).json({
                success: true,
                message: 'Résultat sauvegardé avec succès',
                data: {
                    result: result[0],
                    unlockedBadges: unlockedBadges.length > 0 ? unlockedBadges : undefined
                }
            });

        } else {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
        }

    } catch (error) {
        console.error('❌ Erreur dans handleQuizResults:', error);
        const errorResponse = handleError(error, 'Erreur lors de la gestion des résultats de quiz');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

// Statistiques globales (parent/admin)
async function handleGlobalLessonStats(req, res) {
    try {
        if (req.method !== 'GET') {
            res.status(405).json({ success: false, message: 'Méthode non autorisée' });
            return;
        }

        // Authentification requise (stats globales)
        const user = authenticateToken(req);
        if (!user?.isAdmin) {
            res.status(403).json({ success: false, message: 'Accès refusé' });
            return;
        }

        const [lessonsCount, quizzesCount, avgScore] = await Promise.all([
            withQueryTimeout(
                sql`SELECT COUNT(*)::int as total_lessons FROM lessons WHERE is_published = true`,
                TIMEOUTS.STANDARD,
                'statistiques globales (total lessons)'
            ),
            withQueryTimeout(
                sql`SELECT COUNT(*)::int as total_quizzes_completed FROM quiz_results`,
                TIMEOUTS.STANDARD,
                'statistiques globales (total quizzes)'
            ),
            withQueryTimeout(
                sql`SELECT COALESCE(AVG(percentage), 0)::float as average_score FROM quiz_results`,
                TIMEOUTS.STANDARD,
                'statistiques globales (average score)'
            )
        ]);

        const stats = {
            total_lessons: lessonsCount?.[0]?.total_lessons ?? 0,
            total_quizzes_completed: quizzesCount?.[0]?.total_quizzes_completed ?? 0,
            average_score: avgScore?.[0]?.average_score ?? 0
        };

        res.status(200).json({
            success: true,
            message: 'Statistiques globales récupérées avec succès',
            data: { stats }
        });
    } catch (error) {
        console.error('❌ Erreur dans handleGlobalLessonStats:', error);
        const errorResponse = handleError(error, 'Erreur lors de la récupération des statistiques globales');
        res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body));
    }
}

module.exports = {
    handleLessons,
    handleLesson,
    handleQuizResults,
    handleGlobalLessonStats
};
