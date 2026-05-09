/**
 * Service de gestion des mises à jour de l'application
 * Gère la détection et l'affichage des notifications de mise à jour
 */

import { ref, reactive } from 'vue'

// État global des mises à jour
const updateState = reactive({
  isUpdateAvailable: false,
  currentVersion: null,
  newVersion: null,
  showNotification: false,
  isLoading: true
})

// Charger la version actuelle depuis version.json
async function loadCurrentVersion() {
  try {
    const response = await fetch('/version.json?t=' + Date.now())
    if (!response.ok) {
      throw new Error('Impossible de charger version.json')
    }
    const versionInfo = await response.json()
    updateState.currentVersion = versionInfo.version
    return versionInfo.version
  } catch (error) {
    console.error('Erreur chargement version:', error)
    // Fallback sur une version par défaut
    updateState.currentVersion = '1.0.0'
    return '1.0.0'
  } finally {
    updateState.isLoading = false
  }
}

// Comparer deux versions (format semver)
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1
    if (parts1[i] < parts2[i]) return -1
  }
  return 0
}

// Fonctions de gestion des mises à jour
export const updateService = {
  // État réactif
  state: updateState,

  // Initialiser le service
  async initialize() {
    await loadCurrentVersion()
  },

  // Afficher la notification de mise à jour
  showUpdateNotification(currentVersion, newVersion) {
    // Vérifier que la nouvelle version est vraiment plus récente
    if (compareVersions(newVersion, currentVersion) > 0) {
      updateState.currentVersion = currentVersion
      updateState.newVersion = newVersion
      updateState.isUpdateAvailable = true
      updateState.showNotification = true
    }
  },

  // Masquer la notification
  hideUpdateNotification() {
    updateState.showNotification = false
  },

  // Forcer la mise à jour
  forceUpdate() {
    updateState.showNotification = false
    window.location.reload()
  },

  // Annuler la mise à jour
  cancelUpdate() {
    updateState.showNotification = false
    // Rappel dans 30 minutes
    setTimeout(() => {
      if (updateState.isUpdateAvailable) {
        updateState.showNotification = true
      }
    }, 30 * 60 * 1000)
  },

  // Vérifier les mises à jour
  async checkForUpdates() {

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

    // Vérifier aussi la version sur le serveur
    try {
      const response = await fetch('/version.json?t=' + Date.now())
      if (response.ok) {
        const serverVersion = await response.json()
        const currentVersion = updateState.currentVersion || await loadCurrentVersion()

        if (compareVersions(serverVersion.version, currentVersion) > 0) {
          this.showUpdateNotification(currentVersion, serverVersion.version)
        }
      }
    } catch (error) {
      console.error('Erreur vérification version serveur:', error)
    }
  }
}

// Hook pour utiliser le service dans les composants
export function useUpdateService() {
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
