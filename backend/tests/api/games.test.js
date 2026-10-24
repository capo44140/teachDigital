/**
 * Jeux, de bout en bout (routeur Express réel + base de test dédiée) : jeu fermé par
 * défaut, ouvert par un parent sous condition, temps de jeu compté par le serveur,
 * partie arrêtée quand le temps du jour est écoulé ou que le parent referme le jeu.
 */

jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));

const {
  describeWithDb,
  createTestProfile,
  cleanupTestData
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');
const { startApp } = require('./support/app.js');
const { ensureFamilyGate, currentFamilyToken, currentProfileToken } = require('./support/fixtures.js');

describeWithDb('Jeux : accès fixé par un parent, temps compté par le serveur', () => {
  let app;
  const tokens = {};
  const ids = {};
  const profileIds = [];

  const findGame = (body, key) => body.data.games.find(game => game.key === key);

  // Simule le temps écoulé depuis le dernier signal de vie d'une partie
  async function elapse(sessionId, seconds) {
    await sql`UPDATE game_sessions SET last_seen_at = NOW() - make_interval(secs => ${seconds}) WHERE id = ${sessionId}`;
  }

  beforeAll(async () => {
    app = await startApp();
    await ensureFamilyGate();

    const parent = await createTestProfile({ name: 'Jeux Parent', type: 'admin', is_admin: true, is_child: false });
    const child = await createTestProfile({ name: 'Jeux Enfant', type: 'child' });
    const other = await createTestProfile({ name: 'Jeux Autre Enfant', type: 'child' });
    Object.assign(ids, { parent: parent.id, child: child.id, other: other.id });
    profileIds.push(parent.id, child.id, other.id);

    tokens.family = await currentFamilyToken();
    tokens.parent = await currentProfileToken(parent);
    tokens.child = await currentProfileToken(child);
    tokens.other = await currentProfileToken(other);
  });

  afterAll(async () => {
    await cleanupTestData(profileIds);
    await app.close();
  });

  it('jeu fermé par défaut : visible mais verrouillé, partie refusée', async () => {
    const list = await app.call('GET', `/games?profileId=${ids.child}`, { token: tokens.family });
    expect(list.status).toBe(200);
    expect(findGame(list.body, 'pacman').access).toMatchObject({ unlocked: false, reason: 'disabled' });
    expect(list.body.data.conditionTypes.length).toBeGreaterThan(1);

    const start = await app.call('POST', '/games/pacman/sessions', { token: tokens.family, body: { profileId: ids.child } });
    expect(start.status).toBe(409);
    expect(start.body).toMatchObject({ code: 'GAME_LOCKED', access: { reason: 'disabled' } });
  });

  it('ouvert sous condition par le parent : débloqué quand l\'enfant a fait son quiz', async () => {
    const rule = { isEnabled: true, conditionType: 'quizzes_today', conditionValue: 1, dailyLimitMinutes: 1 };
    expect((await app.call('PUT', `/games/pacman/rules/${ids.child}`, { token: tokens.child, body: rule })).status).toBe(403);
    expect((await app.call('PUT', `/games/pacman/rules/${ids.parent}`, { token: tokens.parent, body: rule })).status).toBe(404);

    const saved = await app.call('PUT', `/games/pacman/rules/${ids.child}`, { token: tokens.parent, body: rule });
    expect(saved.status).toBe(200);
    expect(saved.body.data.game.access).toMatchObject({
      reason: 'condition',
      condition: { current: 0, target: 1, met: false }
    });

    const refused = await app.call('POST', '/games/pacman/sessions', { token: tokens.child, body: { profileId: ids.child } });
    expect(refused.status).toBe(409);
    expect(refused.body.message).toBe('Pour jouer : terminer 1 quiz aujourd\'hui.');

    // Une sauvegarde intermédiaire ne compte pas ; un quiz terminé, oui
    await sql`INSERT INTO quiz_results (profile_id, score, total_questions, percentage, answers, is_completed)
              VALUES (${ids.child}, 1, 2, 50, '[]'::jsonb, false)`;
    let list = await app.call('GET', `/games?profileId=${ids.child}`, { token: tokens.child });
    expect(findGame(list.body, 'pacman').access.reason).toBe('condition');

    await sql`INSERT INTO quiz_results (profile_id, score, total_questions, percentage, answers)
              VALUES (${ids.child}, 2, 2, 100, '[]'::jsonb)`;
    list = await app.call('GET', `/games?profileId=${ids.child}`, { token: tokens.child });
    expect(findGame(list.body, 'pacman').access).toMatchObject({ unlocked: true, remainingSeconds: 60 });
  });

  it('temps de jeu compté par les signaux de vie, partie arrêtée à la fin du temps du jour', async () => {
    const start = await app.call('POST', '/games/pacman/sessions', { token: tokens.family, body: { profileId: ids.child } });
    expect(start.status).toBe(201);
    const sessionId = start.body.data.session.id;

    // Partie d'un autre enfant : introuvable
    expect((await app.call('PUT', `/games/sessions/${sessionId}`, { token: tokens.other, body: {} })).status).toBe(404);

    await elapse(sessionId, 40);
    let beat = await app.call('PUT', `/games/sessions/${sessionId}`, { token: tokens.family, body: { score: 500 } });
    expect(beat.status).toBe(200);
    expect(beat.body.data).toMatchObject({ stop: false, session: { durationSeconds: 40, score: 500 } });
    expect(beat.body.data.access.remainingSeconds).toBe(20);

    // Pause de 10 minutes : la reprise (idle) ne compte pas l'écart
    await elapse(sessionId, 600);
    beat = await app.call('PUT', `/games/sessions/${sessionId}`, { token: tokens.family, body: { score: 300, idle: true } });
    expect(beat.body.data.session).toMatchObject({ durationSeconds: 40, score: 500 });

    // Onglet resté ouvert longtemps sans signal : au plus 45 s comptées
    await elapse(sessionId, 300);
    beat = await app.call('PUT', `/games/sessions/${sessionId}`, { token: tokens.family, body: { score: 800 } });
    expect(beat.body.data).toMatchObject({ stop: true, session: { durationSeconds: 85, score: 800, ended: true } });
    expect(beat.body.data.access.reason).toBe('time_limit');

    const again = await app.call('POST', '/games/pacman/sessions', { token: tokens.family, body: { profileId: ids.child } });
    expect(again.status).toBe(409);
    expect(again.body.access.reason).toBe('time_limit');

    const list = await app.call('GET', `/games?profileId=${ids.child}`, { token: tokens.parent });
    expect(findGame(list.body, 'pacman')).toMatchObject({ bestScore: 800, access: { usedSecondsToday: 85 } });
  });

  it('jeu refermé par le parent pendant une partie : arrêtée au signal suivant', async () => {
    const open = { isEnabled: true, conditionType: 'none', dailyLimitMinutes: null };
    expect((await app.call('PUT', `/games/tetris/rules/${ids.child}`, { token: tokens.parent, body: open })).status).toBe(200);

    const start = await app.call('POST', '/games/tetris/sessions', { token: tokens.child, body: { profileId: ids.child } });
    expect(start.status).toBe(201);
    expect(start.body.data.access.remainingSeconds).toBeNull();

    await app.call('PUT', `/games/tetris/rules/${ids.child}`, { token: tokens.parent, body: { ...open, isEnabled: false } });
    const beat = await app.call('PUT', `/games/sessions/${start.body.data.session.id}`, { token: tokens.child, body: { score: 10 } });
    expect(beat.body.data).toMatchObject({ stop: true, access: { reason: 'disabled' } });
  });

  it('isolation : ni les jeux d\'un autre enfant, ni ceux d\'un parent', async () => {
    expect((await app.call('GET', `/games?profileId=${ids.other}`, { token: tokens.child })).status).toBe(403);
    expect((await app.call('GET', `/games?profileId=${ids.parent}`, { token: tokens.family })).status).toBe(403);
    expect((await app.call('POST', '/games/pacman/sessions', { token: tokens.child, body: { profileId: ids.other } })).status).toBe(403);
  });
});
