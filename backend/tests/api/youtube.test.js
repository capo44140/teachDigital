/**
 * Tests pour les endpoints de vidéos YouTube
 */

const { handleYoutubeVideos } = require('../../controllers/youtubeController.js');
const {
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describe('API Endpoints - Vidéos YouTube', () => {
  let testProfile;
  let testProfileIds = [];

  beforeAll(async () => {
    try {
      testProfile = await createTestProfile({
        name: 'Test YouTube Profile',
        type: 'child'
      });
      testProfileIds.push(testProfile.id);
      await createTestPin(testProfile.id, '1234');
    } catch (error) {
      console.error('Erreur dans beforeAll (youtube.test.js):', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testProfileIds);
  });

  describe('GET /api/youtube-videos', () => {
    it('devrait récupérer toutes les vidéos YouTube actives', async () => {
      const req = createMockRequest('GET', '/api/youtube-videos');
      const res = createMockResponse();

      await handleYoutubeVideos(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.videos).toBeDefined();
      expect(Array.isArray(res.body.data.videos)).toBe(true);
    });
  });
});

