/**
 * Demandes de création de profil : une notification par parent, dans une seule
 * transaction (toutes ou aucune). La base est mockée.
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
  default: jest.fn()
}));

const { pool } = require('../../lib/database.js');
const { handleProfileCreationRequest } = require('../../controllers/profileController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

function mockClient({ admins = [{ id: 1 }, { id: 2 }], failOnInsert = 0 } = {}) {
  let inserts = 0;
  const client = {
    query: jest.fn(async (text) => {
      if (text.startsWith('SELECT id FROM profiles')) return { rows: admins };
      if (text.startsWith('INSERT INTO notifications')) {
        inserts += 1;
        if (inserts === failOnInsert) throw Object.assign(new Error('connexion perdue'), { code: '08006' });
        return { rows: [] };
      }
      return { rows: [] };
    }),
    release: jest.fn()
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

async function request(body = { name: 'Léa', type: 'child' }) {
  const req = createMockRequest('POST', '/api/profiles/requests', body);
  req.user = { scope: 'family', isAdmin: false };
  const res = createMockResponse();
  await handleProfileCreationRequest(req, res);
  return res;
}

const statements = client => client.query.mock.calls.map(([text]) => text.split(' ')[0]);

describe('POST /profiles/requests (transaction)', () => {
  beforeEach(() => {
    pool.connect.mockReset();
  });

  it('notifie chaque parent puis valide la transaction', async () => {
    const client = mockClient();

    const res = await request();

    expect(res.statusCode).toBe(201);
    expect(typeof res.body.data.requestId).toBe('string');
    expect(statements(client)).toEqual(['BEGIN', 'SELECT', 'INSERT', 'INSERT', 'COMMIT']);
    const inserts = client.query.mock.calls.filter(([text]) => text.startsWith('INSERT'));
    expect(inserts.map(([, params]) => params[0])).toEqual([1, 2]);
    expect(inserts[0][1][1]).toBe('profile_request');
    expect(client.release).toHaveBeenCalled();
  });

  it('annule tout (ROLLBACK) si une insertion échoue', async () => {
    const client = mockClient({ failOnInsert: 2 });

    const res = await request();

    expect(res.statusCode).toBe(500);
    expect(statements(client)).toEqual(['BEGIN', 'SELECT', 'INSERT', 'INSERT', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalled();
  });

  it('répond NO_ADMIN_AVAILABLE sans parent actif', async () => {
    mockClient({ admins: [] });

    const res = await request();

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('NO_ADMIN_AVAILABLE');
  });
});
