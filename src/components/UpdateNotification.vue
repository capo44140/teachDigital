<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Overlay avec effet de flou -->
    <div 
      class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
      @click="handleCancel"
    ></div>
    
    <!-- Popup principale -->
    <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
      <!-- Icône de notification -->
      <div class="absolute -top-6 left-1/2 transform -translate-x-1/2">
        <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
      </div>
      
      <!-- Contenu de la popup -->
      <div class="pt-8 px-6 pb-6">
        <!-- Titre -->
        <div class="text-center mb-4">
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            Mise à jour disponible
          </h3>
          <div class="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto"></div>
        </div>
        
        <!-- Message -->
        <div class="text-center mb-6">
          <p class="text-gray-600 leading-relaxed">
            Une nouvelle version de <span class="font-semibold text-gray-900">TeachDigital</span> est disponible avec des améliorations et corrections.
          </p>
          <p class="text-sm text-gray-500 mt-2">
            Voulez-vous recharger l'application maintenant ?
          </p>
        </div>
        
        <!-- Boutons d'action -->
        <div class="flex space-x-3">
          <!-- Bouton Annuler -->
          <button
            @click="handleCancel"
            class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <span class="flex items-center justify-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Plus tard
            </span>
          </button>
          
          <!-- Bouton Mettre à jour -->
          <button
            @click="handleUpdate"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-lg hover:shadow-xl"
          >
            <span class="flex items-center justify-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Mettre à jour
            </span>
          </button>
        </div>
        
        <!-- Indicateur de version -->
        <div class="mt-4 text-center">
          <span class="text-xs text-gray-400">
            Version {{ currentVersion }} → {{ newVersion }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UpdateNotification',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    currentVersion: {
      type: String,
      default: '0.0.15'
    },
    newVersion: {
      type: String,
      default: '0.0.16'
    }
  },
  emits: ['update', 'cancel'],
  methods: {
    handleUpdate() {
      this.$emit('update');
    },
    handleCancel() {
      this.$emit('cancel');
    }
  }
}
</script>

<style scoped>
/* Animation d'entrée */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Animation de la popup */
.scale-enter-active, .scale-leave-active {
  transition: all 0.3s ease;
}
.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
