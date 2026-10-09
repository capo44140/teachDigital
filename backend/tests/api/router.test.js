/**
 * Matrice d'accès du routeur (api/index.js) : passe par Express, comme en production.
 * La base est mockée ; les contrôleurs reçoivent des résultats vides.
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn((strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    // Vérification admin de requireAdmin : seul le profil 1 est un parent actif
    if (text.includes('SELECT is_admin, is_active FROM profiles')) {
      return Promise.resolve(values[0] === 1 ? [{ is_admin: true, is_active: true }] : [{ is_admin: false, is_active: true }]);
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

const express = require('express');
const router = require('../../api/index.js');
const { generateToken, generateFamilyToken } = require('../../lib/auth.js');

let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
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
  const headers = { 'content-type': 'application/json' };
  const factory = tokens[tokenKind];
  const token = factory ? factory() : null;
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return response.status;
}

describe('Routes publiques', () => {
  it.each([
    ['POST', '/auth/login', { profileId: 1, pin: 'abcd' }],
    ['POST', '/auth/family-gate', { pin: 'x' }],
    ['POST', '/auth/logout', {}],
    ['POST', '/audit/logs', {}]
  ])('%s %s ne demande pas de jeton', async (method, path, body) => {
    expect(await call(method, path, 'none', body)).not.toBe(401);
  });
});

describe('Sans jeton : 401', () => {
  it.each([
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
    ['GET', '/route-inconnue']
  ])('%s %s', async (method, path) => {
    expect(await call(method, path, 'none', method === 'GET' ? undefined : {})).toBe(401);
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
    ['POST', '/youtube-videos'],
    ['POST', '/badges'],
    ['PUT', '/badges/1'],
    ['DELETE', '/badges/1'],
    ['POST', '/badges/check-unlock'],
    ['GET', '/ai/providers'],
    ['POST', '/ai/local-llm/model'],
    ['GET', '/audit/logs'],
    ['GET', '/audit/stats']
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

describe('Accès autorisés', () => {
  it.each([
    ['GET', '/profiles'],
    ['GET', '/lessons'],
    ['GET', '/badges'],
    ['GET', '/course-pages?targetProfileId=7'],
    ['GET', '/notifications?profileId=7'],
    ['GET', '/activities'],
    ['GET', '/youtube-videos']
  ])('famille : %s %s', async (method, path) => {
    const status = await call(method, path, 'family');
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  it.each([
    ['GET', '/ai/providers'],
    ['GET', '/profiles/stats'],
    ['GET', '/audit/stats']
  ])('parent : %s %s', async (method, path) => {
    const status = await call(method, path, 'admin');
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });
});

describe('Entrées hostiles', () => {
  it('rejette un profileId objet (tentative d\'injection SQL) sur les résultats de quiz', async () => {
    const body = {
      profileId: { text: 'CAST((SELECT pin_code FROM pin_codes LIMIT 1) AS int)', params: [] },
      score: 1,
      totalQuestions: 1
    };
    expect(await call('POST', '/lessons/1/quiz-results', 'family', body)).toBe(400);
  });

  it('un enfant ne peut pas lire les résultats d\'un autre enfant', async () => {
    expect(await call('GET', '/lessons/1/quiz-results?profileId=8', 'child')).toBe(403);
  });
});
