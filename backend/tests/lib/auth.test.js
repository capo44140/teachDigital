/**
 * Tests des jetons et middlewares d'authentification (lib/auth.js)
 * La base est mockée : profils et code familial sont simulés selon la requête.
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
  clearAuthCache,
  getJwtSecretProblem
} = require('../../lib/auth.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const bearer = token => ({ authorization: `Bearer ${token}` });

// Base simulée : profils { id: { is_admin, is_active, token_version } } et version famille
let profiles;
let familyVersion;

function mockDatabase() {
  sql.mockImplementation((strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (text.includes('FROM profiles')) {
      const row = profiles[values[0]];
      return Promise.resolve(row ? [row] : []);
    }
    if (text.includes('FROM family_gate')) {
      return Promise.resolve(familyVersion === null ? [] : [{ token_version: familyVersion }]);
    }
    return Promise.resolve([]);
  });
}

function runMiddleware(middleware, req) {
  const res = createMockResponse();
  const next = jest.fn();
  return Promise.resolve(middleware(req, res, next)).then(() => ({ res, next }));
}

beforeEach(() => {
  clearAuthCache();
  profiles = {
    1: { is_admin: true, is_active: true, token_version: 0 },
    2: { is_admin: true, is_active: true, token_version: 0 },
    7: { is_admin: false, is_active: true, token_version: 0 },
    8: { is_admin: false, is_active: true, token_version: 0 }
  };
  familyVersion = 0;
  sql.mockReset();
  mockDatabase();
});

describe('authenticateToken', () => {
  it('un jeton famille ne porte jamais de droits admin ni de profil', () => {
    const forged = jwt.sign({ scope: 'family', isAdmin: true, profileId: 1 }, process.env.JWT_SECRET);
    const user = authenticateToken(createMockRequest('GET', '/', {}, bearer(forged)));
    expect(user.scope).toBe('family');
    expect(user.isAdmin).toBe(false);
    expect(user.profileId).toBeUndefined();
  });

  it('accepte les anciens jetons profil sans scope ni version (version 0)', () => {
    const legacy = jwt.sign({ profileId: 3, isAdmin: false }, process.env.JWT_SECRET);
    const user = authenticateToken(createMockRequest('GET', '/', {}, bearer(legacy)));
    expect(user.scope).toBe('profile');
    expect(user.tokenVersion).toBe(0);
  });

  it('refuse un jeton signé avec un autre secret', () => {
    const other = jwt.sign({ scope: 'profile', profileId: 1, isAdmin: true }, 'teachdigital-super-secret-jwt-key-2024-change-in-production');
    expect(() => authenticateToken(createMockRequest('GET', '/', {}, bearer(other)))).toThrow('Token invalide');
  });

  it('refuse un scope inconnu', () => {
    const odd = jwt.sign({ scope: 'superuser' }, process.env.JWT_SECRET);
    expect(() => authenticateToken(createMockRequest('GET', '/', {}, bearer(odd)))).toThrow('Token invalide');
  });

  it('les jetons générés portent la version fournie', () => {
    expect(jwt.decode(generateToken({ profileId: 7, tokenVersion: 3 })).tokenVersion).toBe(3);
    expect(jwt.decode(generateFamilyToken(5).token)).toMatchObject({ scope: 'family', tokenVersion: 5 });
  });
});

describe('requireMember', () => {
  it('401 sans jeton', async () => {
    const { res, next } = await runMiddleware(requireMember, createMockRequest('GET', '/lessons'));
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('laisse passer un jeton famille à jour et renseigne req.user', async () => {
    const req = createMockRequest('GET', '/lessons', {}, bearer(generateFamilyToken().token));
    const { next } = await runMiddleware(requireMember, req);
    expect(next).toHaveBeenCalled();
    expect(req.user.scope).toBe('family');
  });

  it('401 TOKEN_REVOKED pour un jeton famille d\'une version antérieure (code familial changé)', async () => {
    familyVersion = 1;
    const req = createMockRequest('GET', '/lessons', {}, bearer(generateFamilyToken(0).token));
    const { res, next } = await runMiddleware(requireMember, req);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('TOKEN_REVOKED');
    expect(next).not.toHaveBeenCalled();
  });

  it('401 TOKEN_REVOKED pour un jeton profil révoqué (PIN changé) ou un profil désactivé', async () => {
    profiles[7].token_version = 2;
    let result = await runMiddleware(requireMember, createMockRequest('GET', '/', {}, bearer(generateToken({ profileId: 7, tokenVersion: 1 }))));
    expect(result.res.statusCode).toBe(401);
    expect(result.res.body.code).toBe('TOKEN_REVOKED');

    clearAuthCache();
    profiles[8].is_active = false;
    result = await runMiddleware(requireMember, createMockRequest('GET', '/', {}, bearer(generateToken({ profileId: 8 }))));
    expect(result.res.statusCode).toBe(401);
  });

  it('met en cache la vérification (une seule requête pour plusieurs appels)', async () => {
    const token = generateToken({ profileId: 7 });
    await runMiddleware(requireMember, createMockRequest('GET', '/', {}, bearer(token)));
    await runMiddleware(requireMember, createMockRequest('GET', '/', {}, bearer(token)));
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('503 si la vérification en base échoue', async () => {
    sql.mockImplementation(() => Promise.reject(new Error('connexion perdue')));
    const { res, next } = await runMiddleware(requireMember, createMockRequest('GET', '/', {}, bearer(generateToken({ profileId: 7 }))));
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
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

  it('401 si le parent a été désactivé depuis l\'émission du jeton', async () => {
    profiles[1].is_active = false;
    const req = createMockRequest('DELETE', '/profiles/2', {}, bearer(generateToken({ profileId: 1, isAdmin: true })));
    const { res, next } = await runMiddleware(requireAdmin, req);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 si le parent a été rétrogradé en base (isAdmin encore présent dans le jeton)', async () => {
    profiles[2].is_admin = false;
    const req = createMockRequest('DELETE', '/profiles/7', {}, bearer(generateToken({ profileId: 2, isAdmin: true })));
    const { res, next } = await runMiddleware(requireAdmin, req);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('laisse passer un parent actif (vérifié en base)', async () => {
    const req = createMockRequest('DELETE', '/profiles/2', {}, bearer(generateToken({ profileId: 1, isAdmin: true })));
    const { next } = await runMiddleware(requireAdmin, req);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ profileId: 1, isAdmin: true });
  });
});

describe('canActForProfile', () => {
  const admin = { scope: 'profile', isAdmin: true, profileId: 1 };
  const family = { scope: 'family', isAdmin: false };
  const child = { scope: 'profile', isAdmin: false, profileId: 7 };

  it('parent : tous les profils', async () => {
    await expect(canActForProfile(admin, 2)).resolves.toBe(true);
    await expect(canActForProfile(admin, 7)).resolves.toBe(true);
  });

  it('jeton famille : les enfants, jamais un parent ni un profil inexistant', async () => {
    await expect(canActForProfile(family, 7)).resolves.toBe(true);
    await expect(canActForProfile(family, 1)).resolves.toBe(false);
    await expect(canActForProfile(family, 999)).resolves.toBe(false);
  });

  it('jeton profil non admin : uniquement le sien', async () => {
    await expect(canActForProfile(child, 7)).resolves.toBe(true);
    await expect(canActForProfile(child, 8)).resolves.toBe(false);
    await expect(canActForProfile(child, 1)).resolves.toBe(false);
  });

  it('refuse sans utilisateur, avec un identifiant invalide ou si la base échoue', async () => {
    await expect(canActForProfile(undefined, 7)).resolves.toBe(false);
    await expect(canActForProfile(family, 'abc')).resolves.toBe(false);
    sql.mockImplementation(() => Promise.reject(new Error('timeout')));
    await expect(canActForProfile(family, 8)).resolves.toBe(false);
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
