/**
 * Consommation et limites des services IA
 *
 * - recordAiCall : chaque appel réussi à un provider est compté dans ai_usage (jour, provider),
 *   avec les jetons facturés quand le provider les renvoie ;
 * - assertWithinDailyQuota : refuse une nouvelle génération quand le nombre d'appels du jour
 *   aux providers payants (tous sauf LocalLLM) atteint AI_DAILY_CALL_LIMIT ;
 * - acquireGenerationSlot : au plus AI_MAX_CONCURRENT générations en même temps (une page de
 *   cours garde jusqu'à 25 Mo de photos en mémoire pendant plusieurs minutes) ;
 * - aiRateLimiter : au plus AI_RATE_LIMIT_MAX générations par parent sur AI_RATE_LIMIT_WINDOW_MS.
 *
 * Le suivi ne bloque jamais une génération : une erreur d'écriture est seulement journalisée.
 */

const { createRateLimiter, getClientIp } = require('../../../lib/rateLimit.js');
const { AiHttpError } = require('../utils/httpErrors.js');
const logger = require('../../../lib/logger.js');

// Providers sans coût par appel (exclus du quota)
const FREE_PROVIDERS = ['LocalLLM'];

const envInt = (name, fallback) => {
    const value = parseInt(process.env[name] || '', 10);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
};

function getPool() {
    return require('../../../lib/database.js').pool;
}

/**
 * Jetons d'une réponse compatible OpenAI ({ prompt_tokens, completion_tokens })
 */
function usageFromOpenAI(usage) {
    return {
        promptTokens: Number(usage?.prompt_tokens) || 0,
        completionTokens: Number(usage?.completion_tokens) || 0
    };
}

/**
 * Jetons d'une réponse Gemini (usageMetadata)
 */
function usageFromGemini(usageMetadata) {
    return {
        promptTokens: Number(usageMetadata?.promptTokenCount) || 0,
        completionTokens: Number(usageMetadata?.candidatesTokenCount) || 0
    };
}

/**
 * Compte un appel réussi à un provider (n'échoue jamais)
 * @param {string} provider - Nom du provider (ex: "OpenAI")
 * @param {{promptTokens?: number, completionTokens?: number}} [usage]
 */
async function recordAiCall(provider, usage = {}) {
    try {
        await getPool().query(`
            INSERT INTO ai_usage (day, provider, calls, prompt_tokens, completion_tokens)
            VALUES (CURRENT_DATE, $1, 1, $2, $3)
            ON CONFLICT (day, provider) DO UPDATE SET
                calls = ai_usage.calls + 1,
                prompt_tokens = ai_usage.prompt_tokens + EXCLUDED.prompt_tokens,
                completion_tokens = ai_usage.completion_tokens + EXCLUDED.completion_tokens,
                updated_at = CURRENT_TIMESTAMP
        `, [String(provider).slice(0, 50), usage.promptTokens || 0, usage.completionTokens || 0]);
    } catch (error) {
        logger.warn('Consommation IA non enregistrée', { provider, error: error.message });
    }
}

/**
 * Nombre maximum d'appels par jour aux providers payants (0 = illimité)
 */
function getDailyCallLimit() {
    return envInt('AI_DAILY_CALL_LIMIT', 200);
}

/**
 * Consommation du jour
 * @returns {Promise<{paidCalls: number, localCalls: number, promptTokens: number, completionTokens: number, dailyLimit: number, providers: Array}>}
 */
async function getTodayUsage() {
    const result = await getPool().query(
        'SELECT provider, calls, prompt_tokens, completion_tokens FROM ai_usage WHERE day = CURRENT_DATE ORDER BY provider'
    );
    const providers = result.rows.map(row => ({
        provider: row.provider,
        calls: Number(row.calls) || 0,
        promptTokens: Number(row.prompt_tokens) || 0,
        completionTokens: Number(row.completion_tokens) || 0
    }));
    const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
    const paid = providers.filter(row => !FREE_PROVIDERS.includes(row.provider));
    return {
        paidCalls: sum(paid, 'calls'),
        localCalls: sum(providers, 'calls') - sum(paid, 'calls'),
        promptTokens: sum(providers, 'promptTokens'),
        completionTokens: sum(providers, 'completionTokens'),
        dailyLimit: getDailyCallLimit(),
        providers
    };
}

/**
 * Refuse (429) une nouvelle génération quand le quota du jour est atteint.
 * Base injoignable : la génération continue (le quota protège des coûts, pas de l'accès).
 */
async function assertWithinDailyQuota() {
    const limit = getDailyCallLimit();
    if (limit === 0) return;
    let paidCalls;
    try {
        const result = await getPool().query(
            'SELECT COALESCE(SUM(calls), 0) AS calls FROM ai_usage WHERE day = CURRENT_DATE AND provider <> ALL($1)',
            [FREE_PROVIDERS]
        );
        paidCalls = Number(result.rows[0]?.calls) || 0;
    } catch (error) {
        logger.warn('Quota IA non vérifié (base indisponible)', { error: error.message });
        return;
    }
    if (paidCalls >= limit) {
        logger.warn('Quota IA du jour atteint', { paidCalls, limit });
        throw new AiHttpError(
            429,
            `Limite quotidienne de ${limit} appels aux services IA atteinte. Réessayez demain, ou utilisez LM Studio.`,
            'AI_DAILY_QUOTA'
        );
    }
}

let activeGenerations = 0;

/**
 * Réserve une place de génération ; la fonction retournée la libère (une seule fois)
 * @returns {Function} release
 */
function acquireGenerationSlot() {
    const max = Math.max(1, envInt('AI_MAX_CONCURRENT', 2));
    if (activeGenerations >= max) {
        throw new AiHttpError(
            429,
            'Une génération IA est déjà en cours. Attendez qu\'elle se termine avant d\'en lancer une autre.',
            'AI_BUSY'
        );
    }
    activeGenerations += 1;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        activeGenerations -= 1;
    };
}

// Générations par parent (jeton admin), sinon par IP
const aiRateLimiter = createRateLimiter({
    windowMs: envInt('AI_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000) || 10 * 60 * 1000,
    max: envInt('AI_RATE_LIMIT_MAX', 30) || 30,
    keyGenerator: req => `ai:${req.user?.profileId ?? getClientIp(req)}`,
    message: 'Trop de générations IA en peu de temps. Patientez quelques minutes.',
    code: 'RATE_LIMIT_AI'
});

// Tests uniquement
function resetAiUsageForTests() {
    activeGenerations = 0;
}

module.exports = {
    FREE_PROVIDERS,
    usageFromOpenAI,
    usageFromGemini,
    recordAiCall,
    getDailyCallLimit,
    getTodayUsage,
    assertWithinDailyQuota,
    acquireGenerationSlot,
    aiRateLimiter,
    resetAiUsageForTests
};
