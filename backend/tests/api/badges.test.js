/**
 * Tests pour les endpoints de badges (routeur Express réel, base de test dédiée).
 * Icônes en texte : la base de test locale peut ne pas être en UTF-8 (emojis refusés).
 */

jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));

const {
  describeWithDb,
  createTestProfile,
  createTestBadge,
  cleanupTestData
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');
const { startApp } = require('./support/app.js');
const { ensureFamilyGate, currentFamilyToken, currentProfileToken } = require('./support/fixtures.js');

describeWithDb('API Endpoints - Badges', () => {
  let app;
  let child;
  let otherChild;
  let admin;
  let testBadge;
  const testProfileIds = [];
  const testBadgeIds = [];
  const tokens = {};

  beforeAll(async () => {
    app = await startApp();
    await ensureFamilyGate();
    child = await createTestProfile({ name: 'Badge Child', type: 'child' });
    otherChild = await createTestProfile({ name: 'Badge Other Child', type: 'child' });
    admin = await createTestProfile({ name: 'Badge Admin', type: 'admin', is_admin: true, is_child: false });
    testProfileIds.push(child.id, otherChild.id, admin.id);

    testBadge = await createTestBadge({ name: 'Test Badge', icon: 'trophy', condition_type: 'quiz_completed', condition_value: 1 });
    testBadgeIds.push(testBadge.id);
    await sql`
      INSERT INTO profile_badges (profile_id, badge_id, progress, is_unlocked, unlocked_at)
      VALUES (${child.id}, ${testBadge.id}, 1, true, NOW())
    `;

    tokens.child = await currentProfileToken(child);
    tokens.otherChild = await currentProfileToken(otherChild);
    tokens.admin = await currentProfileToken(admin);
    tokens.family = await currentFamilyToken();
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds, [], testBadgeIds);
    await app.close();
  });

  describe('GET /api/badges', () => {
    it('devrait récupérer tous les badges', async () => {
      const { status, body } = await app.call('GET', '/badges', { token: tokens.child });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      // createResponse(message, data) : le tableau est directement dans data
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST /api/badges', () => {
    const newBadge = {
      name: 'New Test Badge',
      description: 'Nouveau badge de test',
      icon: 'target',
      category: 'test',
      condition_type: 'quiz_completed',
      condition_value: 5,
      points: 50,
      color: 'green'
    };

    it('devrait créer un badge avec un admin', async () => {
      const { status, body } = await app.call('POST', '/badges', { token: tokens.admin, body: newBadge });

      expect(status).toBe(201);
      expect(body.data.name).toBe('New Test Badge');
      expect(body.data.is_active).toBe(true);
      testBadgeIds.push(body.data.id);
    });

    it('devrait refuser la création à un enfant', async () => {
      const { status } = await app.call('POST', '/badges', { token: tokens.child, body: newBadge });
      expect(status).toBe(403);
    });

    it.each([
      ['champ manquant', { ...newBadge, icon: undefined }],
      ['valeur de condition nulle', { ...newBadge, condition_value: 0 }],
      ['points négatifs', { ...newBadge, points: -1 }],
      ['points non numériques', { ...newBadge, points: 'beaucoup' }]
    ])('devrait refuser un badge invalide (%s) en 400', async (_label, body) => {
      const { status, body: response } = await app.call('POST', '/badges', { token: tokens.admin, body });
      expect(status).toBe(400);
      expect(response.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET / PUT / DELETE /api/badges/:id', () => {
    it('devrait récupérer un badge par ID', async () => {
      const { status, body } = await app.call('GET', `/badges/${testBadge.id}`, { token: tokens.child });

      expect(status).toBe(200);
      expect(body.data.id).toBe(testBadge.id);
    });

    it('devrait répondre 400 pour un ID invalide et 404 pour un badge inconnu', async () => {
      expect((await app.call('GET', '/badges/abc', { token: tokens.child })).status).toBe(400);
      expect((await app.call('GET', '/badges/999999', { token: tokens.child })).status).toBe(404);
    });

    it('devrait mettre à jour partiellement un badge (parent)', async () => {
      const { status, body } = await app.call('PUT', `/badges/${testBadge.id}`, { token: tokens.admin, body: { points: 25 } });

      expect(status).toBe(200);
      expect(body.data.points).toBe(25);
      expect(body.data.name).toBe('Test Badge');
    });

    it('devrait refuser une mise à jour vide', async () => {
      expect((await app.call('PUT', `/badges/${testBadge.id}`, { token: tokens.admin, body: {} })).status).toBe(400);
    });

    it('devrait supprimer un badge (parent) puis répondre 404', async () => {
      const temp = await createTestBadge({ name: 'Temp Badge', icon: 'star' });
      testBadgeIds.push(temp.id);

      expect((await app.call('DELETE', `/badges/${temp.id}`, { token: tokens.admin })).status).toBe(200);
      expect((await app.call('DELETE', `/badges/${temp.id}`, { token: tokens.admin })).status).toBe(404);
    });
  });

  describe('GET /api/badges/profile/:id', () => {
    it('devrait récupérer les badges, les badges débloqués et les statistiques de son profil', async () => {
      const all = await app.call('GET', `/badges/profile/${child.id}`, { token: tokens.child });
      expect(all.status).toBe(200);
      expect(Array.isArray(all.body.data)).toBe(true);

      const unlocked = await app.call('GET', `/badges/profile/${child.id}/unlocked`, { token: tokens.child });
      expect(unlocked.status).toBe(200);
      expect(unlocked.body.data.map(b => b.id)).toContain(testBadge.id);

      const stats = await app.call('GET', `/badges/profile/${child.id}/stats`, { token: tokens.child });
      expect(stats.status).toBe(200);
      expect(stats.body.data).toEqual(expect.objectContaining({
        total: expect.any(Number),
        unlocked: expect.any(Number),
        locked: expect.any(Number),
        points: expect.any(Number),
        percentage: expect.any(Number)
      }));
      expect(stats.body.data.unlocked).toBeGreaterThanOrEqual(1);
    });

    it('devrait borner limit sur les badges récents (400 pour une valeur invalide)', async () => {
      const ok = await app.call('GET', `/badges/profile/${child.id}/recent?limit=2`, { token: tokens.child });
      expect(ok.status).toBe(200);
      expect(ok.body.data.length).toBeLessThanOrEqual(2);

      for (const limit of ['abc', '0', '500']) {
        const { status, body } = await app.call('GET', `/badges/profile/${child.id}/recent?limit=${limit}`, { token: tokens.child });
        expect(status).toBe(400);
        expect(body.code).toBe('VALIDATION_ERROR');
      }
    });

    it('devrait refuser les badges d\'un autre enfant à un profil enfant', async () => {
      expect((await app.call('GET', `/badges/profile/${child.id}`, { token: tokens.otherChild })).status).toBe(403);
      expect((await app.call('GET', `/badges/profile/${child.id}/unlocked`, { token: tokens.otherChild })).status).toBe(403);
    });

    it('jeton famille : les enfants oui, le parent non', async () => {
      expect((await app.call('GET', `/badges/profile/${child.id}`, { token: tokens.family })).status).toBe(200);
      expect((await app.call('GET', `/badges/profile/${admin.id}`, { token: tokens.family })).status).toBe(403);
      expect((await app.call('GET', `/badges/profile/${admin.id}/stats`, { token: tokens.family })).status).toBe(403);
    });
  });

  describe('POST /api/badges/check-unlock', () => {
    it('devrait vérifier et débloquer les badges (parent)', async () => {
      const { status, body } = await app.call('POST', '/badges/check-unlock', {
        token: tokens.admin,
        body: { profileId: child.id, actionType: 'quiz_completed', actionData: {} }
      });

      expect(status).toBe(200);
      expect(Array.isArray(body.data.unlockedBadges)).toBe(true);
      expect(typeof body.data.count).toBe('number');
    });

    it('devrait refuser un corps invalide en 400 et un enfant en 403', async () => {
      expect((await app.call('POST', '/badges/check-unlock', { token: tokens.admin, body: { profileId: 'x' } })).status).toBe(400);
      expect((await app.call('POST', '/badges/check-unlock', { token: tokens.child, body: { profileId: child.id, actionType: 'quiz_completed' } })).status).toBe(403);
    });
  });
});
