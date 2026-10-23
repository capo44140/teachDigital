/**
 * withTransaction (base de test dédiée) : rien n'est écrit hors transaction,
 * même quand le délai expire pendant que la fonction tourne encore.
 */
const { describeWithDb } = require('../helpers/testHelpers.js');
const { pool } = require('../../lib/database.js');
const { withTransaction } = require('../../lib/transaction.js');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describeWithDb('withTransaction', () => {
  beforeAll(async () => {
    await pool.query('DROP TABLE IF EXISTS tx_probe; CREATE TABLE tx_probe (step text)');
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS tx_probe');
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM tx_probe');
  });

  async function steps() {
    const { rows } = await pool.query('SELECT step FROM tx_probe ORDER BY step');
    return rows.map(row => row.step);
  }

  test('COMMIT si la fonction réussit', async () => {
    const result = await withTransaction(async client => {
      await client.query("INSERT INTO tx_probe VALUES ('a'), ('b')");
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(await steps()).toEqual(['a', 'b']);
  });

  test('ROLLBACK si la fonction échoue, et la connexion reste utilisable', async () => {
    await expect(withTransaction(async client => {
      await client.query("INSERT INTO tx_probe VALUES ('a')");
      throw new Error('échec métier');
    })).rejects.toThrow('échec métier');
    expect(await steps()).toEqual([]);
    expect(pool.totalCount).toBeGreaterThan(0);
  });

  test('délai dépassé : les requêtes suivantes de la fonction ne sont jamais écrites', async () => {
    let lateError = null;
    await expect(withTransaction(async client => {
      try {
        await client.query("INSERT INTO tx_probe VALUES ('avant-delai')");
        await client.query('SELECT pg_sleep(0.6)');
        await client.query("INSERT INTO tx_probe VALUES ('apres-delai-1')");
        await client.query("INSERT INTO tx_probe VALUES ('apres-delai-2')");
      } catch (error) {
        // Connexion détruite au timeout : la requête en cours ou la suivante échoue
        lateError = error;
      }
    }, { timeoutMs: 300, operation: 'test' })).rejects.toMatchObject({ code: 'GATEWAY_TIMEOUT' });

    // Laisser la fonction terminer (pg_sleep) puis vérifier que rien n'a été écrit
    await wait(1500);
    expect(await steps()).toEqual([]);
    expect(lateError).not.toBeNull();

    // Le pool reste sain pour les requêtes suivantes
    const { rows } = await pool.query('SELECT 1 AS ok');
    expect(rows[0].ok).toBe(1);
  });
});
