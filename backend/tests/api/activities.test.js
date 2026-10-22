/**
 * Tests d'intégration des activités (base de test dédiée).
 */

const { handleActivities, handleActivity } = require('../../controllers/activityController.js');
const { default: sql } = require('../../lib/database.js');
const {
  describeWithDb,
  createTestProfile,
  createTestPin,
  generateTestToken,
  cleanupTestData,
  createMockRequest,
  createMockResponse
} = require('../helpers/testHelpers.js');

describeWithDb('API Endpoints - Activités', () => {
  let testProfile;
  let adminProfile;
  let testProfileIds = [];
  let testActivityIds = [];

  beforeAll(async () => {
    testProfile = await createTestProfile({ name: 'Test Activity Child', type: 'child' });
    adminProfile = await createTestProfile({ name: 'Test Activity Admin', type: 'admin', is_admin: true });
    testProfileIds.push(testProfile.id, adminProfile.id);
    await createTestPin(testProfile.id, '1234');
    await createTestPin(adminProfile.id, '5678');
  }, 30000);

  afterAll(async () => {
    if (testActivityIds.length > 0) {
      await sql`DELETE FROM activities WHERE id = ANY(${testActivityIds})`;
    }
    await cleanupTestData(testProfileIds);
  });

  it('GET récupère les activités', async () => {
    const req = createMockRequest('GET', '/api/activities');
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.activities)).toBe(true);
  });

  it('POST crée une activité liée à un enfant', async () => {
    const token = generateTestToken(adminProfile);
    const req = createMockRequest('POST', '/api/activities', {
      title: 'Devoirs de mathématiques',
      description: 'Exercices de géométrie',
      child_id: testProfile.id,
      priority: 'high',
      due_date: '2026-10-25T18:00:00.000Z',
      status: 'active'
    }, { authorization: `Bearer ${token}` });
    const res = createMockResponse();

    await handleActivities(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.activity.title).toBe('Devoirs de mathématiques');
    expect(res.body.data.activity.child_id).toBe(testProfile.id);
    expect(res.body.data.activity.priority).toBe('high');
    testActivityIds.push(res.body.data.activity.id);
  });

  it('GET /:id renvoie l\'activité', async () => {
    const req = createMockRequest('GET', `/api/activities/${testActivityIds[0]}`);
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activity.id).toBe(testActivityIds[0]);
  });

  it('PUT met à jour le statut', async () => {
    const token = generateTestToken(adminProfile);
    const req = createMockRequest('PUT', `/api/activities/${testActivityIds[0]}`, {
      status: 'completed'
    }, { authorization: `Bearer ${token}` });
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.activity.status).toBe('completed');
  });

  it('DELETE supprime l\'activité', async () => {
    const token = generateTestToken(adminProfile);
    const req = createMockRequest('DELETE', `/api/activities/${testActivityIds[0]}`, {}, {
      authorization: `Bearer ${token}`
    });
    const res = createMockResponse();

    await handleActivity(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(testActivityIds[0]);
  });
});
