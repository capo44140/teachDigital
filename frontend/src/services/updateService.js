/* global __APP_VERSION__ */
/**
 * Service de gestion des mises à jour de l'application
 * Gère la détection et l'affichage des notifications de mise à jour
 *
 * La version exécutée est injectée au build (__APP_VERSION__ = « version-horodatage »,
 * cf. vite.config.js) ; la même valeur est écrite dans dist/version.json (champ « build »).
 * Une mise à jour est disponible dès que le serveur annonce un autre build que celui exécuté.
 */

import { reactive } from 'vue'

// Build exécuté (absent en développement / tests si la constante n'est pas définie)
const RUNNING_BUILD = typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? String(__APP_VERSION__) : null

// Rechargement unique après l'échec d'un import dynamique (chunk supprimé par un déploiement)
const CHUNK_RELOAD_KEY = 'teachdigital_chunk_reload_at'
const CHUNK_RELOAD_COOLDOWN_MS = 60 * 1000
const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading (CSS )?chunk [\w-]+ failed/i

/**
 * Version lisible d'un identifiant de build (« 1.0.2-1730000000000 » → « 1.0.2 »)
 */
export function displayVersion (build) {
  if (!build) return null
  const value = String(build)
  const match = /^(.*)-(\d{10,})$/.exec(value)
  return match ? match[1] : value
}

// Comparer deux versions (format semver)
function compareVersions (v1, v2) {
  const parts1 = String(v1).split('.').map(part => parseInt(part, 10) || 0)
  const parts2 = String(v2).split('.').map(part => parseInt(part, 10) || 0)

  for (let i = 0; i < 3; i++) {
    if ((parts1[i] || 0) > (parts2[i] || 0)) return 1
    if ((parts1[i] || 0) < (parts2[i] || 0)) return -1
  }
  return 0
}

/**
 * Le serveur annonce-t-il un build différent de celui exécuté ?
 * @param {Object} serverInfo - contenu de /version.json
 * @param {string|null} runningBuild - build exécuté
 */
export function isNewerBuildAvailable (serverInfo, runningBuild = RUNNING_BUILD) {
  if (!serverInfo || !runningBuild) return false
  if (serverInfo.build) {
    return String(serverInfo.build) !== String(runningBuild)
  }
  // Ancien format de version.json (sans « build ») : comparaison semver
  if (serverInfo.version) {
    return compareVersions(serverInfo.version, displayVersion(runningBuild)) > 0
  }
  return false
}

/**
 * Libellé de la version disponible (précise la date si le numéro de version est inchangé)
 */
export function describeServerVersion (serverInfo, runningBuild = RUNNING_BUILD) {
  const version = serverInfo?.version || displayVersion(serverInfo?.build) || 'nouvelle version'
  if (version !== displayVersion(runningBuild)) return version
  const date = serverInfo?.buildDate ? new Date(serverInfo.buildDate) : null
  if (!date || Number.isNaN(date.getTime())) return `${version} (nouvelle compilation)`
  return `${version} (${date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })})`
}

/**
 * L'erreur provient-elle d'un chunk JS/CSS introuvable (nouveau déploiement) ?
 */
export function isChunkLoadError (error) {
  const message = typeof error === 'string' ? error : (error?.message || '')
  return CHUNK_ERROR_PATTERN.test(message)
}

/**
 * Recharger la page une seule fois (garde en sessionStorage) après un chunk introuvable.
 * @param {string} [targetPath] - page à ouvrir après rechargement
 * @returns {boolean} true si un rechargement a été déclenché
 */
export function reloadOnceAfterChunkError (targetPath) {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (last && Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    // Sans sessionStorage, impossible de garantir un rechargement unique
    return false
  }
  if (targetPath && typeof targetPath === 'string' && targetPath.startsWith('/')) {
    window.location.assign(targetPath)
  } else {
    window.location.reload()
  }
  return true
}

// État global des mises à jour
const updateState = reactive({
  isUpdateAvailable: false,
  currentVersion: displayVersion(RUNNING_BUILD),
  newVersion: null,
  showNotification: false,
  isLoading: true
})

let snoozeTimer = null
let lastNotifiedBuild = null

async function fetchServerVersion () {
  const response = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Impossible de charger version.json')
  }
  return response.json()
}

// Fonctions de gestion des mises à jour
export const updateService = {
  // État réactif
  state: updateState,

  // Build exécuté
  runningBuild: RUNNING_BUILD,

  // Initialiser le service
  async initialize () {
    try {
      if (!updateState.currentVersion) {
        // Développement : afficher au moins la version publiée
        const info = await fetchServerVersion()
        updateState.currentVersion = info?.version || null
      }
    } catch (error) {
      console.error('Erreur chargement version:', error)
    } finally {
      updateState.isLoading = false
    }
  },

  // Afficher la notification de mise à jour
  showUpdateNotification (currentVersion, newVersion) {
    updateState.currentVersion = currentVersion
    updateState.newVersion = newVersion
    updateState.isUpdateAvailable = true
    updateState.showNotification = true
  },

  // Masquer la notification
  hideUpdateNotification () {
    updateState.showNotification = false
  },

  // Forcer la mise à jour
  forceUpdate () {
    updateState.showNotification = false
    window.location.reload()
  },

  // Annuler la mise à jour
  cancelUpdate () {
    updateState.showNotification = false
    // Rappel dans 30 minutes
    if (snoozeTimer) clearTimeout(snoozeTimer)
    snoozeTimer = setTimeout(() => {
      if (updateState.isUpdateAvailable) {
        updateState.showNotification = true
      }
    }, 30 * 60 * 1000)
  },

  // Vérifier les mises à jour
  async checkForUpdates () {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()
        }
      } catch (error) {
        console.error('Erreur vérification mises à jour:', error)
      }
    }

    // Comparer le build exécuté avec celui annoncé par le serveur
    if (!RUNNING_BUILD) return false
    try {
      const serverInfo = await fetchServerVersion()
      if (isNewerBuildAvailable(serverInfo, RUNNING_BUILD)) {
        const serverBuild = serverInfo.build || serverInfo.version
        // Notification déjà affichée ou reportée pour ce build : ne pas la réafficher
        if (updateState.isUpdateAvailable && lastNotifiedBuild === serverBuild) {
          return true
        }
        lastNotifiedBuild = serverBuild
        updateService.showUpdateNotification(displayVersion(RUNNING_BUILD), describeServerVersion(serverInfo, RUNNING_BUILD))
        return true
      }
    } catch (error) {
      console.error('Erreur vérification version serveur:', error)
    }
    return false
  }
}

// Hook pour utiliser le service dans les composants
export function useUpdateService () {
  return {
    updateState,
    showUpdateNotification: updateService.showUpdateNotification,
    hideUpdateNotification: updateService.hideUpdateNotification,
    forceUpdate: updateService.forceUpdate,
    cancelUpdate: updateService.cancelUpdate,
    checkForUpdates: updateService.checkForUpdates,
    initialize: updateService.initialize
  }
}
