/**
 * Tests unitaires du contrôleur YouTube (sans base de données).
 * Vérifie le CRUD ajouté (/youtube-videos/:id) et les gardes d'accès.
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn() },
  default: jest.fn(),
  sql: jest.fn()
}));

const { pool } = require('../../lib/database.js');
const { handleYoutubeVideos, handleYoutubeVideo } = require('../../controllers/youtubeController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');
const { validate } = require('../../lib/validation.js');
const { youtubeVideoCreateSchema, youtubeVideoUpdateSchema } = require('../../lib/schemas.js');
const { runChain } = require('./support/chain.js');

// Chaînes identiques à api/index.js (validation Zod puis contrôleur)
const createRoute = [validate(youtubeVideoCreateSchema), handleYoutubeVideos];
const updateRoute = [validate(youtubeVideoUpdateSchema), handleYoutubeVideo];

const video = {
  id: 3,
  url: 'https://www.youtube.com/watch?v=abc123',
  video_id: 'abc123',
  title: 'Les fractions',
  description: 'Une vidéo',
  category: 'Mathématiques',
  age_group: '6-12',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

const admin = { scope: 'profile', profileId: 1, isAdmin: true };
const child = { scope: 'profile', profileId: 7, isAdmin: false };

describe('YouTube - /youtube-videos/:id', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('GET renvoie la vidéo et masque les vidéos inactives aux enfants', async () => {
    pool.query.mockResolvedValue({ rows: [video] });

    const req = createMockRequest('GET', '/api/youtube-videos/3');
    req.user = child;
    const res = createMockResponse();

    await handleYoutubeVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.video.id).toBe(3);
    expect(pool.query.mock.calls[0][0]).toContain('is_active = true');
  });

  it('GET par un parent ne filtre pas les vidéos inactives', async () => {
    pool.query.mockResolvedValue({ rows: [video] });

    const req = createMockRequest('GET', '/api/youtube-videos/3');
    req.user = admin;
    const res = createMockResponse();

    await handleYoutubeVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(pool.query.mock.calls[0][0]).not.toContain('is_active = true');
  });

  it('GET renvoie 404 pour une vidéo absente ou inactive', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const req = createMockRequest('GET', '/api/youtube-videos/3');
    req.user = child;
    const res = createMockResponse();

    await handleYoutubeVideo(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('PUT refuse un enfant', async () => {
    const req = createMockRequest('PUT', '/api/youtube-videos/3', { title: 'Nouveau titre' });
    req.user = child;
    const res = createMockResponse();

    await handleYoutubeVideo(req, res);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('PUT met à jour les champs fournis (camelCase accepté)', async () => {
    pool.query.mockResolvedValue({ rows: [{ ...video, title: 'Nouveau titre', is_active: false }] });

    const req = createMockRequest('PUT', '/api/youtube-videos/3', { title: 'Nouveau titre', isActive: false });
    req.user = admin;
    const res = createMockResponse();

    await runChain(updateRoute, req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.video.is_active).toBe(false);
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('title = $1');
    expect(sqlText).toContain('is_active = $2');
    expect(params).toEqual(['Nouveau titre', false, 3]);
  });

  it('PUT rejette une valeur de titre non textuelle', async () => {
    const req = createMockRequest('PUT', '/api/youtube-videos/3', { title: 42 });
    req.user = admin;
    const res = createMockResponse();

    await runChain(updateRoute, req, res);

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('DELETE supprime la vidéo', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 3 }] });

    const req = createMockRequest('DELETE', '/api/youtube-videos/3');
    req.user = admin;
    const res = createMockResponse();

    await handleYoutubeVideo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(3);
  });

  it('DELETE renvoie 404 pour une vidéo inconnue', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const req = createMockRequest('DELETE', '/api/youtube-videos/3');
    req.user = admin;
    const res = createMockResponse();

    await handleYoutubeVideo(req, res);

    expect(res.statusCode).toBe(404);
  });
});

describe('YouTube - collection', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('POST crée une vidéo pour un parent', async () => {
    pool.query.mockResolvedValue({ rows: [video] });

    const req = createMockRequest('POST', '/api/youtube-videos', {
      url: video.url,
      video_id: video.video_id,
      title: video.title,
      description: video.description,
      category: video.category,
      age_group: video.age_group
    });
    req.user = admin;
    const res = createMockResponse();

    await runChain(createRoute, req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.video.id).toBe(3);
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO youtube_videos');
  });

  it('POST refuse un enfant', async () => {
    const req = createMockRequest('POST', '/api/youtube-videos', { url: video.url, video_id: 'x', title: 'T' });
    req.user = child;
    const res = createMockResponse();

    await handleYoutubeVideos(req, res);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('POST valide les champs requis et les longueurs', async () => {
    for (const body of [{ title: 'Sans URL' }, { url: 'u', video_id: 'v'.repeat(65), title: 'T' }, { url: 'u', videoId: 'v', title: 'T', isActive: 'peut-être' }]) {
      const req = createMockRequest('POST', '/api/youtube-videos', body);
      req.user = admin;
      const res = createMockResponse();

      await runChain(createRoute, req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('POST applique les valeurs par défaut (catégorie, tranche d\'âge, active)', async () => {
    pool.query.mockResolvedValue({ rows: [video] });
    const req = createMockRequest('POST', '/api/youtube-videos', { url: video.url, videoId: 'abc123', title: 'T' });
    req.user = admin;

    await runChain(createRoute, req, createMockResponse());

    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('video_id');
    expect(params).toEqual(expect.arrayContaining(['abc123', 'general', '6-12', true, '']));
  });
});
