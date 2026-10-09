/**
 * Tests des jetons et middlewares d'authentification (lib/auth.js)
 * La base est mockée : seule la vérification admin l'interroge.
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn(() => Promise.resolve([]));
  return { default: sql, sql, pool: { query: jest.fn() } };
});

const jwt = require('jsonwebtoken');
const sql = require('../../lib/database.js').default;
const {
  generateToken,
  generateFamilyToken,
  authenticateToken,
  requireMember,
  requireAdmin,
  canActForProfile,
  getJwtSecretProblem
} = require('../../lib/auth.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const bearer = token => ({ authorization: `Bearer ${token}` });

function runMiddleware(middleware, req) {
  const res = createMockResponse();
  const next = jest.fn();
  return Promise.resolve(middleware(req, res, next)).then(() => ({ res, next }));
}

beforeEach(() => {
  sql.mockReset().mockImplementation(() => Promise.resolve([]));
});

describe('authenticateToken', () => {
  it('un jeton famille ne porte jamais de droits admin ni de profil', () => {
    const forged = jwt.sign({ scope: 'family', isAdmin: true, profileId: 1 }, process.env.JWT_SECRET);
    const user = authenticateToken(createMockRequest('GET', '/', {}, bearer(forged)));
    expect(user.scope).toBe('family');
    expect(user.isAdmin).toBe(false);
    expect(user.profileId).toBeUndefined();
  });

  it('accepte les anciens jetons profil sans scope', () => {
    const legacy = jwt.sign({ profileId: 3, isAdmin: false }, process.env.JWT_SECRET);
    expect(authenticateToken(createMockRequest('GET', '/', {}, bearer(legacy))).scope).toBe('profile');
  });

  it('refuse un jeton signé avec un autre secret', () => {
    const other = jwt.sign({ scope: 'profile', profileId: 1, isAdmin: true }, 'teachdigital-super-secret-jwt-key-2024-change-in-production');
    expect(() => authenticateToken(createMockRequest('GET', '/', {}, bearer(other)))).toThrow('Token invalide');
  });

  it('refuse un scope inconnu', () => {
    const odd = jwt.sign({ scope: 'superuser' }, process.env.JWT_SECRET);
    expect(() => authenticateToken(createMockRequest('GET', '/', {}, bearer(odd)))).toThrow('Token invalide');
  });
});

describe('requireMember', () => {
  it('401 sans jeton', async () => {
    const { res, next } = await runMiddleware(requireMember, createMockRequest('GET', '/lessons'));
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('laisse passer un jeton famille et renseigne req.user', async () => {
    const req = createMockRequest('GET', '/lessons', {}, bearer(generateFamilyToken().token));
    const { next } = await runMiddleware(requireMember, req);
    expect(next).toHaveBeenCalled();
    expect(req.user.scope).toBe('family');
  });
});

describe('requireAdmin', () => {
  it('403 pour un jeton famille', async () => {
    const req = createMockRequest('DELETE', '/profiles/2', {}, bearer(generateFamilyToken().token));
    const { res, next } = await runMiddleware(requireAdmin, req);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 pour un jeton profil enfant', async () => {
    const req = createMockRequest('DELETE', '/profiles/2', {}, bearer(generateToken({ profileId: 7, isAdmin: false })));
    const { res } = await runMiddleware(requireAdmin, req);
    expect(res.statusCode).toBe(403);
  });

  it('403 si le parent a été désactivé ou rétrogradé depuis l\'émission du jeton', async () => {
    sql.mockImplementation(() => Promise.resolve([{ is_admin: true, is_active: false }]));
    const req = createMockRequest('DELETE', '/profiles/2', {}, bearer(generateToken({ profileId: 1, isAdmin: true })));
    const { res, next } = await runMiddleware(requireAdmin, req);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('laisse passer un parent actif (vérifié en base)', async () => {
    sql.mockImplementation(() => Promise.resolve([{ is_admin: true, is_active: true }]));
    const req = createMockRequest('DELETE', '/profiles/2', {}, bearer(generateToken({ profileId: 1, isAdmin: true })));
    const { next } = await runMiddleware(requireAdmin, req);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ profileId: 1, isAdmin: true });
  });
});

describe('canActForProfile', () => {
  it('applique les règles parent / famille / profil', () => {
    expect(canActForProfile({ scope: 'profile', isAdmin: true, profileId: 1 }, 9)).toBe(true);
    expect(canActForProfile({ scope: 'family', isAdmin: false }, 9)).toBe(true);
    expect(canActForProfile({ scope: 'profile', isAdmin: false, profileId: 9 }, 9)).toBe(true);
    expect(canActForProfile({ scope: 'profile', isAdmin: false, profileId: 8 }, 9)).toBe(false);
    expect(canActForProfile(undefined, 9)).toBe(false);
  });
});

describe('getJwtSecretProblem', () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    process.env.JWT_SECRET = original;
  });

  it('refuse les secrets d\'exemple publiés dans le dépôt et les secrets courts', () => {
    process.env.JWT_SECRET = 'teachdigital-super-secret-jwt-key-2024-change-in-production';
    expect(getJwtSecretProblem()).toMatch(/exemple/);
    process.env.JWT_SECRET = 'court';
    expect(getJwtSecretProblem()).toMatch(/trop court/);
    process.env.JWT_SECRET = '';
    expect(getJwtSecretProblem()).toMatch(/manquant/);
  });

  it('accepte un secret aléatoire suffisamment long', () => {
    expect(getJwtSecretProblem()).toBeNull();
  });
});
