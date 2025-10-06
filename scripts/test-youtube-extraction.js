#!/usr/bin/env node

/**
 * Script de test pour vérifier l'extraction d'ID YouTube
 * Usage: node scripts/test-youtube-extraction.js
 */

import youtubeVideoService from '../src/services/youtubeVideoService.js'

// URLs de test
const testUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/v/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy5nDpQy6b8m6JkdaY1v9Z',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be',
  // URLs invalides
  'https://www.google.com',
  'https://www.youtube.com/watch',
  'https://www.youtube.com/watch?v=',
  'not-a-url',
  ''
]

console.log('🧪 [TEST] Test de l\'extraction d\'ID YouTube')
console.log('=' .repeat(50))

testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. URL: ${url}`)
  
  try {
    const videoId = youtubeVideoService.extractVideoId(url)
    if (videoId) {
      console.log(`   ✅ ID extrait: ${videoId}`)
      console.log(`   🖼️  Miniature: https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
      console.log(`   📺 Embed: https://www.youtube.com/embed/${videoId}`)
    } else {
      console.log(`   ❌ Aucun ID extrait`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
  }
})

console.log('\n' + '=' .repeat(50))
console.log('✅ Test terminé')
