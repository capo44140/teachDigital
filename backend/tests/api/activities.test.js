/**
 * Tests pour les endpoints d'activités
 */

const { handleActivities } = require('../../controllers/activityController.js');
const {
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describe('API Endpoints - Activités', () => {
  let testProfile;
  let testProfileIds = [];

  beforeAll(async () => {
    try {
      testProfile = await createTestProfile({
        name: 'Test Activity Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);
      await createTestPin(testProfile.id, '1234');
    } catch (error) {
      console.error('Erreur dans beforeAll (activities.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds);
  });

  describe('GET /api/activities', () => {
    it('devrait récupérer toutes les activités actives', async () => {
      const req = createMockRequest('GET', '/api/activities');
      const res = createMockResponse();

      await handleActivities(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activities).toBeDefined();
      expect(Array.isArray(res.body.data.activities)).toBe(true);
    });
  });
});

