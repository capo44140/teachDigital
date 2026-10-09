#!/usr/bin/env node

/**
 * Script de migration pour créer la table youtube_videos
 * Usage: node scripts/migrate-youtube-videos.js
 */

import pkg from 'pg'
const { Pool } = pkg;
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration de la base de données PostgreSQL
const config = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || process.env.NEON_HOST,
  database: process.env.DB_DATABASE || process.env.NEON_DATABASE,
  username: process.env.DB_USERNAME || process.env.NEON_USERNAME,
  password: process.env.DB_PASSWORD || process.env.NEON_PASSWORD,
  port: process.env.DB_PORT || process.env.NEON_PORT || 5432,
  ssl: process.env.DB_SSL !== 'false'
};

let sql;

try {
  if (config.connectionString) {
    console.log('🔗 Utilisation de la connection string complète');
    sql = postgres(config.connectionString);
  } else if (config.host && config.username && config.password && config.database) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`;
    console.log('🔗 Construction de la connection string à partir des variables individuelles');
    sql = postgres(connectionString);
  } else {
    throw new Error('Aucune configuration de base de données valide trouvée. Vérifiez vos variables d\'environnement.');
  }
  
  console.log('✅ Connexion à PostgreSQL configurée avec succès');
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  process.exit(1);
}

async function createYouTubeVideosTable() {
  try {
    console.log('🚀 [MIGRATION] Création de la table youtube_videos...')

    // Vérifier si la table existe déjà
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'youtube_videos'
    `

    if (existingTables && existingTables.length > 0) {
      console.log('ℹ️ [MIGRATION] La table youtube_videos existe déjà')
      return
    }

    // Créer la table youtube_videos
    await sql`
      CREATE TABLE IF NOT EXISTS youtube_videos (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        video_id VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        age_group VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(video_id)
      )
    `

    console.log('✅ [MIGRATION] Table youtube_videos créée avec succès')

    // Créer les index pour optimiser les requêtes
    await sql`CREATE INDEX IF NOT EXISTS idx_youtube_videos_category ON youtube_videos(category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_youtube_videos_age_group ON youtube_videos(age_group)`
    await sql`CREATE INDEX IF NOT EXISTS idx_youtube_videos_is_active ON youtube_videos(is_active)`
    await sql`CREATE INDEX IF NOT EXISTS idx_youtube_videos_created_at ON youtube_videos(created_at)`

    console.log('✅ [MIGRATION] Index créés avec succès')

    // Insérer des données de test
    await insertTestData()

  } catch (error) {
    console.error('❌ [MIGRATION] Erreur lors de la migration:', error)
    throw error
  }
}

async function insertTestData() {
  try {
    console.log('📝 [MIGRATION] Insertion des données de test...')

    const testVideos = [
      {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        video_id: 'dQw4w9WgXcQ',
        title: 'Vidéo éducative sur les mathématiques',
        description: 'Une vidéo amusante pour apprendre les bases des mathématiques avec des exemples concrets et des exercices pratiques.',
        category: 'Mathématiques',
        age_group: '6-8 ans',
        is_active: true
      },
      {
        url: 'https://www.youtube.com/watch?v=example2',
        video_id: 'example2',
        title: 'Découverte de la nature',
        description: 'Explorez la beauté de la nature avec cette vidéo éducative qui présente les différents écosystèmes.',
        category: 'Science',
        age_group: '3-5 ans',
        is_active: true
      },
      {
        url: 'https://www.youtube.com/watch?v=example3',
        video_id: 'example3',
        title: 'Histoire de France',
        description: 'Découvrez l\'histoire fascinante de la France à travers les siècles avec des animations et des reconstitutions.',
        category: 'Histoire',
        age_group: '9-12 ans',
        is_active: true
      },
      {
        url: 'https://www.youtube.com/watch?v=example4',
        video_id: 'example4',
        title: 'Apprendre l\'anglais en s\'amusant',
        description: 'Une méthode ludique pour apprendre l\'anglais avec des chansons et des jeux interactifs.',
        category: 'Langues',
        age_group: '6-8 ans',
        is_active: true
      },
      {
        url: 'https://www.youtube.com/watch?v=example5',
        video_id: 'example5',
        title: 'Création artistique',
        description: 'Développez votre créativité avec des techniques de dessin et de peinture adaptées aux enfants.',
        category: 'Art',
        age_group: '3-5 ans',
        is_active: false
      }
    ]

    // Insérer les vidéos une par une pour éviter les erreurs de contrainte unique
    let insertedCount = 0
    for (const video of testVideos) {
      try {
        await sql`
          INSERT INTO youtube_videos (url, video_id, title, description, category, age_group, is_active)
          VALUES (${video.url}, ${video.video_id}, ${video.title}, ${video.description}, ${video.category}, ${video.age_group}, ${video.is_active})
        `
        insertedCount++
      } catch (error) {
        if (error.code === '23505') { // Code d'erreur pour violation de contrainte unique
          console.log(`ℹ️ [MIGRATION] Vidéo ${video.video_id} existe déjà, ignorée`)
        } else {
          console.warn(`⚠️ [MIGRATION] Erreur lors de l'insertion de la vidéo ${video.video_id}:`, error.message)
        }
      }
    }

    console.log('✅ [MIGRATION] Données de test insérées avec succès:', insertedCount, 'vidéos')

  } catch (error) {
    console.warn('⚠️ [MIGRATION] Erreur lors de l\'insertion des données de test:', error)
  }
}

async function main() {
  try {
    console.log('🚀 [MIGRATION] Début de la migration des vidéos YouTube')
    
    await createYouTubeVideosTable()
    
    console.log('✅ [MIGRATION] Migration terminée avec succès')
    console.log('📊 [MIGRATION] La table youtube_videos est maintenant disponible')
    
  } catch (error) {
    console.error('❌ [MIGRATION] Échec de la migration:', error)
    process.exit(1)
  }
}

// Exécuter la migration si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('migrate-youtube-videos.js')) {
  main()
}

export { createYouTubeVideosTable, insertTestData }
