<template>
  <div class="fixed bottom-4 right-4 z-50">
    <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-800">Migration Status</h3>
        <button 
          @click="togglePanel"
          class="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg 
            class="w-4 h-4 transform transition-transform" 
            :class="{ 'rotate-180': isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>
      
      <div v-if="isExpanded" class="space-y-3">
        <!-- Status API -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-600">Nouvelle API:</span>
          <div class="flex items-center space-x-2">
            <div 
              class="w-2 h-2 rounded-full"
              :class="status.useNewAPI ? 'bg-green-500' : 'bg-orange-500'"
            ></div>
            <span class="text-xs font-medium">
              {{ status.useNewAPI ? 'Activée' : 'Désactivée' }}
            </span>
          </div>
        </div>
        
        <!-- Authentification -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-600">Authentification:</span>
          <div class="flex items-center space-x-2">
            <div 
              class="w-2 h-2 rounded-full"
              :class="status.apiService ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            <span class="text-xs font-medium">
              {{ status.apiService ? 'Connecté' : 'Déconnecté' }}
            </span>
          </div>
        </div>
        
        <!-- Boutons de contrôle -->
        <div class="flex space-x-2">
          <button 
            @click="toggleAPI"
            class="flex-1 px-3 py-1 text-xs font-medium rounded transition-colors"
            :class="status.useNewAPI 
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'"
          >
            {{ status.useNewAPI ? 'Désactiver' : 'Activer' }} API
          </button>
          
          <button 
            @click="refreshStatus"
            class="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Actualiser
          </button>
        </div>
        
        <!-- Timestamp -->
        <div class="text-xs text-gray-500 text-center">
          {{ formatTime(status.timestamp) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { migrationService } from '../services/migrationService.js'

export default {
  name: 'MigrationControl',
  setup() {
    const isExpanded = ref(false)
    const status = ref({
      useNewAPI: false,
      apiService: false,
      timestamp: new Date().toISOString()
    })
    
    let refreshInterval = null
    
    const togglePanel = () => {
      isExpanded.value = !isExpanded.value
    }
    
    const refreshStatus = () => {
      status.value = migrationService.getMigrationStatus()
    }
    
    const toggleAPI = () => {
      const newState = !status.value.useNewAPI
      migrationService.setUseNewAPI(newState)
      refreshStatus()
    }
    
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    
    onMounted(() => {
      refreshStatus()
      // Actualiser le statut toutes les 30 secondes
      refreshInterval = setInterval(refreshStatus, 30000)
    })
    
    onUnmounted(() => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    })
    
    return {
      isExpanded,
      status,
      togglePanel,
      refreshStatus,
      toggleAPI,
      formatTime
    }
  }
}
</script>
