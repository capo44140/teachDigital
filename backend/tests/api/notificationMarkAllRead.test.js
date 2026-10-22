/**
 * Tests unitaires de POST /notifications/mark-all-read (sans base de données).
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn(() => Promise.resolve([{ id: 1 }, { id: 2 }]));
  return { default: sql, sql, pool: { query: jest.fn() } };
});

const { default: sql } = require('../../lib/database.js');
const { handleMarkAllNotificationsRead } = require('../../controllers/notificationController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

describe('Notifications - mark-all-read', () => {
  beforeEach(() => {
    sql.mockClear();
  });

  it('marque les notifications du profil du jeton parent', async () => {
    const req = createMockRequest('POST', '/api/notifications/mark-all-read');
    req.user = { scope: 'profile', profileId: 7, isAdmin: false };
    const res = createMockResponse();

    await handleMarkAllNotificationsRead(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ profileId: 7, updated: 2 });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('accepte un profileId explicite pour un parent', async () => {
    const req = createMockRequest('POST', '/api/notifications/mark-all-read', { profileId: 9 });
    req.user = { scope: 'profile', profileId: 1, isAdmin: true };
    const res = createMockResponse();

    await handleMarkAllNotificationsRead(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.profileId).toBe(9);
  });

  it('refuse le profil d\'un autre enfant', async () => {
    const req = createMockRequest('POST', '/api/notifications/mark-all-read', { profileId: 9 });
    req.user = { scope: 'profile', profileId: 7, isAdmin: false };
    const res = createMockResponse();

    await handleMarkAllNotificationsRead(req, res);

    expect(res.statusCode).toBe(403);
    expect(sql).not.toHaveBeenCalled();
  });

  it('exige un profileId avec un jeton famille', async () => {
    const req = createMockRequest('POST', '/api/notifications/mark-all-read');
    req.user = { scope: 'family', isAdmin: false };
    const res = createMockResponse();

    await handleMarkAllNotificationsRead(req, res);

    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });
});
