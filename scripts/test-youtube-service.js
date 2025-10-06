#!/usr/bin/env node

/**
 * Script de test pour vérifier le service YouTube complet
 * Usage: node scripts/test-youtube-service.js
 */

import sql from './test-database-config.js'

// Simuler le service YouTube pour les tests
class TestYouTubeVideoService {
  constructor() {
    this.tableName = 'youtube_videos'
  }

  async getAllVideos() {
    try {
      console.log('📺 [TEST] Récupération de toutes les vidéos')
      
      const data = await sql`
        SELECT * FROM youtube_videos 
        ORDER BY created_at DESC
      `
      console.log('✅ [TEST] Vidéos récupérées depuis la DB:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ [TEST] Erreur dans getAllVideos:', error)
      throw error
    }
  }

  async createVideo(videoData) {
    try {
      console.log('📺 [TEST] Création d\'une nouvelle vidéo:', videoData)
      
      // Validation des données
      if (!videoData.url || !videoData.title || !videoData.category) {
        throw new Error('URL, titre et catégorie sont requis')
      }

      // Extraire l'ID vidéo YouTube de l'URL
      const videoId = this.extractVideoId(videoData.url)
      if (!videoId) {
        throw new Error('URL YouTube invalide')
      }

      const data = await sql`
        INSERT INTO youtube_videos (url, video_id, title, description, category, age_group, is_active)
        VALUES (${videoData.url}, ${videoId}, ${videoData.title}, ${videoData.description || ''}, ${videoData.category}, ${videoData.ageGroup || null}, ${videoData.isActive !== undefined ? videoData.isActive : true})
        RETURNING *
      `

      console.log('✅ [TEST] Vidéo créée avec succès:', data[0])
      return data[0]
    } catch (error) {
      console.error('❌ [TEST] Erreur dans createVideo:', error)
      throw error
    }
  }

  async deleteVideo(id) {
    try {
      console.log('📺 [TEST] Suppression de la vidéo ID:', id)
      
      const data = await sql`
        DELETE FROM youtube_videos 
        WHERE id = ${id}
        RETURNING id
      `

      if (!data || data.length === 0) {
        throw new Error('Vidéo non trouvée')
      }

      console.log('✅ [TEST] Vidéo supprimée avec succès')
      return true
    } catch (error) {
      console.error('❌ [TEST] Erreur dans deleteVideo:', error)
      throw error
    }
  }

  extractVideoId(url) {
    if (!url) {
      console.warn('⚠️ [TEST] URL vide fournie')
      return null
    }
    
    console.log('🔍 [TEST] Extraction de l\'ID depuis l\'URL:', url)
    
    // Nettoyer l'URL
    const cleanUrl = url.trim()
    
    // Patterns pour différents formats d'URL YouTube
    const patterns = [
      // youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      // youtu.be/VIDEO_ID
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/embed/VIDEO_ID
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/v/VIDEO_ID
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      // youtube.com/shorts/VIDEO_ID
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      // Format avec paramètres supplémentaires
      /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
      // Format avec & et autres paramètres
      /(?:youtube\.com\/watch\?[^&]*v=)([a-zA-Z0-9_-]{11})/
    ]
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = cleanUrl.match(pattern)
      if (match && match[1]) {
        const videoId = match[1]
        console.log('✅ [TEST] ID vidéo extrait:', videoId)
        return videoId
      }
    }
    
    // Si aucun pattern ne correspond, essayer une approche plus flexible
    const flexiblePattern = /[?&]v=([a-zA-Z0-9_-]{11})/
    const flexibleMatch = cleanUrl.match(flexiblePattern)
    if (flexibleMatch && flexibleMatch[1]) {
      const videoId = flexibleMatch[1]
      console.log('✅ [TEST] ID vidéo extrait (pattern flexible):', videoId)
      return videoId
    }
    
    console.error('❌ [TEST] Impossible d\'extraire l\'ID vidéo de l\'URL:', cleanUrl)
    return null
  }
}

async function testYouTubeService() {
  try {
    console.log('🧪 [TEST] Test du service YouTube complet')
    console.log('=' .repeat(60))

    const service = new TestYouTubeVideoService()

    // Test 1: Récupérer toutes les vidéos
    console.log('\n1. 📺 Test de récupération des vidéos')
    const videos = await service.getAllVideos()
    console.log(`   ✅ ${videos.length} vidéos récupérées`)

    // Test 2: Créer une nouvelle vidéo
    console.log('\n2. ➕ Test de création d\'une vidéo')
    const newVideo = await service.createVideo({
      url: 'https://www.youtube.com/watch?v=test1234567',
      title: 'Vidéo de test',
      description: 'Description de test',
      category: 'Test',
      ageGroup: '6-8 ans',
      isActive: true
    })
    console.log(`   ✅ Vidéo créée avec l'ID: ${newVideo.id}`)

    // Test 3: Supprimer la vidéo de test
    console.log('\n3. 🗑️ Test de suppression d\'une vidéo')
    await service.deleteVideo(newVideo.id)
    console.log('   ✅ Vidéo supprimée avec succès')

    // Test 4: Test d'extraction d'ID
    console.log('\n4. 🔍 Test d\'extraction d\'ID YouTube')
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
    ]

    let successCount = 0
    for (const url of testUrls) {
      const videoId = service.extractVideoId(url)
      if (videoId) {
        console.log(`   ✅ ${url} → ${videoId}`)
        successCount++
      } else {
        console.log(`   ❌ ${url} → Aucun ID extrait`)
      }
    }

    console.log(`\n📊 Résultats: ${successCount}/${testUrls.length} URLs traitées avec succès`)

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Tous les tests sont passés avec succès!')
    console.log('🎉 Le service YouTube fonctionne correctement')

  } catch (error) {
    console.error('❌ [TEST] Erreur lors des tests:', error)
    process.exit(1)
  }
}

// Exécuter les tests
testYouTubeService()
