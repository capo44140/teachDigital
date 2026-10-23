/**
 * Réglages IA : chiffrement des clés (AI_SETTINGS_KEY, repli JWT_SECRET, re-chiffrement)
 * et chargement au démarrage avec nouvel essai en cas d'échec (aiSettingsLoader)
 */

// Table ai_settings simulée en mémoire (mockFailures : nombre de requêtes à faire échouer)
const mockRows = new Map();
const mockState = { failures: 0 };
jest.mock('../../lib/database.js', () => ({
  pool: {
    query: jest.fn(async (sql, params) => {
      if (mockState.failures > 0) {
        mockState.failures -= 1;
        throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
      }
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

const store = require('../../api/ai/services/aiSettingsStore.js');
const providerSettings = require('../../api/ai/services/aiProviders/providerSettings.js');
const loader = require('../../api/ai/services/aiSettingsLoader.js');

const KEY = 'sk-or-v1-0123456789abcdef0123456789abcdef';
const AI_SETTINGS_KEY = 'a'.repeat(16) + 'b'.repeat(16) + 'c'.repeat(16);

beforeEach(async () => {
  mockRows.clear();
  mockState.failures = 0;
  delete process.env.AI_SETTINGS_KEY;
  delete process.env.OPENROUTER_API_KEY;
  loader.resetAiSettingsLoaderForTests();
  await providerSettings.load();
});

afterAll(() => {
  delete process.env.AI_SETTINGS_KEY;
  loader.resetAiSettingsLoaderForTests();
});

describe('chiffrement des clés API', () => {
  it('utilise la clé dérivée de JWT_SECRET (v1) sans AI_SETTINGS_KEY', () => {
    const stored = store.encrypt(KEY);
    expect(stored).toMatch(/^v1:/);
    expect(store.decryptWithInfo(stored)).toEqual({ value: KEY, needsReencrypt: false });
  });

  it('utilise AI_SETTINGS_KEY (v2) quand elle est définie, indépendamment de JWT_SECRET', () => {
    process.env.AI_SETTINGS_KEY = AI_SETTINGS_KEY;
    const stored = store.encrypt(KEY);
    expect(stored).toMatch(/^v2:/);
    expect(stored).not.toContain(KEY);

    const jwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'un-autre-secret-de-plus-de-32-caracteres-xx';
    try {
      expect(store.decrypt(stored)).toBe(KEY);
    } finally {
      process.env.JWT_SECRET = jwtSecret;
    }
  });

  it('ignore une AI_SETTINGS_KEY trop courte (repli sur JWT_SECRET)', () => {
    process.env.AI_SETTINGS_KEY = 'trop-courte';
    expect(store.hasDedicatedKey()).toBe(false);
    expect(store.encrypt(KEY)).toMatch(/^v1:/);
  });

  it('ne peut pas lire une valeur v2 sans AI_SETTINGS_KEY', () => {
    process.env.AI_SETTINGS_KEY = AI_SETTINGS_KEY;
    const stored = store.encrypt(KEY);
    delete process.env.AI_SETTINGS_KEY;
    expect(() => store.decrypt(stored)).toThrow(/AI_SETTINGS_KEY/);
  });

  it('relit une clé v1 après l\'ajout de AI_SETTINGS_KEY et la re-chiffre en v2 au chargement', async () => {
    await providerSettings.setApiKey('OpenRouter', KEY);
    expect(mockRows.get('openrouter_api_key')).toMatch(/^v1:/);

    process.env.AI_SETTINGS_KEY = AI_SETTINGS_KEY;
    expect(store.decryptWithInfo(mockRows.get('openrouter_api_key')).needsReencrypt).toBe(true);
    await providerSettings.load();

    expect(providerSettings.getApiKey('OpenRouter')).toBe(KEY);
    const reencrypted = mockRows.get('openrouter_api_key');
    expect(reencrypted).toMatch(/^v2:/);
    expect(store.decrypt(reencrypted)).toBe(KEY);
  });

  it('chiffre en v2 les clés enregistrées quand AI_SETTINGS_KEY est définie', async () => {
    process.env.AI_SETTINGS_KEY = AI_SETTINGS_KEY;
    await providerSettings.setApiKey('OpenRouter', KEY);
    expect(mockRows.get('openrouter_api_key')).toMatch(/^v2:/);
  });
});

describe('aiSettingsLoader', () => {
  it('charge les réglages enregistrés', async () => {
    await providerSettings.setApiKey('OpenRouter', KEY);
    await providerSettings.load();
    // Simule un redémarrage : mémoire vide, puis chargement depuis la base
    mockRows.set('local_llm_url', 'http://192.168.1.20:1234/v1');

    await expect(loader.loadAiSettings()).resolves.toBe(true);
    expect(loader.isAiSettingsLoaded()).toBe(true);
    expect(require('../../api/ai/services/aiProviders/localLLMConfig.js').getBaseUrl()).toBe('http://192.168.1.20:1234/v1');
  });

  it('ne lève pas d\'erreur si la base est indisponible et programme un nouvel essai', async () => {
    jest.useFakeTimers();
    try {
      mockState.failures = 1;
      mockRows.set('local_llm_model', 'qwen2.5-vl-7b');

      await expect(loader.loadAiSettings()).resolves.toBe(false);
      expect(loader.isAiSettingsLoaded()).toBe(false);

      // Nouvel essai automatique après 5 s
      await jest.advanceTimersByTimeAsync(5000);
      expect(loader.isAiSettingsLoaded()).toBe(true);
      expect(require('../../api/ai/services/aiProviders/localLLMConfig.js').getActiveModel()).toBe('qwen2.5-vl-7b');
    } finally {
      jest.useRealTimers();
    }
  });

  it('ensureAiSettingsLoaded recharge à la demande après un échec (sans attendre le timer)', async () => {
    mockState.failures = 1;
    await expect(loader.loadAiSettings()).resolves.toBe(false);
    loader.stopAiSettingsRetry();

    // Essai trop rapproché : ignoré (limitation), aucune erreur
    await loader.ensureAiSettingsLoaded();
    expect(loader.isAiSettingsLoaded()).toBe(false);

    const realNow = Date.now;
    Date.now = () => realNow() + 6000;
    try {
      await loader.ensureAiSettingsLoaded();
    } finally {
      Date.now = realNow;
    }
    expect(loader.isAiSettingsLoaded()).toBe(true);
  });

  it('ne recharge plus une fois les réglages chargés', async () => {
    await loader.loadAiSettings();
    const { pool } = require('../../lib/database.js');
    pool.query.mockClear();
    await loader.ensureAiSettingsLoaded();
    expect(pool.query).not.toHaveBeenCalled();
  });
});
