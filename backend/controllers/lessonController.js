const { default: sql } = require('../lib/database.js');
const { authenticateToken } = require('../lib/auth.js');
const { handleError } = require('../lib/response.js');
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js');

// Handler des leçons
async function handleLessons(req, res) {
    try {
        if (req.method === 'GET') {
            // Parser les query parameters depuis l'URL
            const url = new URL(req.url, `http://${req.headers.host}`);
            const profileId = url.searchParams.get('profileId');
            const published = url.searchParams.get('published');

            console.log(`🔍 Récupération des leçons - profileId: ${profileId}, published: ${published}`);
            const startTime = Date.now();

            // Construire la requête dynamiquement (méthode robuste)
            let queryText = 'SELECT id, title, description, subject, level, image_filename, is_published, created_at, updated_at, profile_id FROM lessons';
            const params = [];
            const conditions = [];

            if (profileId) {
                const profileIdNum = parseInt(profileId, 10);
                if (isNaN(profileIdNum)) {
                    res.status(400).json({ success: false, message: 'ID de profil invalide' });
                    return;
                }
                params.push(profileIdNum);
                conditions.push(`profile_id = $${params.length}`);
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

            console.log('🔍 DEBUG SQL:', queryText);
            console.log('🔍 DEBUG PARAMS:', params);

            lessons = await withQueryTimeout(
                sql(queryText, params),
                TIMEOUTS.STANDARD,
                'récupération des leçons'
            );

            const totalTime = Date.now() - startTime;
            console.log(`✅ Leçons récupérées: ${lessons.length} résultat(s) en ${totalTime}ms`);

            res.status(200).json({
                success: true,
                message: 'Leçons récupérées avec succès',
                data: { lessons }
            });

        } else if (req.method === 'POST') {
            // Authentification requise pour POST
            const user = authenticateToken(req);

            const {
                title, description, subject, level,
                imageFilename, imageData, quizData, isPublished = true
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

            // Requête INSERT avec template literal
            // Requête INSERT avec template literal
            console.log(`📝 Création leçon pour profil ${user.profileId}: ${title}`);
            const result = await withQueryTimeout(
                sql`INSERT INTO lessons (profile_id, title, description, subject, level, image_filename, quiz_data, is_published) VALUES (${user.profileId}, ${title}, ${safeDescription}, ${safeSubject}, ${safeLevel}, ${safeImageFilename}, ${safeQuizData}::jsonb, ${safeIsPublished}) RETURNING *`,
                TIMEOUTS.STANDARD,
                'création de la leçon'
            );


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
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        const idMatch = pathname.match(/\/api\/lessons\/(\d+)/);
        const id = idMatch ? idMatch[1] : null;

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

module.exports = {
    handleLessons,
    handleLesson
};
