/**
 * Transaction PostgreSQL sur une connexion dédiée du pool (même principe que badgeService).
 * La fonction reçoit le client et utilise client.query(text, params).
 * COMMIT si elle réussit, ROLLBACK (puis exception relancée) sinon.
 */
const { pool } = require('./database.js');
const { withQueryTimeout, TIMEOUTS } = require('./queries.js');

async function withTransaction(fn, { timeoutMs = TIMEOUTS.LONG, operation = 'transaction' } = {}) {
  // connectionTimeoutMillis (lib/database.js) borne déjà l'attente d'une connexion
  const client = await pool.connect();
  // true : la connexion est détruite au lieu d'être rendue au pool
  let destroyClient = false;
  try {
    await client.query('BEGIN');

    let fnSettled = false;
    const work = Promise.resolve().then(() => fn(client));
    // Attaché avant withQueryTimeout : fnSettled est à jour quand le délai rejette
    work.then(() => { fnSettled = true; }, () => { fnSettled = true; });

    let result;
    try {
      result = await withQueryTimeout(work, timeoutMs, operation);
    } catch (error) {
      if (!fnSettled) {
        // Délai dépassé alors que fn tourne encore : ses requêtes suivantes ne doivent
        // s'exécuter ni hors transaction (après un ROLLBACK) ni sur une connexion rendue
        // au pool (dans la transaction d'une autre requête). La connexion est détruite :
        // PostgreSQL annule la transaction ouverte et les requêtes restantes de fn échouent.
        destroyClient = true;
      }
      throw error;
    }

    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (!destroyClient) {
      await client.query('ROLLBACK').catch(() => {
        destroyClient = true;
      });
    }
    throw error;
  } finally {
    client.release(destroyClient ? true : undefined);
  }
}

module.exports = { withTransaction };
