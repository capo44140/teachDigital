/**
 * Service de gestion des mises à jour de l'application
 * Gère la détection et l'affichage des notifications de mise à jour
 */

import { ref, reactive } from 'vue'

// État global des mises à jour
const updateState = reactive({
  isUpdateAvailable: false,
  currentVersion: '0.0.15',
  newVersion: '0.0.16',
  showNotification: false
})

// Fonctions de gestion des mises à jour
export const updateService = {
  // État réactif
  state: updateState,
  
  // Afficher la notification de mise à jour
  showUpdateNotification(currentVersion, newVersion) {
    updateState.currentVersion = currentVersion
    updateState.newVersion = newVersion
    updateState.isUpdateAvailable = true
    updateState.showNotification = true
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
    // Optionnel : programmer un rappel plus tard
    setTimeout(() => {
      if (updateState.isUpdateAvailable) {
        updateState.showNotification = true
      }
    }, 30000) // Rappel dans 30 secondes
  },
  
  // Vérifier les mises à jour
  checkForUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update()
        }
      })
    }
  }
}

// Hook pour utiliser le service dans les composants
export function useUpdateService() {
  return {
    updateState: updateState,
    showUpdateNotification: updateService.showUpdateNotification,
    hideUpdateNotification: updateService.hideUpdateNotification,
    forceUpdate: updateService.forceUpdate,
    cancelUpdate: updateService.cancelUpdate,
    checkForUpdates: updateService.checkForUpdates
  }
}
