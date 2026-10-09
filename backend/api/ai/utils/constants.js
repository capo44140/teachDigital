/**
 * Constantes pour l'API IA
 * Centralise toutes les URLs, timeouts et configurations
 */

// URLs des APIs externes
// LLM local (LM Studio / Ollama) : désactivé tant que LOCAL_LLM_URL n'est pas défini
// (ex: LOCAL_LLM_URL=http://<ip-du-pc>:1234/v1)
const LOCAL_LLM_BASE_URL = process.env.LOCAL_LLM_URL || '';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1';

// Le serveur coupe toute requête après 180s (server.timeout) : un appel IA plus long
// ne peut de toute façon pas aboutir. On borne donc les timeouts juste en dessous.
const SERVER_REQUEST_TIMEOUT_MS = 180000;
const MAX_AI_TIMEOUT_MS = SERVER_REQUEST_TIMEOUT_MS - 10000;
const boundedTimeout = (value, fallback) => Math.min(parseInt(value || String(fallback), 10) || fallback, MAX_AI_TIMEOUT_MS);

// Timeout pour les appels API externes. Peut être ajusté via AI_TIMEOUT_MS
const API_TIMEOUT_MS = boundedTimeout(process.env.AI_TIMEOUT_MS, MAX_AI_TIMEOUT_MS);

// Timeout spécifique pour le LLM local (LM Studio / Ollama). Peut être ajusté via LOCAL_LLM_TIMEOUT_MS
const LOCAL_LLM_TIMEOUT_MS = boundedTimeout(process.env.LOCAL_LLM_TIMEOUT_MS, MAX_AI_TIMEOUT_MS);

// Modèles par défaut
const DEFAULT_LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || 'mistralai/ministral-3-14b-reasoning';
const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const DEFAULT_MISTRAL_MODEL = 'mistral-large-latest';
const DEFAULT_KIMI_MODEL = 'moonshot-v1-8k';

// Paramètres de génération
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_QUESTION_COUNT = 5;

// Langues pour OCR
const OCR_LANGUAGES = 'fra+eng';

module.exports = {
    // URLs
    LOCAL_LLM_BASE_URL,
    OPENAI_BASE_URL,
    GEMINI_BASE_URL,
    DEEPSEEK_BASE_URL,
    GROQ_BASE_URL,
    MISTRAL_BASE_URL,
    KIMI_BASE_URL,

    // Timeouts
    API_TIMEOUT_MS,
    LOCAL_LLM_TIMEOUT_MS,

    // Modèles
    DEFAULT_LOCAL_LLM_MODEL,
    DEFAULT_OPENAI_MODEL,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_GROQ_MODEL,
    DEFAULT_DEEPSEEK_MODEL,
    DEFAULT_MISTRAL_MODEL,
    DEFAULT_KIMI_MODEL,

    // Paramètres
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_QUESTION_COUNT,
    OCR_LANGUAGES
};
