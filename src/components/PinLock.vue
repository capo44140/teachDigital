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
        <h1 class="text-2xl font-semibold text-white mb-8">Entrez votre code PIN pour accéder à ce profil.</h1>
      </div>

      <!-- Champs de saisie PIN -->
      <div class="flex justify-center space-x-4 mb-8">
        <div 
          v-for="(digit, index) in pinDigits" 
          :key="index"
          class="w-16 h-16 border-2 border-white rounded-lg flex items-center justify-center text-2xl font-bold text-white"
          :class="{ 'bg-white text-black': digit !== '' }"
        >
          {{ digit }}
        </div>
      </div>

      <!-- Clavier numérique -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <button 
          v-for="number in 9" 
          :key="number"
          @click="addDigit(number)"
          class="w-16 h-16 bg-gray-800 text-white text-2xl font-bold rounded-lg hover:bg-gray-700 transition-colors mx-auto"
        >
          {{ number }}
        </button>
        <button 
          @click="addDigit(0)"
          class="w-16 h-16 bg-gray-800 text-white text-2xl font-bold rounded-lg hover:bg-gray-700 transition-colors mx-auto col-start-2"
        >
          0
        </button>
        <button 
          @click="removeDigit"
          class="w-16 h-16 bg-gray-800 text-white text-2xl font-bold rounded-lg hover:bg-gray-700 transition-colors mx-auto"
        >
          ⌫
        </button>
      </div>

      <!-- Message d'erreur -->
      <div v-if="errorMessage" class="text-center mb-6">
        <p class="text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <!-- Lien mot de passe oublié -->
      <div class="text-center">
        <button 
          @click="forgotPin"
          class="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Vous avez oublié votre code PIN ?
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { PIN_CONFIG, getCurrentPin, setPin } from '../config/pinConfig.js'
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'

export default {
  name: 'PinLock',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      pinDigits: ['', '', '', ''],
      currentDigit: 0,
      errorMessage: '',
      attempts: 0,
      maxAttempts: PIN_CONFIG.MAX_ATTEMPTS,
      isLocked: false
    }
  },
  props: {
    profileName: {
      type: String,
      default: 'Parent'
    }
  },
  mounted() {
    // Focus sur le premier champ au chargement
    this.focusFirstField()
  },
  methods: {
    addDigit(digit) {
      if (this.currentDigit < 4) {
        this.pinDigits[this.currentDigit] = digit.toString()
        this.currentDigit++
        
        // Vérifier le PIN si 4 chiffres saisis
        if (this.currentDigit === 4) {
          this.checkPin()
        }
      }
    },
    
    removeDigit() {
      if (this.currentDigit > 0) {
        this.currentDigit--
        this.pinDigits[this.currentDigit] = ''
        this.errorMessage = ''
      }
    },
    
    async checkPin() {
      if (this.isLocked) return
      
      const enteredPin = this.pinDigits.join('')
      
      try {
        // Récupérer le profil parent (ID 1) pour vérifier le PIN
        const profileId = 1 // Profil parent
        const isValid = await this.profileStore.verifyPin(profileId, enteredPin)
        
        if (isValid) {
          // PIN correct - créer une session et rediriger vers le dashboard
          const profileId = this.$route.query.profile || '1'
          console.log('PIN correct, création de session pour le profil:', profileId)
          
          // Créer une session persistante
          sessionService.createSession(profileId, this.profileName)
          
          // Sauvegarder le profil sélectionné dans localStorage
          localStorage.setItem('selectedProfile', JSON.stringify({ id: profileId, name: this.profileName }))
          
          this.$router.push({ 
            path: '/dashboard', 
            query: { 
              profile: profileId,
              unlocked: 'true'
            } 
          }).catch(error => {
            console.error('Erreur lors de la redirection:', error)
            // Fallback vers le sélecteur de profil
            this.$router.push('/')
          })
        } else {
          // PIN incorrect
          this.attempts++
          const remainingAttempts = this.maxAttempts - this.attempts
          
          if (remainingAttempts > 0) {
            this.errorMessage = `${PIN_CONFIG.MESSAGES.INCORRECT_PIN}. Tentatives restantes : ${remainingAttempts}`
            // Réinitialiser les champs après 1 seconde
            setTimeout(() => {
              this.resetPin()
            }, 1000)
          } else {
            // Trop de tentatives - verrouiller temporairement
            this.isLocked = true
            this.errorMessage = PIN_CONFIG.MESSAGES.TOO_MANY_ATTEMPTS
            setTimeout(() => {
              this.goBack()
            }, 3000)
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du PIN:', error)
        this.errorMessage = 'Erreur de connexion. Veuillez réessayer.'
        setTimeout(() => {
          this.resetPin()
        }, 1000)
      }
    },
    
    resetPin() {
      this.pinDigits = ['', '', '', '']
      this.currentDigit = 0
      this.focusFirstField()
    },
    
    focusFirstField() {
      // Focus automatique sur le premier champ
      this.$nextTick(() => {
        // Simulation du focus visuel
      })
    },
    
    goBack() {
      this.$router.push('/')
    },
    
    async forgotPin() {
      try {
        // Récupérer le code PIN depuis la base de données
        const currentPin = await this.profileStore.getDefaultPin()
        alert(PIN_CONFIG.MESSAGES.FORGOT_PIN.replace('{pin}', currentPin))
      } catch (error) {
        console.error('Erreur lors de la récupération du code PIN:', error)
        alert('Code PIN par défaut : 1234')
      }
    }
  }
}
</script>

<style scoped>
/* Animation pour les champs de saisie */
.pin-field {
  transition: all 0.2s ease;
}

.pin-field:focus {
  transform: scale(1.05);
}

/* Animation pour les boutons */
button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.95);
}
</style>
