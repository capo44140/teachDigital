/**
 * Arrêt propre (lib/shutdown.js) : plus de nouvelles connexions, requêtes en cours terminées
 * (dans la limite du délai), nettoyage dans l'ordre, sortie du processus.
 */

const http = require('http');
const { createShutdownHandler } = require('../../lib/shutdown.js');

const silentLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function startServer(handler) {
  const server = http.createServer(handler);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path, agent: false }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

describe('createShutdownHandler', () => {
  it('laisse finir la requête en cours, refuse les nouvelles connexions puis nettoie dans l\'ordre', async () => {
    let releaseSlow;
    const server = await startServer((req, res) => {
      if (req.url === '/slow') {
        releaseSlow = () => res.end('fini');
        return;
      }
      res.end('ok');
    });
    const { port } = server.address();
    const order = [];
    const exit = jest.fn();
    const state = { ready: true, shuttingDown: false };
    const shutdown = createShutdownHandler({
      server,
      state,
      timeoutMs: 5000,
      log: silentLog,
      exit,
      cleanup: [
        ['pool', async () => { order.push('pool'); }],
        ['logs', async () => { order.push('logs'); }]
      ]
    });

    const inFlight = get(port, '/slow');
    await new Promise(resolve => setTimeout(resolve, 50));

    const done = shutdown('SIGTERM');
    expect(state).toEqual({ ready: false, shuttingDown: true });
    // Idempotent : un second signal ne relance pas l'arrêt
    expect(shutdown('SIGINT')).toBe(done);

    // Le port n'accepte plus de connexions
    await expect(get(port, '/')).rejects.toMatchObject({ code: 'ECONNREFUSED' });
    expect(exit).not.toHaveBeenCalled();

    releaseSlow();
    await expect(inFlight).resolves.toEqual({ status: 200, body: 'fini' });
    await done;

    expect(order).toEqual(['pool', 'logs']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('coupe les connexions restantes après le délai et continue le nettoyage même si une étape échoue', async () => {
    const server = await startServer(() => { /* ne répond jamais */ });
    const { port } = server.address();
    const exit = jest.fn();
    const cleaned = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      timeoutMs: 100,
      log: silentLog,
      exit,
      cleanup: [
        ['en échec', async () => { throw new Error('pool déjà fermé'); }],
        ['suivant', cleaned]
      ]
    });

    const hanging = get(port, '/bloquee').catch(error => error);
    await new Promise(resolve => setTimeout(resolve, 50));
    const startedAt = Date.now();
    await shutdown('SIGTERM');

    expect(Date.now() - startedAt).toBeLessThan(3000);
    expect(await hanging).toMatchObject({ code: expect.stringMatching(/ECONNRESET|socket hang up/i) });
    expect(silentLog.warn).toHaveBeenCalledWith(expect.stringContaining('connexions coupées'), expect.anything());
    expect(cleaned).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('arrêt avant la mise en écoute : nettoyage puis sortie avec le code demandé', async () => {
    const exit = jest.fn();
    const cleaned = jest.fn();
    const shutdown = createShutdownHandler({ server: () => null, log: silentLog, exit, cleanup: [['pool', cleaned]] });

    await shutdown('startup-failure', 1);
    expect(cleaned).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
