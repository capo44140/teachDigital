/**
 * Tests du constructeur de requêtes sql`...` (lib/database.js)
 * pg est mocké : aucune connexion réelle.
 */

jest.mock('pg', () => {
  const query = jest.fn(async () => ({ rows: [{ ok: true }] }));
  const configs = [];
  return {
    Pool: class {
      constructor (config) {
        configs.push(config);
        this.query = query;
      }

      on () {}
    },
    __query: query,
    __configs: configs
  };
});

const { __query: poolQuery, __configs: poolConfigs } = require('pg');
const { sql, SqlQuery, waitForDatabase, DB_SETTINGS, getConnectionConfig } = require('../../lib/database.js');

beforeEach(() => {
  poolQuery.mockClear();
});

describe('sql`...`', () => {
  it('paramètre les valeurs interpolées', () => {
    const q = sql`SELECT * FROM t WHERE id = ${5} AND name = ${'x'}`;
    expect(q.text).toBe('SELECT * FROM t WHERE id = $1 AND name = $2');
    expect(q.params).toEqual([5, 'x']);
  });

  it('traite un objet { text, params } venant d\'une requête HTTP comme une simple valeur (pas d\'injection)', () => {
    const payload = { text: 'CAST((SELECT pin_code FROM pin_codes LIMIT 1) AS int)', params: [] };
    const q = sql`INSERT INTO quiz_results (profile_id) VALUES (${payload})`;

    expect(q.text).toBe('INSERT INTO quiz_results (profile_id) VALUES ($1)');
    expect(q.text).not.toContain('pin_codes');
    expect(q.params).toEqual([payload]);
  });

  it('imbrique un fragment construit par sql`...` en réindexant ses paramètres', () => {
    const filter = sql`AND profile_id = ${2}`;
    const q = sql`SELECT * FROM lessons WHERE id = ${1} ${filter}`;

    expect(filter).toBeInstanceOf(SqlQuery);
    expect(q.text).toBe('SELECT * FROM lessons WHERE id = $1 AND profile_id = $2');
    expect(q.params).toEqual([1, 2]);
  });

  it('n\'exécute rien tant qu\'on n\'attend pas le résultat', () => {
    sql`SELECT 1`;
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('se résout avec un await direct (pas d\'attente infinie)', async () => {
    await expect(sql`SELECT ${1}`).resolves.toEqual([{ ok: true }]);
    expect(poolQuery).toHaveBeenCalledWith('SELECT $1', [1]);
  }, 2000);

  it('n\'exécute la requête qu\'une fois même si then() est appelé plusieurs fois', async () => {
    const q = sql`SELECT 1`;
    await q;
    await q;
    await Promise.race([q]);
    expect(poolQuery).toHaveBeenCalledTimes(1);
  });
});

describe('configuration du pool', () => {
  it("borne l'attente de connexion et les requêtes, taille du pool configurable (défauts)", () => {
    const config = poolConfigs[0];
    expect(config.connectionTimeoutMillis).toBe(5000);
    expect(config.statement_timeout).toBe(10000);
    expect(config.query_timeout).toBeGreaterThan(config.statement_timeout);
    expect(config.max).toBe(20);
    expect(DB_SETTINGS).toMatchObject({ connectionTimeoutMs: 5000, statementTimeoutMs: 10000, maxConnections: 20 });
  });

  it('le statement_timeout reste au-dessus du plus long timeout applicatif', () => {
    const { TIMEOUTS } = require('../../lib/queries.js');
    expect(DB_SETTINGS.statementTimeoutMs).toBeGreaterThan(TIMEOUTS.LONG);
  });

  it('expose la configuration de connexion seule (pour le runner de migrations)', () => {
    expect(getConnectionConfig()).toEqual({ connectionString: process.env.DATABASE_URL });
  });
});

describe('waitForDatabase', () => {
  it("réessaie avec un délai croissant jusqu'à ce que PostgreSQL réponde", async () => {
    const client = {
      query: jest.fn()
        .mockRejectedValueOnce(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }))
        .mockRejectedValueOnce(Object.assign(new Error('the database system is starting up'), { code: '57P03' }))
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
    };
    const wait = jest.fn(async () => {});

    const result = await waitForDatabase({ client, wait, maxWaitMs: 60000, initialDelayMs: 1000, maxDelayMs: 15000 });

    expect(result.attempts).toBe(3);
    expect(wait.mock.calls.map(call => call[0])).toEqual([1000, 2000]);
  });

  it('abandonne après maxWaitMs avec une erreur DB_UNAVAILABLE', async () => {
    const client = { query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    await expect(waitForDatabase({ client, wait: async () => {}, maxWaitMs: 0 }))
      .rejects.toMatchObject({ code: 'DB_UNAVAILABLE' });
  });

  it("s'arrête si un arrêt du serveur est demandé pendant l'attente", async () => {
    const client = { query: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    let stop = false;
    const wait = jest.fn(async () => { stop = true; });
    await expect(waitForDatabase({ client, wait, maxWaitMs: 600000, shouldStop: () => stop }))
      .rejects.toMatchObject({ code: 'DB_UNAVAILABLE' });
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
