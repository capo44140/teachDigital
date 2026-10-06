/**
 * Tests des sessions et de la vérification du token
 * La base est mockée : ces tests ne touchent pas aux données réelles.
 */

jest.mock('../../lib/database.js', () => {
  // Reproduit lib/database.js : une Promise native qui ne se résout jamais d'elle-même,
  // seul le then() surchargé exécute la requête. Un « await sql`...` » nu attendrait indéfiniment.
  const sql = jest.fn(() => {
    const promise = new Promise(() => {});
    promise.then = (resolve, reject) => Promise.resolve([{ id: 1, session_token: 'abc' }]).then(resolve, reject);
    promise.catch = reject => Promise.resolve([{ id: 1, session_token: 'abc' }]).catch(reject);
    return promise;
  });
  return { default: sql, sql, pool: { query: jest.fn() } };
});
jest.mock('../../lib/nativeHash.js', () => ({ NativeHashService: {} }));

const { deleteSession, verifySession, createSession, generateToken } = require('../../lib/auth.js');
const { handleVerify, handleLogout } = require('../../controllers/authController.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

describe('Sessions', () => {
  it('deleteSession se termine (pas d\'attente infinie)', async () => {
    await expect(deleteSession('abc')).resolves.toEqual({ id: 1, session_token: 'abc' });
  }, 2000);

  it('verifySession et createSession se terminent', async () => {
    await expect(verifySession('abc')).resolves.toEqual({ id: 1, session_token: 'abc' });
    await expect(createSession(1, 'abc', new Date())).resolves.toEqual({ id: 1, session_token: 'abc' });
  }, 2000);

  it('POST /auth/logout répond avec un token', async () => {
    const req = createMockRequest('POST', '/api/auth/logout', {}, { authorization: 'Bearer abc' });
    const res = createMockResponse();

    await handleLogout(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  }, 2000);
});

describe('GET /api/auth/verify', () => {
  it('renvoie l\'utilisateur pour un token valide', async () => {
    const token = generateToken({ profileId: 1, name: 'Parent', type: 'admin', isAdmin: true });
    const req = createMockRequest('GET', '/api/auth/verify', {}, { authorization: `Bearer ${token}` });
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user).toEqual({ id: 1, name: 'Parent', type: 'admin', isAdmin: true });
  });

  it('renvoie 401 sans token', async () => {
    const req = createMockRequest('GET', '/api/auth/verify');
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('renvoie 401 pour un token invalide', async () => {
    const req = createMockRequest('GET', '/api/auth/verify', {}, { authorization: 'Bearer pas-un-jwt' });
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(401);
  });
});
