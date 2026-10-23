/**
 * Tests de la configuration OpenRouter enregistrée depuis l'interface
 * (clé chiffrée dans ai_settings, priorité interface > .env) et des routes associées
 */

// Table ai_settings simulée en mémoire
const mockRows = new Map();
jest.mock('../../lib/database.js', () => ({
  pool: {
    query: jest.fn(async (sql, params) => {
      if (sql.includes('INSERT INTO ai_settings')) {
        mockRows.set(params[0], params[1]);
        return { rows: [] };
      }
      if (sql.includes('DELETE FROM ai_settings')) {
        mockRows.delete(params[0]);
        return { rows: [] };
      }
      if (sql.includes('SELECT key, value FROM ai_settings')) {
        return { rows: params[0].filter(key => mockRows.has(key)).map(key => ({ key, value: mockRows.get(key) })) };
      }
      throw new Error(`Requête inattendue: ${sql}`);
    })
  }
}));

jest.mock('../../api/ai/utils/fetch.js', () => ({
  fetchWithTimeout: jest.fn()
}));

const { fetchWithTimeout } = require('../../api/ai/utils/fetch.js');
const openRouterConfig = require('../../api/ai/services/aiProviders/openRouterConfig.js');
const OpenRouterProvider = require('../../api/ai/services/aiProviders/openrouter.js');
const handleAI = require('../../api/ai/index.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const VALID_KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef';

function mockReq(method, url, body = {}) {
  return createMockRequest(method, url, body);
}

const mockRes = createMockResponse;

describe('openRouterConfig', () => {
  beforeEach(async () => {
    mockRows.clear();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    await openRouterConfig.load();
    fetchWithTimeout.mockReset();
  });

  it('utilise la clé du .env tant qu\'aucune clé n\'est enregistrée', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-env-key-0123456789abcdef';
    expect(openRouterConfig.getApiKey()).toBe('sk-or-env-key-0123456789abcdef');
    expect(openRouterConfig.getApiKeySource()).toBe('env');
  });

  it('chiffre la clé en base et la relit après redémarrage', async () => {
    await openRouterConfig.setApiKey(VALID_KEY);

    const stored = mockRows.get('openrouter_api_key');
    expect(stored).toMatch(/^v1:/);
    expect(stored).not.toContain(VALID_KEY);

    await openRouterConfig.load();
    expect(openRouterConfig.getApiKey()).toBe(VALID_KEY);
    expect(openRouterConfig.getApiKeySource()).toBe('ui');
    expect(openRouterConfig.getMaskedApiKey()).toBe('sk-or-v1-…cdef');
  });

  it('ignore une clé chiffrée avec un autre JWT_SECRET', async () => {
    await openRouterConfig.setApiKey(VALID_KEY);
    const secret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'un-autre-secret-de-plus-de-32-caracteres-xx';
    try {
      await openRouterConfig.load();
      expect(openRouterConfig.getApiKey()).toBe('');
    } finally {
      process.env.JWT_SECRET = secret;
    }
  });

  it('le provider n\'est disponible qu\'avec une clé valide et utilise le modèle choisi', async () => {
    expect(new OpenRouterProvider().isAvailable()).toBe(false);

    await openRouterConfig.setApiKey(VALID_KEY);
    await openRouterConfig.setModel('anthropic/claude-sonnet-4.5');
    const provider = new OpenRouterProvider();
    expect(provider.isAvailable()).toBe(true);
    expect(provider.model).toBe('anthropic/claude-sonnet-4.5');

    await openRouterConfig.setModel(null);
    expect(new OpenRouterProvider().model).toBe(openRouterConfig.getDefaultModel());
  });

  describe('routes', () => {
    it('GET /openrouter/config ne renvoie jamais la clé en clair', async () => {
      await openRouterConfig.setApiKey(VALID_KEY);
      const res = mockRes();
      await handleAI(mockReq('GET', '/openrouter/config'), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ keyConfigured: true, keySource: 'ui', maskedKey: 'sk-or-v1-…cdef' });
      expect(JSON.stringify(res.body)).not.toContain(VALID_KEY);
    });

    it('POST /openrouter/config refuse une clé mal formée sans appeler OpenRouter', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/openrouter/config', { apiKey: 'sk-proj-pas-openrouter-123456' }), res);

      expect(res.statusCode).toBe(400);
      expect(fetchWithTimeout).not.toHaveBeenCalled();
    });

    it('POST /openrouter/config refuse une clé rejetée par OpenRouter', async () => {
      fetchWithTimeout.mockResolvedValue({ ok: false, status: 401 });
      const res = mockRes();
      await handleAI(mockReq('POST', '/openrouter/config', { apiKey: VALID_KEY }), res);

      expect(res.statusCode).toBe(400);
      expect(mockRows.has('openrouter_api_key')).toBe(false);
    });

    it('POST /openrouter/config enregistre une clé vérifiée et le modèle', async () => {
      fetchWithTimeout.mockResolvedValue({ ok: true, status: 200 });
      const res = mockRes();
      await handleAI(mockReq('POST', '/openrouter/config', { apiKey: ` ${VALID_KEY} `, model: 'openai/gpt-4o' }), res);

      expect(res.statusCode).toBe(200);
      expect(fetchWithTimeout).toHaveBeenCalledWith('https://openrouter.ai/api/v1/key', expect.objectContaining({
        headers: { Authorization: `Bearer ${VALID_KEY}` }
      }), 10000);
      expect(res.body.data).toMatchObject({ keySource: 'ui', model: 'openai/gpt-4o', modelSource: 'ui' });
      expect(openRouterConfig.getApiKey()).toBe(VALID_KEY);
    });

    it('POST /openrouter/config refuse un modèle mal formé', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/openrouter/config', { model: 'gpt 4o; DROP' }), res);

      expect(res.statusCode).toBe(400);
    });

    it('DELETE /openrouter/key revient à la clé du .env', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-env-key-0123456789abcdef';
      await openRouterConfig.setApiKey(VALID_KEY);
      const res = mockRes();
      await handleAI(mockReq('DELETE', '/openrouter/key'), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.keySource).toBe('env');
      expect(mockRows.has('openrouter_api_key')).toBe(false);
    });
  });
});
