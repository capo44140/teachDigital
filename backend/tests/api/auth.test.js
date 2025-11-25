/**
 * Tests pour les endpoints d'authentification
 */

const { handleLogin, handleLogout } = require('../../controllers/authController.js');
const {
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describe('API Endpoints - Authentification', () => {
  let testProfile;
  let testProfileIds = [];

  beforeAll(async () => {
    try {
      // Créer un profil de test avec PIN
      testProfile = await createTestProfile({
        name: 'Test Auth Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);
      
      await createTestPin(testProfile.id, '1234');
    } catch (error) {
      console.error('Erreur dans beforeAll (auth.test.js):', error);
      throw error;
    }
  }, 30000); // Timeout de 30 secondes pour beforeAll

  afterAll(async () => {
    await cleanupTestData(testProfileIds);
  });

  describe('POST /api/auth/login', () => {
    it('devrait se connecter avec un profil et PIN valides', async () => {
      const req = createMockRequest('POST', '/api/auth/login', {
        profileId: testProfile.id,
        pin: '1234'
      });
      const res = createMockResponse();

      await handleLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.profile.id).toBe(testProfile.id);
      expect(res.body.data.profile.name).toBe(testProfile.name);
    });

    it('devrait refuser la connexion avec un PIN incorrect', async () => {
      const req = createMockRequest('POST', '/api/auth/login', {
        profileId: testProfile.id,
        pin: '9999'
      });
      const res = createMockResponse();

      await handleLogin(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('PIN');
    });

    it('devrait refuser la connexion avec un profil inexistant', async () => {
      const req = createMockRequest('POST', '/api/auth/login', {
        profileId: 99999,
        pin: '1234'
      });
      const res = createMockResponse();

      await handleLogin(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('devrait refuser la connexion sans profileId', async () => {
      const req = createMockRequest('POST', '/api/auth/login', {
        pin: '1234'
      });
      const res = createMockResponse();

      await handleLogin(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('requis');
    });

    it('devrait refuser la connexion sans PIN', async () => {
      const req = createMockRequest('POST', '/api/auth/login', {
        profileId: testProfile.id
      });
      const res = createMockResponse();

      await handleLogin(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('requis');
    });

    it('devrait refuser les méthodes non autorisées', async () => {
      const req = createMockRequest('GET', '/api/auth/login');
      const res = createMockResponse();

      await handleLogin(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('devrait déconnecter avec un token valide', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/auth/logout', {}, {
        authorization: `Bearer ${token}`
      });
      const res = createMockResponse();

      await handleLogout(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('réussie');
    });

    it('devrait déconnecter même sans token', async () => {
      const req = createMockRequest('POST', '/api/auth/logout');
      const res = createMockResponse();

      await handleLogout(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('devrait refuser les méthodes non autorisées', async () => {
      const req = createMockRequest('GET', '/api/auth/logout');
      const res = createMockResponse();

      await handleLogout(req, res);

      expect(res.statusCode).toBe(405);
    });
  });
});

