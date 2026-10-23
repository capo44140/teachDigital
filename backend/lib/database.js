const { Pool } = require('pg');
const { loadBackendEnv } = require('./loadEnv.js');
const logger = require('./logger.js');

// Charger les variables d'environnement (prod: `.env` uniquement, dev: `.env` puis `env`)
loadBackendEnv();

// Configuration de la connexion PostgreSQL
// Supporte deux méthodes : variables séparées ou DATABASE_URL

function envInt(key, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[key];
  const n = raw !== undefined && raw !== null && String(raw).trim() !== '' ? parseInt(String(raw).trim(), 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Timeouts et taille du pool (configurables, valeurs par défaut adaptées au NAS)
// - statement_timeout : PostgreSQL annule lui-même une requête trop longue (10 s par défaut),
//   juste au-dessus du plus long timeout applicatif (API_DB_TIMEOUT_LONG_MS = 9 s, lib/queries.js) :
//   une requête abandonnée côté API ne continue pas à tourner indéfiniment côté base.
// - connectionTimeoutMillis : attente max d'une connexion (création ou file d'attente du pool).
// - DB_QUERY_TIMEOUT_MS reste accepté (ancien nom) si DB_STATEMENT_TIMEOUT_MS est absent.
const DB_SETTINGS = Object.freeze({
  statementTimeoutMs: envInt('DB_STATEMENT_TIMEOUT_MS', envInt('DB_QUERY_TIMEOUT_MS', 10000, { min: 1000 }), { min: 1000 }),
  connectionTimeoutMs: envInt('DB_CONNECTION_TIMEOUT_MS', 5000, { min: 1000, max: 60000 }),
  maxConnections: envInt('DB_MAX_CONNECTIONS', 20, { min: 1, max: 200 }),
  idleTimeoutMs: envInt('DB_IDLE_TIMEOUT_MS', 30000, { min: 1000 }),
  // Transaction ouverte mais inactive (code bloqué entre BEGIN et COMMIT) : PostgreSQL ferme la session
  idleInTransactionTimeoutMs: envInt('DB_IDLE_IN_TRANSACTION_TIMEOUT_MS', 30000, { min: 1000 })
});

// Mode silencieux pour la production (pas de logs détaillés)
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const ENABLE_SQL_LOGS = process.env.DB_ENABLE_LOGS === 'true' || IS_DEVELOPMENT;

// Timeout pour les requêtes SQL
const queryTimeout = DB_SETTINGS.statementTimeoutMs;

/**
 * Paramètres de connexion seuls (hôte, base, identifiants, SSL), sans réglages de pool.
 * Utilisé aussi par le runner de migrations (lib/migrate.js), qui ouvre sa propre connexion.
 * @returns {Object} Configuration pg (host/port/database/user/password/ssl ou connectionString)
 */
function getConnectionConfig() {
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD) {
    // Méthode 1 : Variables d'environnement séparées (préférée)
    return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl
    };
  }

  if (process.env.DATABASE_URL) {
    // Méthode 2 : Connection string (compatibilité)
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
      throw new Error('DATABASE_URL doit commencer par postgresql:// ou postgres://');
    }
    return { connectionString, ...(process.env.DB_SSL === 'true' ? { ssl } : {}) };
  }

  throw new Error('Configuration PostgreSQL manquante. Définissez soit (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) soit DATABASE_URL.');
}

let connectionConfig;
try {
  connectionConfig = getConnectionConfig();
} catch (error) {
  logger.error('❌ Erreur de configuration PostgreSQL', {
    error: error.message,
    hint: 'Variables requises: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD (ou DATABASE_URL)'
  });
  throw error;
}

const poolConfig = {
  ...connectionConfig,
  max: DB_SETTINGS.maxConnections,
  min: 0, // Pas de connexions au démarrage (lazy connection)
  idleTimeoutMillis: DB_SETTINGS.idleTimeoutMs,
  connectionTimeoutMillis: DB_SETTINGS.connectionTimeoutMs,
  statement_timeout: DB_SETTINGS.statementTimeoutMs,
  // Filet de sécurité côté client (réseau coupé : le serveur ne peut plus répondre)
  query_timeout: DB_SETTINGS.statementTimeoutMs + 2000,
  idle_in_transaction_session_timeout: DB_SETTINGS.idleInTransactionTimeoutMs,
  application_name: 'teachdigital-backend',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// Créer l'instance de connexion PostgreSQL avec Pool
const pool = new Pool(poolConfig);

pool.on('error', (error) => {
  // Erreur sur une connexion inactive du pool (base redémarrée, réseau coupé) :
  // la connexion est retirée du pool, les requêtes suivantes en ouvrent une nouvelle.
  logger.error('❌ Connexion PostgreSQL inactive perdue', {
    errorCode: error.code,
    errorMessage: error.message
  });
});

// Résumé de la configuration au démarrage (sans mot de passe)
logger.info('Configuration PostgreSQL', {
  target: connectionConfig.connectionString
    ? connectionConfig.connectionString.replace(/:[^:@/]+@/, ':****@')
    : `${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database} (utilisateur ${connectionConfig.user})`,
  ssl: !!connectionConfig.ssl,
  maxConnections: DB_SETTINGS.maxConnections,
  connectionTimeoutMs: DB_SETTINGS.connectionTimeoutMs,
  statementTimeoutMs: DB_SETTINGS.statementTimeoutMs,
  idleTimeoutMs: DB_SETTINGS.idleTimeoutMs,
  sqlLogs: ENABLE_SQL_LOGS
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Attend que PostgreSQL réponde (démarrage du NAS : la base peut démarrer après le backend).
 * Réessaie avec un délai croissant (1 s, 2 s, 4 s... plafonné à maxDelayMs).
 *
 * @param {Object} [options]
 * @param {number} [options.maxWaitMs] - Attente totale max (DB_STARTUP_TIMEOUT_MS, défaut 5 min)
 * @param {number} [options.initialDelayMs=1000]
 * @param {number} [options.maxDelayMs=15000]
 * @param {() => boolean} [options.shouldStop] - Arrêt anticipé (ex. SIGTERM pendant l'attente)
 * @param {Object} [options.client] - Objet exposant query() (défaut : le pool)
 * @returns {Promise<{attempts: number, waitedMs: number}>}
 */
async function waitForDatabase({
  maxWaitMs = envInt('DB_STARTUP_TIMEOUT_MS', 300000, { min: 0 }),
  initialDelayMs = 1000,
  maxDelayMs = 15000,
  shouldStop = () => false,
  client = pool,
  wait = sleep
} = {}) {
  const startedAt = Date.now();
  let delay = initialDelayMs;
  let attempts = 0;

  for (;;) {
    attempts++;
    try {
      await client.query('SELECT 1');
      const waitedMs = Date.now() - startedAt;
      if (attempts > 1) {
        logger.info('✅ PostgreSQL joignable', { attempts, waitedMs });
      }
      return { attempts, waitedMs };
    } catch (error) {
      const waitedMs = Date.now() - startedAt;
      if (shouldStop() || waitedMs + delay > maxWaitMs) {
        const finalError = new Error(`PostgreSQL injoignable après ${attempts} tentative(s) (${Math.round(waitedMs / 1000)} s)`);
        finalError.code = 'DB_UNAVAILABLE';
        finalError.cause = error;
        throw finalError;
      }
      logger.warn('⏳ PostgreSQL injoignable, nouvelle tentative', {
        attempts,
        retryInMs: delay,
        errorCode: error.code,
        errorMessage: error.message
      });
      await wait(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
}

// Objet spécial pour les identifiants SQL
function SqlIdentifier(value) {
  this.isIdentifier = true;
  this.value = String(value);
}

// Fonction helper pour construire une requête SQL à partir d'un template literal
function buildQuery(strings, values) {
  const params_array = [];
  let paramCounter = 1;

  const text = strings.reduce((acc, str, i) => {
    let result = acc + str;

    if (i < values.length) {
      const value = values[i];

      if (value instanceof SqlIdentifier) {
        // Les identifiants sont intégrés directement (pas de paramètre)
        result += value.value;
      } else if (value instanceof SqlQuery) {
        // Seul un fragment construit par sql`...` peut être imbriqué : un objet
        // { text, params } venant d'une requête HTTP (req.body) reste un simple paramètre,
        // sinon son texte serait injecté tel quel dans la requête (injection SQL).
        // On doit réindexer les paramètres
        const subText = String(value.text || '');
        const subParams = value.params || [];

        if (subParams.length > 0) {
          const reindexedText = subText.replace(/\$(\d+)/g, (match, num) => {
            const oldIndex = parseInt(num, 10);
            if (oldIndex > 0 && oldIndex <= subParams.length) {
              params_array.push(subParams[oldIndex - 1]);
              const newIndex = paramCounter++;
              return '$' + newIndex;
            }
            return match; // Garder le placeholder original si index invalide
          });
          result += reindexedText;
        } else {
          // Pas de paramètres, juste ajouter le texte
          result += subText;
        }
      } else if (value === undefined || value === null) {
        // Les valeurs NULL deviennent le texte "NULL"
        result += 'NULL';
      } else {
        // Les valeurs normales deviennent des paramètres
        params_array.push(value);
        result += '$' + paramCounter++;
      }
    }

    return result;
  }, '');

  return { text, params: params_array };
}

// Créer une fonction sql compatible avec l'API postgres et template literals
function sql(strings, ...values) {
  // Gérer les deux cas d'appel:
  // 1. Template literal: sql`SELECT ...`
  // 2. Appel normal: sql(text, params)
  const query = Array.isArray(strings)
    ? buildQuery(strings, values)
    : { text: strings, params: values[0] || [] };

  const queryText = query.text;
  const queryParams = query.params;

  // Exécutée seulement quand on await (voir SqlQuery)
  const executeQuery = async () => {
    const startedAt = Date.now();
    const queryPreview = ENABLE_SQL_LOGS
      ? (queryText.length > 100 ? queryText.substring(0, 100) + '...' : queryText)
      : '';

    try {
      // statement_timeout (serveur) et query_timeout (client) bornent la durée de la requête
      const result = await pool.query(queryText, queryParams);
      const durationMs = Date.now() - startedAt;

      if (ENABLE_SQL_LOGS) {
        logger.debug('SQL exécutée', {
          query: queryPreview,
          durationMs,
          rows: result.rows.length,
          pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }
        });
      }

      // Requête proche du timeout : toujours signalée (le pool est peut-être saturé)
      if (durationMs > queryTimeout * 0.8) {
        logger.warn('🐢 Requête SQL lente (proche du statement_timeout)', {
          durationMs,
          statementTimeoutMs: queryTimeout,
          poolWaiting: pool.waitingCount
        });
      }

      return result.rows;
    } catch (error) {
      // Jamais les paramètres dans les logs (PIN hachés, données enfants...)
      logger.error('❌ Erreur SQL', {
        errorCode: error.code,
        errorMessage: error.message,
        durationMs: Date.now() - startedAt,
        ...(ENABLE_SQL_LOGS ? { query: queryPreview, position: error.position, hint: error.hint } : {})
      });
      throw error;
    }
  };

  return new SqlQuery(queryText, queryParams, executeQuery);
}

// Requête paresseuse : rien n'est exécuté tant qu'on ne fait pas await / then().
// Ce n'est volontairement PAS une Promise native : « await » sur une Promise native
// ignore un then() surchargé et attendrait indéfiniment. Ici, await appelle bien then().
// L'exécution est mémorisée : plusieurs then() ne relancent pas la requête.
class SqlQuery {
  constructor (text, params, execute) {
    this.text = text;
    this.params = params;
    Object.defineProperty(this, '_execute', { value: execute });
    Object.defineProperty(this, '_promise', { value: null, writable: true });
  }

  _run () {
    if (!this._promise) {
      this._promise = this._execute();
    }
    return this._promise;
  }

  then (resolve, reject) {
    return this._run().then(resolve, reject);
  }

  catch (reject) {
    return this._run().catch(reject);
  }

  finally (callback) {
    return this._run().finally(callback);
  }
}

// Ajouter une méthode sql(identifier) pour créer des identifiants
sql.identifier = function (value) {
  return new SqlIdentifier(value);
};

// Stocker le pool sur la fonction pour accès direct
sql.pool = pool;

module.exports = {
  default: sql,
  pool,
  sql,
  SqlQuery,
  buildQuery,
  query: (text, params) => pool.query(text, params),
  getConnectionConfig,
  waitForDatabase,
  DB_SETTINGS
};
