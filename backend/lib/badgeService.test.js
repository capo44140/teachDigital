/**
 * Tests unitaires pour le service de badges
 * Exécuter avec: cd backend && npm test badgeService.test.js
 */

const badgeService = require('../lib/badgeService.js');
const { pool } = require('../lib/database.js');

describe('Badge Service - Unit Tests', () => {
    let testProfileId;
    let testBadgeId;

    // Setup: Créer un profil et des badges de test
    beforeAll(async () => {
        // Créer un profil de test
        const profileResult = await pool.query(
            `INSERT INTO profiles (name, pin_hash, is_parent) 
       VALUES ('Test Profile Badge', 'test_hash', false) 
       RETURNING id`
        );
        testProfileId = profileResult.rows[0].id;

        // Créer un badge de test
        const badgeResult = await pool.query(
            `INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color)
       VALUES ('Test Badge', 'Test Description', '🧪', 'test', 'quiz_completed', 5, 50, 'blue')
       RETURNING id`
        );
        testBadgeId = badgeResult.rows[0].id;
    });

    // Cleanup: Supprimer les données de test
    afterAll(async () => {
        await pool.query(`DELETE FROM profile_badges WHERE profile_id = $1`, [testProfileId]);
        await pool.query(`DELETE FROM quiz_results WHERE profile_id = $1`, [testProfileId]);
        await pool.query(`DELETE FROM badges WHERE id = $1`, [testBadgeId]);
        await pool.query(`DELETE FROM profiles WHERE id = $1`, [testProfileId]);
        await pool.end();
    });

    describe('calculateQuizCompletedProgress', () => {
        it('should return 0 when no quiz completed', async () => {
            const progress = await badgeService.calculateQuizCompletedProgress(testProfileId);
            expect(progress).toBe(0);
        });

        it('should return correct count after completing quizzes', async () => {
            // Créer une leçon de test
            const lessonResult = await pool.query(
                `INSERT INTO lessons (title, profile_id, quiz_data) 
         VALUES ('Test Lesson', $1, '{}') 
         RETURNING id`,
                [testProfileId]
            );
            const lessonId = lessonResult.rows[0].id;

            // Ajouter 3 résultats de quiz
            for (let i = 0; i < 3; i++) {
                await pool.query(
                    `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers)
           VALUES ($1, $2, 8, 10, 80, '[]')`,
                    [lessonId, testProfileId]
                );
            }

            const progress = await badgeService.calculateQuizCompletedProgress(testProfileId);
            expect(progress).toBe(3);

            // Cleanup
            await pool.query(`DELETE FROM quiz_results WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);
        });
    });

    describe('calculatePerfectScoreProgress', () => {
        it('should count only 100% scores', async () => {
            const lessonResult = await pool.query(
                `INSERT INTO lessons (title, profile_id, quiz_data) 
         VALUES ('Test Lesson Perfect', $1, '{}') 
         RETURNING id`,
                [testProfileId]
            );
            const lessonId = lessonResult.rows[0].id;

            // Ajouter 2 scores parfaits et 1 score non parfait
            await pool.query(
                `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers)
         VALUES ($1, $2, 10, 10, 100, '[]')`,
                [lessonId, testProfileId]
            );
            await pool.query(
                `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers)
         VALUES ($1, $2, 10, 10, 100, '[]')`,
                [lessonId, testProfileId]
            );
            await pool.query(
                `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers)
         VALUES ($1, $2, 8, 10, 80, '[]')`,
                [lessonId, testProfileId]
            );

            const progress = await badgeService.calculatePerfectScoreProgress(testProfileId);
            expect(progress).toBe(2);

            // Cleanup
            await pool.query(`DELETE FROM quiz_results WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);
        });
    });

    describe('calculateScoreStreakProgress', () => {
        it('should calculate current streak correctly', async () => {
            const lessonResult = await pool.query(
                `INSERT INTO lessons (title, profile_id, quiz_data) 
         VALUES ('Test Lesson Streak', $1, '{}') 
         RETURNING id`,
                [testProfileId]
            );
            const lessonId = lessonResult.rows[0].id;

            // Ajouter une série de bons scores (>80%)
            const scores = [90, 85, 95, 70, 80]; // Les 3 premiers forment une série
            for (const percentage of scores) {
                await pool.query(
                    `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers, completed_at)
           VALUES ($1, $2, ${percentage}, 100, $3, '[]', NOW() - INTERVAL '${scores.indexOf(percentage)} hours')`,
                    [lessonId, testProfileId, percentage]
                );
            }

            const progress = await badgeService.calculateScoreStreakProgress(testProfileId);
            expect(progress).toBe(3); // Les 3 derniers scores sont >= 80%

            // Cleanup
            await pool.query(`DELETE FROM quiz_results WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);
        });
    });

    describe('checkAndUnlockBadges', () => {
        it('should unlock badge when condition is met', async () => {
            const lessonResult = await pool.query(
                `INSERT INTO lessons (title, profile_id, quiz_data) 
         VALUES ('Test Lesson Unlock', $1, '{}') 
         RETURNING id`,
                [testProfileId]
            );
            const lessonId = lessonResult.rows[0].id;

            // Créer un badge avec condition facile à atteindre
            const badgeResult = await pool.query(
                `INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color)
         VALUES ('Easy Badge', 'Complete 1 quiz', '🎯', 'test', 'quiz_completed', 1, 10, 'green')
         RETURNING id`
            );
            const easyBadgeId = badgeResult.rows[0].id;

            // Ajouter 1 résultat de quiz
            await pool.query(
                `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers)
         VALUES ($1, $2, 8, 10, 80, '[]')`,
                [lessonId, testProfileId]
            );

            // Vérifier les badges
            const unlockedBadges = await badgeService.checkAndUnlockBadges(
                testProfileId,
                'quiz_completed',
                {}
            );

            expect(unlockedBadges.length).toBeGreaterThan(0);
            const unlockedBadge = unlockedBadges.find(b => b.id === easyBadgeId);
            expect(unlockedBadge).toBeDefined();
            expect(unlockedBadge.name).toBe('Easy Badge');

            // Vérifier dans la base de données
            const profileBadgeResult = await pool.query(
                `SELECT * FROM profile_badges WHERE profile_id = $1 AND badge_id = $2`,
                [testProfileId, easyBadgeId]
            );
            expect(profileBadgeResult.rows[0].is_unlocked).toBe(true);
            expect(profileBadgeResult.rows[0].unlocked_at).toBeDefined();

            // Cleanup
            await pool.query(`DELETE FROM profile_badges WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM quiz_results WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM badges WHERE id = $1`, [easyBadgeId]);
            await pool.query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);
        });

        it('should not unlock badge twice (idempotence)', async () => {
            const lessonResult = await pool.query(
                `INSERT INTO lessons (title, profile_id, quiz_data) 
         VALUES ('Test Lesson Idempotence', $1, '{}') 
         RETURNING id`,
                [testProfileId]
            );
            const lessonId = lessonResult.rows[0].id;

            const badgeResult = await pool.query(
                `INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color)
         VALUES ('Idempotent Badge', 'Complete 1 quiz', '🔁', 'test', 'quiz_completed', 1, 10, 'purple')
         RETURNING id`
            );
            const idempotentBadgeId = badgeResult.rows[0].id;

            await pool.query(
                `INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers)
         VALUES ($1, $2, 8, 10, 80, '[]')`,
                [lessonId, testProfileId]
            );

            // Premier appel - devrait débloquer
            const firstCall = await badgeService.checkAndUnlockBadges(testProfileId, 'quiz_completed', {});
            expect(firstCall.length).toBeGreaterThan(0);

            // Deuxième appel - ne devrait pas débloquer à nouveau
            const secondCall = await badgeService.checkAndUnlockBadges(testProfileId, 'quiz_completed', {});
            const secondUnlock = secondCall.find(b => b.id === idempotentBadgeId);
            expect(secondUnlock).toBeUndefined();

            // Cleanup
            await pool.query(`DELETE FROM profile_badges WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM quiz_results WHERE profile_id = $1`, [testProfileId]);
            await pool.query(`DELETE FROM badges WHERE id = $1`, [idempotentBadgeId]);
            await pool.query(`DELETE FROM lessons WHERE id = $1`, [lessonId]);
        });
    });
});
