/**
 * Résumé de progression (controllers/progressController.js) sur une vraie base :
 * une seule requête SQL, mêmes types de réponse qu'avant (Date, percentage en chaîne).
 */

const { default: sql, pool } = require('../../lib/database.js');
const { handleProfileProgressSummary } = require('../../controllers/progressController.js');
const {
  describeWithDb,
  createTestProfile,
  createTestLesson,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

function daysAgo(n, hour = 12) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, hour, 0, 0);
}

describeWithDb('GET /profiles/:id/progress-summary', () => {
  const profileIds = [];
  const lessonIds = [];
  let child;
  let parent;

  beforeAll(async () => {
    parent = await createTestProfile({ name: `Parent progression ${Date.now()}`, type: 'admin', is_admin: true, is_child: false });
    child = await createTestProfile({ name: `Enfant progression ${Date.now()}` });
    profileIds.push(parent.id, child.id);
    const maths = await createTestLesson(parent.id, { title: 'Fractions', subject: 'Mathématiques' });
    const blank = await createTestLesson(parent.id, { title: 'Sans matière', subject: '  ' });
    lessonIds.push(maths.id, blank.id);

    const insert = (lessonId, percentage, completedAt, completed = true) => sql`
      INSERT INTO quiz_results (lesson_id, profile_id, score, total_questions, percentage, answers, is_completed, completed_at)
      VALUES (${lessonId}, ${child.id}, 3, 4, ${percentage}, ${JSON.stringify({ q1: 1 })}::jsonb, ${completed}, ${completedAt})
    `;
    await insert(maths.id, 100, daysAgo(0));
    await insert(maths.id, 75, daysAgo(1));
    await insert(blank.id, 50, daysAgo(2));
    await insert(maths.id, 100, daysAgo(10), false);
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(profileIds, lessonIds);
  });

  async function callSummary(profileId, token, query = '') {
    const req = createMockRequest('GET', `/api/profiles/${profileId}/progress-summary${query}`, {}, {
      authorization: `Bearer ${token}`
    }, { id: String(profileId) });
    const res = createMockResponse();
    await handleProfileProgressSummary(req, res);
    return res;
  }

  it('agrège tout en une seule requête SQL', async () => {
    const spy = jest.spyOn(pool, 'query');
    try {
      const res = await callSummary(child.id, generateTestToken(parent));
      expect(res.statusCode).toBe(200);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('renvoie les totaux, séries, compétences et l\'historique avec les types habituels', async () => {
    const res = await callSummary(child.id, generateTestToken(parent));
    const { summary } = res.body.data;

    expect(summary.totals).toEqual({ totalQuizzes: 4, averageScore: 81.25, perfectCount: 1 });
    expect(summary.streaks).toMatchObject({ current: 3, best: 3 });
    expect(summary.xp.total).toBe(325 + 50);
    expect(summary.skills.find(s => s.subject === 'Mathématiques')).toMatchObject({ quizzes: 3 });
    expect(summary.skills.find(s => s.subject === 'Autres')).toMatchObject({ quizzes: 1, averageScore: 50 });
    expect(summary.skills[0].lastAttempt).toBeInstanceOf(Date);
    expect(summary.monthlyProgress.reduce((n, m) => n + m.quizCount, 0)).toBe(4);

    const [latest] = summary.recentHistory;
    expect(summary.recentHistory).toHaveLength(4);
    expect(latest).toMatchObject({ lessonTitle: 'Fractions', lessonSubject: 'Mathématiques', percentage: '100.00', isCompleted: true, answers: { q1: 1 } });
    expect(latest.completedAt).toBeInstanceOf(Date);
    expect(Math.abs(latest.completedAt.getTime() - daysAgo(0).getTime())).toBeLessThan(1000);
    // Tri du plus récent au plus ancien
    const times = summary.recentHistory.map(q => q.completedAt.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(summary.recentHistory.find(q => q.isCompleted === false)).toBeDefined();
  });

  it('respecte historyLimit', async () => {
    const res = await callSummary(child.id, generateTestToken(parent), '?historyLimit=2');
    expect(res.body.data.summary.recentHistory).toHaveLength(2);
  });

  it('refuse l\'accès au résumé d\'un autre enfant (canActForProfile est asynchrone)', async () => {
    const other = await createTestProfile({ name: `Autre enfant ${Date.now()}` });
    profileIds.push(other.id);
    const res = await callSummary(child.id, generateTestToken(other));
    expect(res.statusCode).toBe(403);
  });
});
