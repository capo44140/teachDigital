<template>
  <div class="push-notification-manager">
    <!-- Bouton d'activation des notifications -->
    <div v-if="!isSubscribed && isSupported" class="notification-prompt">
      <div class="prompt-content">
        <div class="prompt-icon">🔔</div>
        <div class="prompt-text">
          <h3>Activer les notifications</h3>
          <p>Recevez des rappels pour vos quiz et des notifications sur vos progrès</p>
        </div>
        <button 
          @click="enableNotifications" 
          :disabled="isLoading"
          class="enable-button"
        >
          <span v-if="isLoading">Activation...</span>
          <span v-else>Activer</span>
        </button>
      </div>
    </div>

    <!-- Gestionnaire de notifications actif -->
    <div v-if="isSubscribed" class="notification-settings">
      <div class="settings-header">
        <h3>🔔 Notifications activées</h3>
        <button @click="disableNotifications" class="disable-button">
          Désactiver
        </button>
      </div>
      
      <div class="settings-options">
        <div class="setting-item">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.quizReminders"
              @change="updateSettings"
            >
            Rappels de quiz
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.achievements"
              @change="updateSettings"
            >
            Nouveaux badges
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.progressUpdates"
              @change="updateSettings"
            >
            Mises à jour de progression
          </label>
        </div>
        
        <div class="setting-item">
          <label>
            <input 
              type="checkbox" 
              v-model="settings.systemAlerts"
              @change="updateSettings"
            >
            Alertes système
          </label>
        </div>
      </div>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="error-message">
      <p>❌ {{ error }}</p>
      <button @click="error = null" class="dismiss-error">Fermer</button>
    </div>

    <!-- Statistiques (mode développement) -->
    <div v-if="showStats && stats" class="notification-stats">
      <h4>Statistiques des notifications</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Supporté:</span>
          <span class="stat-value">{{ stats.isSupported ? 'Oui' : 'Non' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Abonné:</span>
          <span class="stat-value">{{ stats.isSubscribed ? 'Oui' : 'Non' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Permission:</span>
          <span class="stat-value">{{ stats.permission }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import pushNotificationService from '../services/pushNotificationService.js'
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'PushNotificationManager',
  props: {
    showStats: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const profileStore = useProfileStore()
    
    const isLoading = ref(false)
    const error = ref(null)
    const isSubscribed = ref(false)
    const isSupported = ref(false)
    const stats = ref(null)
    
    const settings = ref({
      quizReminders: true,
      achievements: true,
      progressUpdates: true,
      systemAlerts: false
    })

    // Initialiser le service
    onMounted(async () => {
      try {
        isSupported.value = pushNotificationService.isSupported
        
        if (isSupported.value) {
          await pushNotificationService.initialize()
          isSubscribed.value = await pushNotificationService.isSubscribed()
          stats.value = pushNotificationService.getStats()
          
          // Charger les paramètres sauvegardés
          loadSettings()
        }
      } catch (err) {
        console.error('Erreur lors de l\'initialisation des notifications:', err)
        error.value = 'Erreur lors de l\'initialisation des notifications'
      }
    })

    // Activer les notifications
    const enableNotifications = async () => {
      isLoading.value = true
      error.value = null
      
      try {
        await pushNotificationService.subscribe({
          profileId: profileStore.currentProfile?.id,
          settings: settings.value
        })
        
        isSubscribed.value = true
        stats.value = pushNotificationService.getStats()
        
        // Sauvegarder les paramètres
        saveSettings()
        
        console.log('✅ Notifications push activées')
      } catch (err) {
        console.error('Erreur lors de l\'activation des notifications:', err)
        error.value = err.message || 'Erreur lors de l\'activation des notifications'
      } finally {
        isLoading.value = false
      }
    }

    // Désactiver les notifications
    const disableNotifications = async () => {
      isLoading.value = true
      error.value = null
      
      try {
        await pushNotificationService.unsubscribe()
        isSubscribed.value = false
        stats.value = pushNotificationService.getStats()
        
        console.log('🔕 Notifications push désactivées')
      } catch (err) {
        console.error('Erreur lors de la désactivation des notifications:', err)
        error.value = err.message || 'Erreur lors de la désactivation des notifications'
      } finally {
        isLoading.value = false
      }
    }

    // Mettre à jour les paramètres
    const updateSettings = async () => {
      try {
        saveSettings()
        
        // Si abonné, mettre à jour l'abonnement avec les nouveaux paramètres
        if (isSubscribed.value) {
          await pushNotificationService.subscribe({
            profileId: profileStore.currentProfile?.id,
            settings: settings.value
          })
        }
      } catch (err) {
        console.error('Erreur lors de la mise à jour des paramètres:', err)
        error.value = 'Erreur lors de la mise à jour des paramètres'
      }
    }

    // Sauvegarder les paramètres
    const saveSettings = () => {
      try {
        localStorage.setItem('teachdigital_notification_settings', JSON.stringify(settings.value))
      } catch (err) {
        console.warn('Impossible de sauvegarder les paramètres de notification:', err)
      }
    }

    // Charger les paramètres
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('teachdigital_notification_settings')
        if (saved) {
          settings.value = { ...settings.value, ...JSON.parse(saved) }
        }
      } catch (err) {
        console.warn('Impossible de charger les paramètres de notification:', err)
      }
    }

    // Tester les notifications (mode développement)
    const testNotification = async () => {
      try {
        await pushNotificationService.sendLocalNotification({
          title: 'Test de notification',
          body: 'Ceci est un test de notification push',
          data: {
            type: 'test',
            profileId: profileStore.currentProfile?.id
          }
        })
      } catch (err) {
        console.error('Erreur lors du test de notification:', err)
        error.value = 'Erreur lors du test de notification'
      }
    }

    return {
      isLoading,
      error,
      isSubscribed,
      isSupported,
      stats,
      settings,
      enableNotifications,
      disableNotifications,
      updateSettings,
      testNotification
    }
  }
}
</script>

<style scoped>
.push-notification-manager {
  max-width: 500px;
  margin: 0 auto;
}

.notification-prompt {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  margin-bottom: 20px;
}

.prompt-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.prompt-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.prompt-text {
  flex: 1;
}

.prompt-text h3 {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.prompt-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.enable-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.enable-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.enable-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notification-settings {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.settings-header h3 {
  margin: 0;
  color: #374151;
  font-size: 1.1rem;
}

.disable-button {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s ease;
}

.disable-button:hover {
  background: #dc2626;
}

.settings-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #374151;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dismiss-error {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
}

.notification-stats {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.notification-stats h4 {
  margin: 0 0 10px 0;
  color: #374151;
  font-size: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.stat-label {
  font-size: 0.9rem;
  color: #6b7280;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}

@media (max-width: 640px) {
  .prompt-content {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .settings-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
