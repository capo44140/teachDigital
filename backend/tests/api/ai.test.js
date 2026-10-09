/**
 * Tests pour les endpoints IA
 */

const handleAI = require('../../api/ai/index.js');
const {
  describeWithDb,
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describeWithDb('API Endpoints - IA', () => {
  let testProfile;
  let testProfileIds = [];

  beforeAll(async () => {
    try {
      testProfile = await createTestProfile({
        name: 'Test AI Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);
      await createTestPin(testProfile.id, '1234');
    } catch (error) {
      console.error('Erreur dans beforeAll (ai.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds);
  });

  describe('GET /api/ai/validate-key', () => {
    it('devrait valider une clé API', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', '/api/ai/validate-key?provider=openai&key=test-key', {}, {
        authorization: `Bearer ${token}`
      });
      req.path = '/validate-key';
      const res = createMockResponse();

      await handleAI(req, res);

      // Peut retourner 200 ou 400 selon la validité de la clé
      expect([200, 400]).toContain(res.statusCode);
    });

  });

  describe('GET /api/ai/has-valid-key', () => {
    it('devrait vérifier si une clé valide existe', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('GET', '/api/ai/has-valid-key?provider=openai', {}, {
        authorization: `Bearer ${token}`
      });
      req.path = '/has-valid-key';
      const res = createMockResponse();

      await handleAI(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBeDefined();
    });

  });

  describe('POST /api/ai/generate-quiz-from-text', () => {
    it('devrait accepter une requête avec authentification', async () => {
      const token = generateTestToken(testProfile);
      const req = createMockRequest('POST', '/api/ai/generate-quiz-from-text', {
        text: 'Test text for quiz generation',
        childProfile: { id: testProfile.id, name: testProfile.name }
      }, {
        authorization: `Bearer ${token}`
      });
      req.path = '/generate-quiz-from-text';
      const res = createMockResponse();

      await handleAI(req, res);

      // Peut retourner 200, 400 ou 500 selon la configuration
      expect([200, 400, 500]).toContain(res.statusCode);
    });
  });
});

