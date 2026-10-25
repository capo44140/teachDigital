/**
 * Tests de la génération de pages de cours HTML à partir de photos
 */

jest.mock('../../api/ai/services/aiProviders/index.js', () => ({
  getAvailableProviders: jest.fn(),
  getProviderByName: jest.fn(),
  isAllowedForChildData: jest.fn(() => true),
  createNoProviderError: jest.fn(reason => Object.assign(new Error(`Tous les services IA ont échoué : ${reason}`), { code: 'AI_UNAVAILABLE' }))
}));

// Consommation IA : pas d'écriture en base pendant ces tests
jest.mock('../../api/ai/services/aiUsage.js', () => ({
  ...jest.requireActual('../../api/ai/services/aiUsage.js'),
  recordAiCall: jest.fn(async () => {})
}));

jest.mock('../../api/ai/services/coursePageConfig.js', () => ({
  VISION_PROVIDERS: ['LocalLLM', 'OpenAI', 'Gemini', 'OpenRouter'],
  getProvider: jest.fn(() => null)
}));

const { getAvailableProviders, getProviderByName, isAllowedForChildData } = require('../../api/ai/services/aiProviders/index.js');
const { recordAiCall } = require('../../api/ai/services/aiUsage.js');
const coursePageConfig = require('../../api/ai/services/coursePageConfig.js');
const { generateCoursePageFromImages } = require('../../api/ai/services/coursePageGenerator.js');
const {
  SUMMARY_MARKER,
  CHILD_NAME_PLACEHOLDER,
  buildCoursePagePrompt,
  parseCoursePageResponse,
  fillChildName
} = require('../../api/ai/prompts/coursePageHtml.js');

const PAGE = '<!DOCTYPE html><html><head><title>Pythagore</title></head><body><span id="sOk">0</span></body></html>';
const fakeProvider = (name, model, available = true) => ({ getName: () => name, model, baseUrl: 'http://llm.local/v1', apiKey: `key-${name}`, isAvailable: () => available });
const chatResponse = content => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });

describe('buildCoursePagePrompt', () => {
  it('reprend le profil, la matière, le sujet et les consignes', () => {
    const prompt = buildCoursePagePrompt({
      childProfile: { name: 'Léa', level: '4ème' },
      subject: 'Mathématiques',
      topic: 'le théorème de Pythagore',
      instructions: 'insister sur la réciproque',
      photoCount: 3
    });
    expect(prompt).toContain('3 photos');
    expect(prompt).toContain('mon enfant, en classe : 4ème, matière : Mathématiques');
    expect(prompt).toContain('« le théorème de Pythagore »');
    expect(prompt).toContain('insister sur la réciproque');
    expect(prompt).toContain('id="sOk"');
    expect(prompt).toContain(SUMMARY_MARKER);
  });

  it('n\'envoie pas le prénom de l\'enfant : le modèle écrit un marqueur', () => {
    const prompt = buildCoursePagePrompt({ childProfile: { name: 'Léa', level: '4ème' }, photoCount: 1 });
    expect(prompt).not.toContain('Léa');
    expect(prompt).toContain(CHILD_NAME_PLACEHOLDER);
  });

  it('laisse l\'IA déduire matière et sujet quand ils manquent', () => {
    const prompt = buildCoursePagePrompt({ childProfile: {}, photoCount: 1 });
    expect(prompt).toContain('1 photo de');
    expect(prompt).toContain('matière : à déduire des photos');
    expect(prompt).not.toContain('CONSIGNES SUPPLÉMENTAIRES');
  });
});

describe('parseCoursePageResponse', () => {
  it('sépare la page et le résumé', () => {
    const result = parseCoursePageResponse(`${PAGE}\n${SUMMARY_MARKER}\nLa page contient la leçon.\nVérifiez le prénom.`);
    expect(result).toEqual({ html: PAGE, summary: 'La page contient la leçon.\nVérifiez le prénom.', complete: true });
  });

  it('retire les blocs de code markdown et le texte autour', () => {
    const result = parseCoursePageResponse(`Voici la page :\n\`\`\`html\n${PAGE}\n\`\`\`\nRésumé libre`);
    expect(result.html).toBe(PAGE);
    expect(result.summary).toBe('Résumé libre');
    expect(result.complete).toBe(true);
  });

  it('signale une page tronquée', () => {
    expect(parseCoursePageResponse('<!DOCTYPE html><html><body>').complete).toBe(false);
  });
});

describe('fillChildName', () => {
  it('remplace le marqueur par le prénom', () => {
    expect(fillChildName(`<h1>Bravo ${CHILD_NAME_PLACEHOLDER} !</h1>`, 'Léa')).toBe('<h1>Bravo Léa !</h1>');
  });

  it('ne garde que des caractères sûrs dans du HTML ou une chaîne JavaScript', () => {
    const html = `<script>const nom = "${CHILD_NAME_PLACEHOLDER}";</script>`;
    expect(fillChildName(html, 'Zoé-Anne d\'Arc"</script><img src=x>')).toBe('<script>const nom = "Zoé-Anne d’Arcscriptimg srcx";</script>');
  });

  it('retire le marqueur sans prénom', () => {
    expect(fillChildName(`Salut ${CHILD_NAME_PLACEHOLDER}`, '')).toBe('Salut ');
  });
});

describe('generateCoursePageFromImages', () => {
  const images = [{ base64: 'AAAA', mimeType: 'image/png' }];
  const childProfile = { name: 'Léa', level: '4ème' };

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete global.fetch;
    coursePageConfig.getProvider.mockReturnValue(null);
    isAllowedForChildData.mockReturnValue(true);
  });

  it('remplit le prénom dans la page et le résumé, et compte l\'appel', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('LocalLLM', 'qwen-vl')]);
    const page = PAGE.replace('<body>', `<body><h1>Allez ${CHILD_NAME_PLACEHOLDER} !</h1>`);
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: `${page}\n${SUMMARY_MARKER}\nPage pour ${CHILD_NAME_PLACEHOLDER}` } }], usage: { prompt_tokens: 900, completion_tokens: 4000 } })
    });

    const result = await generateCoursePageFromImages({ images, childProfile });

    expect(result.html).toContain('<h1>Allez Léa !</h1>');
    expect(result.summary).toBe('Page pour Léa');
    expect(JSON.stringify(global.fetch.mock.calls[0][1].body)).not.toContain('Léa');
    expect(recordAiCall).toHaveBeenCalledWith('LocalLLM', { promptTokens: 900, completionTokens: 4000 });
  });

  it('refuse (409) le provider choisi s\'il n\'est pas autorisé pour les données des enfants', async () => {
    coursePageConfig.getProvider.mockReturnValue('OpenAI');
    getProviderByName.mockReturnValue(fakeProvider('OpenAI', 'gpt-4o'));
    isAllowedForChildData.mockReturnValue(false);

    await expect(generateCoursePageFromImages({ images, childProfile }))
      .rejects.toMatchObject({ status: 409, code: 'AI_CHILD_DATA_NOT_ALLOWED' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('utilise le modèle LM Studio configuré et envoie toutes les photos', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('LocalLLM', 'qwen-vl')]);
    global.fetch.mockResolvedValue(chatResponse(`${PAGE}\n${SUMMARY_MARKER}\nRésumé`));

    const result = await generateCoursePageFromImages({ images: [...images, ...images], childProfile });

    expect(result).toEqual({ html: PAGE, summary: 'Résumé', provider: 'LocalLLM', model: 'qwen-vl' });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://llm.local/v1/chat/completions');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('qwen-vl');
    expect(body.messages[0].content.filter(part => part.type === 'image_url')).toHaveLength(2);
    expect(body.messages[0].content[1].image_url.url).toBe('data:image/png;base64,AAAA');
  });

  it('ignore les providers sans vision et passe au suivant si la page est tronquée', async () => {
    getAvailableProviders.mockReturnValue([
      fakeProvider('LocalLLM', 'texte-seul'),
      fakeProvider('DeepSeek', 'deepseek-chat'),
      fakeProvider('OpenAI', 'gpt-4o')
    ]);
    global.fetch
      .mockResolvedValueOnce(chatResponse('<!DOCTYPE html><html><body>coupé'))
      .mockResolvedValueOnce(chatResponse(PAGE));

    const result = await generateCoursePageFromImages({ images, childProfile });

    expect(result.provider).toBe('OpenAI');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer key-OpenAI');
  });

  it('échoue avec AI_UNAVAILABLE sans provider capable de lire des photos', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('Groq', 'llama')]);

    await expect(generateCoursePageFromImages({ images, childProfile }))
      .rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("utilise uniquement le provider choisi dans l'interface (OpenRouter)", async () => {
    coursePageConfig.getProvider.mockReturnValue('OpenRouter');
    getProviderByName.mockReturnValue(fakeProvider('OpenRouter', 'google/gemini-2.5-flash'));
    global.fetch.mockResolvedValue(chatResponse(PAGE));

    const result = await generateCoursePageFromImages({ images, childProfile });

    expect(getProviderByName).toHaveBeenCalledWith('OpenRouter');
    expect(getAvailableProviders).not.toHaveBeenCalled();
    expect(result).toMatchObject({ provider: 'OpenRouter', model: 'google/gemini-2.5-flash' });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer key-OpenRouter');
    expect(JSON.parse(options.body).model).toBe('google/gemini-2.5-flash');
    // Seulement des fournisseurs qui ne conservent pas les données
    expect(JSON.parse(options.body).provider).toEqual({ data_collection: 'deny' });
  });

  it('ne bascule pas sur un autre provider quand le provider choisi échoue', async () => {
    coursePageConfig.getProvider.mockReturnValue('OpenAI');
    getProviderByName.mockReturnValue(fakeProvider('OpenAI', 'gpt-4o'));
    global.fetch.mockResolvedValue(chatResponse('<!DOCTYPE html><html><body>coupé'));

    await expect(generateCoursePageFromImages({ images, childProfile }))
      .rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('envoie la clé Gemini dans l\'en-tête x-goog-api-key, jamais dans l\'URL', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('Gemini', 'gemini-2.5-flash')]);
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: PAGE }] } }] })
    });

    const result = await generateCoursePageFromImages({ images, childProfile });

    expect(result.provider).toBe('Gemini');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('key=');
    expect(options.headers['x-goog-api-key']).toBe('key-Gemini');
    expect(JSON.parse(options.body).contents[0].parts[1].inline_data).toEqual({ mime_type: 'image/png', data: 'AAAA' });
  });

  it('s\'arrête sans essayer le provider suivant quand la requête est annulée', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('LocalLLM', 'qwen-vl'), fakeProvider('OpenAI', 'gpt-4o')]);
    const controller = new AbortController();
    global.fetch.mockImplementation((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      setTimeout(() => controller.abort(Object.assign(new Error('client parti'), { code: 'CLIENT_CLOSED', isAbort: true })), 10);
    }));

    await expect(generateCoursePageFromImages({ images, childProfile }, { signal: controller.signal, deadline: Date.now() + 600000 }))
      .rejects.toMatchObject({ code: 'CLIENT_CLOSED' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // URL saisie depuis l'interface : pas de redirection suivie
    expect(global.fetch.mock.calls[0][1].redirect).toBe('error');
  });

  it('répond « délai dépassé » (AI_TIMEOUT) quand il ne reste plus assez de temps', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('OpenAI', 'gpt-4o')]);

    await expect(generateCoursePageFromImages({ images, childProfile }, { deadline: Date.now() + 1000 }))
      .rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("échoue avec AI_UNAVAILABLE si le provider choisi n'est pas configuré", async () => {
    coursePageConfig.getProvider.mockReturnValue('Gemini');
    getProviderByName.mockReturnValue(fakeProvider('Gemini', 'gemini-flash', false));

    await expect(generateCoursePageFromImages({ images, childProfile }))
      .rejects.toThrow(/provider choisi pour les pages de cours \(Gemini\)/);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
