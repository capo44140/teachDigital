<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour aux paramètres"
              aria-label="Retour aux paramètres"
              @click="goBack"
            >
              <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Configuration IA</h1>
              <p class="text-sm text-white/70 hidden sm:block">Providers IA, clés API et modèles</p>
            </div>
          </div>
          <!-- Bouton rafraîchir -->
          <button
            type="button"
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            title="Rafraîchir"
            aria-label="Rafraîchir"
            :disabled="loading"
            @click="loadData"
          >
            <svg aria-hidden="true" :class="['w-5 h-5', loading ? 'animate-spin' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <!-- Pas de <main> imbriqué : App.vue fournit déjà le <main id="main-content"> -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-4xl mx-auto space-y-8">

        <!-- Section LM Studio -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            LM Studio
          </h2>

          <!-- Statut de connexion -->
          <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-4">
            <div class="flex items-center space-x-3">
              <div
                aria-hidden="true"
                :class="[
                  'w-3 h-3 rounded-full',
                  status.connected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
                ]"
              ></div>
              <div>
                <p class="text-sm font-medium text-white">
                  {{ status.connected ? 'Connecté' : 'Non connecté' }}
                </p>
                <p class="text-xs text-white/70">{{ status.baseUrl || 'URL non configurée' }}</p>
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

          <!-- URL de LM Studio -->
          <form class="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-4" @submit.prevent="saveLocalLLMUrl(localLLMUrlInput.trim() || null)">
            <div class="flex items-center justify-between mb-2">
              <label for="local-llm-url" class="text-xs text-white/70 uppercase tracking-wider">URL de l'API</label>
              <span :class="[
                'text-xs px-3 py-1 rounded-full font-medium',
                status.baseUrlSource === 'ui'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
              ]">
                {{ status.baseUrlSource === 'ui' ? 'Depuis interface' : 'Depuis .env' }}
              </span>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <input
                id="local-llm-url"
                v-model="localLLMUrlInput"
                type="url"
                autocomplete="off"
                placeholder="http://192.168.1.20:1234/v1"
                aria-describedby="local-llm-url-hint"
                :aria-invalid="localLLMUrlError ? 'true' : undefined"
                class="flex-1 min-w-0 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-all font-mono text-sm"
              >
              <button
                type="submit"
                :disabled="!localLLMUrlChanged || savingLocalLLMUrl"
                :class="[
                  'px-6 py-3 rounded-xl font-medium transition-all',
                  (!localLLMUrlChanged || savingLocalLLMUrl)
                    ? 'bg-white/5 text-white/70 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
                ]"
              >
                {{ savingLocalLLMUrl ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button
                v-if="status.baseUrlSource === 'ui'"
                type="button"
                :disabled="savingLocalLLMUrl"
                class="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all text-sm"
                @click="saveLocalLLMUrl(null)"
              >
                Restaurer le défaut (.env)
              </button>
            </div>
            <p id="local-llm-url-hint" class="text-xs text-white/70 mt-2">
              API compatible OpenAI du poste qui fait tourner LM Studio.
              <span v-if="status.baseUrlSource === 'ui'">Défaut .env : {{ status.envBaseUrl || 'aucun' }}</span>
            </p>
            <p v-if="localLLMUrlError" class="text-red-300 text-sm mt-2" role="alert">{{ localLLMUrlError }}</p>
          </form>

          <!-- Modèle actif -->
          <div class="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-white/70 uppercase tracking-wider mb-1">Modèle actif</p>
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
            <p v-if="status.activeModelSource === 'ui' && status.envModel" class="text-xs text-white/70 mt-2">
              Défaut .env : {{ status.envModel }}
            </p>
          </div>

          <!-- Chargement -->
          <div v-if="loading" class="flex items-center justify-center py-8" role="status">
            <svg aria-hidden="true" class="animate-spin w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="ml-3 text-white/70">Chargement des modèles...</span>
          </div>

          <!-- Erreur -->
          <div v-else-if="error" class="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4" role="alert">
            <p class="text-red-200 text-sm">{{ error }}</p>
          </div>

          <!-- Liste des modèles -->
          <div v-else-if="models.length > 0">
            <p class="text-sm text-white/70 mb-3">
              {{ models.length }} modèle{{ models.length > 1 ? 's' : '' }} disponible{{ models.length > 1 ? 's' : '' }}
            </p>
            <div class="space-y-3" role="group" aria-label="Modèles disponibles">
              <button
                v-for="model in models"
                :key="model.id"
                type="button"
                :aria-pressed="selectedModel === model.id ? 'true' : 'false'"
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
                    <div
                      aria-hidden="true"
                      :class="[
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                        selectedModel === model.id
                          ? 'border-purple-400 bg-purple-500'
                          : 'border-white/30'
                      ]"
                    >
                      <div v-if="selectedModel === model.id" class="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <p :class="[
                        'font-medium',
                        selectedModel === model.id ? 'text-white' : 'text-white/80'
                      ]">{{ model.id }}</p>
                      <p class="text-xs text-white/70">{{ model.owned_by }}</p>
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
                type="button"
                :disabled="!selectedModel || selectedModel === status.activeModel || applying"
                :class="[
                  'flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2',
                  (!selectedModel || selectedModel === status.activeModel || applying)
                    ? 'bg-white/5 text-white/70 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
                ]"
                @click="applyModel"
              >
                <svg v-if="applying" aria-hidden="true" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ applying ? 'Application...' : 'Appliquer' }}</span>
              </button>
              <button
                v-if="status.activeModelSource === 'ui'"
                type="button"
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
            <svg aria-hidden="true" class="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p class="text-white/70 text-sm">
              {{ status.connected ? 'Aucun modèle chargé dans LM Studio' : 'LM Studio n\'est pas joignable' }}
            </p>
            <p class="text-white/70 text-xs mt-1">Vérifiez que LM Studio est démarré et qu'un modèle est chargé</p>
          </div>
        </div>

        <!-- Section Providers IA : statut + clé API et modèle de chaque provider -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-2 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-amber-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Providers IA
          </h2>
          <p class="text-sm text-white/70 mb-6">Cliquez sur un provider pour régler sa clé API et son modèle.</p>

          <div v-if="providersConfigError" class="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4" role="alert">
            <p class="text-red-200 text-sm">{{ providersConfigError }}</p>
          </div>

          <div class="space-y-3">
            <div
              v-for="row in providerRows"
              :key="row.name"
              class="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20"
            >
              <button
                type="button"
                :class="['w-full flex items-center justify-between gap-3 text-left', row.config ? 'cursor-pointer' : 'cursor-default']"
                :disabled="!row.config"
                :aria-expanded="expandedProvider === row.name"
                @click="toggleProvider(row.name)"
              >
                <div class="flex items-center space-x-3 min-w-0">
                  <div aria-hidden="true" :class="['w-3 h-3 rounded-full flex-shrink-0', providerState(row).dot]"></div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-white">{{ row.label }}</p>
                    <p class="text-xs text-white/70 font-mono truncate">
                      {{ row.model }}<span v-if="!row.config"> · réglé dans la section LM Studio</span>
                    </p>
                  </div>
                </div>
                <div class="flex items-center space-x-3 flex-shrink-0">
                  <span :class="['text-xs px-3 py-1 rounded-full font-medium', providerState(row).badge]">
                    {{ providerState(row).text }}
                  </span>
                  <svg v-if="row.config"
                    aria-hidden="true"
                    :class="['w-4 h-4 text-white/40 transition-transform', expandedProvider === row.name ? 'rotate-180' : '']"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </button>

              <AIProviderConfig
                v-if="row.config && expandedProvider === row.name"
                :config="row.config"
                @saved="onProviderSaved"
              />
            </div>
          </div>

          <p class="text-xs text-white/70 mt-4">Ordre de priorité : LocalLLM, OpenAI, Gemini, DeepSeek, Groq, Mistral, Kimi, OpenRouter</p>
        </div>

        <!-- Section Pages de cours -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-2 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-pink-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            Pages de cours
          </h2>
          <p class="text-sm text-white/70 mb-4">Provider IA utilisé pour générer une page de cours à partir des photos (modèle capable de lire des images requis).</p>

          <div class="space-y-3" role="group" aria-label="Provider des pages de cours">
            <button
              v-for="option in coursePageOptions"
              :key="option.name || 'auto'"
              type="button"
              :aria-pressed="coursePage.provider === option.name ? 'true' : 'false'"
              :disabled="savingCoursePageProvider || (option.name && !option.configured)"
              :class="[
                'w-full text-left p-4 rounded-xl border-2 transition-all duration-300',
                coursePage.provider === option.name
                  ? 'border-purple-400 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10',
                option.name && !option.configured ? 'opacity-40 cursor-not-allowed' : ''
              ]"
              @click="saveCoursePageProvider(option.name)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div
                    aria-hidden="true"
                    :class="[
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      coursePage.provider === option.name ? 'border-purple-400 bg-purple-500' : 'border-white/30'
                    ]"
                  >
                    <div v-if="coursePage.provider === option.name" class="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div>
                    <p class="font-medium text-white">{{ option.label }}</p>
                    <p class="text-xs text-white/70">{{ option.description }}</p>
                  </div>
                </div>
                <span v-if="option.name && !option.configured" class="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
                  Non configuré
                </span>
              </div>
            </button>
          </div>

          <div v-if="coursePageError" class="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-4" role="alert">
            <p class="text-red-200 text-sm">{{ coursePageError }}</p>
          </div>
        </div>

        <!-- Section Mode OCR -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-4 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-teal-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p class="text-xs text-white/70 mt-0.5">
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
            <p class="text-xs text-white/70 mt-3">Configurable via la variable d'environnement OCR_MODE (llm / tesseract)</p>
          </div>
        </div>

        <!-- Message de succès -->
        <div v-if="successMessage" class="bg-green-500/20 border border-green-500/30 backdrop-blur-xl text-green-200 px-6 py-4 rounded-xl flex items-center space-x-3" role="status">
          <svg aria-hidden="true" class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span>{{ successMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { AIService } from '../services/aiService.js'
import AIProviderConfig from '../components/AIProviderConfig.vue'
import { useParentNavigation } from '../composables/useParentNavigation.js'

export default {
  name: 'AISettings',
  components: {
    AIProviderConfig
  },
  setup() {
    const parentNav = useParentNavigation()
    return { parentNav }
  },
  data() {
    return {
      loading: false,
      applying: false,
      loadingProviders: false,
      error: null,
      successMessage: null,
      status: {
        connected: false,
        baseUrl: '',
        baseUrlSource: 'env',
        envBaseUrl: '',
        activeModel: '',
        activeModelSource: 'env',
        envModel: '',
        ocrMode: 'llm'
      },
      models: [],
      selectedModel: null,
      localLLMUrlInput: '',
      savingLocalLLMUrl: false,
      localLLMUrlError: null,
      // Statut réseau (lent) et configuration (clé masquée, modèle) des providers
      providers: [],
      providersConfig: [],
      providersConfigError: null,
      expandedProvider: null,
      coursePage: {
        provider: null,
        options: []
      },
      savingCoursePageProvider: false,
      coursePageError: null
    }
  },
  computed: {
    // Mode automatique (null) suivi des providers capables de lire des photos
    coursePageOptions() {
      return [
        { name: null, label: 'Automatique', description: 'Premier provider vision disponible, dans l\'ordre de priorité', configured: true },
        ...this.coursePage.options.map(option => ({ ...option, description: option.model || '' }))
      ]
    },
    localLLMUrlChanged() {
      const savedUrl = this.status.baseUrlSource === 'ui' ? this.status.baseUrl : ''
      const input = this.localLLMUrlInput.trim()
      return input !== '' && input !== savedUrl
    },
    // LM Studio (réglé dans sa propre section) puis les providers à clé API, avec leur statut réseau
    providerRows() {
      const statusByName = Object.fromEntries(this.providers.map(provider => [provider.name, provider]))
      const localLLM = statusByName.LocalLLM
      return [
        {
          name: 'LocalLLM',
          label: 'LM Studio',
          model: this.status.activeModel,
          keyConfigured: localLLM ? localLLM.keyConfigured : !!this.status.baseUrl,
          config: null
        },
        ...this.providersConfig.map(config => ({
          name: config.name,
          label: config.label,
          model: config.model,
          keyConfigured: config.keyConfigured,
          config
        }))
      ].map(row => ({ ...row, reachable: statusByName[row.name]?.reachable ?? null }))
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.loadingProviders = true
      this.error = null
      this.successMessage = null

      const aiService = new AIService()

      try {
        const data = await aiService.getLocalLLMModels()

        if (data) {
          this.status = {
            connected: data.connected,
            baseUrl: data.baseUrl,
            baseUrlSource: data.baseUrlSource || 'env',
            envBaseUrl: data.envBaseUrl || '',
            activeModel: data.activeModel,
            activeModelSource: data.activeModelSource,
            envModel: data.envModel,
            ocrMode: data.ocrMode || 'llm'
          }
          this.models = data.models || []
          this.selectedModel = data.activeModel
          this.localLLMUrlInput = data.baseUrl || ''
        }

        // Charger aussi le statut pour le mode OCR
        try {
          const statusData = await aiService.getLocalLLMStatus()
          if (statusData) {
            this.status.ocrMode = statusData.ocrMode || 'llm'
          }
        } catch {
          // Pas grave, on garde le défaut
        }
      } catch (err) {
        this.error = 'Impossible de charger les informations LM Studio: ' + (err.message || 'erreur inconnue')
      } finally {
        this.loading = false
      }

      await this.loadProvidersConfig(aiService)
      await this.loadCoursePageProvider(aiService)
      await this.refreshProvidersStatus(aiService)
    },

    // Statut réseau des providers (peut prendre quelques secondes)
    async refreshProvidersStatus(aiService = new AIService()) {
      this.loadingProviders = true
      try {
        this.providers = await aiService.getProvidersStatus()
      } catch {
        // Pas bloquant
      } finally {
        this.loadingProviders = false
      }
    },

    async loadProvidersConfig(aiService = new AIService()) {
      this.providersConfigError = null
      try {
        this.providersConfig = await aiService.getProvidersConfig()
      } catch (err) {
        this.providersConfigError = 'Impossible de charger la configuration des providers: ' + (err.message || 'erreur inconnue')
      }
    },

    toggleProvider(name) {
      this.expandedProvider = this.expandedProvider === name ? null : name
    },

    // Pastille et badge : non configuré, vérification en cours, en ligne ou hors ligne
    providerState(row) {
      if (!row.keyConfigured) {
        return { dot: 'bg-slate-500', badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/30', text: 'Non configuré' }
      }
      if (this.loadingProviders || row.reachable === null) {
        return { dot: 'bg-slate-400 animate-pulse', badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/30', text: 'Vérification…' }
      }
      return row.reachable
        ? { dot: 'bg-green-400 shadow-lg shadow-green-400/50', badge: 'bg-green-500/20 text-green-300 border border-green-500/30', text: 'En ligne' }
        : { dot: 'bg-red-400 shadow-lg shadow-red-400/50', badge: 'bg-red-500/20 text-red-300 border border-red-500/30', text: 'Hors ligne' }
    },

    async onProviderSaved(config, message) {
      if (config) {
        this.providersConfig = this.providersConfig.map(current => current.name === config.name ? config : current)
      }
      this.successMessage = message
      setTimeout(() => { this.successMessage = null }, 4000)

      const aiService = new AIService()
      await this.loadCoursePageProvider(aiService)
      await this.refreshProvidersStatus(aiService)
    },

    async saveLocalLLMUrl(baseUrl) {
      this.savingLocalLLMUrl = true
      this.localLLMUrlError = null
      this.successMessage = null

      try {
        const result = await new AIService().setLocalLLMUrl(baseUrl)
        // Recharger les modèles et le statut avec la nouvelle URL (loadData efface les messages)
        await this.loadData()
        this.successMessage = baseUrl ? `URL LM Studio enregistrée : ${result?.baseUrl}` : 'URL LM Studio restaurée au défaut (.env)'
        setTimeout(() => { this.successMessage = null }, 4000)
      } catch (err) {
        this.localLLMUrlError = err.message || 'Erreur lors de l\'enregistrement de l\'URL'
      } finally {
        this.savingLocalLLMUrl = false
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

    async loadCoursePageProvider(aiService = new AIService()) {
      try {
        const config = await aiService.getCoursePageProvider()
        if (config) this.coursePage = config
      } catch (err) {
        this.coursePageError = 'Impossible de charger le provider des pages de cours: ' + (err.message || 'erreur inconnue')
      }
    },

    async saveCoursePageProvider(provider) {
      if (provider === this.coursePage.provider) return

      this.savingCoursePageProvider = true
      this.coursePageError = null
      this.successMessage = null

      try {
        const aiService = new AIService()
        const config = await aiService.setCoursePageProvider(provider)
        if (config) this.coursePage = config
        const label = this.coursePageOptions.find(option => option.name === provider)?.label || 'Automatique'
        this.successMessage = `Pages de cours : ${label}`
        setTimeout(() => { this.successMessage = null }, 4000)
      } catch (err) {
        this.coursePageError = err.message || 'Erreur lors de l\'enregistrement'
      } finally {
        this.savingCoursePageProvider = false
      }
    },

    goBack() {
      this.parentNav.goToSettings()
    }
  }
}
</script>

<style scoped>
/* NOTE: styles "glass-card-*" centralisés (src/styles/liquid-glass.css) ; fond animé : AppBackground.vue */
</style>
