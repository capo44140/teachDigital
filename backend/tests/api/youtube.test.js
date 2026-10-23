/**
 * Tests pour les endpoints de vidéos YouTube
 */

const { handleYoutubeVideos } = require('../../controllers/youtubeController.js');
const {
  describeWithDb,
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describeWithDb('API Endpoints - Vidéos YouTube', () => {
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

    describe('vidéos désactivées', () => {
      const { default: sql } = require('../../lib/database.js');
      let inactiveId;

      beforeAll(async () => {
        const rows = await sql`
          INSERT INTO youtube_videos (url, video_id, title, category, is_active)
          VALUES ('https://www.youtube.com/watch?v=testInact01', 'testInact01', 'Vidéo désactivée (test)', 'Test', false)
          RETURNING id
        `;
        inactiveId = rows[0].id;
      });

      afterAll(async () => {
        await sql`DELETE FROM youtube_videos WHERE id = ${inactiveId}`;
      });

      async function list(user, query) {
        const req = createMockRequest('GET', `/api/youtube-videos${query}`);
        req.user = user;
        const res = createMockResponse();
        await handleYoutubeVideos(req, res);
        return res.body.data.videos.map(video => video.id);
      }

      it('incluses pour un parent avec ?includeInactive=true (gestion des vidéos)', async () => {
        expect(await list({ scope: 'profile', profileId: 1, isAdmin: true }, '?includeInactive=true')).toContain(inactiveId);
      });

      it('jamais pour un enfant, ni pour un parent sans le paramètre', async () => {
        expect(await list({ scope: 'family', isAdmin: false }, '?includeInactive=true')).not.toContain(inactiveId);
        expect(await list({ scope: 'profile', profileId: 1, isAdmin: true }, '')).not.toContain(inactiveId);
      });
    });
  });
});

