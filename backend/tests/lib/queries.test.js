/**
 * withQueryTimeout (lib/queries.js) : minuteur toujours annulé, résultat tardif ignoré
 * sans « unhandled rejection ».
 */

const { withQueryTimeout, TIMEOUTS } = require('../../lib/queries.js');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('withQueryTimeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renvoie le résultat et annule le minuteur', async () => {
    jest.useFakeTimers();
    await expect(withQueryTimeout(Promise.resolve([{ ok: 1 }]), 5000, 'test')).resolves.toEqual([{ ok: 1 }]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('propage l\'erreur de la requête et annule le minuteur', async () => {
    jest.useFakeTimers();
    const error = Object.assign(new Error('violation'), { code: '23505' });
    await expect(withQueryTimeout(Promise.reject(error), 5000)).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejette avec une erreur GATEWAY_TIMEOUT au-delà du délai', async () => {
    const pending = deferred();
    await expect(withQueryTimeout(pending.promise, 20, 'lecture lente')).rejects.toMatchObject({
      code: 'GATEWAY_TIMEOUT',
      isTimeout: true,
      timeoutMs: 20,
      operation: 'lecture lente'
    });
  });

  it('ignore une erreur arrivée après le timeout (pas de rejet non géré)', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const pending = deferred();
      await expect(withQueryTimeout(pending.promise, 10)).rejects.toMatchObject({ code: 'GATEWAY_TIMEOUT' });
      pending.reject(new Error('arrivée trop tard'));
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('exécute une requête paresseuse (thenable sql`...`)', async () => {
    const execute = jest.fn(() => Promise.resolve(['ligne']));
    const lazyQuery = { then: (resolve, reject) => execute().then(resolve, reject) };
    await expect(withQueryTimeout(lazyQuery, 1000)).resolves.toEqual(['ligne']);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('utilise le délai par défaut si le délai fourni est invalide', async () => {
    jest.useFakeTimers();
    const pending = deferred();
    const promise = withQueryTimeout(pending.promise, Number.NaN);
    const assertion = expect(promise).rejects.toMatchObject({ timeoutMs: TIMEOUTS.DEFAULT });
    jest.advanceTimersByTime(TIMEOUTS.DEFAULT);
    await assertion;
  });
});
