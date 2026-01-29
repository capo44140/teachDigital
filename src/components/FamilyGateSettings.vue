<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center space-x-4">
          <button
            class="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
            @click="goBack"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-3xl font-bold text-white">Code d'entrée familial</h1>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6">
        <p class="text-gray-300 mb-6">
          Ce code est demandé à l'ouverture de l'application avant la sélection des profils. Vous pouvez le modifier ici (4 à 8 chiffres).
        </p>

        <form class="space-y-6" @submit.prevent="updateCode">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Code actuel</label>
            <input
              v-model="currentPin"
              type="password"
              maxlength="8"
              autocomplete="current-password"
              class="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
              placeholder="Code actuel"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Nouveau code</label>
            <input
              v-model="newPin"
              type="password"
              maxlength="8"
              autocomplete="new-password"
              class="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
              placeholder="4 à 8 chiffres"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Confirmer le nouveau code</label>
            <input
              v-model="confirmPin"
              type="password"
              maxlength="8"
              autocomplete="new-password"
              class="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl"
              placeholder="Répétez le nouveau code"
            >
          </div>

          <div v-if="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</div>
          <div v-if="successMessage" class="text-green-400 text-sm">{{ successMessage }}</div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              :disabled="isLoading"
              class="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              @click="goBack"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isLoading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>{{ isLoading ? 'Enregistrement...' : 'Enregistrer' }}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="mt-8 bg-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-2">Verrouiller l'app</h2>
        <p class="text-gray-400 text-sm mb-4">La prochaine ouverture demandera à nouveau le code d'entrée familial.</p>
        <button
          type="button"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          @click="lockApp"
        >
          Verrouiller maintenant
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { apiService } from '../services/apiService.js'
import familyGateService from '../services/familyGateService.js'

export default {
  name: 'FamilyGateSettings',
  data () {
    return {
      currentPin: '',
      newPin: '',
      confirmPin: '',
      errorMessage: '',
      successMessage: '',
      isLoading: false
    }
  },
  computed: {
    isFormValid () {
      const len = (s) => (s || '').length >= 4 && (s || '').length <= 8 && /^\d+$/.test(s || '')
      return len(this.currentPin) && len(this.newPin) && this.newPin === this.confirmPin
    }
  },
  methods: {
    goBack () {
      this.$router.push({
        path: '/parent-settings',
        query: this.$route.query
      })
    },
    async updateCode () {
      this.errorMessage = ''
      this.successMessage = ''
      this.isLoading = true
      try {
        await apiService.request('/api/auth/family-gate', {
          method: 'PUT',
          body: JSON.stringify({
            currentPin: this.currentPin,
            newPin: this.newPin
          })
        })
        this.successMessage = 'Code d\'entrée familial mis à jour.'
        this.currentPin = ''
        this.newPin = ''
        this.confirmPin = ''
        setTimeout(() => { this.successMessage = '' }, 3000)
      } catch (err) {
        this.errorMessage = err?.message || 'Erreur lors de la modification du code.'
      } finally {
        this.isLoading = false
      }
    },
    lockApp () {
      familyGateService.clearFamilySession()
      this.$router.push('/family-gate')
    }
  }
}
</script>

<style scoped>
input[type="password"] {
  letter-spacing: 0.25em;
}
</style>
