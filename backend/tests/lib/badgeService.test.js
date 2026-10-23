/**
 * Tests du service de badges (lib/badgeService.js) — base mockée
 * Nombre de requêtes constant quel que soit le nombre de badges (pas de requête par badge).
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn();
  return { sql, default: sql, pool: { query: jest.fn(), connect: jest.fn() } };
});

const { sql, pool } = require('../../lib/database.js');
const badgeService = require('../../lib/badgeService.js');

function sqlText(call) {
  return call[0].join('?');
}

const STATS_ROW = {
  quiz_completed: 12,
  perfect_score: 2,
  subjects_variety: 3,
  recent_percentages: [100, 90, 85, 60, 100],
  subject_counts: { 'mathématiques': 6, 'français': 4 },
  day_keys: ['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-15']
};

function badge(id, conditionType, conditionValue, extra = {}) {
  return { id, name: `Badge ${id}`, description: '', condition_type: conditionType, condition_value: conditionValue, is_active: true, ...extra };
}

// sql`...` mocké : badges actifs (avec état du profil), puis statistiques du profil
function mockReads(badges) {
  sql.mockImplementation((strings) => {
    const text = strings.join('?');
    if (text.includes('FROM badges b')) return Promise.resolve(badges);
    if (text.includes('WITH results AS')) return Promise.resolve([STATS_ROW]);
    return Promise.reject(new Error(`Requête inattendue: ${text}`));
  });
}

beforeEach(() => {
  sql.mockReset();
  pool.query.mockReset();
  pool.connect.mockReset();
});

describe('checkAndUnlockBadges', () => {
  it('fait 3 requêtes au total pour 10 badges (lectures groupées + un seul UPSERT)', async () => {
    const badges = Array.from({ length: 10 }, (_, i) => badge(i + 1, 'quiz_completed', i + 1));
    mockReads(badges);
    pool.query.mockResolvedValue({ rows: badges.map(b => ({ badge_id: b.id, is_unlocked: true, unlocked_at: new Date(), unlocked_now: true })) });

    const unlocked = await badgeService.checkAndUnlockBadges(7, 'quiz_completed');

    expect(sql).toHaveBeenCalledTimes(2);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.connect).not.toHaveBeenCalled();
    const [text, params] = pool.query.mock.calls[0];
    expect(text).toContain('INSERT INTO profile_badges');
    expect(text).toContain('unnest');
    expect(params[0]).toBe(7);
    expect(params[1]).toEqual(badges.map(b => b.id));
    expect(params[2]).toEqual(badges.map(() => 12));
    expect(params[3]).toEqual(badges.map(() => true));
    expect(unlocked).toHaveLength(10);
    // Le champ interne de la jointure n'est pas renvoyé
    expect(unlocked[0]).not.toHaveProperty('profile_is_unlocked');
  });

  it('ne renvoie que les badges débloqués par CETTE requête (unlocked_now)', async () => {
    mockReads([badge(1, 'quiz_completed', 1), badge(2, 'perfect_score', 1)]);
    const unlockedAt = new Date();
    pool.query.mockResolvedValue({
      rows: [
        { badge_id: 1, is_unlocked: true, unlocked_at: unlockedAt, unlocked_now: true },
        // Débloqué entre-temps par une requête concurrente : pas une nouvelle notification
        { badge_id: 2, is_unlocked: true, unlocked_at: new Date(0), unlocked_now: false }
      ]
    });

    const unlocked = await badgeService.checkAndUnlockBadges(7, 'quiz_completed');
    expect(unlocked.map(b => b.id)).toEqual([1]);
    expect(unlocked[0].unlocked_at).toBe(unlockedAt);
  });

  it('n\'écrit rien quand tous les badges sont déjà débloqués', async () => {
    mockReads([{ ...badge(3, 'quiz_completed', 1), profile_is_unlocked: true }]);

    await expect(badgeService.checkAndUnlockBadges(7, 'quiz_completed')).resolves.toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
    // Pas besoin des statistiques non plus
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('ignore explicitement les critères non évaluables (learning_time) : ni progression ni déblocage', async () => {
    mockReads([badge(1, 'learning_time', 60), badge(2, 'quiz_completed', 50)]);
    pool.query.mockResolvedValue({ rows: [{ badge_id: 2, is_unlocked: false, unlocked_at: null, unlocked_now: false }] });

    await badgeService.checkAndUnlockBadges(7, 'quiz_completed');

    const params = pool.query.mock.calls[0][1];
    expect(params[1]).toEqual([2]);
  });

  it('propage l\'erreur de l\'UPSERT', async () => {
    mockReads([badge(1, 'quiz_completed', 1)]);
    pool.query.mockRejectedValue(new Error('boom'));

    await expect(badgeService.checkAndUnlockBadges(7, 'quiz_completed')).rejects.toThrow('boom');
  });

  it('ne compte que les sessions terminées et ne lit que les badges actifs', async () => {
    mockReads([badge(1, 'quiz_completed', 1)]);
    pool.query.mockResolvedValue({ rows: [] });

    await badgeService.checkAndUnlockBadges(7, 'quiz_completed');

    const texts = sql.mock.calls.map(sqlText);
    expect(texts[0]).toContain('b.is_active = true');
    expect(texts[1]).toContain('is_completed IS NOT FALSE');
  });
});

describe('computeBadgeProgress', () => {
  const stats = {
    quizCompleted: 12,
    perfectScore: 2,
    subjectsVariety: 3,
    recentPercentages: [100, 90, 85, 60, 100],
    subjectCounts: { 'mathématiques': 6, 'français': 4 },
    dayKeys: ['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-15']
  };

  it.each([
    ['quiz_completed', 10, 12, true],
    ['perfect_score', 3, 2, false],
    ['score_streak', 3, 3, true],
    ['subjects_variety', 3, 3, true],
    ['daily_streak', 3, 3, true],
    ['daily_streak', 7, 3, false]
  ])('%s (objectif %i) → progression %i', (type, value, progress, complete) => {
    expect(badgeService.computeBadgeProgress(badge(1, type, value), stats))
      .toEqual({ progress, isComplete: complete, supported: true });
  });

  it('subject_specific : subject_filter prioritaire, sinon matière déduite du nom', () => {
    expect(badgeService.computeBadgeProgress(badge(1, 'subject_specific', 5, { subject_filter: 'Français' }), stats).progress).toBe(4);
    expect(badgeService.computeBadgeProgress(badge(1, 'subject_specific', 5, { name: 'Mathématicien' }), stats))
      .toEqual({ progress: 6, isComplete: true, supported: true });
  });

  it('learning_time est explicitement non supporté (jamais complété)', () => {
    const result = badgeService.computeBadgeProgress(badge(1, 'learning_time', 1), stats);
    expect(result).toMatchObject({ progress: 0, isComplete: false, supported: false });
    expect(result.reason).toMatch(/temps/i);
    expect(badgeService.getConditionSupport('learning_time').supported).toBe(false);
    expect(badgeService.getConditionSupport('daily_streak').supported).toBe(true);
    expect(badgeService.getConditionSupport('inconnu').supported).toBe(false);
  });
});
