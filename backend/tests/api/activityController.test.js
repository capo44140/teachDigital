/**
 * Tests unitaires du contrôleur d'activités (sans base de données).
 * La validation Zod est appliquée comme sur la route (validate + schéma).
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn() },
  // Vérification d'accès aux profils (lib/auth.js) : seul le profil 1 est un parent
  default: jest.fn((strings, ...values) => Promise.resolve([{ is_admin: values[0] === 1, is_active: true, token_version: 0 }])),
  sql: jest.fn()
}));

const { pool } = require('../../lib/database.js');
const { handleActivities, handleActivity } = require('../../controllers/activityController.js');
const { validate } = require('../../lib/validation.js');
const { activityCreateSchema, activityUpdateSchema, activityListQuerySchema } = require('../../lib/schemas.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');
const { runChain } = require('./support/chain.js');

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
const family = { scope: 'family', isAdmin: false };

// Chaînes identiques à api/index.js
const listRoute = [validate(activityListQuerySchema, 'query'), handleActivities];
const createRoute = [validate(activityCreateSchema), handleActivities];
const updateRoute = [validate(activityUpdateSchema), handleActivity];

async function run(route, method, path, body, user) {
  const req = createMockRequest(method, path, body);
  req.user = user;
  return runChain(route, req, createMockResponse());
}

describe('Activités - collection', () => {
  beforeEach(() => pool.query.mockReset());

  it('GET filtre par enfant, statut et recherche (parent)', async () => {
    pool.query.mockResolvedValue({ rows: [activity] });

    const res = await run(listRoute, 'GET', '/api/activities?child_id=2&status=active&search=math', undefined, admin);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activities).toEqual([activity]);
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('child_id = $1');
    expect(sqlText).toContain('status = $2');
    expect(sqlText).toContain('title ILIKE $3');
    expect(params).toEqual([2, 'active', '%math%']);
  });

  it('GET limite un enfant à ses activités et aux activités sans enfant', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await run(listRoute, 'GET', '/api/activities', undefined, child);

    expect(res.statusCode).toBe(200);
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('(child_id IS NULL OR child_id = $1)');
    expect(params).toEqual([7]);
  });

  it('GET limite le jeton famille aux activités des enfants actifs', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await run(listRoute, 'GET', '/api/activities', undefined, family);

    expect(pool.query.mock.calls[0][0]).toContain('child_id IN (SELECT id FROM profiles WHERE is_admin = false AND COALESCE(is_active, true))');
  });

  it('GET refuse le filtre sur un autre enfant', async () => {
    const res = await run(listRoute, 'GET', '/api/activities?child_id=2', undefined, child);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('GET rejette un filtre de statut inconnu', async () => {
    const res = await run(listRoute, 'GET', '/api/activities?status=inconnu', undefined, admin);

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('POST crée une activité pour un parent (valeurs par défaut)', async () => {
    pool.query.mockResolvedValue({ rows: [activity] });

    const res = await run(createRoute, 'POST', '/api/activities', {
      title: 'Devoirs de mathématiques',
      description: 'Exercices de géométrie',
      childId: 2,
      priority: 'high',
      due_date: '2026-10-25T18:00'
    }, admin);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.activity.id).toBe(5);
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('INSERT INTO activities');
    expect(sqlText).toContain('child_id');
    expect(params).toContain('Devoirs de mathématiques');
    expect(params).toContain(2);
    expect(params).toContain('task'); // type par défaut
    expect(params).toContain('active'); // status par défaut
  });

  it('POST refuse un enfant', async () => {
    const res = await run(createRoute, 'POST', '/api/activities', { title: 'T', child_id: 2 }, child);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each([
    ['sans titre', { description: 'Sans titre' }],
    ['titre non textuel', { title: 42 }],
    ['priorité inconnue', { title: 'T', priority: 'urgent' }],
    ['date invalide', { title: 'T', due_date: 'pas une date' }],
    ['durée négative', { title: 'T', estimatedDuration: -5 }],
    ['enfant invalide', { title: 'T', child_id: 'abc' }]
  ])('POST rejette un corps invalide (%s) en 400', async (_label, body) => {
    const res = await run(createRoute, 'POST', '/api/activities', body, admin);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('Activités - /activities/:id', () => {
  beforeEach(() => pool.query.mockReset());

  it('GET renvoie l\'activité de l\'enfant connecté', async () => {
    pool.query.mockResolvedValue({ rows: [{ ...activity, child_id: 7 }] });

    const res = await run([handleActivity], 'GET', '/api/activities/5', undefined, child);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activity.id).toBe(5);
  });

  it('GET renvoie 404 pour l\'activité d\'un autre enfant', async () => {
    pool.query.mockResolvedValue({ rows: [activity] });

    const res = await run([handleActivity], 'GET', '/api/activities/5', undefined, child);

    expect(res.statusCode).toBe(404);
  });

  it('GET renvoie 404 pour une activité inconnue', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await run([handleActivity], 'GET', '/api/activities/5', undefined, child);

    expect(res.statusCode).toBe(404);
  });

  it('PUT refuse un enfant', async () => {
    const res = await run(updateRoute, 'PUT', '/api/activities/5', { status: 'completed' }, child);

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('PUT met à jour le statut pour un parent', async () => {
    pool.query.mockResolvedValue({ rows: [{ ...activity, status: 'completed' }] });

    const res = await run(updateRoute, 'PUT', '/api/activities/5', { status: 'completed' }, admin);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activity.status).toBe('completed');
    const [sqlText, params] = pool.query.mock.calls[0];
    expect(sqlText).toContain('status = $1');
    expect(params).toEqual(['completed', 5]);
  });

  it('PUT rejette un statut inconnu ou une mise à jour vide', async () => {
    expect((await run(updateRoute, 'PUT', '/api/activities/5', { status: 'inconnu' }, admin)).statusCode).toBe(400);
    expect((await run(updateRoute, 'PUT', '/api/activities/5', {}, admin)).statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('DELETE supprime une activité', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 5 }] });

    const res = await run([handleActivity], 'DELETE', '/api/activities/5', undefined, admin);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(5);
  });
});
