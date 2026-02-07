<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour aux paramètres"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Configuration IA</h1>
              <p class="text-sm text-white/60 hidden sm:block">Gestion du LLM local et des modèles</p>
            </div>
          </div>
          <!-- Bouton rafraîchir -->
          <button 
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            title="Rafraîchir"
            :disabled="loading"
            @click="loadData"
          >
            <svg :class="['w-5 h-5', loading ? 'animate-spin' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-4xl mx-auto space-y-8">

        <!-- Section LM Studio -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            LM Studio
          </h2>

          <!-- Statut de connexion -->
          <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-4">
            <div class="flex items-center space-x-3">
              <div :class="[
                'w-3 h-3 rounded-full',
                status.connected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
              ]"></div>
              <div>
                <p class="text-sm font-medium text-white">
                  {{ status.connected ? 'Connecté' : 'Non connecté' }}
                </p>
                <p class="text-xs text-white/40">{{ status.baseUrl || 'URL non configurée' }}</p>
              </div>
            </div>
            <span :class="[
              'text-xs px-3 py-1 rounded-full font-medium',
              status.connected 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            ]">
              {{ status.connected ? 'En ligne' : 'Hors ligne' }}
            </span>
          </div>

          <!-- Modèle actif -->
          <div class="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-white/40 uppercase tracking-wider mb-1">Modèle actif</p>
                <p class="text-lg font-semibold text-white">{{ status.activeModel || 'Aucun' }}</p>
              </div>
              <span :class="[
                'text-xs px-3 py-1 rounded-full font-medium',
                status.activeModelSource === 'ui'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
              ]">
                {{ status.activeModelSource === 'ui' ? 'Depuis interface' : 'Depuis .env' }}
              </span>
            </div>
            <p v-if="status.activeModelSource === 'ui' && status.envModel" class="text-xs text-white/30 mt-2">
              Défaut .env : {{ status.envModel }}
            </p>
          </div>

          <!-- Chargement -->
          <div v-if="loading" class="flex items-center justify-center py-8">
            <svg class="animate-spin w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="ml-3 text-white/60">Chargement des modèles...</span>
          </div>

          <!-- Erreur -->
          <div v-else-if="error" class="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4">
            <p class="text-red-200 text-sm">{{ error }}</p>
          </div>

          <!-- Liste des modèles -->
          <div v-else-if="models.length > 0">
            <p class="text-sm text-white/60 mb-3">
              {{ models.length }} modèle{{ models.length > 1 ? 's' : '' }} disponible{{ models.length > 1 ? 's' : '' }}
            </p>
            <div class="space-y-3">
              <button
                v-for="model in models"
                :key="model.id"
                :class="[
                  'w-full text-left p-4 rounded-xl border-2 transition-all duration-300',
                  selectedModel === model.id
                    ? 'border-purple-400 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                ]"
                @click="selectedModel = model.id"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <!-- Radio indicator -->
                    <div :class="[
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      selectedModel === model.id
                        ? 'border-purple-400 bg-purple-500'
                        : 'border-white/30'
                    ]">
                      <div v-if="selectedModel === model.id" class="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <p :class="[
                        'font-medium',
                        selectedModel === model.id ? 'text-white' : 'text-white/80'
                      ]">{{ model.id }}</p>
                      <p class="text-xs text-white/30">{{ model.owned_by }}</p>
                    </div>
                  </div>
                  <!-- Badge actif -->
                  <span v-if="model.id === status.activeModel" class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    actif
                  </span>
                </div>
              </button>
            </div>

            <!-- Boutons d'action -->
            <div class="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                :disabled="!selectedModel || selectedModel === status.activeModel || applying"
                :class="[
                  'flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2',
                  (!selectedModel || selectedModel === status.activeModel || applying)
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
                ]"
                @click="applyModel"
              >
                <svg v-if="applying" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ applying ? 'Application...' : 'Appliquer' }}</span>
              </button>
              <button
                v-if="status.activeModelSource === 'ui'"
                :disabled="applying"
                class="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all text-sm"
                @click="restoreDefault"
              >
                Restaurer le défaut (.env)
              </button>
            </div>
          </div>

          <!-- Aucun modèle -->
          <div v-else-if="!loading" class="text-center py-8">
            <svg class="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p class="text-white/40 text-sm">
              {{ status.connected ? 'Aucun modèle chargé dans LM Studio' : 'LM Studio n\'est pas joignable' }}
            </p>
            <p class="text-white/20 text-xs mt-1">Vérifiez que LM Studio est démarré et qu'un modèle est chargé</p>
          </div>
        </div>

        <!-- Section Mode OCR -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center">
            <svg class="w-6 h-6 text-teal-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Mode OCR
          </h2>
          <div class="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-white">
                  {{ status.ocrMode === 'llm' || !status.ocrMode ? 'LLM Vision' : 'Tesseract.js' }}
                </p>
                <p class="text-xs text-white/40 mt-0.5">
                  {{ status.ocrMode === 'llm' || !status.ocrMode 
                    ? 'Utilise la vision IA (meilleure qualité, consomme des tokens)' 
                    : 'OCR classique gratuit (qualité inférieure sur les photos)' }}
                </p>
              </div>
              <span :class="[
                'text-xs px-3 py-1 rounded-full font-medium',
                status.ocrMode === 'llm' || !status.ocrMode
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
              ]">
                {{ status.ocrMode === 'llm' || !status.ocrMode ? 'LLM' : 'Tesseract' }}
              </span>
            </div>
            <p class="text-xs text-white/20 mt-3">Configurable via la variable d'environnement OCR_MODE (llm / tesseract)</p>
          </div>
        </div>

        <!-- Message de succès -->
        <div v-if="successMessage" class="bg-green-500/20 border border-green-500/30 backdrop-blur-xl text-green-200 px-6 py-4 rounded-xl flex items-center space-x-3">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span>{{ successMessage }}</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { AIService } from '../services/aiService.js'

export default {
  name: 'AISettings',
  data() {
    return {
      loading: false,
      applying: false,
      error: null,
      successMessage: null,
      status: {
        connected: false,
        baseUrl: '',
        activeModel: '',
        activeModelSource: 'env',
        envModel: '',
        ocrMode: 'llm'
      },
      models: [],
      selectedModel: null
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.error = null
      this.successMessage = null

      try {
        const aiService = new AIService()
        const data = await aiService.getLocalLLMModels()

        if (data) {
          this.status = {
            connected: data.connected,
            baseUrl: data.baseUrl,
            activeModel: data.activeModel,
            activeModelSource: data.activeModelSource,
            envModel: data.envModel,
            ocrMode: data.ocrMode || 'llm'
          }
          this.models = data.models || []
          this.selectedModel = data.activeModel
        }

        // Charger aussi le statut pour le mode OCR
        try {
          const statusData = await aiService.getLocalLLMStatus()
          if (statusData) {
            this.status.ocrMode = statusData.ocrMode || 'llm'
          }
        } catch (_e) {
          // Pas grave, on garde le défaut
        }
      } catch (err) {
        this.error = 'Impossible de charger les informations LM Studio: ' + (err.message || 'erreur inconnue')
      } finally {
        this.loading = false
      }
    },

    async applyModel() {
      if (!this.selectedModel || this.selectedModel === this.status.activeModel) return

      this.applying = true
      this.error = null
      this.successMessage = null

      try {
        const aiService = new AIService()
        const result = await aiService.setLocalLLMModel(this.selectedModel)

        if (result) {
          this.status.activeModel = result.activeModel
          this.status.activeModelSource = result.activeModelSource
          this.successMessage = `Modèle changé : ${result.activeModel}`

          // Effacer le message après 4s
          setTimeout(() => { this.successMessage = null }, 4000)
        }
      } catch (err) {
        this.error = 'Erreur lors du changement de modèle: ' + (err.message || 'erreur inconnue')
      } finally {
        this.applying = false
      }
    },

    async restoreDefault() {
      this.applying = true
      this.error = null
      this.successMessage = null

      try {
        const aiService = new AIService()
        const result = await aiService.setLocalLLMModel(null)

        if (result) {
          this.status.activeModel = result.activeModel
          this.status.activeModelSource = result.activeModelSource
          this.selectedModel = result.activeModel
          this.successMessage = `Modèle restauré au défaut : ${result.activeModel}`

          setTimeout(() => { this.successMessage = null }, 4000)
        }
      } catch (err) {
        this.error = 'Erreur lors de la restauration: ' + (err.message || 'erreur inconnue')
      } finally {
        this.applying = false
      }
    },

    goBack() {
      this.$router.push({
        path: '/parent-settings',
        query: {
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    }
  }
}
</script>

<style scoped>
/* NOTE: styles "animate-blob" et "glass-card-*" centralisés (src/styles/liquid-glass.css) */
</style>
