/**
 * Script de test pour les services PWA
 * Vérifie que tous les services sont correctement configurés
 */

import { LessonService } from '../src/services/lessonService.js'
import { ProfileService } from '../src/services/profile/profileService.js'
import { NotificationService } from '../src/services/notificationService.js'

async function testPWAServices() {
  console.log('🧪 Test des services PWA...')
  
  const tests = [
    {
      name: 'LessonService.getAllAvailableLessons',
      test: async () => {
        const lessons = await LessonService.getAllAvailableLessons()
        console.log(`✅ LessonService.getAllAvailableLessons: ${lessons.length} leçons trouvées`)
        return true
      }
    },
    {
      name: 'ProfileService.getAllProfiles',
      test: async () => {
        const profiles = await ProfileService.getAllProfiles()
        console.log(`✅ ProfileService.getAllProfiles: ${profiles.length} profils trouvés`)
        return true
      }
    },
    {
      name: 'NotificationService.getNotifications (avec profil)',
      test: async () => {
        // Tester avec un profil par défaut
        const notifications = await NotificationService.getNotifications(1)
        console.log(`✅ NotificationService.getNotifications: ${notifications.length} notifications trouvées`)
        return true
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test.test()
      passed++
    } catch (error) {
      console.error(`❌ ${test.name}:`, error.message)
      failed++
    }
  }

  console.log(`\n📊 Résultats des tests: ${passed} réussis, ${failed} échoués`)
  
  if (failed === 0) {
    console.log('🎉 Tous les services PWA sont correctement configurés!')
  } else {
    console.log('⚠️ Certains services nécessitent une attention')
  }
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testPWAServices().catch(console.error)
}

export { testPWAServices }
