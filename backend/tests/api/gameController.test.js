/**
 * Tests unitaires du contrôleur des jeux (sans base de données) : accès évalué par le
 * serveur, règles réservées aux parents, temps de jeu compté par les signaux de vie.
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn() },
  default: jest.fn(),
  sql: jest.fn()
}));

const { pool } = require('../../lib/database.js');
const {
  handleGames,
  handleGameRule,
  handleGameSessionStart,
  handleGameSession
} = require('../../controllers/gameController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');
const { validate } = require('../../lib/validation.js');
const schemas = require('../../lib/schemas.js');
const { HEARTBEAT_MAX_GAP_SECONDS } = require('../../lib/games.js');
const { runChain } = require('./support/chain.js');

// Chaînes identiques à api/index.js (validation Zod puis contrôleur)
const listRoute = [validate(schemas.gameListQuerySchema, 'query'), handleGames];
const ruleRoute = [validate(schemas.gameRuleUpdateSchema), handleGameRule];
const startRoute = [validate(schemas.gameSessionStartSchema), handleGameSessionStart];
const sessionRoute = [validate(schemas.gameSessionUpdateSchema), handleGameSession];

const admin = { scope: 'profile', profileId: 1, isAdmin: true };
const child = { scope: 'profile', profileId: 7, isAdmin: false };

// Ligne renvoyée par la requête d'état des jeux d'un profil
function stateRow({ rules = [], sessions = [], ...stats } = {}) {
  return {
    rows: [{
      quizzes_today: 0,
      quizzes_week: 0,
      average_score_week: 0,
      day_keys: [],
      rules,
      sessions,
      ...stats
    }]
  };
}

const openPacman = { game_key: 'pacman', is_enabled: true, condition_type: 'none', condition_value: 0, daily_limit_minutes: null };

async function run(route, req) {
  const res = createMockResponse();
  await runChain(route, req, res);
  return res;
}

function request(method, path, user, body, params) {
  const req = createMockRequest(method, path, body, {}, params);
  req.user = user;
  return req;
}

describe('Jeux - GET /games', () => {
  beforeEach(() => pool.query.mockReset());

  it('liste les jeux d\'un enfant : fermés par défaut, catalogue des conditions', async () => {
    pool.query.mockResolvedValueOnce(stateRow());

    const res = await run(listRoute, request('GET', '/api/games?profileId=7', child));

    expect(res.statusCode).toBe(200);
    const { games, conditionTypes, profileId } = res.body.data;
    expect(profileId).toBe(7);
    expect(games.map(g => g.key)).toEqual(['pacman', 'tetris']);
    expect(games.every(g => g.access.unlocked === false && g.access.reason === 'disabled')).toBe(true);
    expect(conditionTypes.map(c => c.type)).toContain('quizzes_today');
    // Statistiques bornées au jour et à la semaine en cours
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('FROM game_access_rules WHERE profile_id = $1');
    expect(params[0]).toBe(7);
    expect(new Date(params[1]).getHours()).toBe(0);
  });

  it('applique la règle, la progression et le temps joué', async () => {
    pool.query.mockResolvedValueOnce(stateRow({
      quizzes_today: 1,
      rules: [{ ...openPacman, condition_type: 'quizzes_today', condition_value: 2, daily_limit_minutes: 15 }],
      sessions: [{ game_key: 'pacman', used_seconds_today: 120, best_score: 4200 }]
    }));

    const res = await run(listRoute, request('GET', '/api/games?profileId=7', child));

    const pacman = res.body.data.games.find(g => g.key === 'pacman');
    expect(pacman.bestScore).toBe(4200);
    expect(pacman.rule).toEqual({ isEnabled: true, conditionType: 'quizzes_today', conditionValue: 2, dailyLimitMinutes: 15 });
    expect(pacman.access).toMatchObject({
      unlocked: false,
      reason: 'condition',
      condition: { current: 1, target: 2, met: false },
      remainingSeconds: 780
    });
  });

  it('refuse le profil d\'un autre enfant', async () => {
    const res = await run(listRoute, request('GET', '/api/games?profileId=8', child));
    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('exige profileId', async () => {
    const res = await run(listRoute, request('GET', '/api/games', child));
    expect(res.statusCode).toBe(400);
  });
});

describe('Jeux - PUT /games/:gameKey/rules/:profileId', () => {
  beforeEach(() => pool.query.mockReset());

  const ruleRequest = (user, gameKey, profileId, body) =>
    request('PUT', `/api/games/${gameKey}/rules/${profileId}`, user, body, { gameKey, profileId: String(profileId) });

  it('enregistre la règle et renvoie l\'état recalculé', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(stateRow({ rules: [{ ...openPacman, game_key: 'tetris', daily_limit_minutes: 30 }] }));

    const res = await run(ruleRoute, ruleRequest(admin, 'tetris', 7, { isEnabled: true, dailyLimitMinutes: 30 }));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.game).toMatchObject({ key: 'tetris', access: { unlocked: true, remainingSeconds: 1800 } });
    const [upsert, params] = pool.query.mock.calls[1];
    expect(upsert).toContain('ON CONFLICT (profile_id, game_key)');
    expect(params).toEqual([7, 'tetris', true, 'none', 0, 30]);
  });

  it('refuse un enfant', async () => {
    const res = await run(ruleRoute, ruleRequest(child, 'tetris', 7, { isEnabled: true }));
    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('jeu inconnu : 404', async () => {
    const res = await run(ruleRoute, ruleRequest(admin, 'doom', 7, { isEnabled: true }));
    expect(res.statusCode).toBe(404);
  });

  it('profil parent ou inexistant : 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await run(ruleRoute, ruleRequest(admin, 'pacman', 1, { isEnabled: true }));
    expect(res.statusCode).toBe(404);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('condition hors bornes : 400', async () => {
    const res = await run(ruleRoute, ruleRequest(admin, 'pacman', 7, { isEnabled: true, conditionType: 'quizzes_today', conditionValue: 99 }));
    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('Jeux - POST /games/:gameKey/sessions', () => {
  beforeEach(() => pool.query.mockReset());

  const startRequest = (user, gameKey, profileId) =>
    request('POST', `/api/games/${gameKey}/sessions`, user, { profileId }, { gameKey });

  it('démarre une partie quand le jeu est ouvert', async () => {
    pool.query
      .mockResolvedValueOnce(stateRow({ rules: [openPacman], sessions: [{ game_key: 'pacman', used_seconds_today: 0, best_score: 3100 }] }))
      .mockResolvedValueOnce({ rows: [{ id: 42, game_key: 'pacman', duration_seconds: 0, score: 0, ended_at: null }] });

    const res = await run(startRoute, startRequest(child, 'pacman', 7));

    expect(res.statusCode).toBe(201);
    expect(res.body.data.session).toEqual({ id: 42, gameKey: 'pacman', durationSeconds: 0, score: 0, ended: false });
    expect(res.body.data.access.unlocked).toBe(true);
    expect(res.body.data.bestScore).toBe(3100);
    expect(pool.query.mock.calls[1][1]).toEqual([7, 'pacman']);
  });

  it('jeu verrouillé : 409 GAME_LOCKED avec le motif, aucune partie créée', async () => {
    pool.query.mockResolvedValueOnce(stateRow({
      rules: [{ ...openPacman, daily_limit_minutes: 10 }],
      sessions: [{ game_key: 'pacman', used_seconds_today: 600, best_score: 0 }]
    }));

    const res = await run(startRoute, startRequest(child, 'pacman', 7));

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('GAME_LOCKED');
    expect(res.body.message).toMatch(/Reviens demain/);
    expect(res.body.access.reason).toBe('time_limit');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('jeu jamais ouvert par un parent : 409', async () => {
    pool.query.mockResolvedValueOnce(stateRow());
    const res = await run(startRoute, startRequest(child, 'tetris', 7));
    expect(res.statusCode).toBe(409);
    expect(res.body.access.reason).toBe('disabled');
  });

  it('profil d\'un autre enfant : 403', async () => {
    const res = await run(startRoute, startRequest(child, 'pacman', 8));
    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('jeu inconnu : 404', async () => {
    const res = await run(startRoute, startRequest(child, 'doom', 7));
    expect(res.statusCode).toBe(404);
  });
});

describe('Jeux - PUT /games/sessions/:id', () => {
  beforeEach(() => pool.query.mockReset());

  const openSession = { id: 42, profile_id: 7, game_key: 'pacman', duration_seconds: 20, score: 100, ended_at: null };
  const sessionRequest = (user, body) => request('PUT', '/api/games/sessions/42', user, body);

  it('signal de vie : temps ajouté (écart borné), meilleur score gardé', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [openSession] })
      .mockResolvedValueOnce({ rows: [{ ...openSession, duration_seconds: 40, score: 300 }] })
      .mockResolvedValueOnce(stateRow({ rules: [openPacman] }));

    const res = await run(sessionRoute, sessionRequest(child, { score: 300 }));

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ stop: false, session: { durationSeconds: 40, score: 300, ended: false } });
    const [update, params] = pool.query.mock.calls[1];
    expect(update).toContain('LEAST(GREATEST(EXTRACT(EPOCH FROM (NOW() - last_seen_at)), 0), $2::int)');
    expect(update).toContain('GREATEST(score, $3::int)');
    expect(params).toEqual([42, HEARTBEAT_MAX_GAP_SECONDS, 300, false, false]);
  });

  it('reprise après une pause (idle) : l\'écart n\'est pas compté', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [openSession] })
      .mockResolvedValueOnce({ rows: [openSession] })
      .mockResolvedValueOnce(stateRow({ rules: [openPacman] }));

    await run(sessionRoute, sessionRequest(child, { score: 100, idle: true }));

    const [update, params] = pool.query.mock.calls[1];
    expect(update).toContain('CASE WHEN $5::boolean THEN 0');
    expect(params[4]).toBe(true);
  });

  it('temps du jour épuisé : la partie est terminée par le serveur', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [openSession] })
      .mockResolvedValueOnce({ rows: [{ ...openSession, duration_seconds: 300 }] })
      .mockResolvedValueOnce(stateRow({
        rules: [{ ...openPacman, daily_limit_minutes: 5 }],
        sessions: [{ game_key: 'pacman', used_seconds_today: 300, best_score: 100 }]
      }))
      .mockResolvedValueOnce({ rows: [{ ...openSession, duration_seconds: 300, ended_at: '2026-10-24T10:00:00Z' }] });

    const res = await run(sessionRoute, sessionRequest(child, { score: 100 }));

    expect(res.body.data.stop).toBe(true);
    expect(res.body.data.session.ended).toBe(true);
    expect(res.body.data.access.reason).toBe('time_limit');
    expect(pool.query.mock.calls[3][0]).toContain('SET ended_at = NOW()');
  });

  it('fin de partie demandée par le client', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [openSession] })
      .mockResolvedValueOnce({ rows: [{ ...openSession, ended_at: '2026-10-24T10:00:00Z' }] })
      .mockResolvedValueOnce(stateRow({ rules: [openPacman] }));

    const res = await run(sessionRoute, sessionRequest(child, { score: 500, ended: true }));

    expect(res.body.data.stop).toBe(true);
    expect(pool.query.mock.calls[1][1]).toEqual([42, HEARTBEAT_MAX_GAP_SECONDS, 500, true, false]);
    expect(pool.query).toHaveBeenCalledTimes(3);
  });

  it('partie déjà terminée : plus rien n\'est compté', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ ...openSession, ended_at: '2026-10-24T10:00:00Z' }] })
      .mockResolvedValueOnce(stateRow({ rules: [openPacman] }));

    const res = await run(sessionRoute, sessionRequest(child, { score: 999 }));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stop).toBe(true);
    expect(pool.query.mock.calls.some(([text]) => text.includes('UPDATE'))).toBe(false);
  });

  it('partie d\'un autre enfant : 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...openSession, profile_id: 8 }] });
    const res = await run(sessionRoute, sessionRequest(child, {}));
    expect(res.statusCode).toBe(404);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('partie inconnue : 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await run(sessionRoute, sessionRequest(child, {}));
    expect(res.statusCode).toBe(404);
  });

  it('erreur de base : réponse générique', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('connexion perdue'), { code: 'ECONNRESET' }));
    const res = await run(sessionRoute, sessionRequest(child, {}));
    expect(res.statusCode).toBe(500);
    expect(res.body.message).not.toContain('connexion perdue');
  });
});
