/**
 * Tests unitaires de la configuration CORS.
 *
 * Objectif : plus aucune origine inconnue acceptée (l'ancien code renvoyait « * »),
 * et localhost uniquement hors production.
 */

const http = require('http');
const express = require('express');

const { corsOptions, corsMiddleware, getAllowedOrigins, isProduction } = require('../../lib/cors.js');

const ENV_KEYS = ['NODE_ENV', 'DOCKER_ENV', 'FRONTEND_URL', 'ALLOWED_ORIGIN'];

function snapshotEnv() {
  const snapshot = {};
  for (const key of ENV_KEYS) snapshot[key] = process.env[key];
  return snapshot;
}

function restoreEnv(snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

// Résout la valeur passée au callback du package cors :
// chaîne = origine reflétée, false = aucun en-tête CORS, true = requête sans Origin
function resolveOrigin(origin) {
  return new Promise((resolve, reject) => {
    corsOptions.origin(origin, (error, value) => {
      if (error) return reject(error);
      return resolve(value);
    });
  });
}

describe('CORS - liste blanche', () => {
  let env;

  beforeEach(() => {
    env = snapshotEnv();
    delete process.env.DOCKER_ENV;
    delete process.env.FRONTEND_URL;
    delete process.env.ALLOWED_ORIGIN;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => restoreEnv(env));

  it('autorise une requête sans en-tête Origin (curl, healthcheck)', async () => {
    await expect(resolveOrigin(undefined)).resolves.toBe(true);
  });

  it('autorise localhost en développement', async () => {
    await expect(resolveOrigin('http://localhost:3000')).resolves.toBe('http://localhost:3000');
    await expect(resolveOrigin('http://localhost:5173')).resolves.toBe('http://localhost:5173');
    await expect(resolveOrigin('http://127.0.0.1:3000')).resolves.toBe('http://127.0.0.1:3000');
  });

  it('refuse localhost en production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(resolveOrigin('http://localhost:3000')).resolves.toBe(false);
    await expect(resolveOrigin('http://localhost:9999')).resolves.toBe(false);
  });

  it('refuse une origine inconnue sans renvoyer « * »', async () => {
    await expect(resolveOrigin('https://evil.example')).resolves.toBe(false);
    await expect(resolveOrigin('https://teach-digital.vercel.app')).resolves.toBe(false);
  });

  it('refuse l\'origine opaque « null » (iframe sandboxée, file://)', async () => {
    await expect(resolveOrigin('null')).resolves.toBe(false);
  });

  it('autorise FRONTEND_URL, y compris avec un slash final', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://app.example.com/';

    await expect(resolveOrigin('https://app.example.com')).resolves.toBe('https://app.example.com');
    expect(getAllowedOrigins()).toContain('https://app.example.com');
  });

  it('autorise plusieurs origines via ALLOWED_ORIGIN (séparées par des virgules)', async () => {
    process.env.ALLOWED_ORIGIN = 'https://a.example.com, https://b.example.com/';

    await expect(resolveOrigin('https://a.example.com')).resolves.toBe('https://a.example.com');
    await expect(resolveOrigin('https://b.example.com')).resolves.toBe('https://b.example.com');
    await expect(resolveOrigin('https://c.example.com')).resolves.toBe(false);
  });

  it('ignore les valeurs d\'origine non parsables (ex. « * »)', async () => {
    process.env.ALLOWED_ORIGIN = '*';
    process.env.FRONTEND_URL = 'pas-une-url';

    const origins = getAllowedOrigins();
    expect(origins).not.toContain('*');
    expect(origins).not.toContain('pas-une-url');
    await expect(resolveOrigin('https://n-importe-quoi.example')).resolves.toBe(false);
  });

  it('détecte la production via NODE_ENV ou DOCKER_ENV', () => {
    expect(isProduction()).toBe(false);

    process.env.DOCKER_ENV = 'true';
    expect(isProduction()).toBe(true);

    delete process.env.DOCKER_ENV;
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });
});

describe('CORS - application Express', () => {
  let env;
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();
    app.use(corsMiddleware);
    app.get('/ping', (req, res) => res.json({ success: true }));

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/ping`;
  });

  beforeEach(() => {
    env = snapshotEnv();
    delete process.env.DOCKER_ENV;
    delete process.env.FRONTEND_URL;
    delete process.env.ALLOWED_ORIGIN;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => restoreEnv(env));

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  function getHeaders(origin) {
    return new Promise((resolve, reject) => {
      const request = http.get(baseUrl, { headers: origin ? { Origin: origin } : {} }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.headers));
      });
      request.on('error', reject);
    });
  }

  it('reflète une origine autorisée', async () => {
    const headers = await getHeaders('http://localhost:3000');
    expect(headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  it('ne pose aucun en-tête CORS pour une origine inconnue', async () => {
    process.env.NODE_ENV = 'production';
    const headers = await getHeaders('https://evil.example');
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });
});
