-- Consommation des services IA par jour et par provider (api/ai/services/aiUsage.js) :
-- - suivi des appels et des jetons facturés (affiché dans Configuration IA) ;
-- - quota quotidien d'appels aux providers payants (AI_DAILY_CALL_LIMIT).
-- Une ligne par (jour, provider), incrémentée après chaque appel réussi.
-- Idempotente : rejouable sans effet.

CREATE TABLE IF NOT EXISTS ai_usage (
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    provider VARCHAR(50) NOT NULL,
    calls INTEGER NOT NULL DEFAULT 0,
    prompt_tokens BIGINT NOT NULL DEFAULT 0,
    completion_tokens BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (day, provider)
);
