<template>
  <form class="space-y-4 pt-4 mt-4 border-t border-white/10" @submit.prevent="save">
    <!-- Clé active -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center space-x-3 min-w-0">
        <div :class="[
          'w-2.5 h-2.5 rounded-full flex-shrink-0',
          config.keyConfigured ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-slate-500'
        ]"></div>
        <p class="text-xs text-white/50 font-mono truncate">
          {{ config.keyConfigured ? config.maskedKey : 'Aucune clé' }}
        </p>
      </div>
      <span v-if="config.keySource" :class="[
        'text-xs px-3 py-1 rounded-full font-medium flex-shrink-0',
        config.keySource === 'ui'
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
      ]">
        {{ config.keySource === 'ui' ? 'Depuis interface' : 'Depuis .env' }}
      </span>
    </div>

    <div>
      <label :for="`${config.name}-key`" class="block text-xs text-white/40 uppercase tracking-wider mb-2">
        {{ config.keyConfigured ? 'Remplacer la clé API' : 'Clé API' }}
      </label>
      <input
        :id="`${config.name}-key`"
        v-model="keyInput"
        type="password"
        autocomplete="off"
        :placeholder="config.keyPlaceholder"
        class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-all font-mono text-sm"
      >
      <p class="text-xs text-white/30 mt-1">
        Créez une clé sur {{ config.keyUrl }}. Elle est vérifiée puis stockée chiffrée sur le serveur.
      </p>
    </div>

    <div>
      <label :for="`${config.name}-model`" class="block text-xs text-white/40 uppercase tracking-wider mb-2">Modèle</label>
      <input
        :id="`${config.name}-model`"
        v-model="modelInput"
        type="text"
        autocomplete="off"
        :list="`${config.name}-models`"
        :placeholder="config.defaultModel"
        class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-all font-mono text-sm"
      >
      <datalist :id="`${config.name}-models`">
        <option v-for="model in modelSuggestions" :key="model" :value="model"></option>
      </datalist>
      <p class="text-xs text-white/30 mt-1">
        <span v-if="loadingModels">Chargement des modèles disponibles… </span>
        <span v-else-if="modelSuggestions.length">{{ modelSuggestions.length }} modèles proposés par {{ config.label }}. </span>
        Vide = défaut : {{ config.defaultModel }}
      </p>
    </div>

    <div v-if="error" class="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
      <p class="text-red-200 text-sm">{{ error }}</p>
    </div>

    <div class="flex flex-col sm:flex-row gap-3">
      <button
        type="submit"
        :disabled="!hasChanges || saving"
        :class="[
          'flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2',
          (!hasChanges || saving)
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
        ]"
      >
        <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ saving ? 'Vérification...' : 'Enregistrer' }}</span>
      </button>
      <button
        v-if="config.keySource === 'ui'"
        type="button"
        :disabled="saving"
        class="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-red-500/20 hover:border-red-500/30 transition-all text-sm"
        @click="deleteKey"
      >
        Supprimer la clé
      </button>
    </div>
  </form>
</template>

<script>
import { AIService } from '../services/aiService.js'

/**
 * Formulaire clé API + modèle d'un provider IA (section Providers de Configuration IA)
 */
export default {
  name: 'AIProviderConfig',
  props: {
    // Configuration renvoyée par /api/ai/providers/config (clé masquée, jamais en clair)
    config: {
      type: Object,
      required: true
    }
  },
  emits: ['saved'],
  data() {
    return {
      keyInput: '',
      modelInput: '',
      modelSuggestions: [],
      loadingModels: false,
      saving: false,
      error: null
    }
  },
  computed: {
    // Modèle tel qu'enregistré (vide = défaut)
    savedModelInput() {
      return this.config.modelSource === 'ui' ? this.config.model : ''
    },
    hasChanges() {
      return this.keyInput.trim() !== '' || this.modelInput.trim() !== this.savedModelInput
    }
  },
  watch: {
    config: {
      immediate: true,
      handler(config, previous) {
        this.keyInput = ''
        this.modelInput = this.savedModelInput
        // Nouvelle clé : les modèles disponibles peuvent changer
        if (!previous || previous.maskedKey !== config.maskedKey) {
          this.loadModels()
        }
      }
    }
  },
  methods: {
    async loadModels() {
      this.modelSuggestions = []
      if (!this.config.keyConfigured) return

      this.loadingModels = true
      try {
        this.modelSuggestions = await new AIService().getProviderModels(this.config.name)
      } catch {
        // Suggestions facultatives : le modèle reste saisissable à la main
      } finally {
        this.loadingModels = false
      }
    },

    async save() {
      if (!this.hasChanges) return

      this.saving = true
      this.error = null

      const payload = {}
      const apiKey = this.keyInput.trim()
      const model = this.modelInput.trim()
      if (apiKey) payload.apiKey = apiKey
      if (model !== this.savedModelInput) payload.model = model || null

      try {
        const config = await new AIService().saveProviderConfig(this.config.name, payload)
        this.$emit('saved', config, `Configuration ${this.config.label} enregistrée`)
      } catch (err) {
        this.error = err.message || 'Erreur lors de l\'enregistrement'
      } finally {
        this.saving = false
      }
    },

    async deleteKey() {
      this.saving = true
      this.error = null

      try {
        const config = await new AIService().deleteProviderKey(this.config.name)
        this.$emit('saved', config, `Clé ${this.config.label} supprimée`)
      } catch (err) {
        this.error = err.message || 'Erreur lors de la suppression'
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
