<template>
  <div class="pwa-diagnostics">
    <div class="diagnostics-header">
      <h3>🔧 Diagnostics PWA</h3>
      <button @click="runDiagnostics" class="run-button" :disabled="isRunning">
        <span v-if="isRunning">🔄</span>
        <span v-else>▶️</span>
        {{ isRunning ? 'Diagnostic en cours...' : 'Lancer le diagnostic' }}
      </button>
    </div>

    <div v-if="diagnostics.length > 0" class="diagnostics-results">
      <div 
        v-for="diagnostic in diagnostics" 
        :key="diagnostic.name"
        class="diagnostic-item"
        :class="diagnostic.status"
      >
        <div class="diagnostic-header">
          <span class="diagnostic-icon">
            {{ getStatusIcon(diagnostic.status) }}
          </span>
          <span class="diagnostic-name">{{ diagnostic.name }}</span>
          <span class="diagnostic-status">{{ diagnostic.status }}</span>
        </div>
        
        <div v-if="diagnostic.message" class="diagnostic-message">
          {{ diagnostic.message }}
        </div>
        
        <div v-if="diagnostic.details" class="diagnostic-details">
          <pre>{{ JSON.stringify(diagnostic.details, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div v-if="summary" class="diagnostics-summary">
      <h4>📊 Résumé</h4>
      <div class="summary-stats">
        <div class="stat-item success">
          <span class="stat-label">✅ Réussis:</span>
          <span class="stat-value">{{ summary.passed }}</span>
        </div>
        <div class="stat-item warning">
          <span class="stat-label">⚠️ Avertissements:</span>
          <span class="stat-value">{{ summary.warnings }}</span>
        </div>
        <div class="stat-item error">
          <span class="stat-label">❌ Erreurs:</span>
          <span class="stat-value">{{ summary.failed }}</span>
        </div>
      </div>
    </div>

    <div v-if="recommendations.length > 0" class="recommendations">
      <h4>💡 Recommandations</h4>
      <ul class="recommendation-list">
        <li v-for="recommendation in recommendations" :key="recommendation.id" class="recommendation-item">
          <span class="recommendation-icon">{{ recommendation.icon }}</span>
          <span class="recommendation-text">{{ recommendation.text }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { LessonService } from '../services/lessonService.js'
import { ProfileService } from '../services/profile/profileService.js'
import { NotificationService } from '../services/notificationService.js'

export default {
  name: 'PWADiagnostics',
  setup() {
    const diagnostics = ref([])
    const isRunning = ref(false)

    const summary = computed(() => {
      if (diagnostics.value.length === 0) return null
      
      const passed = diagnostics.value.filter(d => d.status === 'success').length
      const warnings = diagnostics.value.filter(d => d.status === 'warning').length
      const failed = diagnostics.value.filter(d => d.status === 'error').length
      
      return { passed, warnings, failed }
    })

    const recommendations = computed(() => {
      const recs = []
      
      diagnostics.value.forEach(diagnostic => {
        if (diagnostic.status === 'error') {
          switch (diagnostic.name) {
            case 'Service Worker':
              recs.push({
                id: 'sw-error',
                icon: '🔧',
                text: 'Vérifiez que le Service Worker est correctement enregistré et accessible'
              })
              break
            case 'Manifest PWA':
              recs.push({
                id: 'manifest-error',
                icon: '📱',
                text: 'Vérifiez que le manifest.json est valide et accessible'
              })
              break
            case 'Base de données':
              recs.push({
                id: 'db-error',
                icon: '🗄️',
                text: 'Vérifiez la connexion à la base de données et les variables d\'environnement'
              })
              break
          }
        }
      })
      
      return recs
    })

    const getStatusIcon = (status) => {
      switch (status) {
        case 'success': return '✅'
        case 'warning': return '⚠️'
        case 'error': return '❌'
        default: return '❓'
      }
    }

    const runDiagnostics = async () => {
      isRunning.value = true
      diagnostics.value = []

      const tests = [
        {
          name: 'Service Worker',
          test: async () => {
            if ('serviceWorker' in navigator) {
              const registration = await navigator.serviceWorker.getRegistration()
              if (registration) {
                return { status: 'success', message: 'Service Worker enregistré', details: { scope: registration.scope } }
              } else {
                return { status: 'warning', message: 'Service Worker non enregistré' }
              }
            } else {
              return { status: 'error', message: 'Service Worker non supporté par ce navigateur' }
            }
          }
        },
        {
          name: 'Manifest PWA',
          test: async () => {
            try {
              const response = await fetch('/manifest.json')
              if (response.ok) {
                const manifest = await response.json()
                return { status: 'success', message: 'Manifest PWA valide', details: { name: manifest.name, version: manifest.version } }
              } else {
                return { status: 'error', message: 'Manifest PWA non accessible' }
              }
            } catch (error) {
              return { status: 'error', message: 'Erreur lors du chargement du manifest', details: { error: error.message } }
            }
          }
        },
        {
          name: 'Base de données - Profils',
          test: async () => {
            try {
              const profiles = await ProfileService.getAllProfiles()
              return { status: 'success', message: `${profiles.length} profils trouvés`, details: { count: profiles.length } }
            } catch (error) {
              return { status: 'error', message: 'Erreur lors de la récupération des profils', details: { error: error.message } }
            }
          }
        },
        {
          name: 'Base de données - Leçons',
          test: async () => {
            try {
              const lessons = await LessonService.getAllAvailableLessons()
              return { status: 'success', message: `${lessons.length} leçons trouvées`, details: { count: lessons.length } }
            } catch (error) {
              return { status: 'error', message: 'Erreur lors de la récupération des leçons', details: { error: error.message } }
            }
          }
        },
        {
          name: 'Base de données - Notifications',
          test: async () => {
            try {
              const notifications = await NotificationService.getNotifications(1)
              return { status: 'success', message: `${notifications.length} notifications trouvées`, details: { count: notifications.length } }
            } catch (error) {
              return { status: 'warning', message: 'Erreur lors de la récupération des notifications (normal si aucun profil)', details: { error: error.message } }
            }
          }
        },
        {
          name: 'Notifications Push',
          test: async () => {
            if ('Notification' in window) {
              const permission = Notification.permission
              return { status: 'success', message: `Permission: ${permission}`, details: { permission } }
            } else {
              return { status: 'warning', message: 'Notifications push non supportées' }
            }
          }
        },
        {
          name: 'Installation PWA',
          test: async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
              const registration = await navigator.serviceWorker.getRegistration()
              if (registration) {
                const subscription = await registration.pushManager.getSubscription()
                return { status: 'success', message: 'PWA installable', details: { hasSubscription: !!subscription } }
              }
            }
            return { status: 'warning', message: 'PWA non installable' }
          }
        },
        {
          name: 'Optimisations Mobile',
          test: async () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const connection = navigator.connection ? navigator.connection.effectiveType : 'unknown'
            return { status: 'success', message: `Mobile: ${isMobile}, Connexion: ${connection}`, details: { isMobile, connection } }
          }
        }
      ]

      for (const test of tests) {
        try {
          const result = await test.test()
          diagnostics.value.push({
            name: test.name,
            ...result
          })
        } catch (error) {
          diagnostics.value.push({
            name: test.name,
            status: 'error',
            message: 'Erreur inattendue',
            details: { error: error.message }
          })
        }
      }

      isRunning.value = false
    }

    return {
      diagnostics,
      isRunning,
      summary,
      recommendations,
      getStatusIcon,
      runDiagnostics
    }
  }
}
</script>

<style scoped>
.pwa-diagnostics {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

.diagnostics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.diagnostics-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.2rem;
}

.run-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.run-button:hover:not(:disabled) {
  background: #2563eb;
}

.run-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.diagnostics-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.diagnostic-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.diagnostic-item.success {
  border-color: #10b981;
  background: #f0fdf4;
}

.diagnostic-item.warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

.diagnostic-item.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.diagnostic-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.diagnostic-icon {
  font-size: 1.2rem;
}

.diagnostic-name {
  font-weight: 600;
  color: #111827;
  flex: 1;
}

.diagnostic-status {
  font-size: 0.9rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.diagnostic-item.success .diagnostic-status {
  background: #dcfce7;
  color: #166534;
}

.diagnostic-item.warning .diagnostic-status {
  background: #fef3c7;
  color: #92400e;
}

.diagnostic-item.error .diagnostic-status {
  background: #fecaca;
  color: #991b1b;
}

.diagnostic-message {
  color: #374151;
  margin-bottom: 8px;
}

.diagnostic-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: #374151;
  overflow-x: auto;
}

.diagnostics-summary {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.diagnostics-summary h4 {
  margin: 0 0 12px 0;
  color: #111827;
  font-size: 1rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.stat-item.success {
  background: #dcfce7;
  color: #166534;
}

.stat-item.warning {
  background: #fef3c7;
  color: #92400e;
}

.stat-item.error {
  background: #fecaca;
  color: #991b1b;
}

.stat-label {
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.recommendations {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.recommendations h4 {
  margin: 0 0 12px 0;
  color: #0369a1;
  font-size: 1rem;
}

.recommendation-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #0c4a6e;
}

.recommendation-item:last-child {
  margin-bottom: 0;
}

.recommendation-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.recommendation-text {
  line-height: 1.4;
}

@media (max-width: 640px) {
  .pwa-diagnostics {
    padding: 16px;
  }
  
  .diagnostics-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
}
</style>
