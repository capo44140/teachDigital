/**
 * URL du LLM local (POST /ai/local-llm/url) : http(s) uniquement, sans identifiants,
 * jamais vers une adresse link-local / de métadonnées cloud (SSRF)
 */

// Table ai_settings simulée en mémoire
const mockRows = new Map();
jest.mock('../../lib/database.js', () => ({
  pool: {
    query: jest.fn(async (sql, params) => {
      if (sql.includes('INSERT INTO ai_settings')) {
        mockRows.set(params[0], params[1]);
        return { rows: [] };
      }
      if (sql.includes('DELETE FROM ai_settings')) {
        mockRows.delete(params[0]);
        return { rows: [] };
      }
      if (sql.includes('SELECT key, value FROM ai_settings')) {
        return { rows: params[0].filter(key => mockRows.has(key)).map(key => ({ key, value: mockRows.get(key) })) };
      }
      throw new Error(`Requête inattendue: ${sql}`);
    })
  }
}));

const dns = require('dns');
const handleAI = require('../../api/ai/index.js');
const { validateLocalLLMUrl, isForbiddenAddress } = require('../../api/ai/utils/urlSafety.js');
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers.js');

afterEach(() => {
  jest.restoreAllMocks();
  mockRows.clear();
});

describe('isForbiddenAddress', () => {
  it.each([
    '169.254.169.254',
    '169.254.0.1',
    '0.0.0.0',
    'fd00:ec2::254',
    'FD00:EC2:0:0:0:0:0:254',
    'fe80::1',
    'febf::1',
    '::ffff:169.254.169.254',
    '::ffff:a9fe:a9fe',
    '::'
  ])('refuse %s', (address) => {
    expect(isForbiddenAddress(address)).toBe(true);
  });

  it.each(['192.168.1.20', '10.0.0.5', '172.17.0.1', '127.0.0.1', '::1', 'fd00::1', '2001:db8::1', '::ffff:192.168.1.20'])('accepte %s', (address) => {
    expect(isForbiddenAddress(address)).toBe(false);
  });
});

describe('validateLocalLLMUrl', () => {
  it('accepte une adresse du réseau local en http ou https', async () => {
    await expect(validateLocalLLMUrl('http://192.168.1.20:1234/v1')).resolves.toMatchObject({ ok: true });
    await expect(validateLocalLLMUrl('https://10.0.0.8/v1')).resolves.toMatchObject({ ok: true });
  });

  it.each([
    'file:///etc/passwd',
    'ftp://192.168.1.20/v1',
    'gopher://192.168.1.20:70/',
    'pas une url',
    'http://user:secret@192.168.1.20:1234/v1',
    'http://169.254.169.254/latest/meta-data',
    'http://0xA9FEA9FE/latest/meta-data',
    'http://[fd00:ec2::254]/latest/meta-data',
    'http://[::ffff:169.254.169.254]/',
    'http://[fe80::1]:1234/v1',
    'http://metadata.google.internal/computeMetadata/v1',
    'http://0.0.0.0:1234/v1'
  ])('refuse %s', async (url) => {
    const result = await validateLocalLLMUrl(url);
    expect(result.ok).toBe(false);
    expect(result.message).toEqual(expect.any(String));
  });

  it('refuse un nom d\'hôte qui pointe vers une adresse de métadonnées', async () => {
    const lookup = jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '192.168.1.3', family: 4 }, { address: '169.254.169.254', family: 4 }]);
    await expect(validateLocalLLMUrl('http://lmstudio.piege.example:1234/v1')).resolves.toMatchObject({ ok: false });
    expect(lookup).toHaveBeenCalledWith('lmstudio.piege.example', { all: true });
  });

  it('accepte un nom d\'hôte du réseau local, même non résolu depuis le conteneur', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([{ address: '192.168.1.20', family: 4 }]);
    await expect(validateLocalLLMUrl('http://pc-salon:1234/v1')).resolves.toMatchObject({ ok: true });

    jest.spyOn(dns.promises, 'lookup').mockRejectedValueOnce(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }));
    await expect(validateLocalLLMUrl('http://pc-bureau:1234/v1')).resolves.toMatchObject({ ok: true });
  });
});

describe('POST /local-llm/url', () => {
  async function postUrl(baseUrl) {
    const req = createMockRequest('POST', '/local-llm/url', { baseUrl });
    const res = createMockResponse();
    await handleAI(req, res);
    return res;
  }

  it('enregistre une adresse du réseau local', async () => {
    const res = await postUrl('http://192.168.1.20:1234/v1/');
    expect(res.statusCode).toBe(200);
    expect(mockRows.get('local_llm_url')).toBe('http://192.168.1.20:1234/v1');
  });

  it.each([
    'http://169.254.169.254/latest/meta-data',
    'http://[fd00:ec2::254]/',
    'http://user:pass@192.168.1.20:1234/v1',
    'javascript:alert(1)'
  ])('refuse %s sans rien enregistrer', async (baseUrl) => {
    const res = await postUrl(baseUrl);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockRows.has('local_llm_url')).toBe(false);
  });

  it('refuse une valeur qui n\'est ni une chaîne ni null', async () => {
    const res = await postUrl(12345);
    expect(res.statusCode).toBe(400);
  });
});
