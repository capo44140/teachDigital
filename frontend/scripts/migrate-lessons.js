#!/usr/bin/env node

/**
 * Script de migration pour ajouter les tables de leçons
 * Exécute: node scripts/migrate-lessons.js
 */

import db from '../../backend/lib/database.js'

const sql = db.sql || db.default

async function migrateLessons() {
  try {
    console.log('🚀 Début de la migration des leçons...')
    
    // Créer la table des leçons/quiz
    console.log('📚 Création de la table lessons...')
    await sql`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject VARCHAR(100),
        level VARCHAR(50),
        image_filename VARCHAR(255),
        image_data TEXT,
        quiz_data JSONB NOT NULL,
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Créer la table des résultats de quiz
    console.log('📊 Création de la table quiz_results...')
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        answers JSONB NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Créer les index pour améliorer les performances
    console.log('🔍 Création des index...')
    await sql`CREATE INDEX IF NOT EXISTS idx_lessons_profile ON lessons(profile_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published)`;
    // Index composite pour optimiser les requêtes avec profile_id ET is_published
    await sql`CREATE INDEX IF NOT EXISTS idx_lessons_profile_published ON lessons(profile_id, is_published)`;
    // Index pour optimiser le tri par created_at
    await sql`CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_results_lesson ON quiz_results(lesson_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_results_profile ON quiz_results(profile_id)`;
    
    // Synchroniser la séquence avec les données existantes
    console.log('🔧 Synchronisation de la séquence lessons_id_seq...')
    try {
      const maxIdResult = await sql`SELECT COALESCE(MAX(id), 0) as max_id FROM lessons`
      const maxId = parseInt(maxIdResult[0].max_id, 10)
      const nextId = maxId > 0 ? maxId + 1 : 1
      
      await sql`SELECT setval('lessons_id_seq', ${nextId}, false)`
      console.log(`✅ Séquence synchronisée à ${nextId}`)
    } catch (seqError) {
      console.warn('⚠️  Erreur lors de la synchronisation de la séquence (non bloquant):', seqError.message)
    }
    
    console.log('✅ Migration des leçons terminée avec succès!')
    
    // Vérifier que les tables ont été créées
    const lessonsCount = await sql`SELECT COUNT(*) as count FROM lessons`
    const resultsCount = await sql`SELECT COUNT(*) as count FROM quiz_results`
    
    console.log(`📈 Statistiques:`)
    console.log(`   - Leçons: ${lessonsCount[0].count}`)
    console.log(`   - Résultats: ${resultsCount[0].count}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Exécuter la migration
migrateLessons()
