import { spawnSync } from 'node:child_process'
import db from '../../backend/lib/database.js'

const sql = db.sql || db.default

function runStep(label, cmd, args) {
  console.log(`\n▶️ ${label}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Échec: ${label} (exit ${result.status})`)
  }
}

async function main() {
  console.log('🚀 Initialisation / migrations DB TeachDigital (backend only)...')

  // 1) Test de connexion DB
  console.log('\n📡 Test de connexion PostgreSQL...')
  await sql`SELECT NOW() as current_time`
  console.log('✅ Connexion DB OK')

  // 2) Exécuter quelques migrations connues (idempotentes)
  // Note: on garde ces scripts côté Node (pas de dépendance à src/config/database.js).
  runStep('Migration pin_codes', 'node', ['scripts/migrate-database.js', 'migrate'])
  runStep('Migration champ level profiles', 'node', ['scripts/migrate-profile-level.js', 'migrate'])
  runStep('Migration tables lessons/quiz_results', 'node', ['scripts/migrate-lessons.js'])

  console.log('\n✅ Initialisation terminée')
}

main().catch((error) => {
  console.error('❌ Erreur init-db:', error?.message || error)
  process.exit(1)
});
