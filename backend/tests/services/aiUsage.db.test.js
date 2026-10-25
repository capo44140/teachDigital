/**
 * Consommation IA sur une vraie base (TEST_DATABASE_URL) : cumul par jour et par provider,
 * quota limité aux providers payants.
 */

const { pool } = require('../../lib/database.js');
const { describeWithDb } = require('../helpers/testHelpers.js');
const aiUsage = require('../../api/ai/services/aiUsage.js');

describeWithDb('aiUsage (base réelle)', () => {
  const savedLimit = process.env.AI_DAILY_CALL_LIMIT;

  beforeEach(async () => {
    await pool.query('DELETE FROM ai_usage WHERE day = CURRENT_DATE');
  });

  afterAll(async () => {
    await pool.query('DELETE FROM ai_usage WHERE day = CURRENT_DATE');
    if (savedLimit === undefined) delete process.env.AI_DAILY_CALL_LIMIT;
    else process.env.AI_DAILY_CALL_LIMIT = savedLimit;
  });

  it('cumule appels et jetons par provider pour le jour', async () => {
    await aiUsage.recordAiCall('OpenAI', { promptTokens: 100, completionTokens: 50 });
    await aiUsage.recordAiCall('OpenAI', { promptTokens: 10, completionTokens: 5 });
    await aiUsage.recordAiCall('LocalLLM', { promptTokens: 1, completionTokens: 1 });

    const usage = await aiUsage.getTodayUsage();

    expect(usage).toMatchObject({ paidCalls: 2, localCalls: 1, promptTokens: 111, completionTokens: 56 });
    expect(usage.providers.find(row => row.provider === 'OpenAI')).toEqual({
      provider: 'OpenAI', calls: 2, promptTokens: 110, completionTokens: 55
    });
  });

  it('le quota ignore les appels au LLM local', async () => {
    process.env.AI_DAILY_CALL_LIMIT = '2';
    await aiUsage.recordAiCall('LocalLLM');
    await aiUsage.recordAiCall('LocalLLM');
    await aiUsage.recordAiCall('Mistral');

    await expect(aiUsage.assertWithinDailyQuota()).resolves.toBeUndefined();

    await aiUsage.recordAiCall('Mistral');
    await expect(aiUsage.assertWithinDailyQuota()).rejects.toMatchObject({ status: 429, code: 'AI_DAILY_QUOTA' });
  });
});
