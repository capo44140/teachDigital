<template>
  <div class="min-h-screen bg-black flex items-center justify-center p-6">
    <div class="w-full max-w-md">
      <!-- Bouton de fermeture -->
      <div class="flex justify-end mb-8">
        <button 
          @click="goBack"
          class="text-white hover:text-gray-300 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Message d'état -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold text-white mb-4">Enregistrement de profil facial</h1>
        <p class="text-gray-300 text-sm mb-2">Profil: {{ profileName }}</p>
        <p class="text-gray-400 text-sm">Positionnez votre visage devant la caméra pour l'enregistrer</p>
      </div>

      <!-- Composant de reconnaissance faciale -->
      <div class="mb-8">
        <FaceRecognition
          ref="faceRecognition"
          mode="register"
          :user-id="profileId"
          @success="onRegisterSuccess"
          @error="onRegisterError"
          @cancel="goBack"
        />
      </div>

      <!-- Message d'erreur -->
      <div v-if="errorMessage" class="text-center mb-6">
        <p class="text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Message de succès -->
      <div v-if="successMessage" class="text-center mb-6">
        <p class="text-green-400 text-sm">{{ successMessage }}</p>
      </div>

      <!-- Instructions -->
      <div class="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 class="text-white font-medium mb-2">Instructions :</h3>
        <ul class="text-gray-300 text-sm space-y-1">
          <li>• Assurez-vous d'avoir un bon éclairage</li>
          <li>• Regardez directement la caméra</li>
          <li>• Gardez une expression neutre</li>
          <li>• Évitez les lunettes de soleil</li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="text-center space-y-4">
        <button 
          v-if="!isRegistered"
          @click="goBack"
          class="block w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          Annuler l'enregistrement
        </button>
        
        <button 
          v-if="isRegistered"
          @click="testAuthentication"
          class="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tester l'authentification
        </button>
        
        <button 
          v-if="isRegistered"
          @click="goToDashboard"
          class="block w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          Aller au tableau de bord
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import FaceRecognition from './FaceRecognition.vue'

export default {
  name: 'FaceRegister',
  components: {
    FaceRecognition
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const profileStore = useProfileStore()
    
    return {
      router,
      route,
      profileStore
    }
  },
  data() {
    return {
      errorMessage: '',
      successMessage: '',
      profileId: '1',
      profileName: 'Parent',
      isRegistered: false
    }
  },
  mounted() {
    // Récupérer les paramètres de la route
    this.profileId = this.route.query.profile || '1'
    this.profileName = this.route.query.name || 'Parent'
  },
  methods: {
    onRegisterSuccess(result) {
      console.log('Enregistrement facial réussi:', result)
      this.isRegistered = true
      this.successMessage = 'Profil facial enregistré avec succès !'
      this.errorMessage = ''
      
      // Effacer le message de succès après 5 secondes
      setTimeout(() => {
        this.successMessage = ''
      }, 5000)
    },
    
    onRegisterError(error) {
      console.error('Erreur d\'enregistrement facial:', error)
      this.errorMessage = error
      this.successMessage = ''
      
      // Effacer le message d'erreur après 5 secondes
      setTimeout(() => {
        this.errorMessage = ''
      }, 5000)
    },
    
    testAuthentication() {
      // Rediriger vers l'authentification faciale pour tester
      this.router.push({
        path: '/face-auth',
        query: {
          profile: this.profileId,
          name: this.profileName,
          test: 'true'
        }
      })
    },
    
    goToDashboard() {
      // Créer une session et aller au dashboard
      sessionService.createSession(this.profileId, this.profileName)
      
      localStorage.setItem('selectedProfile', JSON.stringify({ 
        id: this.profileId, 
        name: this.profileName 
      }))
      
      this.router.push({ 
        path: '/dashboard', 
        query: { 
          profile: this.profileId,
          unlocked: 'true',
          method: 'face-register'
        } 
      })
    },
    
    goBack() {
      this.router.push('/')
    }
  }
}
</script>

<style scoped>
/* Styles spécifiques pour l'enregistrement facial */
.face-register-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

/* Animation pour les transitions */
.transition-all {
  transition: all 0.3s ease;
}

/* Effet de survol pour les boutons */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* Style pour les instructions */
.bg-gray-800 {
  background-color: rgba(31, 41, 55, 0.8);
  backdrop-filter: blur(10px);
}
</style>
