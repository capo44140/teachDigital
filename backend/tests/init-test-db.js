/**
 * Initialise une base PostgreSQL DÉDIÉE AUX TESTS : vide le schéma courant puis
 * applique toutes les migrations (backend/migrations), exactement comme au démarrage
 * du serveur. Il n'y a plus de schéma de test séparé à maintenir.
 *
 * Usage :
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/teachdigital_test \
 *     node tests/init-test-db.js
 *
 * Sécurité : refuse de s'exécuter si le nom de la base ne contient pas « test »
 * (sauf ALLOW_TEST_DB_INIT=1 explicite), pour ne jamais vider une base réelle.
 */

const { Client } = require('pg');

// Les logs du runner vont sur la console, pas dans backend/logs
process.env.LOG_ENABLE_FILE = process.env.LOG_ENABLE_FILE || 'false';

// Supprime toutes les tables / vues / séquences / fonctions du schéma courant
const RESET_SCHEMA_SQL = `
DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT viewname FROM pg_views WHERE schemaname = current_schema() LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', item.viewname);
  END LOOP;
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema() LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', item.tablename);
  END LOOP;
  FOR item IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = current_schema() LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', item.sequence_name);
  END LOOP;
  FOR item IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = current_schema() AND d.objid IS NULL
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', item.signature);
  END LOOP;
END $$;
`;

async function main() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL est requis (base dédiée aux tests).');
  }

  let databaseName = '';
  try {
    databaseName = decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('TEST_DATABASE_URL n\'est pas une URL PostgreSQL valide.');
  }

  if (!/test/i.test(databaseName) && process.env.ALLOW_TEST_DB_INIT !== '1') {
    throw new Error(
      `Refus d'initialiser la base « ${databaseName} » : son nom ne contient pas « test ». ` +
      'Définissez ALLOW_TEST_DB_INIT=1 si c\'est volontaire.'
    );
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(RESET_SCHEMA_SQL);
  } finally {
    await client.end();
  }

  const { runMigrations } = require('../lib/migrate.js');
  const { applied } = await runMigrations({ connectionConfig: { connectionString } });
  console.log(`✅ Base de test « ${databaseName} » réinitialisée : ${applied.length} migration(s) appliquée(s)`);
}

main().catch((error) => {
  console.error(`❌ Initialisation de la base de test échouée${error.migration ? ` (${error.migration})` : ''}:`, error.message);
  process.exit(1);
});
