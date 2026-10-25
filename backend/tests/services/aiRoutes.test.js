/**
 * Routes IA (api/ai/index.js) : validation des entrées, refus des PDF, délai global,
 * annulation sur déconnexion du client, erreurs génériques (aucun détail interne renvoyé).
 * Base et réseau simulés : un seul provider (OpenRouter), fetch global mocké.
 */

// Table ai_settings simulée (vide) ; ai_usage simulée (aucun appel aujourd'hui)
jest.mock('../../lib/database.js', () => ({
  pool: {
    query: jest.fn(async (sql) => {
      if (sql.includes('SELECT key, value FROM ai_settings')) return { rows: [] };
      return { rows: [] };
    })
  }
}));

// Limite de générations par parent : relevée ici (testée dans aiUsage.test.js)
process.env.AI_RATE_LIMIT_MAX = '1000';

const http = require('http');
const express = require('express');
const { pool } = require('../../lib/database.js');
const handleAI = require('../../api/ai/index.js');
const quizGenerator = require('../../api/ai/services/quizGenerator.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

const OPENROUTER_KEY = 'sk-or-v1-test-key-not-real-0123456789';
const PROFILE = { id: 3, name: 'Léa', level: 'CM1', image_data: 'data:image/png;base64,AAAA' };

const QUIZ = {
  title: 'Les fractions',
  description: 'Quiz',
  questions: [1, 2, 3].map(i => ({
    question: `Question ${i} ?`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 1,
    explanation: 'Parce que.'
  }))
};

const chatResponse = content => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: () => null },
  json: async () => ({ choices: [{ message: { content } }] })
});

// Réponse qui n'arrive jamais : rejetée quand le signal est annulé
function hangingFetch(record) {
  return jest.fn((url, options) => new Promise((resolve, reject) => {
    record.signal = options.signal;
    options.signal.addEventListener('abort', () => {
      const error = new Error('This operation was aborted');
      error.name = 'AbortError';
      reject(error);
    });
  }));
}

async function call(method, url, body, headers = {}) {
  const req = createMockRequest(method, url, body, headers);
  const res = createMockResponse();
  await handleAI(req, res);
  return res;
}

const savedEnv = {};
const ENV_KEYS = [
  'AI_PROVIDER', 'OPENROUTER_API_KEY', 'AI_REQUEST_TIMEOUT_MS', 'OCR_MODE', 'LOCAL_LLM_URL', 'OPENAI_API_KEY', 'GEMINI_API_KEY',
  'AI_CHILD_DATA_PROVIDERS', 'AI_DAILY_CALL_LIMIT', 'AI_MAX_CONCURRENT'
];
// Tous les providers autorisés pour les données des enfants (sauf tests dédiés)
const ALL_PROVIDERS = 'OpenAI,Gemini,DeepSeek,Groq,Mistral,Kimi,OpenRouter';

beforeAll(() => {
  ENV_KEYS.forEach((key) => { savedEnv[key] = process.env[key]; });
});

afterAll(() => {
  ENV_KEYS.forEach((key) => {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  });
  delete global.fetch;
});

beforeEach(() => {
  ENV_KEYS.forEach((key) => delete process.env[key]);
  process.env.AI_PROVIDER = 'OpenRouter';
  process.env.OPENROUTER_API_KEY = OPENROUTER_KEY;
  process.env.AI_CHILD_DATA_PROVIDERS = ALL_PROVIDERS;
  global.fetch = jest.fn(async () => chatResponse(JSON.stringify(QUIZ)));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /generate-quiz-from-text', () => {
  it('génère un quiz avec le provider configuré (profil réduit au prénom / niveau)', async () => {
    const res = await call('POST', '/generate-quiz-from-text', {
      text: 'Une fraction représente une partie d\'un tout.',
      childProfile: PROFILE,
      options: { questionCount: 3, subject: 'Maths' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.quiz.questions).toHaveLength(3);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.Authorization).toBe(`Bearer ${OPENROUTER_KEY}`);
    expect(options.signal).toBeDefined();
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toContain('Générez exactement 3 questions');
    // L'avatar (image_data) du profil n'est jamais envoyé au LLM
    expect(options.body).not.toContain('image_data');
    // OpenRouter : seulement des fournisseurs qui ne conservent pas les données
    expect(body.provider).toEqual({ data_collection: 'deny' });
  });

  it('refuse (409) quand aucun provider configuré n\'est autorisé pour les données des enfants', async () => {
    delete process.env.AI_CHILD_DATA_PROVIDERS;
    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options: { questionCount: 3 } });

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('AI_CHILD_DATA_NOT_ALLOWED');
    expect(res.body.message).toContain('OpenRouter');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuse (429) une génération quand le quota du jour est atteint, sans appeler l\'IA', async () => {
    process.env.AI_DAILY_CALL_LIMIT = '5';
    const defaultQuery = pool.query.getMockImplementation();
    pool.query.mockImplementation(async (sql, params) => (
      sql.includes('SUM(calls)') ? { rows: [{ calls: '5' }] } : defaultQuery(sql, params)
    ));
    try {
      const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options: { questionCount: 3 } });

      expect(res.statusCode).toBe(429);
      expect(res.body.code).toBe('AI_DAILY_QUOTA');
      expect(res.body.message).toContain('5 appels');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      pool.query.mockImplementation(defaultQuery);
    }
  });

  it('compte chaque appel réussi dans ai_usage avec les jetons', async () => {
    global.fetch.mockResolvedValue({
      ...chatResponse(JSON.stringify(QUIZ)),
      json: async () => ({ choices: [{ message: { content: JSON.stringify(QUIZ) } }], usage: { prompt_tokens: 120, completion_tokens: 800 } })
    });
    pool.query.mockClear();

    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options: { questionCount: 3 } });

    expect(res.statusCode).toBe(200);
    const insert = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO ai_usage'));
    expect(insert[1]).toEqual(['OpenRouter', 120, 800]);
  });

  it('refuse (429) une deuxième génération simultanée au-delà de AI_MAX_CONCURRENT, puis libère la place', async () => {
    process.env.AI_MAX_CONCURRENT = '1';
    process.env.AI_REQUEST_TIMEOUT_MS = '300';
    global.fetch = hangingFetch({});

    const first = call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE });
    // Laisser la première requête réserver sa place
    await new Promise(resolve => setTimeout(resolve, 50));
    const second = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE });
    expect(second.statusCode).toBe(429);
    expect(second.body.code).toBe('AI_BUSY');

    expect((await first).statusCode).toBe(504);
    // Place libérée après le délai dépassé
    global.fetch = jest.fn(async () => chatResponse(JSON.stringify(QUIZ)));
    const third = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options: { questionCount: 3 } });
    expect(third.statusCode).toBe(200);
  });

  it.each([
    [{ questionCount: 41 }, 'entre 1 et 40'],
    [{ questionCount: 0 }, 'entre 1 et 40'],
    [{ questionCount: 'beaucoup' }, 'entre 1 et 40']
  ])('refuse un nombre de questions hors bornes (%j) sans appeler l\'IA', async (options, message) => {
    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' });
    expect(res.body.message).toContain(message);
    expect(res.body.requestId).toEqual(expect.any(String));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuse un texte trop long ou un profil manquant', async () => {
    let res = await call('POST', '/generate-quiz-from-text', { text: 'x'.repeat(50001), childProfile: PROFILE });
    expect(res.statusCode).toBe(400);

    res = await call('POST', '/generate-quiz-from-text', { text: 'abc' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Profil enfant requis');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('répond 422 si le quiz généré est inexploitable', async () => {
    global.fetch.mockResolvedValue(chatResponse(JSON.stringify({ title: 'Sans questions' })));
    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE });

    expect(res.statusCode).toBe(422);
    expect(res.body.code).toBe('INVALID_QUIZ_FORMAT');
  });

  it('répond 503 sans détail interne quand tous les providers échouent', async () => {
    global.fetch.mockRejectedValue(new Error('secret-detail: connexion refusée à 10.0.0.5'));
    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE });

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('AI_UNAVAILABLE');
    expect(res.body.requestId).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain('secret-detail');
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
  });

  it('répond 500 générique (sans error.message) sur une erreur inattendue, avec le requestId de la requête', async () => {
    jest.spyOn(quizGenerator, 'generateQuizFromTextWithAI').mockRejectedValue(new Error('secret-detail SELECT * FROM pin_codes'));
    const req = createMockRequest('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE });
    req.requestId = 'req-123';
    const res = createMockResponse();
    await handleAI(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual(expect.objectContaining({ success: false, code: 'INTERNAL_ERROR', requestId: 'req-123' }));
    expect(JSON.stringify(res.body)).not.toContain('secret-detail');
  });

  it('répond 504 AI_TIMEOUT quand le délai global est dépassé et annule l\'appel au provider', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '300';
    const record = {};
    global.fetch = hangingFetch(record);

    const startedAt = Date.now();
    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE });

    expect(res.statusCode).toBe(504);
    expect(res.body.code).toBe('AI_TIMEOUT');
    expect(record.signal.aborted).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(5000);
    // Pas de nouvelle tentative sur un autre provider après le délai
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('Providers', () => {
  it.each([
    ['DeepSeek', 'DEEPSEEK_API_KEY', 'sk-test-deepseek-not-a-real-key', 'https://api.deepseek.com/v1/chat/completions'],
    ['Groq', 'GROQ_API_KEY', 'gsk_test_groq_not_a_real_key', 'https://api.groq.com/openai/v1/chat/completions'],
    ['Mistral', 'MISTRAL_API_KEY', 'test-mistral-not-a-real-key', 'https://api.mistral.ai/v1/chat/completions'],
    ['Kimi', 'KIMI_API_KEY', 'sk-test-kimi-not-a-real-key', 'https://api.moonshot.cn/v1/chat/completions'],
    ['OpenAI', 'OPENAI_API_KEY', 'sk-test-openai-not-a-real-key', 'https://api.openai.com/v1/chat/completions']
  ])('%s : API compatible OpenAI (Bearer + /chat/completions)', async (name, envKey, key, expectedUrl) => {
    process.env.AI_PROVIDER = name;
    process.env[envKey] = key;
    try {
      const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options: { questionCount: 3 } });
      expect(res.statusCode).toBe(200);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe(expectedUrl);
      expect(options.headers.Authorization).toBe(`Bearer ${key}`);
      expect(JSON.parse(options.body).max_tokens).toBe(1500);
    } finally {
      delete process.env[envKey];
    }
  });

  it('Gemini : clé dans l\'en-tête x-goog-api-key, jamais dans l\'URL', async () => {
    process.env.AI_PROVIDER = 'Gemini';
    process.env.GEMINI_API_KEY = 'AIza-test-gemini-not-a-real-key';
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(QUIZ) }] } }] })
    });

    const res = await call('POST', '/generate-quiz-from-text', { text: 'abc', childProfile: PROFILE, options: { questionCount: 3 } });

    expect(res.statusCode).toBe(200);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[\w.-]+:generateContent$/);
    expect(url).not.toContain('AIza');
    expect(options.headers['x-goog-api-key']).toBe('AIza-test-gemini-not-a-real-key');
  });
});

describe('Documents : seules les images sont acceptées', () => {
  it.each([
    ['/generate-quiz-from-documents', { type: 'application/pdf', base64: 'JVBERi0xLjQK' }],
    ['/extract-text-from-documents', { type: 'pdf', base64: 'AAAA' }],
    ['/extract-text-from-documents', { name: 'lecon.PDF', type: 'image/png', base64: 'AAAA' }],
    ['/extract-text-from-documents', { type: 'image/png', base64: 'JVBERi0xLjcKJ' }]
  ])('%s refuse un PDF (%j) en 415', async (path, doc) => {
    const res = await call('POST', path, { documents: [doc], childProfile: PROFILE, questionCount: 5 });

    expect(res.statusCode).toBe(415);
    expect(res.body).toMatchObject({ success: false, code: 'UNSUPPORTED_FILE_TYPE' });
    expect(res.body.message).toContain('PDF');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuse un PDF envoyé en multipart (contenu %PDF malgré un type image)', async () => {
    const req = createMockRequest('POST', '/generate-quiz-from-documents', {}, { 'content-type': 'multipart/form-data; boundary=x' });
    req.parsedFormData = {
      fields: { fileCount: '1', file_0_name: 'photo.png', file_0_type: 'image/png', childProfile: JSON.stringify(PROFILE), questionCount: '5' },
      files: [{ fieldname: 'file_0', filename: 'photo.png', mimetype: 'image/png', buffer: Buffer.from('%PDF-1.4\n%...') }]
    };
    const res = createMockResponse();
    await handleAI(req, res);

    expect(res.statusCode).toBe(415);
    expect(res.body.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('refuse un autre type de fichier (texte) en 415', async () => {
    const res = await call('POST', '/extract-text-from-documents', { documents: [{ type: 'text/plain', base64: 'aGVsbG8=' }] });
    expect(res.statusCode).toBe(415);
    expect(res.body.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('refuse plus de 10 documents', async () => {
    const documents = Array.from({ length: 11 }, () => ({ type: 'image/png', base64: 'AAAA' }));
    const res = await call('POST', '/extract-text-from-documents', { documents });
    expect(res.statusCode).toBe(400);
  });

  it('répond 503 (et non « document invalide ») quand aucun service de vision n\'est configuré', async () => {
    const res = await call('POST', '/extract-text-from-documents', { documents: [{ type: 'image/png', base64: 'AAAA' }] });

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('AI_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toContain('provider');
  });

  it('enchaîne OCR (LLM vision) puis analyse et renvoie les extractions', async () => {
    // Pas de provider forcé : OpenAI (vision) est le premier de la cascade
    delete process.env.AI_PROVIDER;
    process.env.OPENAI_API_KEY = 'sk-test-openai-not-a-real-key';
    global.fetch
      .mockResolvedValueOnce(chatResponse('Texte de la leçon'))
      .mockResolvedValueOnce(chatResponse(JSON.stringify({ titre_principal: 'Fractions', concepts_cles: ['numérateur'] })));

    const res = await call('POST', '/extract-text-from-documents', { documents: [{ name: 'p1.jpg', type: 'image/jpeg', base64: 'data:image/jpeg;base64,AAAA' }] });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.extractions[0]).toMatchObject({ type: 'image', fileName: 'p1.jpg', extractedText: 'Texte de la leçon' });
    // OCR via OpenAI Vision (image sans préfixe data:), puis analyse avec le premier provider
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
    expect(global.fetch.mock.calls[0][1].body).toContain('data:image/jpeg;base64,AAAA"');
    expect(global.fetch.mock.calls[1][0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it.each([
    ['AI_PROVIDER force un autre provider', () => { process.env.AI_PROVIDER = 'OpenRouter'; }],
    ['OpenAI non autorisé pour les données des enfants', () => {
      delete process.env.AI_PROVIDER;
      process.env.AI_CHILD_DATA_PROVIDERS = 'OpenRouter';
    }]
  ])('l\'OCR n\'envoie pas la photo à OpenAI quand %s', async (label, configure) => {
    process.env.OPENAI_API_KEY = 'sk-test-openai-not-a-real-key';
    configure();

    await call('POST', '/extract-text-from-documents', { documents: [{ name: 'p1.jpg', type: 'image/jpeg', base64: 'data:image/jpeg;base64,AAAA' }] });

    expect(global.fetch.mock.calls.map(([url]) => url)).not.toContain('https://api.openai.com/v1/chat/completions');
  });
});

describe('POST /generate-course-page', () => {
  const coursePageGenerator = require('../../api/ai/services/coursePageGenerator.js');

  function multipartRequest(fields, files) {
    const req = createMockRequest('POST', '/generate-course-page', {}, { 'content-type': 'multipart/form-data; boundary=x' });
    req.parsedFormData = { fields, files };
    return req;
  }

  const photo = { fieldname: 'file_0', filename: 'p.jpg', mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) };

  it('transmet les photos et un contexte (délai des pages de cours) au générateur', async () => {
    const spy = jest.spyOn(coursePageGenerator, 'generateCoursePageFromImages')
      .mockResolvedValue({ html: '<html></html>', summary: 'ok', provider: 'OpenAI', model: 'gpt-4o' });
    const res = createMockResponse();
    await handleAI(multipartRequest({ fileCount: '1', childProfile: JSON.stringify(PROFILE), subject: 'Maths' }, [photo]), res);

    expect(res.statusCode).toBe(200);
    const [options, ctx] = spy.mock.calls[0];
    expect(options.images).toEqual([{ base64: photo.buffer.toString('base64'), mimeType: 'image/jpeg' }]);
    expect(options.childProfile).toEqual({ name: 'Léa', level: 'CM1' });
    expect(ctx.signal).toBeDefined();
    expect(ctx.deadline - Date.now()).toBeGreaterThan(200000);
  });

  it('refuse un PDF (415) et plus de 10 fichiers (400)', async () => {
    let res = createMockResponse();
    await handleAI(multipartRequest({ fileCount: '1', file_0_type: 'application/pdf', childProfile: '{}' }, [{ ...photo, mimetype: 'application/pdf' }]), res);
    expect(res.statusCode).toBe(415);

    res = createMockResponse();
    await handleAI(multipartRequest({ fileCount: '11', childProfile: '{}' }, [photo]), res);
    expect(res.statusCode).toBe(400);
  });

  it('répond 503 générique (sans le détail des providers) quand aucun modèle vision n\'est disponible', async () => {
    jest.spyOn(coursePageGenerator, 'generateCoursePageFromImages')
      .mockRejectedValue(Object.assign(new Error('Tous les services IA ont échoué : OpenAI : Erreur 401 clé sk-xxx'), { code: 'AI_UNAVAILABLE' }));
    const res = createMockResponse();
    await handleAI(multipartRequest({ fileCount: '1', childProfile: '{}' }, [photo]), res);

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('AI_UNAVAILABLE');
    expect(res.body.reason).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('401');
  });
});

describe('Routeur', () => {
  it('répond 404 pour une route inconnue ou une méthode non prévue', async () => {
    let res = await call('GET', '/inconnue');
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: 'Endpoint non trouvé', code: 'NOT_FOUND' });

    res = await call('GET', '/generate-quiz-from-text');
    expect(res.statusCode).toBe(404);
  });

  it('annule l\'appel au provider quand le client se déconnecte (monté dans Express)', async () => {
    const record = {};
    global.fetch = hangingFetch(record);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.requestId = 'test-disconnect'; next(); });
    app.use('/ai', handleAI);
    const server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const { port } = server.address();
      const payload = JSON.stringify({ text: 'abc', childProfile: PROFILE });
      const clientReq = http.request({
        host: '127.0.0.1',
        port,
        path: '/ai/generate-quiz-from-text',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
      });
      clientReq.on('error', () => {});
      clientReq.end(payload);

      // Attendre que le provider soit appelé, puis couper la connexion
      for (let i = 0; i < 100 && !record.signal; i++) await new Promise(r => setTimeout(r, 20));
      expect(record.signal).toBeDefined();
      expect(record.signal.aborted).toBe(false);
      clientReq.destroy();

      for (let i = 0; i < 100 && !record.signal.aborted; i++) await new Promise(r => setTimeout(r, 20));
      expect(record.signal.aborted).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
