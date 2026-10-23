/**
 * OCR Tesseract (api/ai/services/ocr.js) : un seul worker réutilisé, cache des langues
 * dans TESSERACT_CACHE_DIR, délai maximum, annulation, texte jamais journalisé
 */

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn()
}));

const os = require('os');
const path = require('path');
const Tesseract = require('tesseract.js');
const logger = require('../../lib/logger.js');

const CACHE_DIR = path.join(os.tmpdir(), `teachdigital-ocr-test-${process.pid}`);

function fakeWorker(recognize) {
  return { recognize: jest.fn(recognize), terminate: jest.fn(async () => {}) };
}

let ocr;

beforeAll(() => {
  process.env.TESSERACT_CACHE_DIR = CACHE_DIR;
  ocr = require('../../api/ai/services/ocr.js');
});

afterAll(async () => {
  delete process.env.TESSERACT_CACHE_DIR;
  delete process.env.OCR_TIMEOUT_MS;
  await ocr.terminateOcrWorker();
});

beforeEach(async () => {
  await ocr.terminateOcrWorker();
  Tesseract.createWorker.mockReset();
  delete process.env.OCR_TIMEOUT_MS;
});

it('réutilise un seul worker (données de langue en cache dans TESSERACT_CACHE_DIR)', async () => {
  const worker = fakeWorker(async () => ({ data: { text: '  Les fractions  ' } }));
  Tesseract.createWorker.mockResolvedValue(worker);

  await expect(ocr.extractTextFromImage('data:image/png;base64,AAAA')).resolves.toBe('Les fractions');
  await expect(ocr.extractTextFromImage('AAAA')).resolves.toBe('Les fractions');

  expect(Tesseract.createWorker).toHaveBeenCalledTimes(1);
  const [languages, oem, options] = Tesseract.createWorker.mock.calls[0];
  expect(languages).toBe('fra+eng');
  expect(oem).toBe(1);
  expect(options.cachePath).toBe(CACHE_DIR);
  expect(worker.recognize).toHaveBeenCalledTimes(2);
  expect(Buffer.isBuffer(worker.recognize.mock.calls[0][0])).toBe(true);
});

it('ne journalise jamais le texte reconnu', async () => {
  const secret = 'Devoir de Léa : ma maison est au 12 rue des Lilas';
  Tesseract.createWorker.mockResolvedValue(fakeWorker(async () => ({ data: { text: secret } })));
  const spies = ['info', 'debug', 'warn', 'error'].map(level => jest.spyOn(logger, level));

  await ocr.extractTextFromImage('AAAA');

  for (const spy of spies) {
    for (const args of spy.mock.calls) {
      expect(JSON.stringify(args)).not.toContain('rue des Lilas');
    }
    spy.mockRestore();
  }
});

it('arrête le worker au-delà de OCR_TIMEOUT_MS puis en recrée un à l\'appel suivant', async () => {
  process.env.OCR_TIMEOUT_MS = '50';
  const stuck = fakeWorker(() => new Promise(() => {}));
  const healthy = fakeWorker(async () => ({ data: { text: 'ok' } }));
  Tesseract.createWorker.mockResolvedValueOnce(stuck).mockResolvedValueOnce(healthy);

  await expect(ocr.extractTextFromImage('AAAA')).rejects.toMatchObject({ code: 'OCR_TIMEOUT' });
  expect(stuck.terminate).toHaveBeenCalled();

  await expect(ocr.extractTextFromImage('AAAA')).resolves.toBe('ok');
  expect(Tesseract.createWorker).toHaveBeenCalledTimes(2);
});

it('rejette dès que la requête est annulée', async () => {
  const stuck = fakeWorker(() => new Promise(() => {}));
  Tesseract.createWorker.mockResolvedValue(stuck);
  const controller = new AbortController();
  setTimeout(() => controller.abort(Object.assign(new Error('client parti'), { code: 'CLIENT_CLOSED', isAbort: true })), 20);

  await expect(ocr.extractTextFromImage('AAAA', { signal: controller.signal })).rejects.toMatchObject({ code: 'CLIENT_CLOSED' });
  expect(stuck.terminate).toHaveBeenCalled();
});

it('renvoie un texte par défaut quand l\'image ne contient pas de texte', async () => {
  Tesseract.createWorker.mockResolvedValue(fakeWorker(async () => ({ data: { text: '   ' } })));
  await expect(ocr.extractTextFromImage('AAAA')).resolves.toBe('Aucun texte détecté dans l\'image.');
});

it('terminateOcrWorker ne lève jamais d\'erreur', async () => {
  Tesseract.createWorker.mockRejectedValue(new Error('téléchargement des langues impossible'));
  await expect(ocr.extractTextFromImage('AAAA')).rejects.toThrow('téléchargement');
  await expect(ocr.terminateOcrWorker()).resolves.toBeUndefined();
});
