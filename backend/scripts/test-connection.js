#!/usr/bin/env node

/**
 * Script de diagnostic pour tester la connexion PostgreSQL
 * Utilisation: node backend/scripts/test-connection.js
 * 
 * Supporte deux méthodes de configuration:
 * 1. Variables séparées: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
 * 2. Connection string: DATABASE_URL
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 DIAGNOSTIC DE CONNEXION POSTGRESQL');
console.log('═══════════════════════════════════════════════════════════\n');

// Vérifications préalables
console.log('✅ Vérifications préalables:\n');

let poolConfig;
let connectionMethod;

// Méthode 1 : Variables séparées (préférée)
if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD) {
  connectionMethod = 'variables séparées';
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 1,
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 60000
  };
  
  console.log('✓ Configuration avec variables séparées détectée');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Port: ${process.env.DB_PORT || 5432}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  SSL: ${process.env.DB_SSL === 'true' ? 'enabled' : 'disabled'}`);
  
} else if (process.env.DATABASE_URL) {
  // Méthode 2 : Connection string
  connectionMethod = 'connection string';
  const connectionString = process.env.DATABASE_URL;
  
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
    console.log(`  Port: ${url.port || 5432}`);
    console.log(`  Database: ${url.pathname.substring(1)}`);
    console.log(`  Username: ${url.username}`);
    console.log('✓ Connection string parsée avec succès\n');
  } catch (error) {
    console.error('❌ Impossible de parser la connection string:', error.message);
    process.exit(1);
  }
  
  poolConfig = {
    connectionString,
    max: 1,
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 60000,
    ssl: false
  };
} else {
  console.error('❌ Configuration PostgreSQL manquante!');
  console.error('💡 Définissez soit (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) soit DATABASE_URL');
  process.exit(1);
}

// Tester la connexion
console.log('═══════════════════════════════════════════════════════════');
console.log('🔗 Test de connexion:\n');

(async () => {
  let start;
  try {
    console.log('⏳ Connexion en cours...');
    start = Date.now();
    
    const pool = new Pool(poolConfig);
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    const duration = Date.now() - start;
    
    console.log(`✅ Connexion réussie en ${duration}ms!\n`);
    console.log('📊 Informations de la base:\n');
    console.log(`  Heure serveur: ${result.rows[0].current_time}`);
    console.log(`  Version: ${result.rows[0].pg_version.substring(0, 80)}`);
    
    // Afficher les bases de données disponibles
    const dbResult = await client.query(`
      SELECT datname
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY datname;
    `);
    
    console.log('\n📚 Bases de données disponibles:');
    dbResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.datname}`);
    });
    
    // Test de requête simple
    console.log('\n⏳ Test d\'une requête simple...');
    const testResult = await client.query('SELECT 1 as test');
    console.log('✅ Requête simple réussie');
    console.log(`  Résultat: ${testResult.rows[0].test}`);
    
    // Tester la table profiles si elle existe
    try {
      console.log('\n🔍 Test de la table "profiles"...');
      const countResult = await client.query('SELECT COUNT(*) as count FROM profiles');
      console.log(`   📊 Nombre d'enregistrements: ${countResult.rows[0].count}`);
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        ORDER BY ordinal_position;
      `);
      
      if (columnsResult.rows.length > 0) {
        console.log('\n   📋 Structure de la table "profiles":');
        columnsResult.rows.forEach((col, index) => {
          const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          console.log(`   ${index + 1}. ${col.column_name} - ${col.data_type}${length}`);
        });
      }
      
      const sampleResult = await client.query('SELECT * FROM profiles LIMIT 5');
      if (sampleResult.rows.length > 0) {
        console.log('\n   📝 Exemples d\'enregistrements (max 5):');
        sampleResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}.`, row);
        });
      } else {
        console.log('\n   ℹ️ La table "profiles" est vide');
      }
      
      console.log('   ✅ Table "profiles" accessible avec succès!');
    } catch (profileError) {
      console.error('   ⚠️ Erreur lors du test de la table "profiles":', profileError.message);
      console.error('   💡 Vérifiez que la table "profiles" existe dans la base de données');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
    
  } catch (error) {
    const duration = start ? Date.now() - start : 0;
    console.error(`\n❌ Erreur de connexion${duration > 0 ? ` après ${duration}ms` : ''}\n`);
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
      console.error('  • Vérifiez que PostgreSQL est bien démarré');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  • Impossible de résoudre le host');
      console.error('  • Vérifiez que le nom d\'hôte est correct');
      console.error('  • Vérifiez votre connexion DNS');
    } else if (error.code === 'ECONNRESET' || error.message?.includes('TLS')) {
      console.error('  • Problème de connexion TLS/SSL');
      console.error('  • Vérifiez que DB_SSL est correctement configuré');
      console.error('  • Vérifiez les certificats SSL/TLS');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  • Timeout de connexion');
      console.error('  • Vérifiez votre latence réseau');
      console.error('  • Vérifiez que le serveur PostgreSQL est disponible');
    } else if (error.code === '28P01' || error.message?.includes('password')) {
      console.error('  • Erreur d\'authentification');
      console.error('  • Vérifiez que le mot de passe est correct');
      console.error('  • Vérifiez que l\'utilisateur existe dans PostgreSQL');
    } else if (error.code === '3D000' || error.message?.includes('database')) {
      console.error('  • Base de données introuvable');
      console.error('  • Vérifiez que la base de données existe');
      console.error('  • Vérifiez le nom de la base de données dans la configuration');
    }
    
    console.error('\n═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
})();

