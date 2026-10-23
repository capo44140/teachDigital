/**
 * Matrice d'accès du routeur (api/index.js) : passe par Express, comme en production.
 * La base est mockée ; les contrôleurs reçoivent des résultats vides.
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn((strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    // Vérification des jetons : seul le profil 1 est un parent actif, les autres sont des enfants
    if (text.includes('SELECT is_admin, is_active, token_version FROM profiles')) {
      return Promise.resolve([{ is_admin: values[0] === 1, is_active: true, token_version: 0 }]);
    }
    if (text.includes('SELECT token_version FROM family_gate')) {
      return Promise.resolve([{ token_version: 0 }]);
    }
    return Promise.resolve([]);
  });
  return { default: sql, sql, pool: { query: jest.fn(async () => ({ rows: [] })) } };
});
jest.mock('../../lib/nativeHash.js', () => ({
  NativeHashService: { verifyPin: jest.fn(async () => false), needsRehash: () => false, hashPin: jest.fn() }
}));
// Le module IA charge l'OCR et les providers : remplacé par un handler neutre
jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));

const { generateToken, generateFamilyToken } = require('../../lib/auth.js');
const { startApp } = require('./support/app.js');

let app;

beforeAll(async () => {
  app = await startApp();
});

afterAll(async () => {
  await app.close();
});

const tokens = {
  none: null,
  family: () => generateFamilyToken().token,
  child: () => generateToken({ profileId: 7, isAdmin: false }),
  admin: () => generateToken({ profileId: 1, isAdmin: true }),
  // Jeton encore marqué admin mais profil rétrogradé en base
  demotedAdmin: () => generateToken({ profileId: 2, isAdmin: true })
};

async function call(method, path, tokenKind, body) {
  const factory = tokens[tokenKind];
  const { status } = await app.call(method, path, { token: factory ? factory() : null, body });
  return status;
}

describe('Routes publiques', () => {
  it.each([
    ['POST', '/auth/family-gate', { pin: 'x' }],
    ['POST', '/auth/logout', {}]
  ])('%s %s ne demande pas de jeton', async (method, path, body) => {
    expect(await call(method, path, 'none', body)).not.toBe(401);
  });

  it('GET /auth/verify répond lui-même (401 sans jeton, 200 avec)', async () => {
    expect(await call('GET', '/auth/verify', 'none')).toBe(401);
    expect(await call('GET', '/auth/verify', 'family')).toBe(200);
  });
});

describe('Sans jeton : 401', () => {
  it.each([
    ['POST', '/auth/login'],
    ['POST', '/audit/logs'],
    ['GET', '/profiles'],
    ['GET', '/lessons'],
    ['GET', '/lessons/1/quiz-results?profileId=7'],
    ['POST', '/lessons/1/quiz-results'],
    ['POST', '/course-pages/1/results'],
    ['GET', '/notifications?profileId=7'],
    ['GET', '/badges'],
    ['POST', '/badges/check-unlock'],
    ['GET', '/ai/providers'],
    ['GET', '/audit/logs'],
    ['GET', '/activities'],
    ['POST', '/activities'],
    ['GET', '/activities/1'],
    ['PUT', '/activities/1'],
    ['DELETE', '/activities/1'],
    ['GET', '/youtube-videos/1'],
    ['PUT', '/youtube-videos/1'],
    ['DELETE', '/youtube-videos/1'],
    ['POST', '/notifications/mark-all-read'],
    ['POST', '/notifications'],
    ['PUT', '/notifications/1'],
    ['DELETE', '/notifications/1'],
    ['POST', '/profiles'],
    ['PUT', '/profiles/1'],
    ['POST', '/profiles/requests'],
    ['POST', '/lessons'],
    ['PUT', '/lessons/1'],
    ['DELETE', '/lessons/1'],
    ['POST', '/course-pages'],
    ['GET', '/route-inconnue']
  ])('%s %s', async (method, path) => {
    expect(await call(method, path, 'none', method === 'GET' ? undefined : {})).toBe(401);
  });

  it('la connexion à un profil passe avec un jeton famille', async () => {
    // PIN incorrect (mock) : 401 du contrôleur, après le contrôle du jeton
    const { status, body } = await app.call('POST', '/auth/login', { token: tokens.family(), body: { profileId: 7, pin: '4826' } });
    expect(status).toBe(401);
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Jeton famille ou enfant sur une action parent : 403', () => {
  const adminRoutes = [
    ['POST', '/profiles'],
    ['PUT', '/profiles/2'],
    ['DELETE', '/profiles/2'],
    ['GET', '/profiles/stats'],
    ['GET', '/profiles/2/pin'],
    ['PUT', '/profiles/2/pin'],
    ['PUT', '/auth/family-gate'],
    ['POST', '/lessons'],
    ['PUT', '/lessons/1'],
    ['DELETE', '/lessons/1'],
    ['GET', '/lessons/stats/global'],
    ['POST', '/course-pages'],
    ['PUT', '/course-pages/1'],
    ['DELETE', '/course-pages/1'],
    ['POST', '/notifications'],
    ['POST', '/activities'],
    ['PUT', '/activities/1'],
    ['DELETE', '/activities/1'],
    ['POST', '/youtube-videos'],
    ['PUT', '/youtube-videos/1'],
    ['DELETE', '/youtube-videos/1'],
    ['POST', '/badges'],
    ['PUT', '/badges/1'],
    ['DELETE', '/badges/1'],
    ['POST', '/badges/check-unlock'],
    ['GET', '/ai/providers'],
    ['POST', '/ai/local-llm/model'],
    ['GET', '/audit/logs'],
    ['GET', '/audit/stats'],
    ['POST', '/audit/export']
  ];

  it.each(adminRoutes)('famille : %s %s', async (method, path) => {
    expect(await call(method, path, 'family', method === 'GET' ? undefined : {})).toBe(403);
  });

  it.each(adminRoutes)('enfant : %s %s', async (method, path) => {
    expect(await call(method, path, 'child', method === 'GET' ? undefined : {})).toBe(403);
  });

  it('parent rétrogradé en base : 403 malgré isAdmin dans le jeton', async () => {
    expect(await call('GET', '/ai/providers', 'demotedAdmin')).toBe(403);
  });
});

describe('Données d\'un parent : interdites au jeton famille et aux enfants', () => {
  it.each([
    ['GET', '/notifications?profileId=1'],
    ['GET', '/badges/profile/1'],
    ['GET', '/badges/profile/1/stats'],
    ['GET', '/profiles/1/stats'],
    ['GET', '/profiles/1/progress-summary'],
    ['GET', '/lessons?targetProfileId=1'],
    ['GET', '/course-pages?targetProfileId=1'],
    ['GET', '/activities?child_id=1'],
    ['GET', '/lessons/1/quiz-results?profileId=1']
  ])('%s %s', async (method, path) => {
    expect(await call(method, path, 'family')).toBe(403);
    expect(await call(method, path, 'child')).toBe(403);
  });

  it('marquer comme lues les notifications d\'un parent', async () => {
    expect(await call('POST', '/notifications/mark-all-read', 'family', { profileId: 1 })).toBe(403);
  });
});

describe('Accès autorisés', () => {
  it.each([
    ['GET', '/profiles'],
    ['GET', '/lessons'],
    ['GET', '/badges'],
    ['GET', '/badges/profile/7'],
    ['GET', '/course-pages?targetProfileId=7'],
    ['GET', '/notifications?profileId=7'],
    ['GET', '/activities'],
    ['GET', '/activities/1'],
    ['GET', '/youtube-videos'],
    ['GET', '/youtube-videos/1']
  ])('famille : %s %s', async (method, path) => {
    const status = await call(method, path, 'family');
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  it('famille : marque toutes les notifications d\'un enfant comme lues', async () => {
    const status = await call('POST', '/notifications/mark-all-read', 'family', { profileId: 7 });
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  // Chaque ligne a 3 valeurs : sinon Jest prend le 3e paramètre pour un callback done()
  it.each([
    ['GET', '/ai/providers', undefined],
    ['GET', '/profiles/stats', undefined],
    ['GET', '/audit/stats', undefined],
    ['GET', '/notifications?profileId=7', undefined],
    ['PUT', '/activities/1', { status: 'completed' }],
    ['DELETE', '/activities/1', undefined],
    ['PUT', '/youtube-videos/1', { title: 'Nouvelle' }],
    ['DELETE', '/youtube-videos/1', undefined]
  ])('parent : %s %s', async (method, path, body) => {
    const status = await call(method, path, 'admin', body);
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });
});

describe('Entrées hostiles', () => {
  it('rejette un profileId objet (tentative d\'injection SQL) sur les résultats de quiz', async () => {
    const body = {
      profileId: { text: 'CAST((SELECT pin_code FROM pin_codes LIMIT 1) AS int)', params: [] },
      answers: [0]
    };
    expect(await call('POST', '/lessons/1/quiz-results', 'family', body)).toBe(400);
  });

  it('un enfant ne peut pas lire les résultats d\'un autre enfant', async () => {
    expect(await call('GET', '/lessons/1/quiz-results?profileId=8', 'child')).toBe(403);
  });
});
