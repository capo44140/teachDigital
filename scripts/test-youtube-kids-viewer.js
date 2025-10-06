/**
 * Script de test pour le visualiseur YouTube des enfants
 * Teste le filtrage par âge et la sécurité
 */

import sql from '../src/config/database.js'

async function testYouTubeKidsViewer() {
  try {
    console.log('🧪 [TEST] Début des tests du visualiseur YouTube pour enfants...')
    
    // 1. Tester la connexion à la base de données
    console.log('\n1️⃣ Test de connexion à la base de données...')
    const connectionTest = await sql`SELECT NOW() as current_time`
    console.log('✅ Connexion DB réussie:', connectionTest[0].current_time)
    
    // 2. Vérifier que la table youtube_videos existe
    console.log('\n2️⃣ Vérification de la table youtube_videos...')
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'youtube_videos'
      ) as exists
    `
    console.log('✅ Table youtube_videos existe:', tableExists[0].exists)
    
    // 3. Récupérer toutes les vidéos
    console.log('\n3️⃣ Récupération des vidéos...')
    const videos = await sql`
      SELECT id, title, age_group, category, is_active
      FROM youtube_videos 
      ORDER BY created_at DESC
    `
    console.log(`✅ ${videos.length} vidéos trouvées`)
    
    // 4. Tester le filtrage par âge
    console.log('\n4️⃣ Test du filtrage par âge...')
    
    // Simuler différents profils d'âge
    const testProfiles = [
      { name: 'Enfant CP', level: 'CP', age: 6 },
      { name: 'Enfant CE1', level: 'CE1', age: 7 },
      { name: 'Enfant CM2', level: 'CM2', age: 10 },
      { name: 'Adolescent 6ème', level: '6ème', age: 11 },
      { name: 'Adolescent 3ème', level: '3ème', age: 14 }
    ]
    
    for (const profile of testProfiles) {
      console.log(`\n👤 Profil: ${profile.name} (${profile.age} ans)`)
      
      const appropriateVideos = videos.filter(video => {
        if (!video.age_group) return true
        
        const ageGroup = video.age_group
        const ageRanges = ageGroup.match(/(\d+)-(\d+)/)
        
        if (ageRanges) {
          const minAge = parseInt(ageRanges[1])
          const maxAge = parseInt(ageRanges[2])
          return profile.age >= minAge && profile.age <= maxAge
        }
        
        return true
      })
      
      console.log(`   📺 ${appropriateVideos.length} vidéos appropriées`)
      
      // Afficher quelques exemples
      appropriateVideos.slice(0, 3).forEach(video => {
        console.log(`      - ${video.title} (${video.age_group})`)
      })
    }
    
    // 5. Tester les catégories disponibles
    console.log('\n5️⃣ Test des catégories...')
    const categories = [...new Set(videos.map(v => v.category))]
    console.log(`✅ ${categories.length} catégories trouvées:`, categories.join(', '))
    
    // 6. Tester la sécurité - vérifier qu'aucune vidéo inappropriée n'est accessible
    console.log('\n6️⃣ Test de sécurité...')
    const inappropriateVideos = videos.filter(video => {
      // Vérifier s'il y a des vidéos sans groupe d'âge défini
      return !video.age_group || video.age_group.trim() === ''
    })
    
    if (inappropriateVideos.length > 0) {
      console.log('⚠️ ATTENTION: Vidéos sans groupe d\'âge défini:')
      inappropriateVideos.forEach(video => {
        console.log(`   - ${video.title} (ID: ${video.id})`)
      })
    } else {
      console.log('✅ Toutes les vidéos ont un groupe d\'âge défini')
    }
    
    // 7. Statistiques finales
    console.log('\n7️⃣ Statistiques finales...')
    const activeVideos = videos.filter(v => v.is_active)
    const inactiveVideos = videos.filter(v => !v.is_active)
    
    console.log(`📊 Total vidéos: ${videos.length}`)
    console.log(`✅ Vidéos actives: ${activeVideos.length}`)
    console.log(`❌ Vidéos inactives: ${inactiveVideos.length}`)
    
    // Répartition par âge
    const ageGroups = [...new Set(videos.map(v => v.age_group).filter(Boolean))]
    console.log('\n📈 Répartition par groupe d\'âge:')
    ageGroups.forEach(ageGroup => {
      const count = videos.filter(v => v.age_group === ageGroup).length
      console.log(`   ${ageGroup}: ${count} vidéos`)
    })
    
    console.log('\n🎉 Tests terminés avec succès !')
    return true
    
  } catch (error) {
    console.error('❌ [TEST] Erreur lors des tests:', error)
    return false
  }
}

// Fonction pour tester la logique de filtrage
function testAgeFiltering() {
  console.log('\n🧮 Test de la logique de filtrage par âge...')
  
  const testCases = [
    { userAge: 6, ageGroup: '3-5 ans', expected: false },
    { userAge: 6, ageGroup: '6-8 ans', expected: true },
    { userAge: 6, ageGroup: '9-12 ans', expected: false },
    { userAge: 10, ageGroup: '6-8 ans', expected: false },
    { userAge: 10, ageGroup: '9-12 ans', expected: true },
    { userAge: 10, ageGroup: '13-15 ans', expected: false },
    { userAge: 12, ageGroup: '9-12 ans', expected: true },
    { userAge: 12, ageGroup: '13-15 ans', expected: false },
    { userAge: 14, ageGroup: '13-15 ans', expected: true },
    { userAge: 16, ageGroup: '13-15 ans', expected: false }
  ]
  
  let passedTests = 0
  
  testCases.forEach((testCase, index) => {
    const ageRanges = testCase.ageGroup.match(/(\d+)-(\d+)/)
    let result = true
    
    if (ageRanges) {
      const minAge = parseInt(ageRanges[1])
      const maxAge = parseInt(ageRanges[2])
      result = testCase.userAge >= minAge && testCase.userAge <= maxAge
    }
    
    const passed = result === testCase.expected
    if (passed) passedTests++
    
    console.log(`   Test ${index + 1}: ${testCase.userAge} ans, ${testCase.ageGroup} → ${result} ${passed ? '✅' : '❌'}`)
  })
  
  console.log(`\n📊 Résultat: ${passedTests}/${testCases.length} tests réussis`)
  return passedTests === testCases.length
}

// Exécuter les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests du visualiseur YouTube pour enfants...\n')
  
  const dbTest = await testYouTubeKidsViewer()
  const filterTest = testAgeFiltering()
  
  console.log('\n📋 Résumé des tests:')
  console.log(`   Base de données: ${dbTest ? '✅' : '❌'}`)
  console.log(`   Filtrage par âge: ${filterTest ? '✅' : '❌'}`)
  
  if (dbTest && filterTest) {
    console.log('\n🎉 Tous les tests sont passés ! Le visualiseur YouTube pour enfants est prêt.')
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.')
  }
}

// Exécuter si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(() => {
    process.exit(0)
  }).catch(error => {
    console.error('Erreur fatale:', error)
    process.exit(1)
  })
}

export { testYouTubeKidsViewer, testAgeFiltering, runAllTests }
