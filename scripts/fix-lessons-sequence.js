#!/usr/bin/env node

/**
 * Script pour corriger la séquence des IDs de la table lessons
 * Résout l'erreur "duplicate key value violates unique constraint"
 * Exécute: node scripts/fix-lessons-sequence.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { default: sql } = require('../backend/lib/database.js');

async function fixLessonsSequence() {
  try {
    console.log('🔧 Correction de la séquence lessons_id_seq...');
    
    // Récupérer le maximum ID actuel dans la table
    const maxIdResult = await sql`
      SELECT COALESCE(MAX(id), 0) as max_id FROM lessons
    `;
    
    const maxId = parseInt(maxIdResult[0].max_id, 10);
    console.log(`📊 ID maximum actuel dans la table: ${maxId}`);
    
    // Réinitialiser la séquence pour pointer vers le prochain ID disponible
    // On utilise maxId + 1 pour que le prochain INSERT utilise maxId + 1
    const nextId = maxId + 1;
    
    await sql`
      SELECT setval('lessons_id_seq', ${nextId}, false)
    `;
    
    console.log(`✅ Séquence réinitialisée à ${nextId}`);
    console.log(`   Le prochain ID généré sera: ${nextId}`);
    
    // Vérifier la valeur actuelle de la séquence
    const currentValResult = await sql`
      SELECT last_value, is_called FROM lessons_id_seq
    `;
    
    console.log(`📈 État de la séquence:`);
    console.log(`   - last_value: ${currentValResult[0].last_value}`);
    console.log(`   - is_called: ${currentValResult[0].is_called}`);
    
    console.log('✅ Correction terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    
    // Si la séquence n'existe pas, la créer
    if (error.message.includes('does not exist') || error.message.includes('relation') && error.message.includes('lessons_id_seq')) {
      console.log('⚠️  La séquence n\'existe pas, création...');
      try {
        await sql`
          CREATE SEQUENCE IF NOT EXISTS lessons_id_seq OWNED BY lessons.id
        `;
        
        // Récupérer le maximum ID
        const maxIdResult = await sql`
          SELECT COALESCE(MAX(id), 0) as max_id FROM lessons
        `;
        const maxId = parseInt(maxIdResult[0].max_id, 10);
        const nextId = maxId + 1;
        
        // Définir la valeur de la séquence
        await sql`
          SELECT setval('lessons_id_seq', ${nextId}, false)
        `;
        
        // Lier la séquence à la colonne
        await sql`
          ALTER TABLE lessons ALTER COLUMN id SET DEFAULT nextval('lessons_id_seq')
        `;
        
        console.log(`✅ Séquence créée et initialisée à ${nextId}`);
      } catch (createError) {
        console.error('❌ Erreur lors de la création de la séquence:', createError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

// Exécuter la correction
fixLessonsSequence();

