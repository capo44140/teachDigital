/**
 * Application Express de test : le vrai routeur (api/index.js) monté sur /api,
 * comme en production. Chaque fichier de test doit mocker le module IA :
 *   jest.mock('../../api/ai/index.js', () => (req, res) => res.status(200).json({ success: true }));
 *
 * « trust proxy » est activé : l'en-tête X-Forwarded-For simule l'IP du client
 * (tests du verrouillage par IP).
 */
const express = require('express');

async function startApp() {
  const router = require('../../../api/index.js');
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', router);
  app.use((req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND' }));

  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  /**
   * call('GET', '/lessons', { token, body, ip }) -> { status, body }
   */
  async function call(method, path, { token, body, ip } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (ip) headers['x-forwarded-for'] = ip;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_error) {
      json = text;
    }
    return { status: response.status, body: json };
  }

  return {
    baseUrl,
    call,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

module.exports = { startApp };
