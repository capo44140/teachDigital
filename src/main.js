import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import UpdateNotification from './components/UpdateNotification.vue'
import { updateService } from './services/updateService.js'
import { useApiStore } from './stores/apiStore.js'

// Services PWA avancés
import offlineDataService from './services/offlineDataService.js'
import installService from './services/installService.js'
import mobileOptimizationService from './services/mobileOptimizationService.js'

// Créer l'instance Pinia
const pinia = createPinia()

// Créer l'application Vue
const app = createApp(App)

// Enregistrer le composant global
app.component('UpdateNotification', UpdateNotification)

// Enregistrement du Service Worker pour PWA avec gestion des mises à jour
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none' // Forcer la vérification des mises à jour
    })
      .then((registration) => {
        console.log('✅ Service Worker enregistré avec succès:', registration.scope);
        
        // Vérifier les mises à jour toutes les 30 secondes
        setInterval(() => {
          registration.update();
        }, 30000);
        
        // Écouter les mises à jour disponibles
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker: Mise à jour disponible');
          
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 Service Worker: Nouvelle version installée');
              
              // Utiliser la popup personnalisée au lieu de confirm()
              updateService.showUpdateNotification('0.0.15', '0.0.16');
            }
          });
        });
      })
      .catch((error) => {
        console.log('❌ Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

// Fournir les services globalement
app.provide('updateService', updateService)
app.provide('offlineDataService', offlineDataService)
app.provide('installService', installService)
app.provide('mobileOptimizationService', mobileOptimizationService)

app.use(pinia).use(router)

// Monter l'app immédiatement pour un affichage rapide
app.mount('#app')

// Polyfill pour requestIdleCallback (non supporté par Safari)
const scheduleIdleTask = window.requestIdleCallback || ((cb) => setTimeout(cb, 1))

// Initialiser les services de manière asynchrone après le premier rendu
// Cela améliore le temps de premier affichage (FCP - First Contentful Paint)
scheduleIdleTask(() => {
  initializeServicesAsync()
})

/**
 * Initialise les services de manière asynchrone après le montage de l'app
 * Optimise le chemin critique en différant les requêtes non essentielles
 */
async function initializeServicesAsync() {
  console.log('🚀 Initialisation asynchrone des services...')
  
  // Étape 1 : Initialiser l'apiStore depuis le cache local (rapide)
  const apiStore = useApiStore()
  apiStore.initialize()
  
  // Étape 2 : Précharger uniquement les profils en priorité
  // Les autres données seront chargées à la demande
  try {
    await offlineDataService.preloadProfiles()
    console.log('✅ Profils préchargés')
  } catch (error) {
    console.warn('⚠️ Erreur préchargement profils:', error)
  }
  
  // Étape 3 : Initialiser les autres services en arrière-plan
  // Sans bloquer l'interface utilisateur
  scheduleIdleTask(() => {
    initializePWAServices()
  })
}

/**
 * Initialise les services PWA en arrière-plan
 */
async function initializePWAServices() {
  const services = [
    { name: 'Optimisation Mobile', init: () => mobileOptimizationService.init() },
    { name: 'Installation', init: () => installService.checkInstallationStatus() }
  ]

  console.log('🔧 Initialisation des services PWA...')
  
  const results = await Promise.allSettled(
    services.map(service => service.init())
  )

  const successful = results.filter(result => result.status === 'fulfilled').length
  const failed = results.filter(result => result.status === 'rejected').length

  if (failed > 0) {
    console.warn(`⚠️ Initialisation PWA partielle: ${successful} réussis, ${failed} échoués`)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`❌ Échec de l'initialisation ${services[index].name}:`, result.reason)
      }
    })
  } else {
    console.log('✅ Services PWA initialisés avec succès')
  }
  
  // Précharger les leçons et notifications en très basse priorité
  scheduleIdleTask(() => {
    preloadSecondaryData()
  })
}

/**
 * Précharge les données secondaires en arrière-plan
 */
async function preloadSecondaryData() {
  try {
    await Promise.allSettled([
      offlineDataService.preloadLessons(),
      offlineDataService.preloadNotifications()
    ])
    console.log('✅ Données secondaires préchargées')
  } catch (error) {
    console.warn('⚠️ Erreur préchargement données secondaires:', error)
  }
}
