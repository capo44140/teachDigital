/**
 * Tests pour les endpoints de profils
 */

const {
  handleProfiles,
  handleProfile,
  handleProfileStats,
  handlePin
} = require('../../controllers/profileController.js');
const {
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describe('API Endpoints - Profils', () => {
  let testProfile;
  let adminProfile;
  let testProfileIds = [];

  beforeAll(async () => {
    try {
      // Créer un profil enfant de test
      testProfile = await createTestProfile({
        name: 'Test Child Profile',
        type: 'child',
        is_admin: false
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
    } catch (error) {
      console.error('Erreur dans beforeAll (profiles.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds);
  });

  describe('GET /api/profiles', () => {
    it('devrait récupérer tous les profils', async () => {
      const req = createMockRequest('GET', '/api/profiles');
      const res = createMockResponse();

      await handleProfiles(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profiles).toBeDefined();
      expect(Array.isArray(res.body.data.profiles)).toBe(true);
      expect(res.body.data.profiles.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/profiles', () => {
    it('devrait créer un profil avec un admin', async () => {
      const token = generateTestToken(adminProfile);
      const req = createMockRequest('POST', '/api/profiles', {
        name: 'New Test Profile',
        description: 'Nouveau profil de test',
        type: 'child',
        color: 'green'
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleProfiles(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toBeDefined();
      expect(res.body.data.profile.name).toBe('New Test Profile');
      
      // Nettoyer le profil créé
      if (res.body.data.profile.id) {
        testProfileIds.push(res.body.data.profile.id);
      }
    });

    it('devrait refuser la création sans être admin', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/profiles', {
        name: 'Unauthorized Profile',
        type: 'child'
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleProfiles(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Admin');
    });

    it('devrait refuser la création sans authentification', async () => {
      const req = createMockRequest('POST', '/api/profiles', {
        name: 'Unauthorized Profile',
        type: 'child'
      });
      const res = createMockResponse();

      await handleProfiles(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('devrait refuser la création sans nom', async () => {
      const token = generateTestToken(adminProfile);
      const req = createMockRequest('POST', '/api/profiles', {
        type: 'child'
      }, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleProfiles(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/profiles/:id', () => {
    it('devrait récupérer un profil par ID', async () => {
      const req = createMockRequest('GET', `/api/profiles/${testProfile.id}`, {}, {}, {
        id: String(testProfile.id)
      });
      const res = createMockResponse();

      await handleProfile(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toBeDefined();
      expect(res.body.data.profile.id).toBe(testProfile.id);
    });

    it('devrait retourner 404 pour un profil inexistant', async () => {
      const req = createMockRequest('GET', '/api/profiles/99999', {}, {}, {
        id: '99999'
      });
      req.params = { id: '99999' };
      const res = createMockResponse();

      await handleProfile(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/profiles/:id', () => {
    it('devrait mettre à jour un profil', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('PUT', `/api/profiles/${testProfile.id}`, {
        name: 'Updated Profile Name',
        description: 'Description mise à jour'
      }, {
        authorization: `Bearer ${token}`
      }, {
        id: testProfile.id
      });
      const res = createMockResponse();

      await handleProfile(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.name).toBe('Updated Profile Name');
    });

    it('devrait refuser la mise à jour sans authentification', async () => {
      const req = createMockRequest('PUT', `/api/profiles/${testProfile.id}`, {
        name: 'Unauthorized Update'
      }, {}, {
        id: testProfile.id
      });
      const res = createMockResponse();

      await handleProfile(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    it('devrait supprimer un profil avec un admin', async () => {
      // Créer un profil temporaire à supprimer
      const tempProfile = await createTestProfile({
        name: 'Temp Profile to Delete',
        type: 'child'
      });
      testProfileIds.push(tempProfile.id);

      const token = generateTestToken(adminProfile);
      const req = createMockRequest('DELETE', `/api/profiles/${tempProfile.id}`, {}, {
        authorization: `Bearer ${token}`
      }, {
        id: tempProfile.id
      });
      const res = createMockResponse();

      await handleProfile(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('devrait refuser la suppression sans être admin', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('DELETE', `/api/profiles/${testProfile.id}`, {}, {
        authorization: `Bearer ${token}`
      }, {
        id: testProfile.id
      });
      const res = createMockResponse();

      await handleProfile(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/profiles/stats', () => {
    it('devrait récupérer les statistiques des profils', async () => {
      const req = createMockRequest('GET', '/api/profiles/stats');
      const res = createMockResponse();

      await handleProfileStats(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total).toBeDefined();
    });
  });

  describe('POST /api/profiles/:id/pin', () => {
    it('devrait mettre à jour le PIN d\'un profil', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', `/api/profiles/${testProfile.id}/pin`, {
        pin: '5678'
      }, {
        authorization: `Bearer ${token}`
      }, {
        id: testProfile.id
      });
      const res = createMockResponse();

      await handlePin(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('devrait refuser la mise à jour du PIN sans authentification', async () => {
      const req = createMockRequest('POST', `/api/profiles/${testProfile.id}/pin`, {
        pin: '5678'
      }, {}, {
        id: testProfile.id
      });
      const res = createMockResponse();

      await handlePin(req, res);

      expect(res.statusCode).toBe(401);
    });
  });
});

