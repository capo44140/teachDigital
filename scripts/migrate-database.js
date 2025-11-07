#!/usr/bin/env node

/**
 * Script de migration de la base de données
 * Modifie la colonne pin_code pour supporter les codes PIN hachés
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données PostgreSQL
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.DB_HOST || process.env.NEON_HOST,
  database: process.env.DB_DATABASE || process.env.NEON_DATABASE,
  username: process.env.DB_USERNAME || process.env.NEON_USERNAME,
  password: process.env.DB_PASSWORD || process.env.NEON_PASSWORD,
  port: process.env.DB_PORT || process.env.NEON_PORT || 5432,
  ssl: process.env.DB_SSL !== 'false'
};

// Créer l'instance de connexion PostgreSQL
let sql;
try {
  if (config.connectionString) {
    sql = postgres(config.connectionString);
  } else if (config.host && config.username && config.password && config.database) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`;
    sql = postgres(connectionString);
  } else {
    throw new Error('Configuration de base de données manquante. Vérifiez vos variables d\'environnement.');
  }
  console.log('✅ Connexion à PostgreSQL établie');
} catch (error) {
  console.error('❌ Erreur de connexion à PostgreSQL:', error);
  process.exit(1);
}

/**
 * Migre la structure de la base de données
 */
async function migrateDatabase() {
  try {
    console.log('🚀 Début de la migration de la base de données...');
    
    // Vérifier si la table pin_codes existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pin_codes'
      )
    `;
    
    if (!tableExists[0].exists) {
      console.log('ℹ️ Table pin_codes n\'existe pas, création...');
      await sql`
        CREATE TABLE pin_codes (
          id SERIAL PRIMARY KEY,
          profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
          pin_code VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ Table pin_codes créée');
    } else {
      console.log('ℹ️ Table pin_codes existe, vérification de la structure...');
      
      // Vérifier la taille de la colonne pin_code
      const columnInfo = await sql`
        SELECT character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'pin_codes' 
        AND column_name = 'pin_code'
      `;
      
      if (columnInfo.length > 0) {
        const maxLength = columnInfo[0].character_maximum_length;
        console.log(`📊 Taille actuelle de pin_code: ${maxLength} caractères`);
        
        if (maxLength < 255) {
          console.log('🔧 Modification de la taille de la colonne pin_code...');
          await sql`
            ALTER TABLE pin_codes 
            ALTER COLUMN pin_code TYPE VARCHAR(255)
          `;
          console.log('✅ Colonne pin_code modifiée pour supporter 255 caractères');
        } else {
          console.log('✅ Colonne pin_code a déjà la bonne taille');
        }
      } else {
        console.log('⚠️ Impossible de vérifier la colonne pin_code');
      }
    }
    
    // Vérifier et créer les index si nécessaire
    console.log('🔍 Vérification des index...');
    
    const indexes = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'pin_codes'
    `;
    
    const hasProfileIndex = indexes.some(idx => idx.indexname.includes('profile_id'));
    if (!hasProfileIndex) {
      console.log('🔧 Création de l\'index sur profile_id...');
      await sql`CREATE INDEX IF NOT EXISTS idx_pin_codes_profile_id ON pin_codes(profile_id)`;
      console.log('✅ Index sur profile_id créé');
    } else {
      console.log('✅ Index sur profile_id existe déjà');
    }
    
    console.log('\n🎉 Migration de la base de données terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

/**
 * Vérifie l'état de la base de données
 */
async function checkDatabaseStatus() {
  try {
    console.log('🔍 Vérification de l\'état de la base de données...');
    
    // Vérifier la structure de la table pin_codes
    const columnInfo = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'pin_codes'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Structure de la table pin_codes:');
    columnInfo.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   ${col.column_name}: ${col.data_type}${length}`);
    });
    
    // Vérifier les index
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'pin_codes'
    `;
    
    console.log('\n🔍 Index sur pin_codes:');
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`   ${idx.indexname}`);
      });
    } else {
      console.log('   Aucun index trouvé');
    }
    
    // Vérifier les données existantes
    const pinCount = await sql`SELECT COUNT(*) as count FROM pin_codes`;
    console.log(`\n📈 Nombre de codes PIN: ${pinCount[0].count}`);
    
    if (pinCount[0].count > 0) {
      const samplePins = await sql`
        SELECT profile_id, 
               CASE 
                 WHEN pin_code ~ '^\\$2[ab]\\$' THEN 'hashed'
                 ELSE 'plain'
               END as status,
               LENGTH(pin_code) as length
        FROM pin_codes 
        LIMIT 5
      `;
      
      console.log('\n🔍 Échantillon des codes PIN:');
      samplePins.forEach(pin => {
        console.log(`   Profil ${pin.profile_id}: ${pin.status} (${pin.length} caractères)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécuter le script
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrateDatabase();
      break;
    case 'check':
      await checkDatabaseStatus();
      break;
    default:
      console.log('Usage: node migrate-database.js [migrate|check]');
      console.log('  migrate - Migre la structure de la base de données');
      console.log('  check   - Vérifie l\'état de la base de données');
      process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
