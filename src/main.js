import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import UpdateNotification from './components/UpdateNotification.vue'
import { updateService } from './services/updateService.js'
import { useApiStore } from './stores/apiStore.js'

// Services PWA avancés
import installService from './services/installService.js'
import mobileOptimizationService from './services/mobileOptimizationService.js'
import { safeHtmlDirective } from './utils/sanitizeHtml.js'

// Filtrer les avertissements Radix UI/Dialog de la console
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

function safeConsoleArgToString (arg) {
  try {
    if (typeof arg === 'string') return arg
    if (arg instanceof Error) return arg.stack || arg.message || String(arg)
    // Éviter la coercition implicite (peut throw sur certains proxys)
    return JSON.stringify(arg)
  } catch (_e) {
    try {
      return String(arg)
    } catch (_e2) {
      return Object.prototype.toString.call(arg)
    }
  }
}

console.warn = function (...args) {
  const message = args.map(safeConsoleArgToString).join(' ')
  // Ignorer les avertissements Radix UI concernant DialogContent/DialogTitle
  if (message.includes('DialogContent') ||
    message.includes('DialogTitle') ||
    message.includes('requires a `DialogTitle`') ||
    message.includes('VisuallyHidden') ||
    message.includes('radix-ui.com/primitives/docs/components/dialog')) {
    return // Ignorer cet avertissement
  }
  originalConsoleWarn.apply(console, args)
}

console.error = function (...args) {
  const message = args.map(safeConsoleArgToString).join(' ')
  // Ignorer les erreurs Radix UI concernant DialogContent/DialogTitle
  if (message.includes('DialogContent') ||
    message.includes('DialogTitle') ||
    message.includes('requires a `DialogTitle`') ||
    message.includes('VisuallyHidden') ||
    message.includes('radix-ui.com/primitives/docs/components/dialog')) {
    return // Ignorer cette erreur
  }
  originalConsoleError.apply(console, args)
}

// Créer l'instance Pinia
const pinia = createPinia()

// Créer l'application Vue
const app = createApp(App)

// Enregistrer le composant global
app.component('UpdateNotification', UpdateNotification)

// Directive globale de sanitisation HTML (XSS protection pour avatars)
app.directive('safe-html', safeHtmlDirective)

// Enregistrement du Service Worker pour PWA avec gestion des mises à jour
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none' // Forcer la vérification des mises à jour
    })
      .then(async (registration) => {
        // Initialiser le service de mise à jour
        await updateService.initialize()

        // Vérifier les mises à jour au démarrage
        setTimeout(() => {
          updateService.checkForUpdates()
        }, 5000) // Attendre 5s après le chargement

        // Vérifier périodiquement (toutes les 30 minutes)
        setInterval(() => {
          updateService.checkForUpdates()
        }, 30 * 60 * 1000)

        // Écouter les mises à jour disponibles du Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', async () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

              // Récupérer les versions réelles
              try {
                const response = await fetch('/version.json?t=' + Date.now())
                if (response.ok) {
                  const newVersionInfo = await response.json()
                  const currentVersion = updateService.state.currentVersion || '1.0.0'
                  updateService.showUpdateNotification(currentVersion, newVersionInfo.version)
                }
              } catch (error) {
                console.error('Erreur récupération version:', error)
                // Fallback: afficher quand même la notification
                const currentVersion = updateService.state.currentVersion || '1.0.0'
                updateService.showUpdateNotification(currentVersion, 'nouvelle version')
              }
            }
          })
        })
      })
      .catch((error) => {
        // Échec de l'enregistrement du Service Worker
      })
  })

  // Vérifier les mises à jour quand l'app redevient visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateService.checkForUpdates()
    }
  })
}

// Fournir les services globalement
app.provide('updateService', updateService)
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
  // Étape 1 : Initialiser l'apiStore depuis le cache local (rapide)
  const apiStore = useApiStore()
  apiStore.initialize()

  // Étape 2 : Initialiser les autres services en arrière-plan
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

  const results = await Promise.allSettled(
    services.map(service => service.init())
  )

  const successful = results.filter(result => result.status === 'fulfilled').length
  const failed = results.filter(result => result.status === 'rejected').length

  if (failed > 0) {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Échec de l'initialisation ${services[index].name}:`, result.reason)
      }
    })
  } else {
    // Services PWA initialisés
  }
}
