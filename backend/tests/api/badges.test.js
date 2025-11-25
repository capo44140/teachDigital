/**
 * Tests pour les endpoints de badges
 */

const handleBadges = require('../../api/badges.js');
const {
  createTestProfile,
  createTestPin,
  createTestBadge,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');
const { default: sql } = require('../../lib/database.js');

describe('API Endpoints - Badges', () => {
  let testProfile;
  let adminProfile;
  let testBadge;
  let testProfileIds = [];
  let testBadgeIds = [];

  beforeAll(async () => {
    try {
      // Créer un profil enfant de test
      testProfile = await createTestProfile({
        name: 'Test Badge Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);

      // Créer un profil admin de test
      adminProfile = await createTestProfile({
        name: 'Test Admin Profile',
        type: 'admin',
        is_admin: true
      });
      testProfileIds.push(adminProfile.id);

      await createTestPin(testProfile.id, '1234');
      await createTestPin(adminProfile.id, '5678');

      // Créer un badge de test
      testBadge = await createTestBadge({
        name: 'Test Badge',
        condition_type: 'quiz_completed',
        condition_value: 1
      });
      testBadgeIds.push(testBadge.id);
    } catch (error) {
      console.error('Erreur dans beforeAll (badges.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds, [], testBadgeIds);
  });

  describe('GET /api/badges', () => {
    it('devrait récupérer tous les badges', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', '/api/badges', {}, {
        authorization: `Bearer ${token}`
      });
      req.path = '/';
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.badges).toBeDefined();
      expect(Array.isArray(res.body.data.badges)).toBe(true);
    });

    it('devrait refuser l\'accès sans authentification', async () => {
      const req = createMockRequest('GET', '/api/badges');
      req.path = '/';
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/badges', () => {
    it('devrait créer un badge avec un admin', async () => {
      const token = generateTestToken(adminProfile);
      const req = createMockRequest('POST', '/api/badges', {
        name: 'New Test Badge',
        description: 'Nouveau badge de test',
        icon: '🎯',
        category: 'test',
        condition_type: 'quiz_completed',
        condition_value: 5,
        points: 50,
        color: 'green'
      }, {
        authorization: `Bearer ${token}`
      });
      req.path = '/';
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.badge).toBeDefined();
      expect(res.body.data.badge.name).toBe('New Test Badge');
      
      if (res.body.data.badge.id) {
        testBadgeIds.push(res.body.data.badge.id);
      }
    });

    it('devrait refuser la création sans être admin', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/badges', {
        name: 'Unauthorized Badge',
        category: 'test',
        condition_type: 'quiz_completed',
        condition_value: 1
      }, {
        authorization: `Bearer ${token}`
      });
      req.path = '/';
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/badges/:id', () => {
    it('devrait récupérer un badge par ID', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', `/api/badges/${testBadge.id}`, {}, {
        authorization: `Bearer ${token}`
      });
      req.path = `/${testBadge.id}`;
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.badge).toBeDefined();
      expect(res.body.data.badge.id).toBe(testBadge.id);
    });
  });

  describe('GET /api/badges/profile/:id', () => {
    it('devrait récupérer les badges d\'un profil', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', `/api/badges/profile/${testProfile.id}`, {}, {
        authorization: `Bearer ${token}`
      });
      req.path = `/profile/${testProfile.id}`;
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.badges).toBeDefined();
      expect(Array.isArray(res.body.data.badges)).toBe(true);
    });

    it('devrait récupérer les badges débloqués d\'un profil', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', `/api/badges/profile/${testProfile.id}/unlocked`, {}, {
        authorization: `Bearer ${token}`
      });
      req.path = `/profile/${testProfile.id}/unlocked`;
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.badges).toBeDefined();
    });

    it('devrait récupérer les statistiques de badges d\'un profil', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', `/api/badges/profile/${testProfile.id}/stats`, {}, {
        authorization: `Bearer ${token}`
      });
      req.path = `/profile/${testProfile.id}/stats`;
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
    });
  });

  describe('POST /api/badges/check-unlock', () => {
    it('devrait vérifier et débloquer les badges', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/badges/check-unlock', {
        profileId: testProfile.id,
        conditionType: 'quiz_completed',
        context: {}
      }, {
        authorization: `Bearer ${token}`
      });
      req.path = '/check-unlock';
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unlockedBadges).toBeDefined();
      expect(Array.isArray(res.body.data.unlockedBadges)).toBe(true);
    });

    it('devrait refuser l\'accès sans authentification', async () => {
      const req = createMockRequest('POST', '/api/badges/check-unlock', {
        profileId: testProfile.id,
        conditionType: 'quiz_completed'
      });
      req.path = '/check-unlock';
      const res = createMockResponse();

      await handleBadges(req, res);

      expect(res.statusCode).toBe(401);
    });
  });
});

