<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header avec navigation -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center space-x-4">
          <button 
            @click="goBack"
            class="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-3xl font-bold text-white">Configuration du code PIN</h1>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Configuration actuelle -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Code PIN actuel</h2>
          <div class="space-y-4">
            <div class="flex items-center space-x-4">
              <div class="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9v1H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5z"/>
                </svg>
              </div>
              <div>
                <p class="text-gray-400 text-sm">Code PIN configuré</p>
                <p class="text-white text-lg font-mono">{{ maskedPin }}</p>
              </div>
            </div>
            
            <div class="pt-4 border-t border-gray-700">
              <button 
                @click="showChangeForm = true"
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Modifier le code PIN
              </button>
            </div>
          </div>
        </div>

        <!-- Informations -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Informations</h2>
          <div class="space-y-4 text-gray-300">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p class="font-medium text-white">Sécurité</p>
                <p class="text-sm">Le code PIN protège l'accès aux profils administrateurs</p>
              </div>
            </div>
            
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p class="font-medium text-white">Format</p>
                <p class="text-sm">Le code PIN doit contenir exactement 4 chiffres</p>
              </div>
            </div>
            
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p class="font-medium text-white">Tentatives</p>
                <p class="text-sm">Maximum 3 tentatives avant verrouillage temporaire</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulaire de modification -->
      <div v-if="showChangeForm" class="mt-8 bg-gray-800 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-white mb-4">Modifier le code PIN</h3>
        
        <form @submit.prevent="changePin" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Nouveau code PIN</label>
              <input 
                v-model="newPin"
                type="password"
                maxlength="4"
                pattern="[0-9]{4}"
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
                placeholder="1234"
              >
              <p class="text-xs text-gray-400 mt-1">4 chiffres uniquement</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Confirmer le code PIN</label>
              <input 
                v-model="confirmPin"
                type="password"
                maxlength="4"
                pattern="[0-9]{4}"
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
                placeholder="1234"
              >
              <p class="text-xs text-gray-400 mt-1">Répétez le même code</p>
            </div>
          </div>

          <div v-if="errorMessage" class="text-red-400 text-sm">
            {{ errorMessage }}
          </div>

          <div v-if="successMessage" class="text-green-400 text-sm">
            {{ successMessage }}
          </div>

          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="cancelChange"
              class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              :disabled="!isFormValid"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { getCurrentPin, setPin, resetPin, PIN_CONFIG } from '../config/pinConfig.js'

export default {
  name: 'PinSettings',
  data() {
    return {
      showChangeForm: false,
      newPin: '',
      confirmPin: '',
      errorMessage: '',
      successMessage: ''
    }
  },
  computed: {
    currentPin() {
      return getCurrentPin()
    },
    maskedPin() {
      return '•'.repeat(4)
    },
    isFormValid() {
      return this.newPin.length === 4 && 
             this.confirmPin.length === 4 && 
             this.newPin === this.confirmPin &&
             /^\d{4}$/.test(this.newPin)
    }
  },
  methods: {
    goBack() {
      this.$router.push('/manage-profiles')
    },
    
    changePin() {
      this.errorMessage = ''
      this.successMessage = ''
      
      if (!this.isFormValid) {
        this.errorMessage = 'Veuillez saisir un code PIN valide de 4 chiffres identiques'
        return
      }
      
      if (setPin(this.newPin)) {
        this.successMessage = 'Code PIN modifié avec succès !'
        this.newPin = ''
        this.confirmPin = ''
        setTimeout(() => {
          this.showChangeForm = false
          this.successMessage = ''
        }, 2000)
      } else {
        this.errorMessage = 'Erreur lors de la modification du code PIN'
      }
    },
    
    cancelChange() {
      this.showChangeForm = false
      this.newPin = ''
      this.confirmPin = ''
      this.errorMessage = ''
      this.successMessage = ''
    }
  }
}
</script>

<style scoped>
input[type="password"] {
  letter-spacing: 0.5em;
}
</style>
