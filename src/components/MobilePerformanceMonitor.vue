<template>
  <div class="mobile-performance-monitor">
    <div class="monitor-header">
      <h3>📱 Performance Mobile</h3>
      <button @click="refreshStats" class="refresh-button" :disabled="isLoading">
        <span v-if="isLoading">🔄</span>
        <span v-else>↻</span>
      </button>
    </div>

    <div class="stats-grid">
      <!-- Informations de l'appareil -->
      <div class="stat-card device-info">
        <h4>Appareil</h4>
        <div class="stat-items">
          <div class="stat-item">
            <span class="stat-label">Type:</span>
            <span class="stat-value" :class="{ 'low-end': stats.isLowEndDevice }">
              {{ stats.isMobile ? 'Mobile' : 'Desktop' }}
              <span v-if="stats.isLowEndDevice" class="warning-badge">Bas de gamme</span>
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mémoire:</span>
            <span class="stat-value">{{ stats.deviceMemory || 'Inconnue' }} GB</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">CPU:</span>
            <span class="stat-value">{{ stats.hardwareConcurrency || 'Inconnu' }} cœurs</span>
          </div>
        </div>
      </div>

      <!-- Connexion réseau -->
      <div class="stat-card connection-info">
        <h4>Réseau</h4>
        <div class="stat-items">
          <div class="stat-item">
            <span class="stat-label">Type:</span>
            <span class="stat-value" :class="getConnectionClass(stats.connectionType)">
              {{ getConnectionLabel(stats.connectionType) }}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Optimisé:</span>
            <span class="stat-value" :class="{ 'optimized': isConnectionOptimized }">
              {{ isConnectionOptimized ? 'Oui' : 'Non' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Optimisations actives -->
      <div class="stat-card optimizations">
        <h4>Optimisations</h4>
        <div class="optimization-list">
          <div 
            v-for="(enabled, optimization) in stats.optimizations" 
            :key="optimization"
            class="optimization-item"
          >
            <span class="optimization-name">{{ getOptimizationLabel(optimization) }}</span>
            <span class="optimization-status" :class="{ 'active': enabled }">
              {{ enabled ? '✅' : '❌' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Statistiques DOM -->
      <div class="stat-card dom-stats">
        <h4>DOM</h4>
        <div class="stat-items">
          <div class="stat-item">
            <span class="stat-label">Éléments:</span>
            <span class="stat-value" :class="{ 'warning': stats.domElementCount > 1000 }">
              {{ stats.domElementCount }}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Images:</span>
            <span class="stat-value">{{ stats.imageCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Scripts:</span>
            <span class="stat-value">{{ stats.scriptCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Styles:</span>
            <span class="stat-value">{{ stats.styleCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions d'optimisation -->
    <div class="optimization-actions">
      <button @click="forceOptimizations" class="action-button optimize">
        🚀 Forcer les optimisations
      </button>
      <button @click="toggleOptimizations" class="action-button toggle">
        {{ optimizationsEnabled ? '❌ Désactiver' : '✅ Activer' }} les optimisations
      </button>
    </div>

    <!-- Recommandations -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import mobileOptimizationService from '../services/mobileOptimizationService.js'

export default {
  name: 'MobilePerformanceMonitor',
  setup() {
    const stats = ref({})
    const isLoading = ref(false)
    const optimizationsEnabled = ref(true)
    const refreshInterval = ref(null)

    // Calculer les recommandations
    const recommendations = computed(() => {
      const recs = []
      
      if (stats.value.isLowEndDevice) {
        recs.push({
          id: 'low-end-device',
          icon: '📱',
          text: 'Appareil bas de gamme détecté - optimisations activées'
        })
      }
      
      if (['slow-2g', '2g', '3g'].includes(stats.value.connectionType)) {
        recs.push({
          id: 'slow-connection',
          icon: '🐌',
          text: 'Connexion lente - compression d\'images activée'
        })
      }
      
      if (stats.value.domElementCount > 1000) {
        recs.push({
          id: 'dom-heavy',
          icon: '⚡',
          text: 'Trop d\'éléments DOM - nettoyage automatique activé'
        })
      }
      
      if (!stats.value.optimizations?.lazyLoading) {
        recs.push({
          id: 'lazy-loading',
          icon: '🔄',
          text: 'Activer le lazy loading pour améliorer les performances'
        })
      }
      
      return recs
    })

    // Vérifier si la connexion est optimisée
    const isConnectionOptimized = computed(() => {
      return ['4g', '5g'].includes(stats.value.connectionType)
    })

    // Obtenir le label de connexion
    const getConnectionLabel = (type) => {
      const labels = {
        'slow-2g': '2G Lent',
        '2g': '2G',
        '3g': '3G',
        '4g': '4G',
        '5g': '5G',
        'unknown': 'Inconnue'
      }
      return labels[type] || type
    }

    // Obtenir la classe CSS pour la connexion
    const getConnectionClass = (type) => {
      if (['slow-2g', '2g'].includes(type)) return 'slow'
      if (['3g'].includes(type)) return 'medium'
      if (['4g', '5g'].includes(type)) return 'fast'
      return 'unknown'
    }

    // Obtenir le label d'optimisation
    const getOptimizationLabel = (optimization) => {
      const labels = {
        lazyLoading: 'Lazy Loading',
        imageCompression: 'Compression d\'images',
        reducedAnimations: 'Animations réduites',
        simplifiedUI: 'Interface simplifiée',
        preloadCritical: 'Préchargement critique',
        deferNonCritical: 'Report non-critique'
      }
      return labels[optimization] || optimization
    }

    // Actualiser les statistiques
    const refreshStats = async () => {
      isLoading.value = true
      try {
        stats.value = mobileOptimizationService.getOptimizationStats()
      } catch (error) {
        console.error('Erreur lors de l\'actualisation des statistiques:', error)
      } finally {
        isLoading.value = false
      }
    }

    // Forcer les optimisations
    const forceOptimizations = () => {
      mobileOptimizationService.forceOptimizations()
      refreshStats()
    }

    // Basculer les optimisations
    const toggleOptimizations = () => {
      if (optimizationsEnabled.value) {
        mobileOptimizationService.disableOptimizations()
        optimizationsEnabled.value = false
      } else {
        mobileOptimizationService.forceOptimizations()
        optimizationsEnabled.value = true
      }
      refreshStats()
    }

    // Initialiser le composant
    onMounted(() => {
      refreshStats()
      
      // Actualiser automatiquement toutes les 30 secondes
      refreshInterval.value = setInterval(refreshStats, 30000)
    })

    // Nettoyer les intervalles
    onUnmounted(() => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
      }
    })

    return {
      stats,
      isLoading,
      optimizationsEnabled,
      recommendations,
      isConnectionOptimized,
      getConnectionLabel,
      getConnectionClass,
      getOptimizationLabel,
      refreshStats,
      forceOptimizations,
      toggleOptimizations
    }
  }
}
</script>

<style scoped>
.mobile-performance-monitor {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.monitor-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.2rem;
}

.refresh-button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.refresh-button:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.stat-card h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.stat-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.stat-label {
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  color: #111827;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-value.low-end {
  color: #ef4444;
}

.warning-badge {
  background: #fef3c7;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.stat-value.slow {
  color: #ef4444;
}

.stat-value.medium {
  color: #f59e0b;
}

.stat-value.fast {
  color: #10b981;
}

.stat-value.optimized {
  color: #10b981;
}

.optimization-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.optimization-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.optimization-name {
  color: #374151;
}

.optimization-status {
  font-size: 1rem;
}

.optimization-status.active {
  color: #10b981;
}

.optimization-actions {
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
}

.action-button.optimize {
  background: #3b82f6;
  color: white;
}

.action-button.optimize:hover {
  background: #2563eb;
}

.action-button.toggle {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button.toggle:hover {
  background: #e5e7eb;
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
  .mobile-performance-monitor {
    padding: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .optimization-actions {
    flex-direction: column;
  }
  
  .action-button {
    width: 100%;
  }
}
</style>
