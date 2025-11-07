#!/usr/bin/env node

/**
 * Script de diagnostic pour tester la connexion Neon
 * Utilisation: node backend/scripts/test-connection.js
 */

const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 DIAGNOSTIC DE CONNEXION NEON');
console.log('═══════════════════════════════════════════════════════════\n');

// Vérifications préalables
console.log('✅ Vérifications préalables:\n');

if (!connectionString) {
  console.error('❌ DATABASE_URL non définie!');
  process.exit(1);
}

console.log('✓ DATABASE_URL est défini');
console.log('  Format:', connectionString.substring(0, 50) + '...');
console.log('  Longueur:', connectionString.length, 'caractères');

if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL n\'a pas le bon format!');
  process.exit(1);
}

console.log('✓ Format correct (postgresql:// ou postgres://)');

// Parser la connection string
try {
  const url = new URL(connectionString);
  console.log('\n📍 Détails de la connexion:');
  console.log(`  Host: ${url.hostname}`);
  console.log(`  Port: ${url.port}`);
  console.log(`  Database: ${url.pathname.substring(1)}`);
  console.log(`  Username: ${url.username}`);
  console.log('✓ Connection string parsée avec succès\n');
} catch (error) {
  console.error('❌ Impossible de parser la connection string:', error.message);
  process.exit(1);
}

// Tester la connexion
console.log('═══════════════════════════════════════════════════════════');
console.log('🔗 Test de connexion:\n');

(async () => {
  try {
    // Configuration de test
    const sql = postgres(connectionString, {
      ssl: 'require',
      max: 1,
      connect_timeout: 60,
      statement_timeout: 60000,
      idle_timeout: 60
    });

    console.log('⏳ Connexion en cours...');
    const start = Date.now();
    
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    const duration = Date.now() - start;
    
    console.log(`✅ Connexion réussie en ${duration}ms!\n`);
    console.log('📊 Informations de la base:\n');
    console.log(`  Heure serveur: ${result[0].current_time}`);
    console.log(`  Version: ${result[0].pg_version.substring(0, 80)}`);
    
    // Test de requête simple
    console.log('\n⏳ Test d\'une requête simple...');
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Requête simple réussie');
    console.log(`  Résultat: ${testResult[0].test}`);
    
    // Fermer la connexion
    await sql.end();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
    
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`\n❌ Erreur de connexion après ${duration}ms\n`);
    console.error('📋 Détails de l\'erreur:\n');
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);
    console.error(`  Severity: ${error.severity || 'N/A'}`);
    console.error(`  Host: ${error.host || 'undefined'}`);
    console.error(`  Port: ${error.port || 'undefined'}`);
    
    console.error('\n💡 Conseils de dépannage:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('  • La base de données n\'est pas accessible');
      console.error('  • Vérifiez que le host et le port sont corrects');
      console.error('  • Vérifiez les pare-feu/whitelist IP');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  • Impossible de résoudre le host');
      console.error('  • Vérifiez que le nom d\'hôte Neon est correct');
      console.error('  • Vérifiez votre connexion DNS');
    } else if (error.code === 'ECONNRESET' || error.message?.includes('TLS')) {
      console.error('  • Problème de connexion TLS/SSL');
      console.error('  • Vérifiez que ssl: require est correctement configuré');
      console.error('  • Vérifiez les certificats SSL/TLS');
      console.error('  • Le cluster Neon peut être en panne ou surchargé');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  • Timeout de connexion');
      console.error('  • Le cluster Neon peut être surchargé');
      console.error('  • Vérifiez votre latence réseau');
    }
    
    console.error('\n═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
})();

