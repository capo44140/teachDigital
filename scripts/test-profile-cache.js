/**
 * Script de test pour le cache des profils
 * Vérifie que les profils sont correctement mis en cache
 */

import { ProfileService } from '../src/services/profile/profileService.js'
import offlineDataService from '../src/services/offlineDataService.js'
import cacheService from '../src/services/cacheService.js'

async function testProfileCache() {
  console.log('🧪 Test du cache des profils...')
  
  const tests = [
    {
      name: 'Chargement initial des profils',
      test: async () => {
        console.log('📥 Chargement initial des profils...')
        const profiles = await offlineDataService.getCriticalData(
          'profiles',
          () => ProfileService.getAllProfiles(),
          { 
            maxAge: 30 * 60 * 1000,
            ttl: 30 * 60 * 1000,
            persistent: true,
            priority: 'high',
            tags: ['profiles']
          }
        )
        
        console.log(`✅ ${profiles.length} profils chargés`)
        return profiles.length > 0
      }
    },
    {
      name: 'Vérification du cache',
      test: async () => {
        console.log('🔍 Vérification du cache...')
        const cachedProfiles = cacheService.get('offline_profiles')
        
        if (cachedProfiles) {
          console.log(`✅ ${cachedProfiles.length} profils trouvés en cache`)
          return true
        } else {
          console.log('❌ Aucun profil en cache')
          return false
        }
      }
    },
    {
      name: 'Chargement depuis le cache',
      test: async () => {
        console.log('📤 Chargement depuis le cache...')
        const startTime = Date.now()
        
        const profiles = await offlineDataService.getCriticalData(
          'profiles',
          () => ProfileService.getAllProfiles(),
          { 
            maxAge: 30 * 60 * 1000,
            ttl: 30 * 60 * 1000,
            persistent: true,
            priority: 'high',
            tags: ['profiles']
          }
        )
        
        const endTime = Date.now()
        const loadTime = endTime - startTime
        
        console.log(`✅ Profils chargés depuis le cache en ${loadTime}ms`)
        return loadTime < 100 // Moins de 100ms = depuis le cache
      }
    },
    {
      name: 'Test de persistance',
      test: async () => {
        console.log('💾 Test de persistance...')
        
        // Vérifier que les données sont en localStorage
        const stored = localStorage.getItem('teachdigital_cache')
        if (stored) {
          const cacheData = JSON.parse(stored)
          const hasProfiles = cacheData['offline_profiles'] !== undefined
          
          if (hasProfiles) {
            console.log('✅ Données persistantes trouvées')
            return true
          } else {
            console.log('❌ Aucune donnée persistante')
            return false
          }
        } else {
          console.log('❌ Aucun cache persistant')
          return false
        }
      }
    },
    {
      name: 'Test d\'invalidation',
      test: async () => {
        console.log('🗑️ Test d\'invalidation...')
        
        // Invalider le cache
        cacheService.deleteByTags(['profiles'])
        
        // Vérifier que le cache est vide
        const cachedProfiles = cacheService.get('offline_profiles')
        
        if (!cachedProfiles) {
          console.log('✅ Cache invalidé avec succès')
          return true
        } else {
          console.log('❌ Cache non invalidé')
          return false
        }
      }
    },
    {
      name: 'Statistiques du cache',
      test: async () => {
        console.log('📊 Statistiques du cache...')
        const stats = cacheService.getStats()
        
        console.log('Statistiques:', {
          hits: stats.hits,
          misses: stats.misses,
          hitRate: stats.hitRate + '%',
          size: stats.size,
          memoryUsage: stats.memoryUsage?.kb + ' KB'
        })
        
        return stats.hitRate > 0
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.test()
      if (result) {
        passed++
        console.log(`✅ ${test.name}: RÉUSSI`)
      } else {
        failed++
        console.log(`❌ ${test.name}: ÉCHOUÉ`)
      }
    } catch (error) {
      failed++
      console.error(`❌ ${test.name}: ERREUR -`, error.message)
    }
    console.log('') // Ligne vide pour la lisibilité
  }

  console.log(`📊 Résultats des tests: ${passed} réussis, ${failed} échoués`)
  
  if (failed === 0) {
    console.log('🎉 Tous les tests du cache des profils sont réussis!')
  } else {
    console.log('⚠️ Certains tests ont échoué')
  }

  return { passed, failed }
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testProfileCache().catch(console.error)
}

export { testProfileCache }
