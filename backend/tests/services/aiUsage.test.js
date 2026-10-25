/**
 * Consommation et limites des services IA (api/ai/services/aiUsage.js)
 */

jest.mock('../../lib/database.js', () => ({
  pool: { query: jest.fn(async () => ({ rows: [] })) }
}));

const { pool } = require('../../lib/database.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const ENV_KEYS = ['AI_DAILY_CALL_LIMIT', 'AI_MAX_CONCURRENT', 'AI_RATE_LIMIT_MAX', 'AI_RATE_LIMIT_WINDOW_MS'];
const savedEnv = {};

// Module rechargé à chaque test : la limite par parent lit l'environnement à son chargement
function loadAiUsage(env = {}) {
  Object.assign(process.env, env);
  let aiUsage;
  jest.isolateModules(() => {
    aiUsage = require('../../api/ai/services/aiUsage.js');
  });
  return aiUsage;
}

beforeAll(() => {
  ENV_KEYS.forEach((key) => { savedEnv[key] = process.env[key]; });
});

beforeEach(() => {
  ENV_KEYS.forEach(key => delete process.env[key]);
  pool.query.mockReset().mockImplementation(async () => ({ rows: [] }));
});

afterAll(() => {
  ENV_KEYS.forEach((key) => {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  });
});

describe('aiRateLimiter', () => {
  function generate(aiRateLimiter, profileId) {
    const req = createMockRequest('POST', '/generate-quiz-from-text');
    req.user = { profileId };
    const res = createMockResponse();
    const next = jest.fn();
    aiRateLimiter(req, res, next);
    return { res, next };
  }

  it('limite le nombre de générations par parent', () => {
    const { aiRateLimiter } = loadAiUsage({ AI_RATE_LIMIT_MAX: '2' });

    expect(generate(aiRateLimiter, 1).next).toHaveBeenCalled();
    expect(generate(aiRateLimiter, 1).next).toHaveBeenCalled();
    const third = generate(aiRateLimiter, 1);
    expect(third.next).not.toHaveBeenCalled();
    expect(third.res.statusCode).toBe(429);
    expect(third.res.body.code).toBe('RATE_LIMIT_AI');

    // Un autre parent garde sa propre limite
    expect(generate(aiRateLimiter, 2).next).toHaveBeenCalled();
  });
});

describe('acquireGenerationSlot', () => {
  it('refuse au-delà de AI_MAX_CONCURRENT et libère une seule fois', () => {
    const { acquireGenerationSlot } = loadAiUsage({ AI_MAX_CONCURRENT: '1' });

    const release = acquireGenerationSlot();
    expect(() => acquireGenerationSlot()).toThrow(expect.objectContaining({ status: 429, code: 'AI_BUSY' }));

    release();
    release();
    const again = acquireGenerationSlot();
    expect(() => acquireGenerationSlot()).toThrow(expect.objectContaining({ code: 'AI_BUSY' }));
    again();
  });
});

describe('assertWithinDailyQuota', () => {
  it('ne compte que les providers payants', async () => {
    const { assertWithinDailyQuota } = loadAiUsage({ AI_DAILY_CALL_LIMIT: '10' });
    pool.query.mockResolvedValue({ rows: [{ calls: '9' }] });

    await expect(assertWithinDailyQuota()).resolves.toBeUndefined();
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('provider <> ALL($1)');
    expect(params).toEqual([['LocalLLM']]);
  });

  it('refuse (429) quand le quota est atteint', async () => {
    const { assertWithinDailyQuota } = loadAiUsage({ AI_DAILY_CALL_LIMIT: '10' });
    pool.query.mockResolvedValue({ rows: [{ calls: '10' }] });

    await expect(assertWithinDailyQuota()).rejects.toMatchObject({ status: 429, code: 'AI_DAILY_QUOTA' });
  });

  it('AI_DAILY_CALL_LIMIT=0 : illimité, sans requête', async () => {
    const { assertWithinDailyQuota } = loadAiUsage({ AI_DAILY_CALL_LIMIT: '0' });

    await expect(assertWithinDailyQuota()).resolves.toBeUndefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('laisse passer la génération si la base est injoignable', async () => {
    const { assertWithinDailyQuota } = loadAiUsage();
    pool.query.mockRejectedValue(new Error('connexion refusée'));

    await expect(assertWithinDailyQuota()).resolves.toBeUndefined();
  });
});

describe('recordAiCall et getTodayUsage', () => {
  it('n\'échoue jamais, même si la base est injoignable', async () => {
    const { recordAiCall } = loadAiUsage();
    pool.query.mockRejectedValue(new Error('connexion refusée'));

    await expect(recordAiCall('OpenAI', { promptTokens: 1, completionTokens: 2 })).resolves.toBeUndefined();
  });

  it('sépare les appels payants des appels au LLM local', async () => {
    const { getTodayUsage } = loadAiUsage({ AI_DAILY_CALL_LIMIT: '50' });
    pool.query.mockResolvedValue({
      rows: [
        { provider: 'LocalLLM', calls: 4, prompt_tokens: '100', completion_tokens: '200' },
        { provider: 'Mistral', calls: 3, prompt_tokens: '10', completion_tokens: '20' }
      ]
    });

    await expect(getTodayUsage()).resolves.toMatchObject({
      paidCalls: 3,
      localCalls: 4,
      promptTokens: 110,
      completionTokens: 220,
      dailyLimit: 50
    });
  });
});
