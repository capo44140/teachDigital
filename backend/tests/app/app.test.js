/**
 * Application Express (app.js) avec un routeur API factice :
 * identifiant de requête, gestion centralisée des erreurs, limites de corps,
 * upload multipart (authentification AVANT lecture du corps, 413), santé / readiness.
 */

jest.mock('../../lib/database.js', () => {
  const sql = jest.fn(async () => []);
  return { sql, default: sql, pool: { query: jest.fn() } };
});

jest.mock('../../lib/auth.js', () => {
  const actual = jest.requireActual('../../lib/auth.js');
  return { ...actual, verifyRequestToken: jest.fn() };
});

const http = require('http');
const express = require('express');
const logger = require('../../lib/logger.js');
const { pool } = require('../../lib/database.js');
const { verifyRequestToken } = require('../../lib/auth.js');
const { createApp, parseTrustProxy, isLargeBodyRoute } = require('../../app.js');
const coursePageView = require('../../lib/coursePageView.js');

const ADMIN = { user: { scope: 'profile', profileId: 1, isAdmin: true } };
const CHILD = { user: { scope: 'profile', profileId: 7, isAdmin: false } };
const UPLOAD_LIMITS = { fileSize: 1024, files: 2, fields: 10, fieldSize: 1024, totalBytes: 4096 };

const router = express.Router();
const echo = (req, res) => res.json({ success: true, bytes: JSON.stringify(req.body || {}).length });
router.post('/echo', echo);
router.post('/course-pages', echo);
router.post('/course-pages/preview', echo);
router.put('/profiles/:id', echo);
router.post('/ai/generate-quiz-from-text', echo);
router.post('/ai/extract-text-from-documents', (req, res) => res.json({
  success: true,
  fields: req.body.fields,
  files: req.body.files.map(file => ({ fieldname: file.fieldname, filename: file.filename, size: file.buffer.length }))
}));
router.get('/boom', () => {
  throw new Error('détail interne : password=hunter2 sur db-prod');
});
router.get('/boom-async', (req, res, next) => {
  Promise.reject(Object.assign(new Error('relation "secrets" does not exist'), { code: '42P01' })).catch(next);
});
router.get('/refus', (req, res) => res.status(418).json({ success: false, message: 'Refus', code: 'TEAPOT' }));
router.get('/ip', (req, res) => res.json({ success: true, ip: req.ip }));
router.get('/course-pages/render', (req, res) => coursePageView.sendCoursePageHtml(res, '<p>Cours</p>'));
router.get('/items/:id', (req, res) => res.json({ success: true, id: req.params.id }));

const state = { ready: true, shuttingDown: false };
let server;
let baseUrl;

beforeAll(async () => {
  const app = createApp({ apiRouter: router, state, uploadLimits: UPLOAD_LIMITS });
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

beforeEach(() => {
  verifyRequestToken.mockReset().mockResolvedValue(ADMIN);
  pool.query.mockReset();
  state.shuttingDown = false;
});

const jsonBody = bytes => JSON.stringify({ data: 'a'.repeat(bytes) });
const post = (path, body, headers = {}) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body
});

describe('page de cours isolée', () => {
  it('seule la CSP « sandbox » de la page est envoyée (Helmet n\'en ajoute pas)', async () => {
    const res = await fetch(`${baseUrl}/api/course-pages/render?t=x`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBe(coursePageView.COURSE_PAGE_CSP);
    expect(res.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await res.text()).toMatch(/^<p>Cours<\/p><script>/);
  });
});

describe('identifiant de requête', () => {
  it('génère un X-Request-Id et l\'ajoute aux réponses d\'erreur', async () => {
    const res = await fetch(`${baseUrl}/api/refus`);
    const id = res.headers.get('x-request-id');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await res.json()).toEqual({ success: false, message: 'Refus', code: 'TEAPOT', requestId: id });
  });

  it('reprend un identifiant transmis par le proxy s\'il est sûr, sinon en génère un', async () => {
    const kept = await fetch(`${baseUrl}/health`, { headers: { 'x-request-id': 'nginx-abc123-def' } });
    expect(kept.headers.get('x-request-id')).toBe('nginx-abc123-def');

    const replaced = await fetch(`${baseUrl}/health`, { headers: { 'x-request-id': 'x <script>' } });
    expect(replaced.headers.get('x-request-id')).not.toContain('<');
  });
});

describe('gestion centralisée des erreurs', () => {
  it('erreur synchrone : 500 générique avec requestId, détail uniquement dans les logs', async () => {
    const errorSpy = jest.spyOn(logger, 'error');
    try {
      const res = await fetch(`${baseUrl}/api/boom`);
      const text = await res.text();
      const body = JSON.parse(text);

      expect(res.status).toBe(500);
      expect(body).toEqual({ success: false, message: 'Erreur interne du serveur', code: 'INTERNAL_ERROR', data: null, requestId: res.headers.get('x-request-id') });
      expect(text).not.toMatch(/hunter2|db-prod|détail interne/);
      expect(errorSpy).toHaveBeenCalledWith('Erreur non gérée', expect.objectContaining({ requestId: body.requestId, path: '/api/boom' }));
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('erreur asynchrone transmise à next() : même réponse générique', async () => {
    const res = await fetch(`${baseUrl}/boom-async`);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain('secrets');
    expect(JSON.parse(text)).toMatchObject({ code: 'INTERNAL_ERROR', requestId: expect.any(String) });
  });

  it('erreur client signalée par Express (URI mal encodée) : 400, pas 500', async () => {
    const errorSpy = jest.spyOn(logger, 'error');
    try {
      const res = await fetch(`${baseUrl}/api/items/%E0%A4%A`);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ success: false, code: 'BAD_REQUEST', requestId: expect.any(String) });
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('JSON invalide : 400 BAD_REQUEST', async () => {
    const res = await post('/echo', '{pas du json');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false, code: 'BAD_REQUEST', requestId: expect.any(String) });
  });

  it('route inconnue : 404 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/inexistante`);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ success: false, code: 'NOT_FOUND', requestId: expect.any(String) });
  });
});

describe('limites de taille des corps JSON', () => {
  it('100 ko par défaut', async () => {
    expect((await post('/echo', jsonBody(50 * 1024))).status).toBe(200);
    const res = await post('/api/echo', jsonBody(150 * 1024));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it.each([
    ['POST', '/course-pages'],
    ['POST', '/api/course-pages/preview'],
    ['PUT', '/api/profiles/12'],
    ['POST', '/ai/generate-quiz-from-text']
  ])('10 Mo pour %s %s', async (method, path) => {
    const res = await fetch(`${baseUrl}${path}`, { method, headers: { 'content-type': 'application/json' }, body: jsonBody(3 * 1024 * 1024) });
    expect(res.status).toBe(200);
  });

  it('au-delà de 10 Mo, même une route autorisée répond 413', async () => {
    expect((await post('/course-pages', jsonBody(11 * 1024 * 1024))).status).toBe(413);
  });

  it('isLargeBodyRoute ne concerne que les méthodes et chemins listés', () => {
    expect(isLargeBodyRoute({ method: 'POST', path: '/api/lessons' })).toBe(true);
    expect(isLargeBodyRoute({ method: 'PUT', path: '/lessons/3' })).toBe(true);
    expect(isLargeBodyRoute({ method: 'POST', path: '/course-pages/3/results' })).toBe(false);
    expect(isLargeBodyRoute({ method: 'GET', path: '/course-pages' })).toBe(false);
    expect(isLargeBodyRoute({ method: 'POST', path: '/auth/login' })).toBe(false);
  });
});

describe('upload multipart', () => {
  function multipart(files, fields = {}) {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    files.forEach(([name, size], index) => form.append(`file_${index}`, new Blob([Buffer.alloc(size, 1)], { type: 'image/png' }), name));
    return form;
  }

  it('lit fichiers et champs pour un parent', async () => {
    const res = await fetch(`${baseUrl}/api/ai/extract-text-from-documents`, {
      method: 'POST',
      headers: { authorization: 'Bearer x' },
      body: multipart([['a.png', 100], ['b.png', 200]], { fileCount: '2' })
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      fields: { fileCount: '2' },
      files: [{ fieldname: 'file_0', filename: 'a.png', size: 100 }, { fieldname: 'file_1', filename: 'b.png', size: 200 }]
    });
  });

  it('415 hors des routes IA (sans lire le corps)', async () => {
    const res = await fetch(`${baseUrl}/echo`, { method: 'POST', body: multipart([['a.png', 10]]) });
    expect(res.status).toBe(415);
    expect(verifyRequestToken).not.toHaveBeenCalled();
  });

  it('vérifie le jeton AVANT de lire le corps : 401 alors que l\'envoi n\'est pas terminé', async () => {
    verifyRequestToken.mockResolvedValue({ status: 401, code: 'UNAUTHORIZED', message: 'Token manquant' });

    const { status, body } = await new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}/ai/extract-text-from-documents`, {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=xyz', 'content-length': String(3000) }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      // Seul le début du corps est envoyé : le serveur répond quand même
      req.write('--xyz\r\nContent-Disposition: form-data; name="fileCount"\r\n\r\n1\r\n');
      setTimeout(() => req.destroy(), 2000);
    });

    expect(status).toBe(401);
    expect(JSON.parse(body)).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('403 pour un jeton non parent', async () => {
    verifyRequestToken.mockResolvedValue(CHILD);
    const res = await fetch(`${baseUrl}/ai/extract-text-from-documents`, { method: 'POST', body: multipart([['a.png', 10]]) });
    expect(res.status).toBe(403);
  });

  it('413 si la taille annoncée dépasse la limite totale', async () => {
    const res = await fetch(`${baseUrl}/ai/extract-text-from-documents`, { method: 'POST', body: multipart([['a.png', 900], ['b.png', 900], ['c.png', 900], ['d.png', 900], ['e.png', 900]]) });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it('413 si un fichier dépasse la taille maximale', async () => {
    const res = await fetch(`${baseUrl}/ai/extract-text-from-documents`, { method: 'POST', body: multipart([['gros.png', 2000]]) });
    expect(res.status).toBe(413);
  });

  it('413 si trop de fichiers', async () => {
    const res = await fetch(`${baseUrl}/ai/extract-text-from-documents`, { method: 'POST', body: multipart([['a.png', 10], ['b.png', 10], ['c.png', 10]]) });
    expect(res.status).toBe(413);
  });
});

describe('santé', () => {
  it('/health ne dépend pas de la base', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('/health/ready : 200 si PostgreSQL répond', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const res = await fetch(`${baseUrl}/health/ready`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ready', database: 'ok' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('/health/ready : 503 sans détail si PostgreSQL est injoignable', async () => {
    pool.query.mockRejectedValue(new Error('password authentication failed for user "teachdigital"'));
    const res = await fetch(`${baseUrl}/api/health/ready`);
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(JSON.parse(text)).toMatchObject({ status: 'not_ready', database: 'unavailable' });
    expect(text).not.toContain('password');
  });

  it('/health/ready : 503 pendant l\'arrêt, et les connexions keep-alive sont fermées', async () => {
    state.shuttingDown = true;
    const res = await fetch(`${baseUrl}/health/ready`);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'shutting_down' });
    expect(res.headers.get('connection')).toBe('close');
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('TRUST_PROXY', () => {
  it('interprète nombre, booléen et liste', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('loopback, 172.16.0.0/12')).toBe('loopback, 172.16.0.0/12');
    expect(parseTrustProxy(undefined)).toBe('loopback');
  });

  it('X-Forwarded-For n\'est cru que depuis un proxy de confiance (défaut : loopback seulement)', async () => {
    const res = await fetch(`${baseUrl}/ip`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
    // 127.0.0.1 est « loopback » (proxy Vite en développement) : la valeur est reprise.
    // Un client du réseau local (192.168.x.x) n'est plus de confiance par défaut.
    expect((await res.json()).ip).toBe('203.0.113.9');

    const previous = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = 'false';
    try {
      const app = createApp({ apiRouter: router, state });
      const other = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      try {
        const direct = await fetch(`http://127.0.0.1:${other.address().port}/ip`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
        expect((await direct.json()).ip).toMatch(/127\.0\.0\.1/);
      } finally {
        await new Promise(resolve => other.close(resolve));
      }
    } finally {
      if (previous === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = previous;
    }
  });
});
