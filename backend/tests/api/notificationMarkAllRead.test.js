/**
 * Tests unitaires de POST /notifications/mark-all-read (sans base de données).
 */

jest.mock('../../lib/database.js', () => {
  // Vérification d'accès aux profils (lib/auth.js) : seul le profil 1 est un parent
  const sql = jest.fn((strings, ...values) => Promise.resolve([{ is_admin: values[0] === 1, is_active: true, token_version: 0 }]));
  return { default: sql, sql, pool: { query: jest.fn(async () => ({ rows: [{ id: 1 }, { id: 2 }] })) } };
});

const { pool } = require('../../lib/database.js');
const { handleMarkAllNotificationsRead } = require('../../controllers/notificationController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

async function markAllRead(user, body) {
  const req = createMockRequest('POST', '/api/notifications/mark-all-read', body);
  req.user = user;
  const res = createMockResponse();
  await handleMarkAllNotificationsRead(req, res);
  return res;
}

describe('Notifications - mark-all-read', () => {
  beforeEach(() => {
    pool.query.mockClear();
  });

  it('marque les notifications du profil du jeton', async () => {
    const res = await markAllRead({ scope: 'profile', profileId: 7, isAdmin: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ profileId: 7, updated: 2 });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('accepte un profileId explicite pour un parent', async () => {
    const res = await markAllRead({ scope: 'profile', profileId: 1, isAdmin: true }, { profileId: 9 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.profileId).toBe(9);
  });

  it('refuse le profil d\'un autre enfant', async () => {
    const res = await markAllRead({ scope: 'profile', profileId: 7, isAdmin: false }, { profileId: 9 });

    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('jeton famille : un enfant oui, un parent non', async () => {
    expect((await markAllRead({ scope: 'family', isAdmin: false }, { profileId: 9 })).statusCode).toBe(200);
    expect((await markAllRead({ scope: 'family', isAdmin: false }, { profileId: 1 })).statusCode).toBe(403);
  });

  it('exige un profileId avec un jeton famille', async () => {
    const res = await markAllRead({ scope: 'family', isAdmin: false });

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
