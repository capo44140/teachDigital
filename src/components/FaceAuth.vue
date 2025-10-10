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
        <p class="text-sm text-gray-400 mb-4">Le profil est actuellement verrouillé.</p>
        <h1 class="text-2xl font-semibold text-white mb-8">Authentification par reconnaissance faciale</h1>
        <p class="text-gray-300 text-sm">Positionnez votre visage devant la caméra pour vous authentifier</p>
      </div>

      <!-- Composant de reconnaissance faciale -->
      <div class="mb-8">
        <FaceRecognition
          ref="faceRecognition"
          mode="authenticate"
          :user-id="profileId"
          :threshold="0.5"
          @success="onAuthSuccess"
          @error="onAuthError"
          @cancel="goBack"
        />
      </div>

      <!-- Message d'erreur -->
      <div v-if="errorMessage" class="text-center mb-6">
        <p class="text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Options alternatives -->
      <div class="text-center space-y-4">
        <button 
          @click="switchToPin"
          class="block w-full text-sm text-gray-400 hover:text-white transition-colors"
        >
          Utiliser le code PIN à la place
        </button>
        
        <button 
          @click="registerFace"
          class="block w-full text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Enregistrer un nouveau profil facial
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
  name: 'FaceAuth',
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
      profileId: '1', // Profil parent par défaut
      profileName: 'Parent'
    }
  },
  mounted() {
    // Récupérer les paramètres de la route
    this.profileId = this.route.query.profile || '1'
    this.profileName = this.route.query.name || 'Parent'
  },
  methods: {
    onAuthSuccess(result) {
      console.log('Authentification faciale réussie:', result)
      
      // Créer une session persistante
      sessionService.createSession(this.profileId, this.profileName)
      
      // Sauvegarder le profil sélectionné
      localStorage.setItem('selectedProfile', JSON.stringify({ 
        id: this.profileId, 
        name: this.profileName 
      }))
      
      // Rediriger vers le dashboard
      this.router.push({ 
        path: '/dashboard', 
        query: { 
          profile: this.profileId,
          unlocked: 'true',
          method: 'face'
        } 
      }).catch(error => {
        console.error('Erreur lors de la redirection:', error)
        this.router.push('/')
      })
    },
    
    onAuthError(error) {
      console.error('Erreur d\'authentification faciale:', error)
      this.errorMessage = error
      
      // Effacer le message d'erreur après 5 secondes
      setTimeout(() => {
        this.errorMessage = ''
      }, 5000)
    },
    
    switchToPin() {
      // Rediriger vers l'authentification par PIN
      this.router.push({
        path: '/pin-lock',
        query: {
          profile: this.profileId,
          name: this.profileName
        }
      })
    },
    
    registerFace() {
      // Rediriger vers l'enregistrement de profil facial
      this.router.push({
        path: '/face-register',
        query: {
          profile: this.profileId,
          name: this.profileName
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
/* Styles spécifiques pour l'authentification faciale */
.face-auth-container {
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
</style>
