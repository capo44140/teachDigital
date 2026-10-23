/**
 * Tests de la connexion, du code familial et de la vérification du token
 * La base est mockée : ces tests ne touchent pas aux données réelles.
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn(() => Promise.resolve([]));
  return { default: sql, sql, pool: { query: jest.fn(async () => ({ rows: [] })) } };
});
jest.mock('../../lib/nativeHash.js', () => ({
  NativeHashService: {
    verifyPin: jest.fn(),
    needsRehash: jest.fn(() => false),
    hashPin: jest.fn()
  }
}));

const jwt = require('jsonwebtoken');
const { default: sql, pool } = require('../../lib/database.js');
const { NativeHashService } = require('../../lib/nativeHash.js');
const { generateToken, generateFamilyToken, clearAuthCache } = require('../../lib/auth.js');
const { pinFailures, familyGateFailures } = require('../../lib/bruteForce.js');
const { handleVerify, handleLogout, handleLogin, handleFamilyGate } = require('../../controllers/authController.js');
const { createMockRequest, createMockResponse, familyAuthHeader } = require('../helpers/testHelpers.js');

// Base simulée
let db;

function mockDatabase() {
  sql.mockImplementation((strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (text.includes('FROM pin_codes')) {
      return Promise.resolve(db.pins[values[0]] ? [{ pin_code: db.pins[values[0]] }] : []);
    }
    if (text.includes('FROM profiles')) {
      const profile = db.profiles[values[0]];
      return Promise.resolve(profile ? [profile] : []);
    }
    if (text.includes('FROM family_gate')) {
      return Promise.resolve(db.familyGate ? [db.familyGate] : []);
    }
    return Promise.resolve([]);
  });
  pool.query.mockImplementation(async (text) => {
    if (text.includes('SELECT id FROM profiles WHERE is_admin = true')) {
      return { rows: Object.values(db.profiles).filter(p => p.is_admin && p.is_active).map(p => ({ id: p.id })) };
    }
    return { rows: [{ id: 1 }] };
  });
}

// Requête venant d'une IP donnée (req.ip est calculé par Express en production)
function loginRequest(body, ip = '10.0.0.1') {
  const req = createMockRequest('POST', '/api/auth/login', body, familyAuthHeader());
  req.ip = ip;
  return req;
}

async function login(body, ip) {
  const res = createMockResponse();
  await handleLogin(loginRequest(body, ip), res);
  return res;
}

function auditActions() {
  return pool.query.mock.calls
    .filter(([text]) => text.includes('INSERT INTO audit_logs'))
    .map(([, params]) => params[0]);
}

beforeEach(() => {
  clearAuthCache();
  db = {
    profiles: {
      1: { id: 1, name: 'Parent', type: 'admin', is_admin: true, is_child: false, is_teen: false, is_active: true, token_version: 4 },
      2: { id: 2, name: 'Parent 2', type: 'admin', is_admin: true, is_child: false, is_teen: false, is_active: true, token_version: 0 },
      7: { id: 7, name: 'Léa', type: 'child', is_admin: false, is_child: true, is_teen: false, is_active: true, token_version: 0 }
    },
    pins: { 1: 'hash-1', 2: 'hash-2', 7: 'hash-7' },
    familyGate: { pin_hash: 'hash', token_version: 2 }
  };
  sql.mockReset();
  pool.query.mockReset();
  mockDatabase();
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
  it('renvoie un jeton profil portant la version courante du profil', async () => {
    NativeHashService.verifyPin.mockResolvedValue(true);

    const res = await login({ profileId: 1, pin: '482613' });

    expect(res.statusCode).toBe(200);
    const payload = jwt.decode(res.body.data.token);
    expect(payload).toMatchObject({ scope: 'profile', profileId: 1, isAdmin: true, tokenVersion: 4 });
    expect(auditActions()).toContain('LOGIN_SUCCESS');
  });

  it('journalise les échecs de connexion', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);

    const res = await login({ profileId: 7, pin: '0000' });

    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(auditActions()).toContain('LOGIN_FAILED');
  });

  it('verrouille le profil pour une IP après 10 PIN incorrects, pas pour les autres IP', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);
    for (let i = 0; i < 10; i++) {
      expect((await login({ profileId: 7, pin: '0000' }, '10.0.0.1')).statusCode).toBe(401);
    }

    // Même avec le bon PIN, la 11e tentative depuis cette IP est refusée sans interroger la base
    NativeHashService.verifyPin.mockResolvedValue(true);
    sql.mockClear();
    const locked = await login({ profileId: 7, pin: '4826' }, '10.0.0.1');
    expect(locked.statusCode).toBe(429);
    expect(locked.body.code).toBe('PIN_LOCKED');
    expect(locked.body.retryAfterSeconds).toBeGreaterThan(14 * 60);
    expect(sql).not.toHaveBeenCalled();
    expect(auditActions()).toContain('PIN_LOCKED');

    // Le parent connecté depuis un autre appareil n'est pas bloqué
    expect((await login({ profileId: 7, pin: '4826' }, '10.0.0.2')).statusCode).toBe(200);
  });

  it('prévient les parents quand le PIN d\'un profil parent est verrouillé', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);
    for (let i = 0; i < 10; i++) {
      await login({ profileId: 1, pin: '000000' });
    }
    await new Promise(resolve => setImmediate(resolve));

    const inserts = pool.query.mock.calls.filter(([text]) => text.includes('INSERT INTO notifications'));
    expect(inserts.map(([, params]) => params[0]).sort()).toEqual([1, 2]);
    expect(inserts[0][1][1]).toBe('security_alert');
    expect(inserts[0][1][3]).toMatch(/Parent/);
  });

  it('ne prévient personne pour le verrouillage d\'un profil enfant', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);
    for (let i = 0; i < 10; i++) {
      await login({ profileId: 7, pin: '0000' });
    }
    await new Promise(resolve => setImmediate(resolve));

    expect(pool.query.mock.calls.some(([text]) => text.includes('INSERT INTO notifications'))).toBe(false);
  });
});

describe('POST /api/auth/family-gate', () => {
  function gateRequest(pin, ip = '10.0.0.1') {
    const req = createMockRequest('POST', '/api/auth/family-gate', { pin });
    req.ip = ip;
    return req;
  }

  it('renvoie un jeton famille sans droits admin, portant la version du code familial', async () => {
    NativeHashService.verifyPin.mockResolvedValue(true);
    const res = createMockResponse();

    await handleFamilyGate(gateRequest('4826'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.valid).toBe(true);
    const payload = jwt.decode(res.body.data.token);
    expect(payload.scope).toBe('family');
    expect(payload.tokenVersion).toBe(2);
    expect(payload.isAdmin).toBeUndefined();
    expect(payload.profileId).toBeUndefined();
    expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(auditActions()).toContain('FAMILY_GATE_SUCCESS');
  });

  it('ne délivre pas de jeton pour un code incorrect et journalise l\'échec', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);
    const res = createMockResponse();

    await handleFamilyGate(gateRequest('0000'), res);

    expect(res.statusCode).toBe(401);
    expect(res.body.data).toBeFalsy();
    expect(auditActions()).toContain('FAMILY_GATE_FAILED');
  });

  it('verrouille le code familial par IP', async () => {
    NativeHashService.verifyPin.mockResolvedValue(false);
    for (let i = 0; i < 10; i++) {
      await handleFamilyGate(gateRequest('0000', '10.0.0.9'), createMockResponse());
    }
    const res = createMockResponse();
    await handleFamilyGate(gateRequest('0000', '10.0.0.9'), res);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('FAMILY_GATE_LOCKED');
    expect(auditActions()).toContain('FAMILY_GATE_LOCKED');

    const other = createMockResponse();
    await handleFamilyGate(gateRequest('0000', '10.0.0.10'), other);
    expect(other.statusCode).toBe(401);
  });
});

describe('GET /api/auth/verify', () => {
  it('renvoie l\'utilisateur pour un token profil valide', async () => {
    const token = generateToken({ profileId: 1, name: 'Parent', type: 'admin', isAdmin: true, tokenVersion: 4 });
    const req = createMockRequest('GET', '/api/auth/verify', {}, { authorization: `Bearer ${token}` });
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.scope).toBe('profile');
    expect(res.body.data.user).toEqual({ id: 1, name: 'Parent', type: 'admin', isAdmin: true });
  });

  it('ne renvoie aucun utilisateur pour un jeton famille', async () => {
    const req = createMockRequest('GET', '/api/auth/verify', {}, { authorization: `Bearer ${generateFamilyToken(2).token}` });
    const res = createMockResponse();

    await handleVerify(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ scope: 'family', user: null });
  });

  it('renvoie 401 TOKEN_REVOKED pour un jeton révoqué (ancienne version)', async () => {
    const stale = generateToken({ profileId: 1, isAdmin: true, tokenVersion: 3 });
    const res = createMockResponse();
    await handleVerify(createMockRequest('GET', '/api/auth/verify', {}, { authorization: `Bearer ${stale}` }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('TOKEN_REVOKED');

    const staleFamily = createMockResponse();
    await handleVerify(createMockRequest('GET', '/api/auth/verify', {}, familyAuthHeader()), staleFamily);
    expect(staleFamily.statusCode).toBe(401);
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
