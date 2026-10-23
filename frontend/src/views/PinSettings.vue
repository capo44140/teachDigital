<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header avec navigation -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center space-x-4">
          <button
            type="button"
            class="p-3 text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Retour"
            @click="goBack"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          <h2 class="text-xl font-semibold text-white mb-4">Code PIN parent</h2>
          <div class="space-y-4">
            <div class="flex items-center space-x-4">
              <div class="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9v1H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5z"/>
                </svg>
              </div>
              <div>
                <p class="text-gray-400 text-sm">Profil</p>
                <p class="text-white text-lg">{{ parentName || 'Parent' }}</p>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-700">
              <button
                type="button"
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                :aria-expanded="showChangeForm ? 'true' : 'false'"
                aria-controls="pin-change-form"
                @click="showChangeForm = true"
              >
                Modifier le code PIN
              </button>
            </div>
          </div>
        </div>

        <!-- Informations -->
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Informations</h2>
          <ul class="space-y-4 text-gray-300">
            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p class="font-medium text-white">Sécurité</p>
                <p class="text-sm">Le code PIN protège l'accès à l'espace parent.</p>
              </div>
            </li>

            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p class="font-medium text-white">Format</p>
                <p class="text-sm">
                  Nouveau code : {{ parentMinLength }} à {{ maxLength }} chiffres, ni chiffres identiques (000000)
                  ni suite (123456).
                </p>
              </div>
            </li>

            <li class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <p class="font-medium text-white">Tentatives</p>
                <p class="text-sm">Après plusieurs codes incorrects, l'accès est temporairement bloqué.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Formulaire de modification -->
      <div v-if="showChangeForm" id="pin-change-form" class="mt-8 bg-gray-800 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-white mb-4">Modifier le code PIN</h3>

        <form class="space-y-6" novalidate @submit.prevent="changePin">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label for="pin-current" class="block text-sm font-medium text-gray-300 mb-2">Code PIN actuel</label>
              <input
                id="pin-current"
                v-model="currentPin"
                type="password"
                inputmode="numeric"
                autocomplete="current-password"
                :maxlength="maxLength"
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
                @input="currentPin = sanitize(currentPin)"
              >
            </div>

            <div>
              <label for="pin-new" class="block text-sm font-medium text-gray-300 mb-2">Nouveau code PIN</label>
              <input
                id="pin-new"
                v-model="newPin"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                :maxlength="maxLength"
                required
                aria-describedby="pin-new-hint"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
                @input="newPin = sanitize(newPin)"
              >
              <p id="pin-new-hint" class="text-xs text-gray-400 mt-1">{{ parentMinLength }} à {{ maxLength }} chiffres</p>
            </div>

            <div>
              <label for="pin-confirm" class="block text-sm font-medium text-gray-300 mb-2">Confirmer le nouveau code</label>
              <input
                id="pin-confirm"
                v-model="confirmPin"
                type="password"
                inputmode="numeric"
                autocomplete="new-password"
                :maxlength="maxLength"
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
                @input="confirmPin = sanitize(confirmPin)"
              >
            </div>
          </div>

          <div v-if="errorMessage" class="text-red-400 text-sm" role="alert">
            {{ errorMessage }}
            <span v-if="errorReference" class="block text-xs text-gray-400 mt-1">{{ errorReference }}</span>
          </div>

          <div v-if="successMessage" class="text-green-400 text-sm" role="status">
            {{ successMessage }}
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              :disabled="isLoading"
              class="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              @click="cancelChange"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="!isFormComplete || isLoading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>{{ isLoading ? 'Modification...' : 'Enregistrer' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { authService } from '../services/authService.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { requestRef } from '../utils/apiErrors.js'
import {
  PARENT_PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  isPinFormatValid,
  sanitizePinInput,
  validateNewPin
} from '../utils/pinPolicy.js'

export default {
  name: 'PinSettings',
  setup() {
    const parentNav = useParentNavigation()
    return { parentNav }
  },
  data() {
    return {
      showChangeForm: false,
      currentPin: '',
      newPin: '',
      confirmPin: '',
      errorMessage: '',
      errorReference: null,
      successMessage: '',
      isLoading: false,
      parentMinLength: PARENT_PIN_MIN_LENGTH,
      maxLength: PIN_MAX_LENGTH
    }
  },
  computed: {
    // PIN modifié : celui du parent de la session (jamais un profil choisi ailleurs)
    parentId() {
      return this.parentNav.getParentProfileId()
    },
    parentName() {
      return this.parentNav.getParentProfileName()
    },
    isFormComplete() {
      return isPinFormatValid(this.currentPin) && this.newPin.length > 0 && this.confirmPin.length > 0
    }
  },
  methods: {
    sanitize(value) {
      return sanitizePinInput(value)
    },

    goBack() {
      // Revenir à la page d'origine (paramètres ou gestion des profils)
      if (window.history.state?.back) {
        this.$router.back()
      } else {
        this.parentNav.goToSettings()
      }
    },

    async changePin() {
      this.errorMessage = ''
      this.errorReference = null
      this.successMessage = ''

      if (!this.parentId) {
        this.errorMessage = 'Session parent expirée : saisissez à nouveau votre code PIN.'
        return
      }
      if (this.newPin !== this.confirmPin) {
        this.errorMessage = 'Les deux nouveaux codes ne sont pas identiques.'
        return
      }
      const validation = validateNewPin(this.newPin, { isParent: true })
      if (!validation.isValid) {
        this.errorMessage = validation.message
        return
      }

      this.isLoading = true
      try {
        await authService.updatePin(this.parentId, this.newPin, this.currentPin)
        // Le nouveau jeton parent est enregistré par authService (l'ancien est révoqué)
        this.successMessage = 'Code PIN modifié. Les autres appareils devront saisir le nouveau code.'
        this.currentPin = ''
        this.newPin = ''
        this.confirmPin = ''
        setTimeout(() => {
          this.showChangeForm = false
          this.successMessage = ''
        }, 2000)
      } catch (error) {
        // WEAK_PIN / PIN_TOO_SHORT / PIN actuel incorrect : message du serveur
        this.errorMessage = error?.message || 'Erreur lors de la modification du code PIN'
        this.errorReference = requestRef(error)
      } finally {
        this.isLoading = false
      }
    },

    cancelChange() {
      this.showChangeForm = false
      this.currentPin = ''
      this.newPin = ''
      this.confirmPin = ''
      this.errorMessage = ''
      this.errorReference = null
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
