/**
 * Tests de la génération de pages de cours HTML à partir de photos
 */

jest.mock('../../api/ai/services/aiProviders/index.js', () => ({
  getAvailableProviders: jest.fn()
}));

const { getAvailableProviders } = require('../../api/ai/services/aiProviders/index.js');
const { generateCoursePageFromImages } = require('../../api/ai/services/coursePageGenerator.js');
const {
  SUMMARY_MARKER,
  buildCoursePagePrompt,
  parseCoursePageResponse
} = require('../../api/ai/prompts/coursePageHtml.js');

const PAGE = '<!DOCTYPE html><html><head><title>Pythagore</title></head><body><span id="sOk">0</span></body></html>';
const fakeProvider = (name, model) => ({ getName: () => name, model, baseUrl: 'http://llm.local/v1' });
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
    expect(prompt).toContain('Léa, en classe : 4ème, matière : Mathématiques');
    expect(prompt).toContain('« le théorème de Pythagore »');
    expect(prompt).toContain('insister sur la réciproque');
    expect(prompt).toContain('id="sOk"');
    expect(prompt).toContain(SUMMARY_MARKER);
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

describe('generateCoursePageFromImages', () => {
  const images = [{ base64: 'AAAA', mimeType: 'image/png' }];
  const childProfile = { name: 'Léa', level: '4ème' };

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.OPENAI_API_KEY = 'sk-test-key-for-course-pages';
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.OPENAI_API_KEY;
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
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer sk-test-key-for-course-pages');
  });

  it('échoue avec AI_UNAVAILABLE sans provider capable de lire des photos', async () => {
    getAvailableProviders.mockReturnValue([fakeProvider('Groq', 'llama')]);

    await expect(generateCoursePageFromImages({ images, childProfile }))
      .rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
