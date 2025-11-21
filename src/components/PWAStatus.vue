<template>
  <div class="pwa-status">
    <div class="status-header">
      <h3>📱 Statut PWA</h3>
      <div class="status-indicators">
        <span 
          v-for="indicator in statusIndicators" 
          :key="indicator.name"
          class="status-indicator"
          :class="indicator.status"
          :title="indicator.tooltip"
        >
          {{ indicator.icon }}
        </span>
      </div>
    </div>

    <div class="status-details">
      <div class="status-section">
        <h4>🔧 Service Worker</h4>
        <div class="status-item">
          <span class="label">Statut:</span>
          <span class="value" :class="swStatus.class">{{ swStatus.text }}</span>
        </div>
        <div v-if="swInfo.scope" class="status-item">
          <span class="label">Portée:</span>
          <span class="value">{{ swInfo.scope }}</span>
        </div>
        <div v-if="swInfo.version" class="status-item">
          <span class="label">Version:</span>
          <span class="value">{{ swInfo.version }}</span>
        </div>
      </div>

      <div class="status-section">
        <h4>📋 Manifest</h4>
        <div class="status-item">
          <span class="label">Nom:</span>
          <span class="value">{{ manifestInfo.name }}</span>
        </div>
        <div class="status-item">
          <span class="label">Version:</span>
          <span class="value">{{ manifestInfo.version }}</span>
        </div>
        <div class="status-item">
          <span class="label">Icônes:</span>
          <span class="value">{{ manifestInfo.iconCount }} icônes</span>
        </div>
        <div class="status-item">
          <span class="label">Raccourcis:</span>
          <span class="value">{{ manifestInfo.shortcutCount }} raccourcis</span>
        </div>
      </div>

      <div class="status-section">
        <h4>🔔 Notifications</h4>
        <div class="status-item">
          <span class="label">Support:</span>
          <span class="value" :class="notificationStatus.class">{{ notificationStatus.text }}</span>
        </div>
        <div class="status-item">
          <span class="label">Permission:</span>
          <span class="value" :class="permissionStatus.class">{{ permissionStatus.text }}</span>
        </div>
        <div v-if="subscriptionStatus" class="status-item">
          <span class="label">Abonnement:</span>
          <span class="value" :class="subscriptionStatus.class">{{ subscriptionStatus.text }}</span>
        </div>
      </div>

      <div class="status-section">
        <h4>📱 Installation</h4>
        <div class="status-item">
          <span class="label">Installable:</span>
          <span class="value" :class="installStatus.class">{{ installStatus.text }}</span>
        </div>
        <div class="status-item">
          <span class="label">Mode:</span>
          <span class="value">{{ displayMode }}</span>
        </div>
        <div v-if="installPrompt" class="status-item">
          <span class="label">Prompt disponible:</span>
          <span class="value" class="success">Oui</span>
        </div>
      </div>
    </div>

    <div class="status-actions">
      <button class="action-button" :disabled="isLoading" @click="refreshStatus">
        <span v-if="isLoading">🔄</span>
        <span v-else>↻</span>
        Actualiser
      </button>
      
      <button v-if="canInstall" class="action-button install" @click="showInstallPrompt">
        📱 Installer
      </button>
      
      <button v-if="canSubscribe" class="action-button notifications" @click="subscribeNotifications">
        🔔 Activer les notifications
      </button>
    </div>

    <div v-if="errors.length > 0" class="status-errors">
      <h4>❌ Erreurs détectées</h4>
      <ul class="error-list">
        <li v-for="error in errors" :key="error" class="error-item">
          {{ error }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { inject } from 'vue'

export default {
  name: 'PWAStatus',
  setup() {
    const isLoading = ref(false)
    const errors = ref([])
    const swInfo = ref({})
    const manifestInfo = ref({})
    const installPrompt = ref(null)
    const displayMode = ref('browser')

    // Injecter les services PWA
    const installService = inject('installService', null)
    // Service de notifications push supprimé

    // Indicateurs de statut
    const statusIndicators = computed(() => [
      {
        name: 'Service Worker',
        icon: '🔧',
        status: swStatus.value.class,
        tooltip: `Service Worker: ${swStatus.value.text}`
      },
      {
        name: 'Manifest',
        icon: '📋',
        status: manifestInfo.value.valid ? 'success' : 'error',
        tooltip: `Manifest: ${manifestInfo.value.valid ? 'Valide' : 'Invalide'}`
      },
      {
        name: 'Notifications',
        icon: '🔔',
        status: notificationStatus.value.class,
        tooltip: `Notifications: ${notificationStatus.value.text}`
      },
      {
        name: 'Installation',
        icon: '📱',
        status: installStatus.value.class,
        tooltip: `Installation: ${installStatus.value.text}`
      }
    ])

    // Statut du Service Worker
    const swStatus = computed(() => {
      if (swInfo.value.registered) {
        return { text: 'Enregistré', class: 'success' }
      } else if (swInfo.value.supported) {
        return { text: 'Non enregistré', class: 'warning' }
      } else {
        return { text: 'Non supporté', class: 'error' }
      }
    })

    // Statut des notifications
    const notificationStatus = computed(() => {
      if ('Notification' in window) {
        return { text: 'Supporté', class: 'success' }
      } else {
        return { text: 'Non supporté', class: 'error' }
      }
    })

    // Statut des permissions
    const permissionStatus = computed(() => {
      if ('Notification' in window) {
        const permission = Notification.permission
        switch (permission) {
          case 'granted':
            return { text: 'Accordée', class: 'success' }
          case 'denied':
            return { text: 'Refusée', class: 'error' }
          case 'default':
            return { text: 'Non demandée', class: 'warning' }
          default:
            return { text: 'Inconnue', class: 'warning' }
        }
      }
      return { text: 'N/A', class: 'error' }
    })

    // Statut de l'abonnement (service supprimé)
    const subscriptionStatus = computed(() => {
      return null
    })

    // Statut d'installation
    const installStatus = computed(() => {
      if (installService) {
        const stats = installService.getStats()
        if (stats.isInstalled) {
          return { text: 'Installée', class: 'success' }
        } else if (stats.isInstallable) {
          return { text: 'Installable', class: 'warning' }
        } else {
          return { text: 'Non installable', class: 'error' }
        }
      }
      return { text: 'Inconnu', class: 'warning' }
    })

    // Peut installer
    const canInstall = computed(() => {
      return installService && installService.getStats().isInstallable
    })

    // Peut s'abonner aux notifications
    const canSubscribe = computed(() => {
      return false // Service de notifications push supprimé
    })

    // Actualiser le statut
    const refreshStatus = async () => {
      isLoading.value = true
      errors.value = []

      try {
        await checkServiceWorker()
        await checkManifest()
        await checkInstallation()
        await checkNotifications()
      } catch (error) {
        errors.value.push(`Erreur lors de l'actualisation: ${error.message}`)
      } finally {
        isLoading.value = false
      }
    }

    // Vérifier le Service Worker
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          swInfo.value = {
            supported: true,
            registered: !!registration,
            scope: registration?.scope,
            version: registration?.active?.scriptURL
          }
        } catch (error) {
          swInfo.value = { supported: true, registered: false, error: error.message }
        }
      } else {
        swInfo.value = { supported: false, registered: false }
      }
    }

    // Vérifier le Manifest
    const checkManifest = async () => {
      try {
        const response = await fetch('/manifest.json')
        if (response.ok) {
          const manifest = await response.json()
          manifestInfo.value = {
            valid: true,
            name: manifest.name,
            version: manifest.version,
            iconCount: manifest.icons?.length || 0,
            shortcutCount: manifest.shortcuts?.length || 0
          }
        } else {
          manifestInfo.value = { valid: false, error: 'Manifest non accessible' }
          errors.value.push('Manifest PWA non accessible')
        }
      } catch (error) {
        manifestInfo.value = { valid: false, error: error.message }
        errors.value.push(`Erreur lors du chargement du manifest: ${error.message}`)
      }
    }

    // Vérifier l'installation
    const checkInstallation = async () => {
      if (installService) {
        const stats = installService.getStats()
        displayMode.value = stats.displayMode
        installPrompt.value = stats.shouldShowPrompt
      }
    }

    // Vérifier les notifications (service supprimé)
    const checkNotifications = async () => {
      // Service de notifications push supprimé
    }

    // Afficher le prompt d'installation
    const showInstallPrompt = async () => {
      if (installService) {
        try {
          await installService.showInstallPrompt()
        } catch (error) {
          errors.value.push(`Erreur installation: ${error.message}`)
        }
      }
    }

    // S'abonner aux notifications (service supprimé)
    const subscribeNotifications = async () => {
      // Service de notifications push supprimé
    }

    // Initialiser au montage
    onMounted(() => {
      refreshStatus()
    })

    return {
      isLoading,
      errors,
      swInfo,
      manifestInfo,
      installPrompt,
      displayMode,
      statusIndicators,
      swStatus,
      notificationStatus,
      permissionStatus,
      subscriptionStatus,
      installStatus,
      canInstall,
      canSubscribe,
      refreshStatus,
      showInstallPrompt,
      subscribeNotifications
    }
  }
}
</script>

<style scoped>
.pwa-status {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.status-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.2rem;
}

.status-indicators {
  display: flex;
  gap: 8px;
}

.status-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: 2px solid;
}

.status-indicator.success {
  background: #dcfce7;
  border-color: #10b981;
  color: #166534;
}

.status-indicator.warning {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.status-indicator.error {
  background: #fecaca;
  border-color: #ef4444;
  color: #991b1b;
}

.status-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.status-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.status-section h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.status-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.value {
  color: #111827;
  font-weight: 600;
}

.value.success {
  color: #10b981;
}

.value.warning {
  color: #f59e0b;
}

.value.error {
  color: #ef4444;
}

.status-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.action-button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-button:not(.install):not(.notifications) {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button:not(.install):not(.notifications):hover:not(:disabled) {
  background: #e5e7eb;
}

.action-button.install {
  background: #3b82f6;
  color: white;
}

.action-button.install:hover:not(:disabled) {
  background: #2563eb;
}

.action-button.notifications {
  background: #10b981;
  color: white;
}

.action-button.notifications:hover:not(:disabled) {
  background: #059669;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-errors {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
}

.status-errors h4 {
  margin: 0 0 12px 0;
  color: #dc2626;
  font-size: 1rem;
}

.error-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.error-item {
  color: #991b1b;
  font-size: 0.9rem;
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;
}

.error-item:before {
  content: '•';
  position: absolute;
  left: 0;
  color: #dc2626;
}

.error-item:last-child {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .pwa-status {
    padding: 16px;
  }
  
  .status-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .status-details {
    grid-template-columns: 1fr;
  }
  
  .status-actions {
    flex-direction: column;
  }
  
  .action-button {
    justify-content: center;
  }
}
</style>
