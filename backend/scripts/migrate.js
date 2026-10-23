#!/usr/bin/env node

/**
 * Applique les migrations SQL (backend/migrations) sur la base configurée
 * (backend/.env : DB_HOST/DB_NAME/DB_USER/DB_PASSWORD ou DATABASE_URL).
 *
 * Usage :
 *   pnpm run migrate              # applique les migrations en attente
 *   node scripts/migrate.js --status   # liste les migrations appliquées / en attente
 *
 * Le serveur applique aussi les migrations à chaque démarrage (server.js) :
 * ce script sert surtout en développement ou pour vérifier l'état d'une base.
 */

const { loadBackendEnv } = require('../lib/loadEnv.js');

loadBackendEnv();

async function main() {
  const { runMigrations, getMigrationStatus } = require('../lib/migrate.js');

  if (process.argv.includes('--status')) {
    const { applied, pending } = await getMigrationStatus();
    console.log('Migrations appliquées :');
    if (applied.length === 0) console.log('  (aucune)');
    applied.forEach(row => console.log(`  ✅ ${row.name}  (${new Date(row.applied_at).toISOString()})`));
    console.log('Migrations en attente :');
    if (pending.length === 0) console.log('  (aucune)');
    pending.forEach(name => console.log(`  ⏳ ${name}`));
    return;
  }

  const { applied, total } = await runMigrations();
  console.log(applied.length === 0
    ? `✅ Base à jour (${total} migration(s) déjà appliquée(s))`
    : `✅ ${applied.length} migration(s) appliquée(s) : ${applied.join(', ')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Migrations en échec${error.migration ? ` (${error.migration})` : ''} : ${error.message}`);
    process.exit(1);
  });
