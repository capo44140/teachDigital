#!/usr/bin/env node

/**
 * Script de migration pour ajouter les tables de badges
 * Exécute: node scripts/migrate-badges.js
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import pkg from 'pg'

const { Pool } = pkg

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '../.env')
const result = config({ path: envPath })

if (result.error) {
  console.error('❌ Erreur lors du chargement du fichier .env:', result.error)
  process.exit(1)
}

console.log('✅ Fichier .env chargé depuis:', envPath)
console.log('DATABASE_URL présente:', !!process.env.DATABASE_URL)

// Créer la connexion directement ici
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL n\'est pas définie dans le fichier .env')
  console.error('Veuillez configurer votre fichier .env avec l\'URL de connexion PostgreSQL')
  process.exit(1)
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
})

async function migrateBadges() {
  const client = await pool.connect()
  try {
    console.log('🚀 Début de la migration des badges...')
    
    // Créer la table des badges (définitions)
    console.log('🏆 Création de la table badges...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        condition_type VARCHAR(50) NOT NULL,
        condition_value INTEGER NOT NULL,
        points INTEGER DEFAULT 0,
        color VARCHAR(50) DEFAULT 'yellow',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Table badges créée')
    
    // Créer la table des badges débloqués par profil
    console.log('🎖️ Création de la table profile_badges...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_badges (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0,
        is_unlocked BOOLEAN DEFAULT FALSE,
        unlocked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(profile_id, badge_id)
      )
    `)
    console.log('✅ Table profile_badges créée')
    
    // Créer les index pour améliorer les performances
    console.log('🔍 Création des index...')
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_badges_profile ON profile_badges(profile_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_badges_badge ON profile_badges(badge_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_badges_unlocked ON profile_badges(is_unlocked)`)
    console.log('✅ Index créés')
    
    // Insérer des badges par défaut
    console.log('🎯 Insertion des badges par défaut...')
    
    const defaultBadges = [
      {
        name: 'Premier pas',
        description: 'Complète ton premier quiz',
        icon: '🎯',
        category: 'débutant',
        condition_type: 'quiz_completed',
        condition_value: 1,
        points: 10,
        color: 'blue'
      },
      {
        name: 'Apprenti',
        description: 'Complète 5 quiz',
        icon: '📚',
        category: 'progression',
        condition_type: 'quiz_completed',
        condition_value: 5,
        points: 25,
        color: 'green'
      },
      {
        name: 'Expert',
        description: 'Complète 10 quiz',
        icon: '🏆',
        category: 'progression',
        condition_type: 'quiz_completed',
        condition_value: 10,
        points: 50,
        color: 'purple'
      },
      {
        name: 'Perfectionniste',
        description: 'Obtiens un score parfait de 100%',
        icon: '⭐',
        category: 'excellence',
        condition_type: 'perfect_score',
        condition_value: 1,
        points: 100,
        color: 'yellow'
      },
      {
        name: 'Série de victoires',
        description: 'Obtiens plus de 80% sur 3 quiz d\'affilée',
        icon: '🔥',
        category: 'excellence',
        condition_type: 'score_streak',
        condition_value: 3,
        points: 75,
        color: 'orange'
      },
      {
        name: 'Studieux',
        description: 'Passe plus de 60 minutes à apprendre',
        icon: '⏰',
        category: 'temps',
        condition_type: 'learning_time',
        condition_value: 60,
        points: 50,
        color: 'blue'
      },
      {
        name: 'Régulier',
        description: 'Complète un quiz pendant 7 jours consécutifs',
        icon: '📅',
        category: 'temps',
        condition_type: 'daily_streak',
        condition_value: 7,
        points: 100,
        color: 'green'
      },
      {
        name: 'Polyvalent',
        description: 'Complète des quiz dans 3 matières différentes',
        icon: '🌈',
        category: 'diversité',
        condition_type: 'subjects_variety',
        condition_value: 3,
        points: 60,
        color: 'rainbow'
      },
      {
        name: 'Mathématicien',
        description: 'Complète 5 quiz de mathématiques',
        icon: '🔢',
        category: 'matière',
        condition_type: 'subject_specific',
        condition_value: 5,
        points: 40,
        color: 'blue'
      },
      {
        name: 'Littéraire',
        description: 'Complète 5 quiz de français',
        icon: '📖',
        category: 'matière',
        condition_type: 'subject_specific',
        condition_value: 5,
        points: 40,
        color: 'pink'
      }
    ]
    
    for (const badge of defaultBadges) {
      await client.query(
        `INSERT INTO badges (name, description, icon, category, condition_type, condition_value, points, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [badge.name, badge.description, badge.icon, badge.category, 
         badge.condition_type, badge.condition_value, badge.points, badge.color]
      )
    }
    
    console.log('✅ Badges par défaut insérés')
    
    console.log('✅ Migration des badges terminée avec succès!')
    console.log('📊 Vous pouvez maintenant gérer les badges via l\'application')
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    throw error
  } finally {
    client.release()
  }
}

// Exécuter la migration
migrateBadges()
  .then(async () => {
    console.log('✨ Migration terminée')
    await pool.end()
    process.exit(0)
  })
  .catch(async error => {
    console.error('💥 Échec de la migration:', error)
    await pool.end()
    process.exit(1)
  })

