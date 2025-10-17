<template>
  <div class="profile-cache-manager">
    <div class="cache-header">
      <h3>👥 Gestion du Cache des Profils</h3>
      <button @click="refreshCache" class="refresh-button" :disabled="isLoading">
        <span v-if="isLoading">🔄</span>
        <span v-else>↻</span>
        Actualiser
      </button>
    </div>

    <div class="cache-stats">
      <div class="stat-card">
        <h4>📊 Statistiques du Cache</h4>
        <div class="stat-items">
          <div class="stat-item">
            <span class="stat-label">Profils en cache:</span>
            <span class="stat-value">{{ cacheStats.profilesInCache || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Taux de réussite:</span>
            <span class="stat-value" :class="getHitRateClass(cacheStats.hitRate)">
              {{ cacheStats.hitRate || 0 }}%
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Taille du cache:</span>
            <span class="stat-value">{{ cacheStats.memoryUsage?.kb || 0 }} KB</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Dernière mise à jour:</span>
            <span class="stat-value">{{ lastUpdateTime }}</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <h4>🔍 État des Profils</h4>
        <div class="stat-items">
          <div class="stat-item">
            <span class="stat-label">Profils chargés:</span>
            <span class="stat-value">{{ profileStore.profiles.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Profil actuel:</span>
            <span class="stat-value">{{ currentProfileName }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Statut:</span>
            <span class="stat-value" :class="profileStore.isLoading ? 'loading' : 'ready'">
              {{ profileStore.isLoading ? 'Chargement...' : 'Prêt' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="cache-actions">
      <button @click="forceReloadProfiles" class="action-button reload" :disabled="isLoading">
        🔄 Recharger depuis la base
      </button>
      
      <button @click="clearProfileCache" class="action-button clear" :disabled="isLoading">
        🗑️ Vider le cache
      </button>
      
      <button @click="preloadProfiles" class="action-button preload" :disabled="isLoading">
        📦 Précharger les profils
      </button>
    </div>

    <div v-if="profileStore.error" class="error-message">
      <h4>❌ Erreur</h4>
      <p>{{ profileStore.error }}</p>
      <button @click="profileStore.clearError()" class="dismiss-button">
        Fermer
      </button>
    </div>

    <div v-if="successMessage" class="success-message">
      <h4>✅ Succès</h4>
      <p>{{ successMessage }}</p>
      <button @click="successMessage = null" class="dismiss-button">
        Fermer
      </button>
    </div>

    <div class="cache-details">
      <h4>🔧 Détails du Cache</h4>
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Clé de cache:</span>
          <span class="detail-value">offline_profiles</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">TTL:</span>
          <span class="detail-value">30 minutes</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Persistance:</span>
          <span class="detail-value">Oui</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Priorité:</span>
          <span class="detail-value">Haute</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '../stores/profileStore.js'
import offlineDataService from '../services/offlineDataService.js'

export default {
  name: 'ProfileCacheManager',
  setup() {
    const profileStore = useProfileStore()
    const isLoading = ref(false)
    const successMessage = ref('')
    const lastUpdateTime = ref('')
    const cacheStats = ref({})

    // Nom du profil actuel
    const currentProfileName = computed(() => {
      return profileStore.currentProfile?.name || 'Aucun'
    })

    // Classe CSS pour le taux de réussite
    const getHitRateClass = (hitRate) => {
      if (hitRate >= 80) return 'excellent'
      if (hitRate >= 60) return 'good'
      if (hitRate >= 40) return 'average'
      return 'poor'
    }

    // Actualiser les statistiques
    const refreshCache = async () => {
      isLoading.value = true
      try {
        await loadCacheStats()
        lastUpdateTime.value = new Date().toLocaleTimeString()
        successMessage.value = 'Statistiques actualisées'
        setTimeout(() => successMessage.value = '', 3000)
      } catch (error) {
        console.error('Erreur lors de l\'actualisation:', error)
      } finally {
        isLoading.value = false
      }
    }

    // Charger les statistiques du cache
    const loadCacheStats = async () => {
      try {
        const stats = profileStore.getCacheStats()
        cacheStats.value = {
          profilesInCache: profileStore.profiles.length,
          hitRate: stats.cacheStats?.hitRate || 0,
          memoryUsage: stats.cacheStats?.memoryUsage || { kb: 0 }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
      }
    }

    // Forcer le rechargement des profils
    const forceReloadProfiles = async () => {
      isLoading.value = true
      try {
        await profileStore.refreshProfilesFromCache()
        await loadCacheStats()
        successMessage.value = 'Profils rechargés avec succès'
        setTimeout(() => successMessage.value = '', 3000)
      } catch (error) {
        console.error('Erreur lors du rechargement:', error)
      } finally {
        isLoading.value = false
      }
    }

    // Vider le cache des profils
    const clearProfileCache = async () => {
      isLoading.value = true
      try {
        // Vider le cache
        offlineDataService.cacheService.deleteByTags(['profiles'])
        
        // Recharger les profils
        await profileStore.loadProfiles()
        
        await loadCacheStats()
        successMessage.value = 'Cache vidé et profils rechargés'
        setTimeout(() => successMessage.value = '', 3000)
      } catch (error) {
        console.error('Erreur lors du vidage du cache:', error)
      } finally {
        isLoading.value = false
      }
    }

    // Précharger les profils
    const preloadProfiles = async () => {
      isLoading.value = true
      try {
        await offlineDataService.preloadProfiles()
        await loadCacheStats()
        successMessage.value = 'Profils préchargés avec succès'
        setTimeout(() => successMessage.value = '', 3000)
      } catch (error) {
        console.error('Erreur lors du préchargement:', error)
      } finally {
        isLoading.value = false
      }
    }

    // Initialiser au montage
    onMounted(() => {
      loadCacheStats()
      lastUpdateTime.value = new Date().toLocaleTimeString()
    })

    return {
      profileStore,
      isLoading,
      successMessage,
      lastUpdateTime,
      cacheStats,
      currentProfileName,
      getHitRateClass,
      refreshCache,
      forceReloadProfiles,
      clearProfileCache,
      preloadProfiles
    }
  }
}
</script>

<style scoped>
.profile-cache-manager {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

.cache-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.cache-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.2rem;
}

.refresh-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-button:hover:not(:disabled) {
  background: #2563eb;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cache-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
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
}

.stat-value.excellent {
  color: #10b981;
}

.stat-value.good {
  color: #3b82f6;
}

.stat-value.average {
  color: #f59e0b;
}

.stat-value.poor {
  color: #ef4444;
}

.stat-value.loading {
  color: #f59e0b;
}

.stat-value.ready {
  color: #10b981;
}

.cache-actions {
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

.action-button.reload {
  background: #3b82f6;
  color: white;
}

.action-button.reload:hover:not(:disabled) {
  background: #2563eb;
}

.action-button.clear {
  background: #ef4444;
  color: white;
}

.action-button.clear:hover:not(:disabled) {
  background: #dc2626;
}

.action-button.preload {
  background: #10b981;
  color: white;
}

.action-button.preload:hover:not(:disabled) {
  background: #059669;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.error-message h4 {
  margin: 0 0 8px 0;
  color: #dc2626;
  font-size: 1rem;
}

.error-message p {
  margin: 0 0 12px 0;
  color: #991b1b;
  font-size: 0.9rem;
}

.success-message {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.success-message h4 {
  margin: 0 0 8px 0;
  color: #16a34a;
  font-size: 1rem;
}

.success-message p {
  margin: 0 0 12px 0;
  color: #166534;
  font-size: 0.9rem;
}

.dismiss-button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}

.cache-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.cache-details h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.detail-label {
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  color: #111827;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

@media (max-width: 640px) {
  .profile-cache-manager {
    padding: 16px;
  }
  
  .cache-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .cache-stats {
    grid-template-columns: 1fr;
  }
  
  .cache-actions {
    flex-direction: column;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
