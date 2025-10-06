#!/usr/bin/env node

/**
 * Script de test pour vérifier la table youtube_videos
 * Usage: node scripts/test-youtube-table.js
 */

import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration de la base de données Neon
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.NEON_HOST || process.env.VITE_NEON_HOST,
  database: process.env.NEON_DATABASE || process.env.VITE_NEON_DATABASE,
  username: process.env.NEON_USERNAME || process.env.VITE_NEON_USERNAME,
  password: process.env.NEON_PASSWORD || process.env.VITE_NEON_PASSWORD,
  port: process.env.NEON_PORT || process.env.VITE_NEON_PORT || 5432,
  ssl: true
};

let sql;

try {
  if (config.connectionString) {
    console.log('🔗 Utilisation de la connection string complète');
    sql = neon(config.connectionString);
  } else if (config.host && config.username && config.password && config.database) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=require`;
    console.log('🔗 Construction de la connection string à partir des variables individuelles');
    sql = neon(connectionString);
  } else {
    throw new Error('Aucune configuration de base de données valide trouvée. Vérifiez vos variables d\'environnement.');
  }
  
  console.log('✅ Connexion à Neon DB configurée avec succès');
} catch (error) {
  console.error('❌ Erreur de configuration Neon DB:', error);
  process.exit(1);
}

async function testYouTubeTable() {
  try {
    console.log('🔍 [TEST] Vérification de la table youtube_videos...')

    // Vérifier si la table existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'youtube_videos'
      )
    `

    if (tableExists[0].exists) {
      console.log('✅ [TEST] La table youtube_videos existe')
      
      // Compter les vidéos
      const count = await sql`SELECT COUNT(*) as count FROM youtube_videos`
      console.log('📊 [TEST] Nombre de vidéos dans la table:', count[0].count)
      
      // Lister quelques vidéos
      const videos = await sql`SELECT id, title, category, is_active FROM youtube_videos LIMIT 5`
      console.log('📺 [TEST] Quelques vidéos:')
      videos.forEach(video => {
        console.log(`  - ${video.id}: ${video.title} (${video.category}) - ${video.is_active ? 'Actif' : 'Inactif'}`)
      })
    } else {
      console.log('❌ [TEST] La table youtube_videos n\'existe pas')
      console.log('💡 [TEST] Exécutez: node scripts/migrate-youtube-videos.js')
    }

  } catch (error) {
    console.error('❌ [TEST] Erreur lors du test:', error)
  }
}

// Exécuter le test
testYouTubeTable()
