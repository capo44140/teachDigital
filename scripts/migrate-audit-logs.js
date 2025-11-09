/**
 * Script de migration pour créer la table audit_logs
 * Usage: node scripts/migrate-audit-logs.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Vérification de l\'existence de la table audit_logs...');
    
    // Vérifier si la table existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ La table audit_logs existe déjà');
      return;
    }

    console.log('📝 Création de la table audit_logs...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        user_id INTEGER, -- NULL pour les logs système
        category VARCHAR(100) NOT NULL,
        level VARCHAR(20) NOT NULL DEFAULT 'info',
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('📝 Création des index...');

    // Index pour les recherches fréquentes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_category ON audit_logs(user_id, category);
    `);

    console.log('✅ Migration terminée avec succès');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

