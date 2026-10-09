/**
 * Tests des résultats de session sur une page de cours
 * La base et les badges sont mockés.
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn() },
  default: jest.fn()
}));
jest.mock('../../lib/nativeHash.js', () => ({ NativeHashService: {} }));
jest.mock('../../lib/badgeService.js', () => ({ checkAndUnlockBadges: jest.fn() }));

const { pool } = require('../../lib/database.js');
const badgeService = require('../../lib/badgeService.js');
const { handleCoursePageResults } = require('../../controllers/coursePageController.js');
const { createMockRequest, createMockResponse, familyAuthHeader, profileAuthHeader } = require('../helpers/testHelpers.js');

const PAGE = { id: 12, subject: 'SVT' };
const body = { profileId: 7, score: 4, totalQuestions: 5, answers: { bestStreak: 3 } };

describe('Résultats de page de cours', () => {
  beforeEach(() => {
    pool.query.mockReset();
    badgeService.checkAndUnlockBadges.mockReset().mockResolvedValue([]);
  });

  it('crée une session (POST) et vérifie les badges avec la matière de la page', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [PAGE] })
      .mockResolvedValueOnce({ rows: [{ id: 99, course_page_id: 12, percentage: 80 }] });
    badgeService.checkAndUnlockBadges.mockResolvedValue([{ id: 1, name: 'Premier quiz' }]);
    const req = createMockRequest('POST', '/api/course-pages/12/results', body, familyAuthHeader(), { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.result.id).toBe(99);
    expect(res.body.data.unlockedBadges).toEqual([{ id: 1, name: 'Premier quiz' }]);
    const [checkSql, checkParams] = pool.query.mock.calls[0];
    expect(checkSql).toContain('is_published = true AND target_profile_id = $2');
    expect(checkParams).toEqual([12, 7]);
    const [insertSql, insertParams] = pool.query.mock.calls[1];
    expect(insertSql).toContain('INSERT INTO quiz_results (course_page_id');
    // completed absent = session terminée (compatibilité anciens clients)
    expect(insertParams).toEqual([12, 7, 4, 5, 80, '{"bestStreak":3}', true]);
    expect(badgeService.checkAndUnlockBadges).toHaveBeenCalledWith(7, 'quiz_completed', expect.objectContaining({ subject: 'SVT', percentage: 80 }));
  });

  it('met à jour la session (PUT) uniquement pour la bonne page et le bon enfant', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [PAGE] })
      .mockResolvedValueOnce({ rows: [{ id: 99, percentage: 90 }] });
    const req = createMockRequest('PUT', '/api/course-pages/12/results/99', { ...body, score: 9, totalQuestions: 10 }, familyAuthHeader(), { id: '12', resultId: '99' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(200);
    const [updateSql, updateParams] = pool.query.mock.calls[1];
    expect(updateSql).toContain('WHERE id = $5 AND course_page_id = $6 AND profile_id = $7');
    expect(updateParams).toEqual([9, 10, 90, '{"bestStreak":3}', 99, 12, 7, true]);
  });

  it('renvoie 404 si la session à mettre à jour n\'existe pas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [PAGE] }).mockResolvedValueOnce({ rows: [] });
    const req = createMockRequest('PUT', '/api/course-pages/12/results/5', body, familyAuthHeader(), { id: '12', resultId: '5' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(404);
    expect(badgeService.checkAndUnlockBadges).not.toHaveBeenCalled();
  });

  it('refuse une page masquée ou destinée à un autre enfant', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = createMockRequest('POST', '/api/course-pages/12/results', body, familyAuthHeader(), { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(404);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['score supérieur au total', { ...body, score: 6 }],
    ['total nul', { ...body, score: 0, totalQuestions: 0 }],
    ['profil manquant', { score: 1, totalQuestions: 1 }],
    ['score non entier', { ...body, score: 1.5 }]
  ])('rejette des données invalides : %s', async (_label, invalid) => {
    const req = createMockRequest('POST', '/api/course-pages/12/results', invalid, familyAuthHeader(), { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('n\'évalue pas les badges sur une sauvegarde intermédiaire (completed: false)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [PAGE] })
      .mockResolvedValueOnce({ rows: [{ id: 99, percentage: 100 }] });
    const req = createMockRequest('POST', '/api/course-pages/12/results', { ...body, score: 5, completed: false }, familyAuthHeader(), { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(201);
    expect(pool.query.mock.calls[1][1][6]).toBe(false);
    expect(badgeService.checkAndUnlockBadges).not.toHaveBeenCalled();
  });

  it('refuse sans jeton (403) et ne touche pas à la base', async () => {
    const req = createMockRequest('POST', '/api/course-pages/12/results', body, {}, { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('refuse qu\'un profil non parent enregistre pour un autre enfant', async () => {
    const req = createMockRequest('POST', '/api/course-pages/12/results', body, profileAuthHeader({ profileId: 8, isAdmin: false }), { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('sauvegarde même si la vérification des badges échoue', async () => {
    pool.query.mockResolvedValueOnce({ rows: [PAGE] }).mockResolvedValueOnce({ rows: [{ id: 99 }] });
    badgeService.checkAndUnlockBadges.mockRejectedValue(new Error('badges KO'));
    const req = createMockRequest('POST', '/api/course-pages/12/results', body, familyAuthHeader(), { id: '12' });
    const res = createMockResponse();

    await handleCoursePageResults(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.unlockedBadges).toBeUndefined();
  });
});
