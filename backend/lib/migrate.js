/**
 * Runner de migrations SQL (sans dépendance externe).
 *
 * Contrat :
 * - Fichiers `migrations/NNNN_description.sql` (4 chiffres, puis lettres/chiffres/_/-),
 *   appliqués dans l'ordre lexical ; les autres fichiers du dossier sont ignorés.
 * - Chaque fichier est exécuté dans SA transaction (BEGIN / COMMIT posés par le runner :
 *   ne pas en mettre dans les fichiers, ni de CREATE INDEX CONCURRENTLY).
 * - Les migrations appliquées sont tracées dans schema_migrations(name, applied_at) :
 *   un fichier déjà appliqué n'est jamais rejoué (le modifier n'a donc aucun effet,
 *   il faut en créer un nouveau).
 * - Un verrou consultatif PostgreSQL (pg_advisory_lock) empêche deux instances
 *   de migrer en même temps : la seconde attend la fin de la première.
 * - Une migration en échec est annulée (ROLLBACK) et l'erreur est relancée :
 *   le serveur ne démarre pas sur un schéma incomplet.
 *
 * Plages de numéros : 0001-0099 infrastructure / schéma de base, 0100-0199 fonctionnalités.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const logger = require('./logger.js');

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATION_FILE_PATTERN = /^\d{4}_[A-Za-z0-9_-]+\.sql$/;

// Clé du verrou consultatif (constante propre à TeachDigital, 2 entiers 32 bits)
const ADVISORY_LOCK_KEYS = [0x7d1a, 0x0001];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Liste les fichiers de migration du dossier, triés dans l'ordre d'application
 * @param {string} [migrationsDir]
 * @returns {string[]} Noms de fichiers
 */
function listMigrationFiles(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir)
    .filter(name => MIGRATION_FILE_PATTERN.test(name))
    .sort();
}

/**
 * Prend le verrou consultatif, en réessayant jusqu'à lockTimeoutMs
 */
async function acquireLock(client, { lockTimeoutMs, pollMs = 1000, log = logger }) {
  const startedAt = Date.now();
  let warned = false;
  for (;;) {
    const { rows } = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', ADVISORY_LOCK_KEYS);
    if (rows[0].locked) return;
    if (Date.now() - startedAt >= lockTimeoutMs) {
      const error = new Error(`Verrou des migrations non obtenu après ${Math.round(lockTimeoutMs / 1000)} s (une autre instance migre-t-elle ?)`);
      error.code = 'MIGRATION_LOCK_TIMEOUT';
      throw error;
    }
    if (!warned) {
      log.warn('⏳ Migrations en cours sur une autre instance, attente du verrou...');
      warned = true;
    }
    await sleep(pollMs);
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query('SELECT name, applied_at FROM schema_migrations ORDER BY name');
  return rows;
}

/**
 * Ouvre une connexion dédiée (hors pool : pas de statement_timeout applicatif,
 * une migration peut durer plus longtemps qu'une requête d'API)
 */
async function openClient(connectionConfig) {
  const config = connectionConfig || require('./database.js').getConnectionConfig();
  const client = new Client({
    ...config,
    application_name: 'teachdigital-migrations',
    connectionTimeoutMillis: config.connectionTimeoutMillis || 10000
  });
  await client.connect();
  // Pas de timeout de requête pendant les migrations, mais un délai max d'attente de verrou
  // de table (évite de bloquer indéfiniment derrière une transaction oubliée)
  await client.query('SET statement_timeout = 0');
  await client.query(`SET lock_timeout = '${Math.max(1000, parseInt(process.env.MIGRATION_LOCK_WAIT_MS || '60000', 10) || 60000)}ms'`);
  return client;
}

/**
 * Applique les migrations en attente.
 *
 * @param {Object} [options]
 * @param {Object} [options.connectionConfig] - Configuration pg (défaut : celle du backend)
 * @param {string} [options.migrationsDir] - Dossier des fichiers .sql
 * @param {number} [options.lockTimeoutMs=300000] - Attente max du verrou inter-instances
 * @param {Object} [options.log] - Logger (info/warn/error)
 * @returns {Promise<{applied: string[], alreadyApplied: number, total: number}>}
 * @throws {Error} Migration en échec (error.migration = nom du fichier) ou verrou non obtenu
 */
async function runMigrations({
  connectionConfig,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  lockTimeoutMs = 300000,
  log = logger
} = {}) {
  const files = listMigrationFiles(migrationsDir);
  const client = await openClient(connectionConfig);
  let locked = false;

  try {
    await acquireLock(client, { lockTimeoutMs, log });
    locked = true;

    // Créée sous le verrou : deux CREATE TABLE IF NOT EXISTS simultanés peuvent échouer
    await ensureMigrationsTable(client);
    const alreadyApplied = new Set((await getAppliedMigrations(client)).map(row => row.name));
    const pending = files.filter(name => !alreadyApplied.has(name));

    if (pending.length === 0) {
      log.info('✅ Schéma de base de données à jour', { migrations: files.length });
      return { applied: [], alreadyApplied: alreadyApplied.size, total: files.length };
    }

    log.info('🔄 Application des migrations', { pending });
    const applied = [];
    for (const name of pending) {
      const sqlText = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
      const startedAt = Date.now();
      try {
        await client.query('BEGIN');
        await client.query(sqlText);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        error.migration = name;
        log.error(`❌ Migration ${name} en échec (annulée)`, {
          migration: name,
          errorCode: error.code,
          errorMessage: error.message,
          position: error.position,
          detail: error.detail,
          hint: error.hint
        });
        throw error;
      }
      applied.push(name);
      log.info(`✅ Migration ${name} appliquée`, { durationMs: Date.now() - startedAt });
    }

    return { applied, alreadyApplied: alreadyApplied.size, total: files.length };
  } finally {
    if (locked) {
      await client.query('SELECT pg_advisory_unlock($1, $2)', ADVISORY_LOCK_KEYS).catch(() => {});
    }
    await client.end().catch(() => {});
  }
}

/**
 * État des migrations (appliquées / en attente), sans rien modifier
 * @returns {Promise<{applied: Array<{name: string, applied_at: Date}>, pending: string[]}>}
 */
async function getMigrationStatus({ connectionConfig, migrationsDir = DEFAULT_MIGRATIONS_DIR } = {}) {
  const files = listMigrationFiles(migrationsDir);
  const client = await openClient(connectionConfig);
  try {
    const { rows } = await client.query(`SELECT to_regclass('schema_migrations') IS NOT NULL AS present`);
    const applied = rows[0].present ? await getAppliedMigrations(client) : [];
    const appliedNames = new Set(applied.map(row => row.name));
    return { applied, pending: files.filter(name => !appliedNames.has(name)) };
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = {
  DEFAULT_MIGRATIONS_DIR,
  MIGRATION_FILE_PATTERN,
  listMigrationFiles,
  runMigrations,
  getMigrationStatus
};
