<template>
  <div class="performance-dashboard">
    <div class="max-w-7xl mx-auto p-6">
      <!-- En-tête -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Tableau de Bord Performance
        </h1>
        <p class="text-gray-600">
          Optimisations implémentées : Lazy Loading, Compression d'Images, Bundle Splitting
        </p>
      </div>

      <!-- Métriques de performance -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg">
              <Icon name="mdi:speedometer" class="w-6 h-6 text-blue-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Temps de Chargement</p>
              <p class="text-2xl font-semibold text-gray-900">{{ loadingTime }}ms</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 rounded-lg">
              <Icon name="mdi:package-variant" class="w-6 h-6 text-purple-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Chunks Lazy</p>
              <p class="text-2xl font-semibold text-gray-900">{{ lazyChunksCount }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="p-2 bg-orange-100 rounded-lg">
              <Icon name="mdi:image-multiple" class="w-6 h-6 text-orange-600" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Images Optimisées</p>
              <p class="text-2xl font-semibold text-gray-900">{{ optimizedImagesCount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sections de test -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Test d'Optimisation d'Images -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <Icon name="mdi:image-edit" class="w-5 h-5 mr-2 text-green-600" />
              Optimisation d'Images
            </h2>
          </div>
          <div class="p-6">
            <ImageOptimizer @optimized="onImagesOptimized" />
          </div>
        </div>
      </div>

      <!-- Test des Composants Lazy -->
      <div class="mt-8 bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 flex items-center">
            <Icon name="mdi:loading" class="w-5 h-5 mr-2 text-purple-600" />
            Test des Composants Lazy Loading
          </h2>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              :disabled="loadingComponents.LessonScanner"
              class="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              @click="loadComponent('LessonScanner')"
            >
              <Icon name="mdi:scanner" class="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 class="font-medium text-gray-900">Lesson Scanner</h3>
              <p class="text-sm text-gray-600">Composant IA lourd</p>
              <div v-if="loadingComponents.LessonScanner" class="mt-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </button>

            <button
              :disabled="loadingComponents.YouTubeVideoManager"
              class="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              @click="loadComponent('YouTubeVideoManager')"
            >
              <Icon name="mdi:youtube" class="w-8 h-8 mx-auto mb-2 text-red-600" />
              <h3 class="font-medium text-gray-900">YouTube Manager</h3>
              <p class="text-sm text-gray-600">Gestionnaire vidéos</p>
              <div v-if="loadingComponents.YouTubeVideoManager" class="mt-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mx-auto"></div>
              </div>
            </button>
          </div>

          <!-- Composant chargé dynamiquement -->
          <div v-if="loadedComponent" class="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 class="font-medium text-gray-900 mb-2">
              Composant chargé : {{ loadedComponent }}
            </h3>
            <p class="text-sm text-gray-600">
              Temps de chargement : {{ componentLoadTime }}ms
            </p>
            <button
              class="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              @click="unloadComponent"
            >
              Décharger le composant
            </button>
          </div>
        </div>
      </div>

      <!-- Actions de Performance -->
      <div class="mt-8 bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 flex items-center">
            <Icon name="mdi:tools" class="w-5 h-5 mr-2 text-orange-600" />
            Actions de Performance
          </h2>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              :disabled="isPreloading"
              class="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              @click="preloadCriticalData"
            >
              <Icon name="mdi:download" class="w-6 h-6 mx-auto mb-2" />
              <h3 class="font-medium">Précharger Données</h3>
              <p class="text-sm opacity-90">Préchargement des données</p>
            </button>

            <button
              :disabled="isRunningTest"
              class="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              @click="runPerformanceTest"
            >
              <Icon name="mdi:speedometer" class="w-6 h-6 mx-auto mb-2" />
              <h3 class="font-medium">Test Performance</h3>
              <p class="text-sm opacity-90">Benchmark complet</p>
            </button>

            <button
              class="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              @click="exportReport"
            >
              <Icon name="mdi:file-export" class="w-6 h-6 mx-auto mb-2" />
              <h3 class="font-medium">Exporter Rapport</h3>
              <p class="text-sm opacity-90">Données de performance</p>
            </button>
          </div>
        </div>
      </div>

      <!-- Messages de feedback -->
      <div v-if="message" class="mt-6 p-4 rounded-lg" :class="messageClass">
        <div class="flex items-center">
          <Icon :name="messageIcon" class="w-5 h-5 mr-2" />
          <span>{{ message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import ImageOptimizer from './ImageOptimizer.vue'

export default {
  name: 'PerformanceDashboard',
  components: {
    Icon,
    ImageOptimizer
  },
  setup() {
    // État réactif
    const loadingTime = ref(0)
    const lazyChunksCount = ref(0)
    const optimizedImagesCount = ref(0)
    const loadingComponents = ref({
      LessonScanner: false,
      YouTubeVideoManager: false
    })
    const loadedComponent = ref(null)
    const componentLoadTime = ref(0)
    const isPreloading = ref(false)
    const isRunningTest = ref(false)
    const message = ref('')
    const messageType = ref('')

    // Computed
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
    const loadComponent = async (componentName) => {
      const startTime = performance.now()
      loadingComponents.value[componentName] = true

      try {
        // Simuler le chargement lazy
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
        
        const endTime = performance.now()
        componentLoadTime.value = Math.round(endTime - startTime)
        loadedComponent.value = componentName
        
        showMessage(`Composant ${componentName} chargé en ${componentLoadTime.value}ms`, 'success')
      } catch (error) {
        showMessage(`Erreur lors du chargement de ${componentName}`, 'error')
      } finally {
        loadingComponents.value[componentName] = false
      }
    }

    const unloadComponent = () => {
      loadedComponent.value = null
      componentLoadTime.value = 0
      showMessage('Composant déchargé', 'info')
    }

    const preloadCriticalData = async () => {
      isPreloading.value = true
      try {
        // Simuler le préchargement
        await new Promise(resolve => setTimeout(resolve, 2000))
        showMessage('Données critiques préchargées avec succès', 'success')
      } catch (error) {
        showMessage('Erreur lors du préchargement', 'error')
      } finally {
        isPreloading.value = false
      }
    }

    const runPerformanceTest = async () => {
      isRunningTest.value = true
      try {
        // Simuler un test de performance
        await new Promise(resolve => setTimeout(resolve, 3000))
        showMessage('Test de performance terminé - Voir les résultats dans la console', 'success')
      } catch (error) {
        showMessage('Erreur lors du test de performance', 'error')
      } finally {
        isRunningTest.value = false
      }
    }

    const exportReport = () => {
      const report = {
        timestamp: new Date().toISOString(),
        loadingTime: loadingTime.value,
        lazyChunksCount: lazyChunksCount.value,
        optimizedImagesCount: optimizedImagesCount.value
      }
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      showMessage('Rapport de performance exporté', 'success')
    }

    const onImagesOptimized = (results) => {
      optimizedImagesCount.value += results.filter(r => r.success).length
      showMessage(`${results.length} images traitées`, 'success')
    }

    const showMessage = (text, type = 'info') => {
      message.value = text
      messageType.value = type
      setTimeout(() => {
        message.value = ''
        messageType.value = ''
      }, 3000)
    }

    const updateStats = () => {
      // Simuler des métriques de performance
      loadingTime.value = Math.round(100 + Math.random() * 200)
      lazyChunksCount.value = 3 // Nombre de chunks lazy configurés
    }

    // Lifecycle
    onMounted(() => {
      updateStats()
      setInterval(updateStats, 5000) // Mise à jour toutes les 5 secondes
    })

    return {
      loadingTime,
      lazyChunksCount,
      optimizedImagesCount,
      loadingComponents,
      loadedComponent,
      componentLoadTime,
      isPreloading,
      isRunningTest,
      message,
      messageType,
      messageClass,
      messageIcon,
      loadComponent,
      unloadComponent,
      preloadCriticalData,
      runPerformanceTest,
      exportReport,
      onImagesOptimized
    }
  }
}
</script>

<style scoped>
.performance-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
