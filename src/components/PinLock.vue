<template>
  <!-- 
    LIQUID GLASS DESIGN - PIN Lock
    
    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden flex items-center justify-center p-6">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Contenu relatif -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Bouton de fermeture -->
      <div class="flex justify-end mb-8">
        <button 
          @click="goBack"
          class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
          title="Retour"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Glass card principale -->
      <div class="glass-card-pinlock">
        <!-- Message d'état -->
        <div class="text-center mb-12">
          <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <p class="text-sm text-white/60 mb-3">Accès sécurisé</p>
          <h1 class="text-3xl font-bold text-white mb-3">Entrez votre PIN</h1>
          <p class="text-white/60">Profil: <span class="font-semibold text-white">{{ profileName }}</span></p>
        </div>

        <!-- Champs de saisie PIN -->
        <div class="flex justify-center space-x-3 mb-12">
          <div 
            v-for="(digit, index) in pinDigits" 
            :key="index"
            class="w-14 h-14 border-2 border-white/30 rounded-xl flex items-center justify-center text-2xl font-bold transition-all"
            :class="{
              'bg-gradient-to-br from-purple-400/30 to-pink-400/30 border-purple-400/60 text-white': digit !== '',
              'text-white/40 bg-white/5': digit === ''
            }"
          >
            <span v-if="digit" class="text-white">●</span>
          </div>
        </div>

        <!-- Clavier numérique -->
        <div class="grid grid-cols-3 gap-3 mb-8">
          <button 
            v-for="number in 9" 
            :key="number"
            @click="addDigit(number)"
            class="glass-button-pin h-12"
          >
            {{ number }}
          </button>
          <button 
            @click="addDigit(0)"
            class="glass-button-pin h-12 col-start-2"
          >
            0
          </button>
          <button 
            @click="removeDigit"
            class="glass-button-pin h-12 text-lg"
            title="Supprimer"
          >
            ⌫
          </button>
        </div>

        <!-- Message d'erreur -->
        <div v-if="errorMessage" class="text-center mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p class="text-red-300 text-sm">{{ errorMessage }}</p>
        </div>

        <!-- Lien mot de passe oublié -->
        <div class="text-center pt-6 border-t border-white/10">
          <button 
            @click="forgotPin"
            class="text-sm text-white/60 hover:text-white transition-colors"
          >
            Vous avez oublié votre code PIN ?
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { PIN_CONFIG, getCurrentPin, setPin } from '../config/pinConfig.js'
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import { apiService } from '../services/apiService.js'

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
        // Récupérer le profil depuis la route (ou utiliser le profil parent par défaut)
        const targetProfileId = this.$route.query.profile || '1'
        const targetProfileIdNum = parseInt(targetProfileId, 10)
        
        // Vérifier le PIN pour le profil cible
        const isValid = await this.profileStore.verifyPin(targetProfileIdNum, enteredPin)
        console.log('🔐 Résultat de la vérification du PIN:', isValid ? '✅ VALIDE' : '❌ INVALIDE')
        
        if (isValid) {
          // PIN correct - obtenir le token JWT via login
          console.log('PIN correct, connexion pour obtenir le token JWT pour le profil:', targetProfileIdNum)
          
          try {
            // Appeler login pour obtenir le token JWT et le stocker dans localStorage
            await apiService.login(targetProfileIdNum, enteredPin)
            console.log('✅ Token JWT obtenu et stocké dans localStorage')
          } catch (loginError) {
            console.error('❌ Erreur lors de la connexion après vérification du PIN:', loginError)
            // Continuer quand même avec la session locale si le login échoue
            // (pour ne pas bloquer l'utilisateur si l'API est temporairement indisponible)
          }
          
          // Créer une session persistante
          sessionService.createSession(targetProfileId, this.profileName)
          
          // Sauvegarder le profil sélectionné dans localStorage
          localStorage.setItem('selectedProfile', JSON.stringify({ id: targetProfileId, name: this.profileName }))
          
          this.$router.push({ 
            path: '/dashboard', 
            query: { 
              profile: targetProfileId,
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
            this.errorMessage = PIN_CONFIG.MESSAGES.TOO_MANY_ATTEMPTS + ' Veuillez réessayer plus tard.'
            // Ne pas rediriger automatiquement - rester sur la page PIN
            // L'utilisateur peut utiliser le bouton de retour s'il le souhaite
            console.log('⚠️ Trop de tentatives - accès verrouillé temporairement')
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
/* Animations */
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Glass Card PIN Lock */
.glass-card-pinlock {
  padding: 2rem;
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Glass Button PIN */
.glass-button-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.glass-button-pin:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.glass-button-pin:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 640px) {
  .glass-card-pinlock {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }

  h1 {
    font-size: 1.75rem;
  }

  .glass-button-pin {
    font-size: 1rem;
  }
}
</style>
