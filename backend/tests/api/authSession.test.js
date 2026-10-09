/**
 * Tests de la connexion, du code familial et de la vérification du token
 * La base est mockée : ces tests ne touchent pas aux données réelles.
 */

jest.mock('../../lib/database.js', () => {
  // sql`...` renvoie une requête paresseuse ; chaque test fournit les lignes attendues
  const sql = jest.fn(() => Promise.resolve([]));
  return { default: sql, sql, pool: { query: jest.fn() } };
});
jest.mock('../../lib/nativeHash.js', () => ({
  NativeHashService: {
    verifyPin: jest.fn(),
    needsRehash: jest.fn(() => false),
    hashPin: jest.fn()
  }
}));

const jwt = require('jsonwebtoken');
const sql = require('../../lib/database.js').default;
const { NativeHashService } = require('../../lib/nativeHash.js');
const { generateToken } = require('../../lib/auth.js');
const { pinFailures, familyGateFailures } = require('../../lib/bruteForce.js');
const { handleVerify, handleLogout, handleLogin, handleFamilyGate } = require('../../controllers/authController.js');
const { createMockRequest, createMockResponse, familyAuthHeader } = require('../helpers/testHelpers.js');

beforeEach(() => {
  sql.mockReset().mockImplementation(() => Promise.resolve([]));
  NativeHashService.verifyPin.mockReset();
  pinFailures.reset();
  familyGateFailures.reset();
});

describe('POST /api/auth/logout', () => {
  it('répond 200 (jetons sans état : le client supprime le sien)', async () => {
    const req = createMockRequest('POST', '/api/auth/logout', {}, { authorization: 'Bearer abc' });
    const res = createMockResponse();

    await handleLogout(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  const PROFILE = { id: 1, name: 'Parent', type: 'admin', is_admin: true, is_child: false, is_teen: false };

  function mockProfileAndPin() {
    sql
      .mockImplementationOnce(() => Promise.resolve([PROFILE]))
      .mockImplementationOnce(() => Promise.resolve([{ pin_code: 'hash' }]));
  }

  it('renvoie un jeton profil (scope profile) pour un PIN correct', async () => {
    mockProfileAndPin();
    NativeHashService.verifyPin.mockResolvedValue(true);
    const req = createMockRequest('POST', '/api/auth/login', { profileId: 1, pin: '4826' });
    const res = createMockResponse();

    await handleLogin(req, res);

    expect(res.statusCode).toBe(200);
    const payload = jwt.decode(res.body.data.token);
    expect(payload).toMatchObject({ scope: 'profile', profileId: 1, isAdmin: true });
  });

  it('verrouille le profil après 10 PIN incorrects, quelle que soit l\'origine', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);
    for (let i = 0; i < 10; i++) {
      mockProfileAndPin();
      const res = createMockResponse();
      await handleLogin(createMockRequest('POST', '/api/auth/login', { profileId: 1, pin: '0000' }), res);
      expect(res.statusCode).toBe(401);
    }

    // Même avec le bon PIN, la 11e tentative est refusée sans interroger la base
    NativeHashService.verifyPin.mockResolvedValue(true);
    sql.mockClear();
    const res = createMockResponse();
    await handleLogin(createMockRequest('POST', '/api/auth/login', { profileId: 1, pin: '4826' }), res);

    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('PIN_LOCKED');
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/family-gate', () => {
  it('renvoie un jeton famille sans droits admin pour un code correct', async () => {
    sql.mockImplementationOnce(() => Promise.resolve([{ pin_hash: 'hash' }]));
    NativeHashService.verifyPin.mockResolvedValue(true);
    const req = createMockRequest('POST', '/api/auth/family-gate', { pin: '4826' });
    const res = createMockResponse();

    await handleFamilyGate(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.valid).toBe(true);
    const payload = jwt.decode(res.body.data.token);
    expect(payload.scope).toBe('family');
    expect(payload.isAdmin).toBeUndefined();
    expect(payload.profileId).toBeUndefined();
    expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('ne délivre pas de jeton pour un code incorrect', async () => {
    sql.mockImplementationOnce(() => Promise.resolve([{ pin_hash: 'hash' }]));
    NativeHashService.verifyPin.mockResolvedValue(false);
    const res = createMockResponse();

    await handleFamilyGate(createMockRequest('POST', '/api/auth/family-gate', { pin: '0000' }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body.data).toBeFalsy();
  });
});

describe('GET /api/auth/verify', () => {
  it('renvoie l\'utilisateur pour un token profil valide', async () => {
    const token = generateToken({ profileId: 1, name: 'Parent', type: 'admin', isAdmin: true });
    const req = createMockRequest('GET', '/api/auth/verify', {}, { authorization: `Bearer ${token}` });
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.scope).toBe('profile');
    expect(res.body.data.user).toEqual({ id: 1, name: 'Parent', type: 'admin', isAdmin: true });
  });

  it('ne renvoie aucun utilisateur pour un jeton famille', async () => {
    const req = createMockRequest('GET', '/api/auth/verify', {}, familyAuthHeader());
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ scope: 'family', user: null });
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
