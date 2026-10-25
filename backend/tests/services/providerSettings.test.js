/**
 * Tests des paramètres des providers IA enregistrés depuis l'interface
 * (clé chiffrée et modèle dans ai_settings, priorité interface > .env > défaut),
 * de l'URL LM Studio et des routes associées
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
const providerSettings = require('../../api/ai/services/aiProviders/providerSettings.js');
const localLLMConfig = require('../../api/ai/services/aiProviders/localLLMConfig.js');
const { getProviderByName, getAvailableProviders } = require('../../api/ai/services/aiProviders/index.js');
const { validateApiKey } = require('../../api/ai/utils/validation.js');
const handleAI = require('../../api/ai/index.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const VALID_KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef';

// Une clé acceptée par le validateur de chaque provider, volontairement factice
// (une forme proche des vraies clés déclenche la protection anti-secrets de GitHub)
const VALID_KEYS = {
  OpenAI: 'sk-test-openai-not-a-real-key',
  Gemini: 'AIza-test-gemini-not-a-real-key',
  DeepSeek: 'sk-test-deepseek-not-a-real-key',
  Groq: 'gsk_test_groq_not_a_real_key',
  Mistral: 'test-mistral-not-a-real-key',
  Kimi: 'sk-test-kimi-not-a-real-key',
  OpenRouter: VALID_KEY
};

const ENV_VARS = ['OPENAI', 'GEMINI', 'DEEPSEEK', 'GROQ', 'MISTRAL', 'KIMI', 'OPENROUTER']
  .flatMap(prefix => [`${prefix}_API_KEY`, `${prefix}_MODEL`])
  .concat(['LOCAL_LLM_URL', 'LOCAL_LLM_MODEL', 'AI_CHILD_DATA_PROVIDERS', 'AI_PROVIDER']);

const mockReq = (method, url, body = {}) => createMockRequest(method, url, body);
const mockRes = createMockResponse;

describe('providerSettings', () => {
  beforeEach(async () => {
    mockRows.clear();
    ENV_VARS.forEach(name => delete process.env[name]);
    await providerSettings.load();
    await localLLMConfig.load();
    fetchWithTimeout.mockReset();
  });

  it('utilise la clé du .env tant qu\'aucune clé n\'est enregistrée', () => {
    process.env.OPENAI_API_KEY = VALID_KEYS.OpenAI;
    expect(providerSettings.getApiKey('OpenAI')).toBe(VALID_KEYS.OpenAI);
    expect(providerSettings.getApiKeySource('OpenAI')).toBe('env');
    expect(providerSettings.getApiKeySource('Gemini')).toBeNull();
  });

  it('chiffre la clé en base (clé "<provider>_api_key") et la relit après redémarrage', async () => {
    await providerSettings.setApiKey('OpenRouter', VALID_KEY);

    const stored = mockRows.get('openrouter_api_key');
    expect(stored).toMatch(/^v1:/);
    expect(stored).not.toContain(VALID_KEY);

    await providerSettings.load();
    expect(providerSettings.getApiKey('OpenRouter')).toBe(VALID_KEY);
    expect(providerSettings.getPublicConfig('OpenRouter')).toMatchObject({
      keyConfigured: true,
      keySource: 'ui',
      maskedKey: 'sk-or-v1-…cdef'
    });
  });

  it('ignore une clé chiffrée avec un autre JWT_SECRET', async () => {
    await providerSettings.setApiKey('Gemini', VALID_KEYS.Gemini);
    const secret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'un-autre-secret-de-plus-de-32-caracteres-xx';
    try {
      await providerSettings.load();
      expect(providerSettings.getApiKey('Gemini')).toBe('');
    } finally {
      process.env.JWT_SECRET = secret;
    }
  });

  it.each(Object.keys(VALID_KEYS))('le provider %s utilise la clé et le modèle enregistrés', async (name) => {
    expect(getProviderByName(name).isAvailable()).toBeFalsy();

    await providerSettings.setApiKey(name, VALID_KEYS[name]);
    await providerSettings.setModel(name, name === 'OpenRouter' ? 'anthropic/claude-sonnet-4.5' : 'modele-choisi');
    const provider = getProviderByName(name);
    expect(provider.isAvailable()).toBe(true);
    expect(provider.apiKey).toBe(VALID_KEYS[name]);
    expect(provider.model).toBe(name === 'OpenRouter' ? 'anthropic/claude-sonnet-4.5' : 'modele-choisi');
    expect(await validateApiKey(name.toLowerCase())).toBe(true);

    await providerSettings.setModel(name, null);
    expect(getProviderByName(name).model).toBe(providerSettings.getDefaultModel(name));
  });

  it('modèle : interface > variable <PROVIDER>_MODEL > défaut', async () => {
    expect(providerSettings.getModel('Groq')).toBe('llama-3.3-70b-versatile');
    process.env.GROQ_MODEL = 'llama-3.1-8b-instant';
    expect(providerSettings.getModel('Groq')).toBe('llama-3.1-8b-instant');
    expect(providerSettings.getModelSource('Groq')).toBe('env');

    await providerSettings.setModel('Groq', 'openai/gpt-oss-120b');
    expect(mockRows.get('groq_model')).toBe('openai/gpt-oss-120b');
    expect(providerSettings.getModel('Groq')).toBe('openai/gpt-oss-120b');
    expect(providerSettings.getModelSource('Groq')).toBe('ui');
  });

  it('valide le format du modèle selon le provider', () => {
    expect(providerSettings.isValidModel('OpenAI', 'ft:gpt-4o-mini:org::abc123')).toBe(true);
    expect(providerSettings.isValidModel('Groq', 'meta-llama/llama-4-scout-17b-16e-instruct')).toBe(true);
    expect(providerSettings.isValidModel('OpenAI', '../../x')).toBe(false);
    expect(providerSettings.isValidModel('OpenAI', 'gpt 4o')).toBe(false);
    // Gemini : identifiant inséré dans l'URL, sans "/"
    expect(providerSettings.isValidModel('Gemini', 'gemini-2.5-flash')).toBe(true);
    expect(providerSettings.isValidModel('Gemini', 'models/gemini-2.5-flash')).toBe(false);
    // OpenRouter : fournisseur/modele obligatoire
    expect(providerSettings.isValidModel('OpenRouter', 'openai/gpt-4o:free')).toBe(true);
    expect(providerSettings.isValidModel('OpenRouter', 'gpt-4o')).toBe(false);
  });

  it('extrait les modèles des réponses OpenAI et Gemini', () => {
    expect(providerSettings.parseModels('OpenAI', { data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1' }, { id: 'gpt-4o' }] }))
      .toEqual(['gpt-4.1', 'gpt-4o']);
    expect(providerSettings.parseModels('Gemini', {
      models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
        { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }
      ]
    })).toEqual(['gemini-2.5-flash']);
  });

  it('accepte une clé Mistral sans préfixe', () => {
    expect(providerSettings.isValidKeyFormat('Mistral', VALID_KEYS.Mistral)).toBe(true);
  });

  describe('données des enfants (RGPD)', () => {
    const availableNames = () => getAvailableProviders().map(provider => provider.getName());

    it('n\'autorise par défaut que les providers hébergés dans l\'UE', () => {
      expect(providerSettings.NAMES.filter(name => providerSettings.isChildDataAllowed(name))).toEqual(['Mistral']);
      expect(providerSettings.getPublicConfig('Kimi')).toMatchObject({
        dataRegion: 'Chine',
        childDataAllowed: false,
        childDataSource: 'default'
      });
    });

    it('exclut de la cascade un provider configuré mais non autorisé', () => {
      process.env.OPENAI_API_KEY = VALID_KEYS.OpenAI;
      process.env.MISTRAL_API_KEY = VALID_KEYS.Mistral;
      expect(availableNames()).toEqual(['Mistral']);
    });

    it('AI_CHILD_DATA_PROVIDERS remplace la liste par défaut (noms insensibles à la casse)', () => {
      process.env.AI_CHILD_DATA_PROVIDERS = 'openai, Gemini, inconnu';
      expect(providerSettings.isChildDataAllowed('OpenAI')).toBe(true);
      expect(providerSettings.isChildDataAllowed('Gemini')).toBe(true);
      expect(providerSettings.isChildDataAllowed('Mistral')).toBe(false);
      expect(providerSettings.getChildDataSource('OpenAI')).toBe('env');
    });

    it('le choix de l\'interface prime sur le .env et survit au rechargement', async () => {
      process.env.AI_CHILD_DATA_PROVIDERS = 'OpenAI';
      await providerSettings.setChildDataAllowed('OpenAI', false);
      await providerSettings.setChildDataAllowed('Kimi', true);
      expect(mockRows.get('openai_child_data')).toBe('deny');

      await providerSettings.load();

      expect(providerSettings.isChildDataAllowed('OpenAI')).toBe(false);
      expect(providerSettings.isChildDataAllowed('Kimi')).toBe(true);
      expect(providerSettings.getChildDataSource('Kimi')).toBe('ui');
    });

    it('POST /providers/:name/config enregistre l\'autorisation sans vérifier de clé', async () => {
      process.env.OPENAI_API_KEY = VALID_KEYS.OpenAI;
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenAI/config', { childDataAllowed: true }), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ childDataAllowed: true, childDataSource: 'ui' });
      expect(fetchWithTimeout).not.toHaveBeenCalled();
      expect(availableNames()).toContain('OpenAI');
    });

    it('refuse une autorisation qui n\'est pas un booléen', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenAI/config', { childDataAllowed: 'oui' }), res);

      expect(res.statusCode).toBe(400);
      expect(mockRows.has('openai_child_data')).toBe(false);
    });
  });

  describe('routes providers', () => {
    it('GET /providers/config liste chaque provider sans jamais renvoyer de clé en clair', async () => {
      await providerSettings.setApiKey('OpenRouter', VALID_KEY);
      const res = mockRes();
      await handleAI(mockReq('GET', '/providers/config'), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.providers.map(provider => provider.name))
        .toEqual(['OpenAI', 'Gemini', 'DeepSeek', 'Groq', 'Mistral', 'Kimi', 'OpenRouter']);
      expect(res.body.data.providers.find(provider => provider.name === 'OpenRouter'))
        .toMatchObject({ keyConfigured: true, keySource: 'ui', maskedKey: 'sk-or-v1-…cdef' });
      expect(JSON.stringify(res.body)).not.toContain(VALID_KEY);
    });

    it('refuse une clé mal formée sans appeler le provider (nom insensible à la casse)', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/openrouter/config', { apiKey: 'sk-proj-pas-openrouter-123456' }), res);

      expect(res.statusCode).toBe(400);
      expect(fetchWithTimeout).not.toHaveBeenCalled();
    });

    it('refuse une clé rejetée par le provider', async () => {
      fetchWithTimeout.mockResolvedValue({ ok: false, status: 401 });
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenRouter/config', { apiKey: VALID_KEY }), res);

      expect(res.statusCode).toBe(400);
      expect(mockRows.has('openrouter_api_key')).toBe(false);
    });

    it('vérifie une clé OpenRouter sur /key puis l\'enregistre avec le modèle', async () => {
      fetchWithTimeout.mockResolvedValue({ ok: true, status: 200 });
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenRouter/config', { apiKey: ` ${VALID_KEY} `, model: 'openai/gpt-4o' }), res);

      expect(res.statusCode).toBe(200);
      expect(fetchWithTimeout).toHaveBeenCalledWith('https://openrouter.ai/api/v1/key', expect.objectContaining({
        headers: { Authorization: `Bearer ${VALID_KEY}` }
      }), 10000);
      expect(res.body.data).toMatchObject({ keySource: 'ui', model: 'openai/gpt-4o', modelSource: 'ui' });
      expect(providerSettings.getApiKey('OpenRouter')).toBe(VALID_KEY);
    });

    it('vérifie une clé Gemini avec l\'en-tête x-goog-api-key (clé hors de l\'URL)', async () => {
      fetchWithTimeout.mockResolvedValue({ ok: true, status: 200 });
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/Gemini/config', { apiKey: VALID_KEYS.Gemini }), res);

      expect(res.statusCode).toBe(200);
      const [url, options] = fetchWithTimeout.mock.calls[0];
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000');
      expect(url).not.toContain(VALID_KEYS.Gemini);
      expect(options.headers).toEqual({ 'x-goog-api-key': VALID_KEYS.Gemini });
    });

    it('traite le 400 de Gemini comme une clé refusée', async () => {
      fetchWithTimeout.mockResolvedValue({ ok: false, status: 400 });
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/Gemini/config', { apiKey: VALID_KEYS.Gemini }), res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Clé refusée par Google Gemini');
    });

    it('enregistre un modèle seul, puis revient au défaut avec un modèle vide', async () => {
      let res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenAI/config', { model: 'gpt-4.1-mini' }), res);
      expect(res.statusCode).toBe(200);
      expect(providerSettings.getModel('OpenAI')).toBe('gpt-4.1-mini');
      expect(fetchWithTimeout).not.toHaveBeenCalled();

      res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenAI/config', { model: '' }), res);
      expect(res.body.data).toMatchObject({ model: 'gpt-4o', modelSource: 'env' });
      expect(mockRows.has('openai_model')).toBe(false);
    });

    it('refuse un modèle mal formé', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/OpenRouter/config', { model: 'gpt 4o; DROP' }), res);

      expect(res.statusCode).toBe(400);
    });

    it('DELETE /providers/<nom>/key revient à la clé du .env', async () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-env-key-0123456789abcdef';
      await providerSettings.setApiKey('OpenRouter', VALID_KEY);
      const res = mockRes();
      await handleAI(mockReq('DELETE', '/providers/OpenRouter/key'), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.keySource).toBe('env');
      expect(mockRows.has('openrouter_api_key')).toBe(false);
    });

    it('répond 404 pour un provider inconnu', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/providers/Inconnu/config', { model: 'x' }), res);

      expect(res.statusCode).toBe(404);
    });

    it('GET /providers/<nom>/models liste les modèles du provider', async () => {
      await providerSettings.setApiKey('OpenAI', VALID_KEYS.OpenAI);
      fetchWithTimeout.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1' }] }) });
      const res = mockRes();
      await handleAI(mockReq('GET', '/providers/OpenAI/models'), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.models).toEqual(['gpt-4.1', 'gpt-4o']);
      expect(fetchWithTimeout.mock.calls[0][1].headers).toEqual({ Authorization: `Bearer ${VALID_KEYS.OpenAI}` });
    });

    it('GET /providers/<nom>/models refuse sans clé configurée', async () => {
      const res = mockRes();
      await handleAI(mockReq('GET', '/providers/Mistral/models'), res);

      expect(res.statusCode).toBe(400);
      expect(fetchWithTimeout).not.toHaveBeenCalled();
    });
  });

  describe('LM Studio', () => {
    it('enregistre l\'URL (sans / final) et revient au .env avec null', async () => {
      process.env.LOCAL_LLM_URL = 'http://pc-env:1234/v1';
      let res = mockRes();
      await handleAI(mockReq('POST', '/local-llm/url', { baseUrl: 'http://192.168.1.20:1234/v1/' }), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ baseUrl: 'http://192.168.1.20:1234/v1', baseUrlSource: 'ui', envBaseUrl: 'http://pc-env:1234/v1' });
      expect(mockRows.get('local_llm_url')).toBe('http://192.168.1.20:1234/v1');
      expect(getProviderByName('LocalLLM').baseUrl).toBe('http://192.168.1.20:1234/v1');

      res = mockRes();
      await handleAI(mockReq('POST', '/local-llm/url', { baseUrl: null }), res);
      expect(res.body.data).toMatchObject({ baseUrl: 'http://pc-env:1234/v1', baseUrlSource: 'env' });
      expect(mockRows.has('local_llm_url')).toBe(false);
    });

    it('refuse une URL qui n\'est pas en http(s)', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/local-llm/url', { baseUrl: 'file:///etc/passwd' }), res);

      expect(res.statusCode).toBe(400);
      expect(mockRows.has('local_llm_url')).toBe(false);
    });

    it('conserve le modèle choisi après redémarrage', async () => {
      const res = mockRes();
      await handleAI(mockReq('POST', '/local-llm/model', { modelId: 'qwen2.5-vl-7b' }), res);
      expect(res.statusCode).toBe(200);

      await localLLMConfig.load();
      expect(localLLMConfig.getActiveModel()).toBe('qwen2.5-vl-7b');
      expect(localLLMConfig.getActiveModelSource()).toBe('ui');
    });
  });
});
