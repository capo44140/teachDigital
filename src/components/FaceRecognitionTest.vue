<template>
  <div class="face-test-container">
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-3xl font-bold text-white mb-8">Test de Reconnaissance Faciale</h1>
      
      <!-- État d'initialisation -->
      <div v-if="!isInitialized" class="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mr-3"></div>
          <span class="text-yellow-200">Initialisation de la reconnaissance faciale...</span>
        </div>
      </div>

      <!-- Interface de test -->
      <div v-else class="space-y-6">
        <!-- Onglets -->
        <div class="flex space-x-4 mb-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            ]"
          >
            {{ tab.name }}
          </button>
        </div>

        <!-- Détection de visages -->
        <div v-if="activeTab === 'detect'" class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Détection de visages</h2>
          <FaceRecognition
            mode="detect"
            @success="onDetectionSuccess"
            @error="onError"
          />
        </div>

        <!-- Enregistrement de profil -->
        <div v-if="activeTab === 'register'" class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Enregistrement de profil</h2>
          <div class="mb-4">
            <label class="block text-gray-300 mb-2">ID du profil:</label>
            <input
              v-model="testUserId"
              type="text"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Entrez un ID de profil"
            />
          </div>
          <FaceRecognition
            mode="register"
            :user-id="testUserId"
            @success="onRegisterSuccess"
            @error="onError"
          />
        </div>

        <!-- Authentification -->
        <div v-if="activeTab === 'authenticate'" class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Authentification</h2>
          <div class="mb-4">
            <label class="block text-gray-300 mb-2">ID du profil à authentifier:</label>
            <input
              v-model="testUserId"
              type="text"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Entrez l'ID du profil"
            />
          </div>
          <FaceRecognition
            mode="authenticate"
            :user-id="testUserId"
            @success="onAuthSuccess"
            @error="onError"
          />
        </div>

        <!-- Résultats -->
        <div v-if="results.length > 0" class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Résultats des tests</h2>
          <div class="space-y-4">
            <div
              v-for="(result, index) in results"
              :key="index"
              :class="[
                'p-4 rounded-lg border',
                result.success ? 'bg-green-900 border-green-600' : 'bg-red-900 border-red-600'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-white">{{ result.test }}</span>
                <span class="text-sm text-gray-300">{{ result.timestamp }}</span>
              </div>
              <p :class="result.success ? 'text-green-200' : 'text-red-200'">
                {{ result.message }}
              </p>
              <div v-if="result.details" class="mt-2 text-sm text-gray-300">
                <pre class="bg-gray-900 p-2 rounded text-xs overflow-auto">{{ JSON.stringify(result.details, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-4">
          <button
            @click="clearResults"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Effacer les résultats
          </button>
          <button
            @click="runFullTest"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Test complet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import FaceRecognition from './FaceRecognition.vue'
import faceRecognitionService from '../services/faceRecognitionService.js'

export default {
  name: 'FaceRecognitionTest',
  components: {
    FaceRecognition
  },
  setup() {
    const isInitialized = ref(false)
    const activeTab = ref('detect')
    const testUserId = ref('test-user-1')
    const results = ref([])

    const tabs = [
      { id: 'detect', name: 'Détection' },
      { id: 'register', name: 'Enregistrement' },
      { id: 'authenticate', name: 'Authentification' }
    ]

    onMounted(async () => {
      try {
        await faceRecognitionService.initialize()
        isInitialized.value = true
        addResult('Initialisation', true, 'Reconnaissance faciale initialisée avec succès')
      } catch (error) {
        addResult('Initialisation', false, `Erreur d'initialisation: ${error.message}`)
      }
    })

    const addResult = (test, success, message, details = null) => {
      results.value.unshift({
        test,
        success,
        message,
        details,
        timestamp: new Date().toLocaleTimeString()
      })
    }

    const onDetectionSuccess = (result) => {
      addResult('Détection', true, 'Visage détecté avec succès', result)
    }

    const onRegisterSuccess = (result) => {
      addResult('Enregistrement', true, 'Profil enregistré avec succès', result)
    }

    const onAuthSuccess = (result) => {
      addResult('Authentification', true, 'Authentification réussie', result)
    }

    const onError = (error) => {
      addResult('Erreur', false, error)
    }

    const clearResults = () => {
      results.value = []
    }

    const runFullTest = async () => {
      clearResults()
      addResult('Test complet', true, 'Démarrage du test complet...')
      
      try {
        // Test 1: Vérifier l'initialisation
        if (!faceRecognitionService.isInitialized) {
          throw new Error('Service non initialisé')
        }
        addResult('Test 1', true, 'Service initialisé correctement')

        // Test 2: Vérifier les modèles
        if (!faceRecognitionService.modelsLoaded) {
          throw new Error('Modèles non chargés')
        }
        addResult('Test 2', true, 'Modèles chargés correctement')

        // Test 3: Vérifier le localStorage
        const testKey = 'face_descriptor_test'
        const testDescriptor = new Float32Array([0.1, 0.2, 0.3])
        localStorage.setItem(testKey, JSON.stringify(Array.from(testDescriptor)))
        
        const loaded = localStorage.getItem(testKey)
        if (!loaded) {
          throw new Error('Impossible de sauvegarder dans localStorage')
        }
        addResult('Test 3', true, 'localStorage fonctionne correctement')
        
        // Nettoyer le test
        localStorage.removeItem(testKey)

        addResult('Test complet', true, 'Tous les tests sont passés avec succès !')
      } catch (error) {
        addResult('Test complet', false, `Erreur lors du test: ${error.message}`)
      }
    }

    return {
      isInitialized,
      activeTab,
      testUserId,
      results,
      tabs,
      onDetectionSuccess,
      onRegisterSuccess,
      onAuthSuccess,
      onError,
      clearResults,
      runFullTest
    }
  }
}
</script>

<style scoped>
.face-test-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

/* Styles pour les onglets */
.tab-button {
  transition: all 0.3s ease;
}

.tab-button:hover {
  transform: translateY(-1px);
}

/* Styles pour les résultats */
.result-item {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Styles pour les inputs */
input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Styles pour les boutons */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}
</style>
