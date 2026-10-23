/**
 * Logger (lib/logger.js) : écriture fichier par flux (aucune écriture synchrone par ligne),
 * rotation, masquage des données sensibles.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Logger, maskSensitive } = require('../../lib/logger.js');

function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function createFileLogger(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-logs-'));
  const logger = withEnv({ LOGS_DIR: dir, LOG_ENABLE_FILE: 'true', LOG_FORMAT: 'json', LOG_DEBUG: 'false', ...extraEnv }, () => new Logger());
  return { dir, logger };
}

describe('maskSensitive', () => {
  it('masque les champs sensibles quel que soit leur format de nom', () => {
    const masked = maskSensitive({
      pin: '1234',
      newPin: '5678',
      pin_code: '$2b$12$hash',
      password: 'x',
      apiKey: 'sk-abc',
      OPENAI_API_KEY: 'sk-abc',
      authorization: 'Bearer abc',
      token: 'eyJ...',
      extractedText: 'devoir de Léa : 7x8=56',
      image_data: 'data:image/png;base64,AAAA',
      tokenVersion: 3,
      requestId: 'abc-123',
      nested: { headers: { 'x-goog-api-key': 'AIza...' } }
    });

    for (const key of ['pin', 'newPin', 'pin_code', 'password', 'apiKey', 'OPENAI_API_KEY', 'authorization', 'token', 'extractedText', 'image_data']) {
      expect(masked[key]).toBe('[MASQUÉ]');
    }
    expect(masked.nested.headers['x-goog-api-key']).toBe('[MASQUÉ]');
    expect(masked.tokenVersion).toBe(3);
    expect(masked.requestId).toBe('abc-123');
  });

  it('masque les secrets reconnaissables dans le texte libre', () => {
    const text = maskSensitive(
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl ; cle sk-proj-abcdefghijklmnop ; ' +
      'https://x/v1?key=AIzaSyA1234567890abcdefghijk&b=1 ; postgresql://user:motdepasse@db:5432/app'
    );
    expect(text).not.toMatch(/eyJhbGci|abcdefghijklmnop|AIzaSyA1234567890|motdepasse/);
    expect(text).toContain('postgresql://user:****@db:5432/app');
  });

  it('sérialise les erreurs (message masqué) et gère les références circulaires', () => {
    const error = new Error('échec avec Bearer abc.def.ghi');
    const data = { error };
    data.self = data;
    const masked = maskSensitive(data);
    expect(masked.error).toMatchObject({ name: 'Error', message: expect.not.stringContaining('abc.def.ghi') });
    expect(masked.self).toBe('[circulaire]');
  });
});

describe('Logger (fichiers)', () => {
  it('écrit via un flux, sans écriture synchrone par ligne, avec les données masquées', async () => {
    const appendSpy = jest.spyOn(fs, 'appendFileSync');
    const writeSyncSpy = jest.spyOn(fs, 'writeFileSync');
    const { dir, logger } = createFileLogger();
    try {
      for (let i = 0; i < 20; i++) {
        logger.info(`ligne ${i}`, { pin: '1234', i });
      }
      logger.error('échec', new Error('boom'));
      await logger.close();

      expect(appendSpy).not.toHaveBeenCalled();
      expect(writeSyncSpy).not.toHaveBeenCalled();
      const info = fs.readFileSync(path.join(dir, 'info.log'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
      expect(info).toHaveLength(20);
      expect(info[3]).toMatchObject({ level: 'INFO', message: 'ligne 3', pin: '[MASQUÉ]', i: 3 });
      const errors = fs.readFileSync(path.join(dir, 'error.log'), 'utf8');
      expect(errors).toContain('"errorMessage":"boom"');
    } finally {
      appendSpy.mockRestore();
      writeSyncSpy.mockRestore();
    }
  });

  it('fait tourner le fichier quand il dépasse LOG_MAX_SIZE', async () => {
    const { dir, logger } = createFileLogger({ LOG_MAX_SIZE: '300', LOG_MAX_FILES: '3' });
    for (let i = 0; i < 30; i++) {
      logger.info(`message numéro ${i} avec un peu de texte`);
    }
    await logger.close();

    const files = fs.readdirSync(dir).sort();
    expect(files).toEqual(expect.arrayContaining(['info.log', 'info.1.log', 'info.2.log']));
    expect(files).not.toContain('info.3.log');
  });

  it('n\'écrit plus dans les fichiers après close() (stdout seulement)', async () => {
    const { dir, logger } = createFileLogger();
    logger.info('avant');
    await logger.close();
    logger.info('après');
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(fs.readFileSync(path.join(dir, 'info.log'), 'utf8')).not.toContain('après');
  });
});
