<template>
  <div class="image-optimizer">
    <!-- Zone de drop -->
    <div 
      class="drop-zone"
      :class="{ 'drag-over': isDragOver, 'processing': isProcessing }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        @change="handleFileSelect"
        class="hidden"
      />
      
      <div v-if="!isProcessing" class="drop-content">
        <Icon name="mdi:image-plus" class="w-12 h-12 text-gray-400 mb-4" />
        <p class="text-lg font-medium text-gray-700 mb-2">
          Glissez-déposez vos images ici
        </p>
        <p class="text-sm text-gray-500 mb-4">
          ou cliquez pour sélectionner des fichiers
        </p>
        <p class="text-xs text-gray-400">
          Formats supportés: JPEG, PNG, GIF, WebP (max 10MB)
        </p>
      </div>

      <div v-else class="processing-content">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-lg font-medium text-gray-700">
          Optimisation en cours...
        </p>
        <p class="text-sm text-gray-500">
          {{ currentFile }} ({{ progress }}%)
        </p>
      </div>
    </div>

    <!-- Options d'optimisation -->
    <div v-if="!isProcessing" class="optimization-options mt-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Options d'optimisation</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Qualité -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Qualité
          </label>
          <select v-model="options.quality" class="w-full p-2 border border-gray-300 rounded-md">
            <option value="high">Haute (90%)</option>
            <option value="medium">Moyenne (70%)</option>
            <option value="low">Basse (50%)</option>
          </select>
        </div>

        <!-- Format -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Format de sortie
          </label>
          <select v-model="options.format" class="w-full p-2 border border-gray-300 rounded-md">
            <option value="auto">Automatique</option>
            <option value="webp">WebP (recommandé)</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
          </select>
        </div>

        <!-- Dimensions max -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Largeur max (px)
          </label>
          <input
            v-model.number="options.maxWidth"
            type="number"
            min="100"
            max="4096"
            class="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Hauteur max (px)
          </label>
          <input
            v-model.number="options.maxHeight"
            type="number"
            min="100"
            max="4096"
            class="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <!-- Options avancées -->
      <div class="mt-4">
        <label class="flex items-center">
          <input
            v-model="options.progressive"
            type="checkbox"
            class="mr-2"
          />
          <span class="text-sm text-gray-700">JPEG progressif</span>
        </label>
      </div>
    </div>

    <!-- Résultats -->
    <div v-if="results.length > 0" class="results mt-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        Résultats d'optimisation
      </h3>
      
      <div class="space-y-4">
        <div
          v-for="(result, index) in results"
          :key="index"
          class="result-item p-4 border border-gray-200 rounded-lg"
          :class="result.success ? 'bg-green-50' : 'bg-red-50'"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-medium text-gray-800">{{ result.file }}</h4>
            <span
              class="px-2 py-1 text-xs rounded-full"
              :class="result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ result.success ? 'Succès' : 'Erreur' }}
            </span>
          </div>

          <div v-if="result.success" class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Taille originale:</span>
              <br>
              <span class="font-medium">{{ formatFileSize(result.data.originalSize) }}</span>
            </div>
            <div>
              <span class="text-gray-600">Taille optimisée:</span>
              <br>
              <span class="font-medium">{{ formatFileSize(result.data.optimizedSize) }}</span>
            </div>
            <div>
              <span class="text-gray-600">Compression:</span>
              <br>
              <span class="font-medium text-green-600">{{ result.data.compressionRatio }}%</span>
            </div>
            <div>
              <span class="text-gray-600">Format:</span>
              <br>
              <span class="font-medium">{{ result.data.format.split('/')[1].toUpperCase() }}</span>
            </div>
          </div>

          <div v-if="result.success" class="mt-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Dimensions:</span>
              <span class="text-sm font-medium">
                {{ result.data.dimensions.original.width }}×{{ result.data.dimensions.original.height }}
                →
                {{ result.data.dimensions.optimized.width }}×{{ result.data.dimensions.optimized.height }}
              </span>
            </div>
          </div>

          <div v-if="result.success" class="mt-3 flex space-x-2">
            <button
              @click="downloadOptimizedImage(result.data.blob, result.file)"
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Télécharger
            </button>
            <button
              @click="previewImage(result.data.blob)"
              class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Aperçu
            </button>
          </div>

          <div v-if="!result.success" class="text-red-600 text-sm">
            {{ result.data.error }}
          </div>
        </div>
      </div>

      <!-- Statistiques globales -->
      <div v-if="globalStats" class="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 class="font-semibold text-blue-800 mb-2">Statistiques globales</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-blue-600">Images traitées:</span>
            <br>
            <span class="font-medium">{{ globalStats.totalImages }}</span>
          </div>
          <div>
            <span class="text-blue-600">Taille totale originale:</span>
            <br>
            <span class="font-medium">{{ formatFileSize(globalStats.originalTotalSize) }}</span>
          </div>
          <div>
            <span class="text-blue-600">Taille totale optimisée:</span>
            <br>
            <span class="font-medium">{{ formatFileSize(globalStats.optimizedTotalSize) }}</span>
          </div>
          <div>
            <span class="text-blue-600">Économie totale:</span>
            <br>
            <span class="font-medium text-green-600">{{ globalStats.totalSavings }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'aperçu -->
    <div
      v-if="showPreview"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closePreview"
    >
      <div class="bg-white rounded-lg p-4 max-w-4xl max-h-full overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Aperçu de l'image optimisée</h3>
          <button
            @click="closePreview"
            class="text-gray-500 hover:text-gray-700"
          >
            <Icon name="mdi:close" class="w-6 h-6" />
          </button>
        </div>
        <img
          :src="previewUrl"
          alt="Aperçu"
          class="max-w-full max-h-96 mx-auto"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import imageOptimizationService from '../services/imageOptimizationService.js'

export default {
  name: 'ImageOptimizer',
  components: {
    Icon
  },
  emits: ['optimized', 'error'],
  setup(props, { emit }) {
    // État réactif
    const fileInput = ref(null)
    const isDragOver = ref(false)
    const isProcessing = ref(false)
    const currentFile = ref('')
    const progress = ref(0)
    const results = ref([])
    const showPreview = ref(false)
    const previewUrl = ref('')

    // Options d'optimisation
    const options = ref({
      quality: 'medium',
      format: 'auto',
      maxWidth: 1920,
      maxHeight: 1080,
      progressive: true
    })

    // Statistiques globales
    const globalStats = computed(() => {
      if (results.value.length === 0) return null

      const successfulResults = results.value.filter(r => r.success)
      if (successfulResults.length === 0) return null

      const originalTotalSize = successfulResults.reduce((sum, r) => sum + r.data.originalSize, 0)
      const optimizedTotalSize = successfulResults.reduce((sum, r) => sum + r.data.optimizedSize, 0)
      const totalSavings = Math.round((1 - optimizedTotalSize / originalTotalSize) * 100)

      return {
        totalImages: successfulResults.length,
        originalTotalSize,
        optimizedTotalSize,
        totalSavings
      }
    })

    // Méthodes
    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files)
      processFiles(files)
    }

    const handleDrop = (event) => {
      event.preventDefault()
      isDragOver.value = false
      
      const files = Array.from(event.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      )
      
      if (files.length > 0) {
        processFiles(files)
      }
    }

    const handleDragOver = (event) => {
      event.preventDefault()
      isDragOver.value = true
    }

    const handleDragLeave = () => {
      isDragOver.value = false
    }

    const processFiles = async (files) => {
      if (files.length === 0) return

      isProcessing.value = true
      results.value = []
      currentFile.value = ''
      progress.value = 0

      try {
        const results_data = await imageOptimizationService.optimizeImages(files, options.value)
        
        // Simuler le progrès
        for (let i = 0; i < results_data.length; i++) {
          currentFile.value = results_data[i].file
          progress.value = Math.round(((i + 1) / results_data.length) * 100)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        results.value = results_data
        emit('optimized', results_data)

      } catch (error) {
        console.error('Erreur lors du traitement des images:', error)
        emit('error', error)
      } finally {
        isProcessing.value = false
        currentFile.value = ''
        progress.value = 0
      }
    }

    const downloadOptimizedImage = (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename.replace(/\.[^/.]+$/, '') + '_optimized.' + blob.type.split('/')[1]
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const previewImage = (blob) => {
      previewUrl.value = URL.createObjectURL(blob)
      showPreview.value = true
    }

    const closePreview = () => {
      showPreview.value = false
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = ''
      }
    }

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return {
      fileInput,
      isDragOver,
      isProcessing,
      currentFile,
      progress,
      results,
      showPreview,
      previewUrl,
      options,
      globalStats,
      triggerFileInput,
      handleFileSelect,
      handleDrop,
      handleDragOver,
      handleDragLeave,
      downloadOptimizedImage,
      previewImage,
      closePreview,
      formatFileSize
    }
  }
}
</script>

<style scoped>
@import "tailwindcss" reference;

.drop-zone {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors;
}

.drop-zone:hover {
  @apply border-gray-400 bg-gray-50;
}

.drop-zone.drag-over {
  @apply border-blue-500 bg-blue-50;
}

.drop-zone.processing {
  @apply border-blue-500 bg-blue-50 cursor-not-allowed;
}

.hidden {
  @apply sr-only;
}
</style>
