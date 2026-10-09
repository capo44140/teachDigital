/**
 * Tests du service de badges (lib/badgeService.js) — base mockée
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn();
  const client = { query: jest.fn(), release: jest.fn() };
  return { sql, default: sql, pool: { connect: jest.fn(async () => client), query: jest.fn() }, __client: client };
});

const { sql, pool, __client: client } = require('../../lib/database.js');
const badgeService = require('../../lib/badgeService.js');

const BADGE = { id: 3, name: 'Premier quiz', condition_type: 'quiz_completed', condition_value: 1 };

function sqlText(call) {
  return call[0].join('?');
}

beforeEach(() => {
  sql.mockReset();
  pool.connect.mockClear();
  client.query.mockReset().mockResolvedValue({ rows: [{ unlocked_at: new Date() }] });
  client.release.mockClear();
});

it('fait toutes les lectures avant d\'ouvrir la transaction (aucune connexion bloquée pendant les lectures)', async () => {
  let connected = false;
  pool.connect.mockImplementationOnce(async () => {
    connected = true;
    return client;
  });
  sql.mockImplementation((strings) => {
    // Une lecture après pool.connect() garderait une connexion bloquée pendant qu'elle en attend une autre
    expect(connected).toBe(false);
    const text = strings.join('?');
    if (text.includes('FROM badges')) return Promise.resolve([BADGE]);
    if (text.includes('FROM profile_badges')) return Promise.resolve([]);
    return Promise.resolve([{ count: '1' }]);
  });

  const unlocked = await badgeService.checkAndUnlockBadges(7, 'quiz_completed');

  expect(unlocked.map(b => b.id)).toEqual([3]);
  expect(client.query.mock.calls.map(c => c[0])).toEqual(['BEGIN', expect.stringContaining('INSERT INTO profile_badges'), 'COMMIT']);
  expect(client.release).toHaveBeenCalled();
});

it('n\'ouvre aucune transaction quand tous les badges sont déjà débloqués', async () => {
  sql.mockImplementation((strings) => {
    const text = strings.join('?');
    if (text.includes('FROM badges')) return Promise.resolve([BADGE]);
    return Promise.resolve([{ badge_id: 3, is_unlocked: true }]);
  });

  await expect(badgeService.checkAndUnlockBadges(7, 'quiz_completed')).resolves.toEqual([]);
  expect(pool.connect).not.toHaveBeenCalled();
});

it('annule la transaction et libère la connexion en cas d\'erreur', async () => {
  sql.mockImplementation((strings) => {
    const text = strings.join('?');
    if (text.includes('FROM badges')) return Promise.resolve([BADGE]);
    if (text.includes('FROM profile_badges')) return Promise.resolve([]);
    return Promise.resolve([{ count: '1' }]);
  });
  client.query.mockImplementation(async (text) => {
    if (text.includes('INSERT')) throw new Error('boom');
    return { rows: [] };
  });

  await expect(badgeService.checkAndUnlockBadges(7, 'quiz_completed')).rejects.toThrow('boom');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalled();
});

it('ne compte que les sessions terminées (sauvegardes intermédiaires exclues)', async () => {
  sql.mockResolvedValue([{ count: '0' }]);

  await badgeService.calculatePerfectScoreProgress(7);
  await badgeService.calculateQuizCompletedProgress(7);

  for (const call of sql.mock.calls) {
    expect(sqlText(call)).toContain('is_completed IS NOT FALSE');
  }
});
