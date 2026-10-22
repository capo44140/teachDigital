/**
 * Tests unitaires du contrôleur d'activités (sans base de données).
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn() },
  default: jest.fn(),
  sql: jest.fn()
}));

const { pool } = require('../../lib/database.js');
const { handleActivities, handleActivity } = require('../../controllers/activityController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const activity = {
  id: 5,
  title: 'Devoirs de mathématiques',
  description: 'Exercices de géométrie',
  child_id: 2,
  priority: 'high',
  due_date: '2026-10-25T18:00:00.000Z',
  type: 'task',
  status: 'active',
  difficulty_level: 'medium',
  estimated_duration: 30,
  target_age_group: '6-12',
  subject_area: 'general',
  is_active: true,
  created_at: '2026-10-20T10:00:00.000Z',
  updated_at: '2026-10-20T10:00:00.000Z'
};

const admin = { scope: 'profile', profileId: 1, isAdmin: true };
const child = { scope: 'profile', profileId: 7, isAdmin: false };

describe('Activités - collection', () => {
  beforeEach(() => pool.query.mockReset());

  it('GET filtre par enfant, statut et recherche', async () => {
    pool.query.mockResolvedValue({ rows: [activity] });

    const req = createMockRequest('GET', '/api/activities?child_id=2&status=active&search=math');
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activities).toEqual([activity]);
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('child_id = $1');
    expect(sqlText).toContain('status = $2');
    expect(sqlText).toContain('title ILIKE $3');
    expect(params).toEqual([2, 'active', '%math%']);
  });

  it('GET rejette un filtre de statut inconnu', async () => {
    const req = createMockRequest('GET', '/api/activities?status=inconnu');
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('POST crée une activité pour un parent (valeurs par défaut)', async () => {
    pool.query.mockResolvedValue({ rows: [activity] });

    const req = createMockRequest('POST', '/api/activities', {
      title: 'Devoirs de mathématiques',
      description: 'Exercices de géométrie',
      child_id: 2,
      priority: 'high',
      due_date: '2026-10-25T18:00'
    });
    req.user = admin;
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.activity.id).toBe(5);
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('INSERT INTO activities');
    expect(params).toContain('Devoirs de mathématiques');
    expect(params).toContain('task'); // type par défaut
    expect(params).toContain('active'); // status par défaut
  });

  it('POST refuse un enfant', async () => {
    const req = createMockRequest('POST', '/api/activities', { title: 'T', child_id: 2 });
    req.user = child;
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('POST exige un titre', async () => {
    const req = createMockRequest('POST', '/api/activities', { description: 'Sans titre' });
    req.user = admin;
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('Activités - /activities/:id', () => {
  beforeEach(() => pool.query.mockReset());

  it('GET renvoie une activité', async () => {
    pool.query.mockResolvedValue({ rows: [activity] });

    const req = createMockRequest('GET', '/api/activities/5');
    req.user = child;
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activity.id).toBe(5);
  });

  it('GET renvoie 404 pour une activité inconnue', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const req = createMockRequest('GET', '/api/activities/5');
    req.user = child;
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('PUT refuse un enfant', async () => {
    const req = createMockRequest('PUT', '/api/activities/5', { status: 'completed' });
    req.user = child;
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('PUT met à jour le statut pour un parent', async () => {
    pool.query.mockResolvedValue({ rows: [{ ...activity, status: 'completed' }] });

    const req = createMockRequest('PUT', '/api/activities/5', { status: 'completed' });
    req.user = admin;
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activity.status).toBe('completed');
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('status = $1');
    expect(params).toEqual(['completed', 5]);
  });

  it('PUT rejette un statut inconnu', async () => {
    const req = createMockRequest('PUT', '/api/activities/5', { status: 'inconnu' });
    req.user = admin;
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('DELETE supprime une activité', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 5 }] });

    const req = createMockRequest('DELETE', '/api/activities/5');
    req.user = admin;
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(5);
  });
});
