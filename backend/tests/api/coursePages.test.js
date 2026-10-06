/**
 * Tests des endpoints de pages de cours HTML
 * La base est mockée : ces tests ne touchent pas aux données réelles.
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn() },
  default: jest.fn()
}));
// Importé par testHelpers mais inutile ici
jest.mock('../../lib/nativeHash.js', () => ({ NativeHashService: {} }));

const { pool } = require('../../lib/database.js');
const { handleCoursePages, handleCoursePage } = require('../../controllers/coursePageController.js');
const { generateToken } = require('../../lib/auth.js');
const { coursePageCreateSchema } = require('../../lib/schemas.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const adminAuth = () => ({ authorization: `Bearer ${generateToken({ profileId: 1, isAdmin: true })}` });
const childAuth = () => ({ authorization: `Bearer ${generateToken({ profileId: 7, isAdmin: false })}` });

const PAGE = {
  id: 12,
  title: 'Les molécules',
  subject: 'Physique-chimie',
  description: null,
  is_published: true,
  target_profile_id: 7,
  profile_id: 1
};

describe('API Endpoints - Pages de cours', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  describe('GET /api/course-pages', () => {
    it('liste les pages publiées d\'un enfant sans token', async () => {
      pool.query.mockResolvedValueOnce({ rows: [PAGE] });
      const req = createMockRequest('GET', '/api/course-pages?targetProfileId=7&published=false');
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.coursePages).toEqual([PAGE]);
      const [sqlText, params] = pool.query.mock.calls[0];
      // Un enfant ne peut pas demander les pages masquées
      expect(sqlText).toContain('is_published = true');
      expect(sqlText).not.toContain('html_content');
      expect(params).toEqual([7]);
    });

    it('refuse la liste complète sans token parent', async () => {
      const req = createMockRequest('GET', '/api/course-pages');
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(403);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('laisse un parent filtrer sur les pages masquées', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const req = createMockRequest('GET', '/api/course-pages?published=false', {}, adminAuth());
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(200);
      const [sqlText, params] = pool.query.mock.calls[0];
      expect(sqlText).toContain('is_published = $1');
      expect(params).toEqual([false]);
    });

    it('rejette un targetProfileId invalide', async () => {
      const req = createMockRequest('GET', '/api/course-pages?targetProfileId=abc');
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/course-pages', () => {
    const body = { title: 'Les molécules', subject: '', htmlContent: '<html></html>', targetProfileId: 7 };

    it('exige un token', async () => {
      const req = createMockRequest('POST', '/api/course-pages', body);
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('refuse un profil enfant', async () => {
      const req = createMockRequest('POST', '/api/course-pages', body, childAuth());
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(403);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('publie la page pour l\'enfant ciblé', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] })
        .mockResolvedValueOnce({ rows: [PAGE] });
      const req = createMockRequest('POST', '/api/course-pages', body, adminAuth());
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.coursePage).toEqual(PAGE);
      const [, insertParams] = pool.query.mock.calls[1];
      expect(insertParams).toEqual([1, 7, 'Les molécules', null, null, '<html></html>', true]);
    });

    it('refuse un enfant cible inexistant ou parent', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const req = createMockRequest('POST', '/api/course-pages', body, adminAuth());
      const res = createMockResponse();

      await handleCoursePages(req, res);

      expect(res.statusCode).toBe(400);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/course-pages/:id', () => {
    it('cache une page masquée à un enfant', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ...PAGE, is_published: false, html_content: '<p>x</p>' }] });
      const req = createMockRequest('GET', '/api/course-pages/12');
      const res = createMockResponse();

      await handleCoursePage(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('montre une page masquée à un parent (aperçu)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ...PAGE, is_published: false, html_content: '<p>x</p>' }] });
      const req = createMockRequest('GET', '/api/course-pages/12', {}, adminAuth());
      const res = createMockResponse();

      await handleCoursePage(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.coursePage.html_content).toBe('<p>x</p>');
    });
  });

  describe('PUT /api/course-pages/:id', () => {
    it('met à jour uniquement les champs fournis', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ...PAGE, is_published: false }] });
      const req = createMockRequest('PUT', '/api/course-pages/12', { isPublished: false }, adminAuth());
      const res = createMockResponse();

      await handleCoursePage(req, res);

      expect(res.statusCode).toBe(200);
      const [sqlText, params] = pool.query.mock.calls[0];
      expect(sqlText).toContain('SET is_published = $1, updated_at');
      expect(sqlText).toContain('WHERE id = $2');
      expect(params).toEqual([false, 12]);
    });

    it('rejette une mise à jour vide', async () => {
      const req = createMockRequest('PUT', '/api/course-pages/12', {}, adminAuth());
      const res = createMockResponse();

      await handleCoursePage(req, res);

      expect(res.statusCode).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/course-pages/:id', () => {
    it('renvoie 404 si la page n\'existe pas', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const req = createMockRequest('DELETE', '/api/course-pages/99', {}, adminAuth());
      const res = createMockResponse();

      await handleCoursePage(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('coursePageCreateSchema', () => {
    it('convertit l\'ID cible et nettoie le titre', () => {
      const parsed = coursePageCreateSchema.parse({ title: '  Les stomates ', htmlContent: '<p></p>', targetProfileId: '7' });
      expect(parsed.title).toBe('Les stomates');
      expect(parsed.targetProfileId).toBe(7);
    });

    it('refuse un titre vide', () => {
      expect(() => coursePageCreateSchema.parse({ title: ' ', htmlContent: '<p></p>', targetProfileId: 7 })).toThrow();
    });
  });
});
