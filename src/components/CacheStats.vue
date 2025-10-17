<template>
  <div class="cache-stats">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800">
          Statistiques du Cache
        </h3>
        <div class="flex space-x-2">
          <button
            @click="refreshStats"
            class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            :disabled="isRefreshing"
          >
            <Icon name="mdi:refresh" class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
            Actualiser
          </button>
          <button
            @click="cleanupCache"
            class="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
            :disabled="isCleaning"
          >
            <Icon name="mdi:broom" class="w-4 h-4" :class="{ 'animate-spin': isCleaning }" />
            Nettoyer
          </button>
        </div>
      </div>

      <!-- Statistiques principales -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="stat-card">
          <div class="stat-value text-blue-600">{{ stats.hitRate }}%</div>
          <div class="stat-label">Taux de réussite</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-green-600">{{ stats.hits }}</div>
          <div class="stat-label">Accès réussis</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-red-600">{{ stats.misses }}</div>
          <div class="stat-label">Accès manqués</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-purple-600">{{ stats.size }}</div>
          <div class="stat-label">Entrées en cache</div>
        </div>
      </div>

      <!-- Utilisation mémoire -->
      <div class="mb-6">
        <h4 class="text-md font-semibold text-gray-700 mb-3">Utilisation Mémoire</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="memory-card">
            <div class="memory-value">{{ memoryUsage.bytes.toLocaleString() }}</div>
            <div class="memory-label">Octets</div>
          </div>
          <div class="memory-card">
            <div class="memory-value">{{ memoryUsage.kb }} KB</div>
            <div class="memory-label">Kilooctets</div>
          </div>
          <div class="memory-card">
            <div class="memory-value">{{ memoryUsage.mb }} MB</div>
            <div class="memory-label">Mégaoctets</div>
          </div>
        </div>
      </div>

      <!-- Barre de progression pour la taille du cache -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-700">Utilisation du cache</span>
          <span class="text-sm text-gray-500">{{ stats.size }} / {{ stats.maxSize }}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: cacheUsagePercentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Statistiques détaillées -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-md font-semibold text-gray-700 mb-3">Opérations</h4>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Définitions:</span>
              <span class="text-sm font-medium">{{ stats.sets }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Suppressions:</span>
              <span class="text-sm font-medium">{{ stats.deletes }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Nettoyages:</span>
              <span class="text-sm font-medium">{{ stats.cleanups }}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-md font-semibold text-gray-700 mb-3">Performance</h4>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Total des accès:</span>
              <span class="text-sm font-medium">{{ totalAccesses }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Efficacité:</span>
              <span class="text-sm font-medium" :class="efficiencyClass">
                {{ efficiencyText }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Dernière actualisation:</span>
              <span class="text-sm font-medium">{{ lastRefreshTime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="mt-6 pt-4 border-t border-gray-200">
        <h4 class="text-md font-semibold text-gray-700 mb-3">Actions Rapides</h4>
        <div class="flex flex-wrap gap-2">
          <button
            @click="invalidateProfiles"
            class="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
          >
            Invalider Profils
          </button>
          <button
            @click="invalidateLessons"
            class="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
          >
            Invalider Leçons
          </button>
          <button
            @click="invalidateYouTube"
            class="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
          >
            Invalider YouTube
          </button>
          <button
            @click="invalidateAll"
            class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Tout Invalider
          </button>
        </div>
      </div>

      <!-- Messages de feedback -->
      <div v-if="message" class="mt-4 p-3 rounded" :class="messageClass">
        <div class="flex items-center">
          <Icon :name="messageIcon" class="w-4 h-4 mr-2" />
          <span class="text-sm">{{ message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import cachedApiService from '../services/cachedApiService.js'

export default {
  name: 'CacheStats',
  components: {
    Icon
  },
  setup() {
    const stats = ref({
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      hitRate: 0,
      size: 0,
      maxSize: 50
    })

    const memoryUsage = ref({
      bytes: 0,
      kb: 0,
      mb: 0
    })

    const isRefreshing = ref(false)
    const isCleaning = ref(false)
    const message = ref('')
    const messageType = ref('')
    const lastRefreshTime = ref('')

    // Computed
    const totalAccesses = computed(() => stats.value.hits + stats.value.misses)
    
    const cacheUsagePercentage = computed(() => {
      return Math.round((stats.value.size / stats.value.maxSize) * 100)
    })

    const efficiencyClass = computed(() => {
      if (stats.value.hitRate >= 80) return 'text-green-600'
      if (stats.value.hitRate >= 60) return 'text-yellow-600'
      return 'text-red-600'
    })

    const efficiencyText = computed(() => {
      if (stats.value.hitRate >= 80) return 'Excellente'
      if (stats.value.hitRate >= 60) return 'Bonne'
      if (stats.value.hitRate >= 40) return 'Moyenne'
      return 'Faible'
    })

    const messageClass = computed(() => {
      switch (messageType.value) {
        case 'success': return 'bg-green-100 text-green-800 border border-green-200'
        case 'error': return 'bg-red-100 text-red-800 border border-red-200'
        case 'warning': return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        default: return 'bg-blue-100 text-blue-800 border border-blue-200'
      }
    })

    const messageIcon = computed(() => {
      switch (messageType.value) {
        case 'success': return 'mdi:check-circle'
        case 'error': return 'mdi:alert-circle'
        case 'warning': return 'mdi:alert'
        default: return 'mdi:information'
      }
    })

    // Méthodes
    const refreshStats = async () => {
      isRefreshing.value = true
      try {
        const newStats = cachedApiService.getCacheStats()
        stats.value = newStats
        memoryUsage.value = newStats.memoryUsage
        lastRefreshTime.value = new Date().toLocaleTimeString('fr-FR')
        showMessage('Statistiques actualisées', 'success')
      } catch (error) {
        showMessage('Erreur lors de l\'actualisation', 'error')
      } finally {
        isRefreshing.value = false
      }
    }

    const cleanupCache = async () => {
      isCleaning.value = true
      try {
        const cleaned = cachedApiService.cleanupCache()
        showMessage(`${cleaned} entrées nettoyées`, 'success')
        await refreshStats()
      } catch (error) {
        showMessage('Erreur lors du nettoyage', 'error')
      } finally {
        isCleaning.value = false
      }
    }

    const invalidateProfiles = () => {
      cachedApiService.invalidateProfiles()
      showMessage('Cache des profils invalidé', 'warning')
      refreshStats()
    }

    const invalidateLessons = () => {
      cachedApiService.invalidateLessons()
      showMessage('Cache des leçons invalidé', 'warning')
      refreshStats()
    }

    const invalidateYouTube = () => {
      cachedApiService.invalidateYouTube()
      showMessage('Cache YouTube invalidé', 'warning')
      refreshStats()
    }

    const invalidateAll = () => {
      cachedApiService.invalidateAll()
      showMessage('Tout le cache invalidé', 'warning')
      refreshStats()
    }

    const showMessage = (text, type = 'info') => {
      message.value = text
      messageType.value = type
      setTimeout(() => {
        message.value = ''
        messageType.value = ''
      }, 3000)
    }

    // Auto-refresh
    let refreshInterval = null

    const startAutoRefresh = () => {
      refreshInterval = setInterval(refreshStats, 10000) // Toutes les 10 secondes
    }

    const stopAutoRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }

    // Lifecycle
    onMounted(() => {
      refreshStats()
      startAutoRefresh()
    })

    onUnmounted(() => {
      stopAutoRefresh()
    })

    return {
      stats,
      memoryUsage,
      isRefreshing,
      isCleaning,
      message,
      messageType,
      lastRefreshTime,
      totalAccesses,
      cacheUsagePercentage,
      efficiencyClass,
      efficiencyText,
      messageClass,
      messageIcon,
      refreshStats,
      cleanupCache,
      invalidateProfiles,
      invalidateLessons,
      invalidateYouTube,
      invalidateAll
    }
  }
}
</script>

<style scoped>
@import "tailwindcss" reference;

.stat-card {
  @apply text-center p-4 bg-gray-50 rounded-lg;
}

.stat-value {
  @apply text-2xl font-bold mb-1;
}

.stat-label {
  @apply text-sm text-gray-600;
}

.memory-card {
  @apply text-center p-3 bg-blue-50 rounded-lg;
}

.memory-value {
  @apply text-lg font-semibold text-blue-700 mb-1;
}

.memory-label {
  @apply text-xs text-blue-600;
}
</style>
