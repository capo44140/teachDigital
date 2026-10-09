/**
 * Tests du constructeur de requêtes sql`...` (lib/database.js)
 * pg est mocké : aucune connexion réelle.
 */

jest.mock('pg', () => {
  const query = jest.fn(async () => ({ rows: [{ ok: true }] }));
  return {
    Pool: class {
      constructor () {
        this.query = query;
      }

      on () {}
    },
    __query: query
  };
});

const { __query: poolQuery } = require('pg');
const { sql, SqlQuery } = require('../../lib/database.js');

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
