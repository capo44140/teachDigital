#!/usr/bin/env node

/**
 * Script de migration pour convertir les codes PIN en clair en codes PIN hachés
 * Ce script doit être exécuté une seule fois après la mise à jour de la sécurité
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.NEON_HOST,
  database: process.env.NEON_DATABASE,
  username: process.env.NEON_USERNAME,
  password: process.env.NEON_PASSWORD,
  port: process.env.NEON_PORT || 5432,
  ssl: true
};

// Créer l'instance de connexion Neon
let sql;
try {
  if (config.connectionString) {
    sql = neon(config.connectionString);
  } else {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=require`;
    sql = neon(connectionString);
  }
  console.log('✅ Connexion à Neon DB établie');
} catch (error) {
  console.error('❌ Erreur de connexion à Neon DB:', error);
  process.exit(1);
}

/**
 * Vérifie si un code PIN est déjà haché
 * Les codes PIN hachés commencent par $2a$ ou $2b$
 */
function isHashed(pin) {
  return pin && (pin.startsWith('$2a$') || pin.startsWith('$2b$'));
}

/**
 * Migre les codes PIN en clair vers des codes PIN hachés
 */
async function migratePins() {
  try {
    console.log('🚀 Début de la migration des codes PIN...');
    
    // Récupérer tous les codes PIN
    const pins = await sql`
      SELECT id, profile_id, pin_code, created_at, updated_at
      FROM pin_codes
      ORDER BY profile_id
    `;
    
    if (pins.length === 0) {
      console.log('ℹ️ Aucun code PIN trouvé dans la base de données');
      return;
    }
    
    console.log(`📊 ${pins.length} code(s) PIN trouvé(s)`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const pinRecord of pins) {
      const { id, profile_id, pin_code } = pinRecord;
      
      // Vérifier si le code PIN est déjà haché
      if (isHashed(pin_code)) {
        console.log(`⏭️ Code PIN du profil ${profile_id} déjà haché, ignoré`);
        skippedCount++;
        continue;
      }
      
      // Vérifier si le code PIN est valide (4 chiffres)
      if (!/^\d{4}$/.test(pin_code)) {
        console.log(`⚠️ Code PIN du profil ${profile_id} invalide (${pin_code}), ignoré`);
        skippedCount++;
        continue;
      }
      
      try {
        // Hacher le code PIN
        const hashedPin = await bcrypt.hash(pin_code, 12);
        
        // Mettre à jour dans la base de données
        await sql`
          UPDATE pin_codes 
          SET pin_code = ${hashedPin}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `;
        
        console.log(`✅ Code PIN du profil ${profile_id} migré avec succès`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Erreur lors de la migration du code PIN du profil ${profile_id}:`, error);
      }
    }
    
    console.log('\n📈 Résumé de la migration:');
    console.log(`✅ ${migratedCount} code(s) PIN migré(s)`);
    console.log(`⏭️ ${skippedCount} code(s) PIN ignoré(s)`);
    console.log('🎉 Migration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

/**
 * Vérifie l'état de la migration
 */
async function checkMigrationStatus() {
  try {
    console.log('🔍 Vérification de l\'état de la migration...');
    
    const pins = await sql`
      SELECT profile_id, pin_code, 
             CASE 
               WHEN pin_code ~ '^\\$2[ab]\\$' THEN 'hashed'
               ELSE 'plain'
             END as status
      FROM pin_codes
      ORDER BY profile_id
    `;
    
    const hashedCount = pins.filter(p => p.status === 'hashed').length;
    const plainCount = pins.filter(p => p.status === 'plain').length;
    
    console.log(`📊 État des codes PIN:`);
    console.log(`   🔐 Hachés: ${hashedCount}`);
    console.log(`   📝 En clair: ${plainCount}`);
    
    if (plainCount > 0) {
      console.log('\n⚠️ Des codes PIN sont encore en clair. Exécutez la migration.');
    } else {
      console.log('\n✅ Tous les codes PIN sont sécurisés !');
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
      await migratePins();
      break;
    case 'check':
      await checkMigrationStatus();
      break;
    default:
      console.log('Usage: node migrate-pins.js [migrate|check]');
      console.log('  migrate - Migre les codes PIN en clair vers des codes PIN hachés');
      console.log('  check   - Vérifie l\'état de la migration');
      process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
