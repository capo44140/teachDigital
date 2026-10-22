/**
 * Initialise une base PostgreSQL DÉDIÉE AUX TESTS avec tests/schema.sql.
 *
 * Usage :
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/teachdigital_test \
 *     node tests/init-test-db.js
 *
 * Sécurité : refuse de s'exécuter si le nom de la base ne contient pas « test »
 * (sauf ALLOW_TEST_DB_INIT=1 explicite), pour ne jamais vider une base réelle.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(schema);
    console.log(`✅ Schéma de test initialisé dans « ${databaseName} »`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('❌ Initialisation du schéma de test échouée:', error.message);
  process.exit(1);
});
