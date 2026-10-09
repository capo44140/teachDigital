#!/usr/bin/env node

/**
 * Script de test simple pour vérifier l'extraction d'ID YouTube
 * Usage: node scripts/test-youtube-extraction-simple.js
 */

// Fonction d'extraction d'ID YouTube (copiée du service)
function extractVideoId(url) {
  if (!url) {
    console.warn('⚠️ URL vide fournie')
    return null
  }
  
  console.log('🔍 Extraction de l\'ID depuis l\'URL:', url)
  
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
      console.log('✅ ID vidéo extrait:', videoId)
      return videoId
    }
  }
  
  // Si aucun pattern ne correspond, essayer une approche plus flexible
  const flexiblePattern = /[?&]v=([a-zA-Z0-9_-]{11})/
  const flexibleMatch = cleanUrl.match(flexiblePattern)
  if (flexibleMatch && flexibleMatch[1]) {
    const videoId = flexibleMatch[1]
    console.log('✅ ID vidéo extrait (pattern flexible):', videoId)
    return videoId
  }
  
  console.error('❌ Impossible d\'extraire l\'ID vidéo de l\'URL:', cleanUrl)
  console.log('💡 Formats supportés:')
  console.log('  - https://www.youtube.com/watch?v=VIDEO_ID')
  console.log('  - https://youtu.be/VIDEO_ID')
  console.log('  - https://www.youtube.com/embed/VIDEO_ID')
  console.log('  - https://www.youtube.com/shorts/VIDEO_ID')
  
  return null
}

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

let successCount = 0
let totalCount = testUrls.length

testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. URL: ${url}`)
  
  try {
    const videoId = extractVideoId(url)
    if (videoId) {
      console.log(`   ✅ ID extrait: ${videoId}`)
      console.log(`   🖼️  Miniature: https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
      console.log(`   📺 Embed: https://www.youtube.com/embed/${videoId}`)
      successCount++
    } else {
      console.log(`   ❌ Aucun ID extrait`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
  }
})

console.log('\n' + '=' .repeat(50))
console.log(`📊 Résultats: ${successCount}/${totalCount} URLs traitées avec succès`)
console.log('✅ Test terminé')
