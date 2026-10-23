/**
 * Badges sur une vraie base (TEST_DATABASE_URL) : statistiques groupées, daily_streak,
 * critère non supporté et déblocage unique sous concurrence.
 */

const { default: sql } = require('../../lib/database.js');
const badgeService = require('../../lib/badgeService.js');
const {
  describeWithDb,
  createTestProfile,
  createTestLesson,
  createTestBadge,
  cleanupTestData
} = require('../helpers/testHelpers.js');

// Midi, heure locale, N jours avant aujourd'hui
function daysAgo(n) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12, 0, 0);
}

async function addResult(profileId, lessonId, { daysBefore, percentage = 80, completed = true }) {
  await sql`
    INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers, is_completed, completed_at)
    VALUES (${lessonId}, ${profileId}, 4, 5, ${percentage}, ${JSON.stringify([0, 1])}::jsonb, ${completed}, ${daysAgo(daysBefore)})
  `;
}

describeWithDb('badgeService (base réelle)', () => {
  const profileIds = [];
  const lessonIds = [];
  const badgeIds = [];
  let profile;
  let lesson;

  beforeAll(async () => {
    profile = await createTestProfile({ name: `Badge streak ${Date.now()}` });
    profileIds.push(profile.id);
    lesson = await createTestLesson(profile.id, { subject: 'Mathématiques' });
    lessonIds.push(lesson.id);

    // 4 jours consécutifs (hier → il y a 4 jours), deux quiz le même jour, une sauvegarde
    // non terminée (exclue) qui comblerait sinon un trou, puis un jour isolé
    await addResult(profile.id, lesson.id, { daysBefore: 1, percentage: 100 });
    await addResult(profile.id, lesson.id, { daysBefore: 1 });
    await addResult(profile.id, lesson.id, { daysBefore: 2 });
    await addResult(profile.id, lesson.id, { daysBefore: 3 });
    await addResult(profile.id, lesson.id, { daysBefore: 4, percentage: 50 });
    await addResult(profile.id, lesson.id, { daysBefore: 5, completed: false });
    await addResult(profile.id, lesson.id, { daysBefore: 6 });
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(profileIds, lessonIds, badgeIds);
  });

  it('calcule toutes les statistiques en une requête (sessions terminées uniquement)', async () => {
    const stats = await badgeService.loadProfileBadgeStats(profile.id);

    expect(stats.quizCompleted).toBe(6);
    expect(stats.perfectScore).toBe(1);
    expect(stats.subjectsVariety).toBe(1);
    expect(stats.subjectCounts).toEqual({ 'mathématiques': 6 });
    expect(stats.recentPercentages.slice(0, 2).sort()).toEqual([100, 80]);
    // 5 jours distincts : la sauvegarde non terminée (il y a 5 jours) n'en fait pas partie
    expect(stats.dayKeys).toHaveLength(5);
  });

  it('daily_streak : débloqué à 4 jours consécutifs, une seule fois', async () => {
    const streakBadge = await createTestBadge({ name: 'Régulier test', condition_type: 'daily_streak', condition_value: 4 });
    const tooLong = await createTestBadge({ name: 'Très régulier test', condition_type: 'daily_streak', condition_value: 5 });
    badgeIds.push(streakBadge.id, tooLong.id);

    const unlocked = await badgeService.checkAndUnlockBadges(profile.id, 'quiz_completed');
    const ids = unlocked.map(b => b.id);
    expect(ids).toContain(streakBadge.id);
    expect(ids).not.toContain(tooLong.id);

    const rows = await sql`SELECT badge_id, progress, is_unlocked FROM profile_badges WHERE profile_id = ${profile.id} AND badge_id = ANY(${[streakBadge.id, tooLong.id]})`;
    const byBadge = Object.fromEntries(rows.map(r => [r.badge_id, r]));
    expect(byBadge[streakBadge.id]).toMatchObject({ progress: 4, is_unlocked: true });
    expect(byBadge[tooLong.id]).toMatchObject({ progress: 4, is_unlocked: false });

    // Deuxième vérification : déjà débloqué, pas renvoyé à nouveau
    const again = await badgeService.checkAndUnlockBadges(profile.id, 'quiz_completed');
    expect(again.map(b => b.id)).not.toContain(streakBadge.id);
  });

  it('learning_time : aucune progression enregistrée (critère non évaluable)', async () => {
    const timeBadge = await createTestBadge({ name: 'Studieux test', condition_type: 'learning_time', condition_value: 1 });
    badgeIds.push(timeBadge.id);

    const unlocked = await badgeService.checkAndUnlockBadges(profile.id, 'quiz_completed');
    expect(unlocked.map(b => b.id)).not.toContain(timeBadge.id);

    const rows = await sql`SELECT 1 FROM profile_badges WHERE profile_id = ${profile.id} AND badge_id = ${timeBadge.id}`;
    expect(rows).toHaveLength(0);
  });

  it('deux vérifications simultanées ne débloquent (et ne notifient) le badge qu\'une fois', async () => {
    const other = await createTestProfile({ name: `Badge concurrence ${Date.now()}` });
    profileIds.push(other.id);
    await addResult(other.id, lesson.id, { daysBefore: 0 });
    const firstQuiz = await createTestBadge({ name: 'Premier quiz test', condition_type: 'quiz_completed', condition_value: 1 });
    badgeIds.push(firstQuiz.id);

    const [a, b] = await Promise.all([
      badgeService.checkAndUnlockBadges(other.id, 'quiz_completed'),
      badgeService.checkAndUnlockBadges(other.id, 'quiz_completed')
    ]);
    const occurrences = [...a, ...b].filter(badge => badge.id === firstQuiz.id);
    expect(occurrences).toHaveLength(1);
  });
});
