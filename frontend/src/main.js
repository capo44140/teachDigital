import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import UpdateNotification from './components/UpdateNotification.vue'
import { updateService, isChunkLoadError, reloadOnceAfterChunkError } from './services/updateService.js'
import { safeHtmlDirective } from './utils/sanitizeHtml.js'
import { useToastStore } from './stores/toastStore.js'
import { useSettingsStore } from './stores/settingsStore.js'
import { useThemeStore } from './stores/themeStore.js'
import { confirmAction } from './composables/useConfirm.js'
import { reportClientError } from './services/clientErrorReporter.js'

// Service d'installation PWA : chargé à part, mais tôt (il doit capter beforeinstallprompt)
import('./services/installService.js')
  .then(({ initInstallService }) => initInstallService())
  .catch((error) => console.warn('Service d\'installation indisponible:', error))

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
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Comparer le build exécuté (__APP_VERSION__) avec /version.json
              updateService.checkForUpdates()
            }
          })
        })
      })
      .catch((error) => {
        console.warn('Échec de l\'enregistrement du Service Worker:', error)
      })
  })

  // Vérifier les mises à jour quand l'app redevient visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateService.checkForUpdates()
    }
  })
}

// Chunk JS/CSS introuvable après un déploiement (ancien index.html encore en mémoire) :
// recharger une seule fois pour récupérer la nouvelle version
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceAfterChunkError()) {
    event.preventDefault()
  }
})

router.onError((error, to) => {
  if (isChunkLoadError(error)) {
    reloadOnceAfterChunkError(to?.fullPath)
  }
})

// Fournir les services globalement
app.provide('updateService', updateService)

app.use(pinia).use(router)

// Préférences d'affichage : nettoyage des anciennes clés et état par défaut dès le démarrage
useSettingsStore(pinia).initialize()
// Thème de l'application (déjà posé par public/theme-boot.js) et synchronisation entre onglets
useThemeStore(pinia).initialize()

// Exposer $toast globalement pour les composants Options API
// Usage : this.$toast.success('Profil créé') / this.$toast.errorFrom(error, 'Échec')
const toastStore = useToastStore(pinia)
app.config.globalProperties.$toast = {
  show:    (msg, opts) => toastStore.show(msg, 'info', opts),
  success: (msg, opts) => toastStore.success(msg, opts),
  info:    (msg, opts) => toastStore.info(msg, opts),
  warning: (msg, opts) => toastStore.warning(msg, opts),
  error:   (msg, opts) => toastStore.error(msg, opts),
  errorFrom: (err, fallback, opts) => toastStore.errorFrom(err, fallback, opts),
  dismiss: (id) => toastStore.dismiss(id),
  clear:   () => toastStore.clear()
}

// Confirmation accessible (remplace window.confirm) : await this.$confirm({ … })
app.config.globalProperties.$confirm = confirmAction

// Erreurs non gérées : toast (filet de sécurité) + remontée CLIENT_ERROR limitée
const UNEXPECTED_ERROR_MESSAGE = 'Une erreur inattendue est survenue. Si le problème persiste, rechargez la page.'

/**
 * Erreur non interceptée (hook de composant ou promesse) :
 * - erreur d'API : ce n'est pas un bug JavaScript, pas de remontée CLIENT_ERROR. Les refus 4xx
 *   (session expirée ou révoquée, droits…) sont déjà gérés par le router ; toast seulement
 *   hors ligne (statut 0) ou pour une erreur serveur (≥ 500) ;
 * - autre erreur : remontée CLIENT_ERROR (limitée) et toast.
 */
function handleUncaughtError (error, context) {
  if (error?.name === 'ApiError') {
    if (!(error.status > 0 && error.status < 500)) {
      toastStore.errorFrom(error, UNEXPECTED_ERROR_MESSAGE)
    }
    return
  }
  reportClientError(error, context)
  toastStore.error(UNEXPECTED_ERROR_MESSAGE)
}

app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue error]', info, err)
  handleUncaughtError(err, { source: 'vue', info })
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Promesse non gérée]', event.reason)
  handleUncaughtError(event.reason, { source: 'unhandledrejection' })
})

// Monter l'app immédiatement pour un affichage rapide
app.mount('#app')
