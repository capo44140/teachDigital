<template>
  <!--
    LIQUID GLASS DESIGN - Paramètres Enfant

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen overflow-hidden">
    <!-- Header avec navigation -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
              aria-label="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">Mes Paramètres</h1>
              <p class="text-sm text-white/70 hidden sm:block">Personnalise ton espace d'apprentissage</p>
            </div>
          </div>

          <!-- Profil actuel -->
          <div v-if="currentProfile" class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20" :class="currentProfile.bgColor || 'bg-gradient-to-br from-purple-500/30 to-pink-500/30'">
              <span class="text-white text-sm font-semibold">{{ currentProfile.initial || currentProfile.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="text-white font-medium">{{ currentProfile.name }}</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-4xl mx-auto space-y-8">
        <!-- Section Mon Profil -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center">
              <svg aria-hidden="true" class="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white">Mon Profil</h2>
          </div>

          <div class="flex items-center space-x-6 mb-6">
            <div class="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold text-white backdrop-blur-xl border border-white/20"
                 :class="currentProfile?.bgColor || 'bg-gradient-to-br from-purple-500/30 to-pink-500/30'">
              {{ currentProfile?.initial || currentProfile?.name?.charAt(0) || '?' }}
            </div>
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-white">{{ currentProfile?.name || 'Utilisateur' }}</h3>
              <p class="text-white/70">{{ currentProfile?.description || 'Profil d\'apprentissage' }}</p>
            </div>
          </div>

          <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-purple-400/30 rounded-xl p-4">
            <p class="text-sm text-purple-200">
              <span class="font-semibold"><span aria-hidden="true">💡</span> Info :</span> Pour modifier ton nom ou ton avatar, demande à un parent de t'aider !
            </p>
          </div>
        </div>

        <!-- Section Apparence -->
        <section class="glass-card-dashboard" aria-labelledby="settings-appearance-title">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-xl flex items-center justify-center" aria-hidden="true">
              <svg aria-hidden="true" class="w-6 h-6 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
              </svg>
            </div>
            <h2 id="settings-appearance-title" class="text-xl font-bold text-white">Apparence et Thème</h2>
          </div>

          <div class="space-y-6">
            <!-- Thème de l'application (src/stores/themeStore.js) -->
            <div>
              <h3 class="text-lg font-medium text-white mb-1">Choisis ton thème</h3>
              <template v-if="themeStore.childChoice">
                <p class="text-sm text-white/70 mb-4">Il habille tout ton espace : couleurs, police et décor.</p>
                <ThemePicker
                  name="child-app-theme"
                  legend="Choisis ton thème"
                  :model-value="ownAppTheme"
                  :inherit-theme="themeStore.familyTheme"
                  inherit-label="Comme ma famille"
                  @update:model-value="selectAppTheme"
                />
              </template>
              <p v-else class="text-sm text-white/70">
                Ton thème, {{ appTheme.emoji }} {{ appTheme.name }}, est choisi par tes parents.
              </p>
            </div>

            <!-- Couleur du fond de l'application (si le thème en tient compte) -->
            <div v-if="toneConfig">
              <h3 id="settings-theme-label" class="text-lg font-medium text-white mb-1">{{ toneConfig.title }}</h3>
              <p class="text-sm text-white/70 mb-4">{{ toneConfig.hint }}</p>
              <div class="grid grid-cols-3 md:grid-cols-7 gap-4" role="group" aria-labelledby="settings-theme-label">
                <button
                  type="button"
                  :class="[
                    'h-20 rounded-xl transition-all duration-300 backdrop-blur-xl border border-white/20 bg-white/10 flex flex-col items-center justify-center',
                    settings.theme === null ? 'ring-4 ring-offset-2 ring-purple-400 shadow-lg shadow-purple-500/50' : ''
                  ]"
                  :aria-pressed="settings.theme === null ? 'true' : 'false'"
                  @click="selectTheme(null)"
                >
                  <span class="text-white font-semibold text-sm" aria-hidden="true">✨</span>
                  <span class="text-white text-xs">Auto</span>
                </button>
                <button
                  v-for="theme in colorThemes"
                  :key="theme.id"
                  type="button"
                  :class="[
                    'h-20 rounded-xl transition-all duration-300 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center',
                    toneOption(theme).swatch ? '' : theme.gradient,
                    settings.theme === theme.id ? 'ring-4 ring-offset-2 ring-purple-400 shadow-lg shadow-purple-500/50' : ''
                  ]"
                  :style="toneOption(theme).swatch ? { backgroundImage: toneOption(theme).swatch } : null"
                  :aria-pressed="settings.theme === theme.id ? 'true' : 'false'"
                  @click="selectTheme(theme.id)"
                >
                  <span class="text-white font-semibold text-sm" aria-hidden="true">{{ toneOption(theme).emoji }}</span>
                  <span class="text-white text-xs">{{ toneOption(theme).name }}</span>
                </button>
              </div>
            </div>

            <!-- Taille du texte -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <label for="settings-font-size" class="text-lg font-medium text-white">Taille du texte</label>
                <p id="settings-font-size-desc" class="text-sm text-white/70">Rends le texte plus facile à lire</p>
              </div>
              <select
                id="settings-font-size"
                v-model="settings.fontSize"
                aria-describedby="settings-font-size-desc"
                class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="small" class="bg-slate-900">Petit</option>
                <option value="normal" class="bg-slate-900">Normal</option>
                <option value="large" class="bg-slate-900">Grand</option>
              </select>
            </div>

            <!-- Animations -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 id="settings-animations-label" class="text-lg font-medium text-white">Animations</h3>
                <p id="settings-animations-desc" class="text-sm text-white/70">Rendre l'interface plus vivante (désactive-les si elles te gênent)</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="settings.animations"
                  type="checkbox"
                  role="switch"
                  class="sr-only peer"
                  aria-labelledby="settings-animations-label"
                  aria-describedby="settings-animations-desc"
                >
                <span class="toggle-track toggle-track--accent" aria-hidden="true"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Section Accessibilité -->
        <section class="glass-card-dashboard" aria-labelledby="settings-accessibility-title">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center" aria-hidden="true">
              <svg aria-hidden="true" class="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <h2 id="settings-accessibility-title" class="text-xl font-bold text-white">Accessibilité</h2>
          </div>

          <div class="space-y-6">
            <!-- Mode lecture facile -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 id="settings-easy-read-label" class="text-lg font-medium text-white">Mode lecture facile <span aria-hidden="true">📖</span></h3>
                <p id="settings-easy-read-desc" class="text-sm text-white/70">Police plus grande et espacement amélioré</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="settings.easyReadMode"
                  type="checkbox"
                  role="switch"
                  class="sr-only peer"
                  aria-labelledby="settings-easy-read-label"
                  aria-describedby="settings-easy-read-desc"
                >
                <span class="toggle-track toggle-track--success" aria-hidden="true"></span>
              </label>
            </div>

            <!-- Contraste élevé -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 id="settings-contrast-label" class="text-lg font-medium text-white">Contraste élevé <span aria-hidden="true">🔆</span></h3>
                <p id="settings-contrast-desc" class="text-sm text-white/70">Textes plus nets et fonds plus sombres</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  v-model="settings.highContrast"
                  type="checkbox"
                  role="switch"
                  class="sr-only peer"
                  aria-labelledby="settings-contrast-label"
                  aria-describedby="settings-contrast-desc"
                >
                <span class="toggle-track toggle-track--success" aria-hidden="true"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Section Aide -->
        <section class="glass-card-dashboard" aria-labelledby="settings-help-title">
          <div class="flex items-center space-x-4 mb-6">
            <div class="w-10 h-10 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center" aria-hidden="true">
              <svg aria-hidden="true" class="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 id="settings-help-title" class="text-xl font-bold text-white">Aide</h2>
          </div>

          <button
            type="button"
            class="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-400/30 rounded-xl hover:bg-yellow-500/20 transition-all"
            @click="showHelp"
          >
            <span class="flex items-center space-x-4">
              <span class="w-12 h-12 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center" aria-hidden="true">
                <svg aria-hidden="true" class="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </span>
              <span class="text-left">
                <span class="block text-lg font-medium text-white">Guide d'aide <span aria-hidden="true">📚</span></span>
                <span class="block text-sm text-white/70">Apprends à utiliser l'application</span>
              </span>
            </span>
            <svg class="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </section>

        <!-- Enregistrement automatique et réinitialisation -->
        <div class="flex flex-col items-center gap-4 mb-8">
          <p class="text-sm text-white/70" role="status" aria-live="polite">{{ statusMessage }}</p>
          <button
            type="button"
            class="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-medium text-lg"
            @click="resetSettings"
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ThemePicker from '../components/ThemePicker.vue'
import { useProfileStore } from '../stores/profileStore.js'
import { useSettingsStore, CHILD_THEMES, DEFAULT_CHILD_SETTINGS } from '../stores/settingsStore.js'
import { useThemeStore } from '../stores/themeStore.js'

export default {
  name: 'ChildSettings',
  components: { ThemePicker },
  setup() {
    const profileStore = useProfileStore()
    const settingsStore = useSettingsStore()
    const themeStore = useThemeStore()
    return { profileStore, settingsStore, themeStore, colorThemes: CHILD_THEMES }
  },
  data() {
    const profileId = this.$route.query.profile
    return {
      currentProfile: null,
      // Copie locale des préférences enregistrées du profil
      settings: profileId ? this.settingsStore.getSettings(profileId) : { ...DEFAULT_CHILD_SETTINGS },
      statusMessage: 'Tes réglages sont enregistrés automatiquement.'
    }
  },
  computed: {
    profileId() {
      return this.$route.query.profile
    },
    // Thème choisi pour ce profil (null : celui de la famille)
    ownAppTheme() {
      return this.themeStore.profileThemeId(this.profileId)
    },
    // Thème effectivement appliqué à l'espace de l'enfant
    appTheme() {
      return this.themeStore.themeForProfile(this.profileId)
    },
    // Choix de couleur proposé par le thème (null : le thème n'en tient pas compte)
    toneConfig() {
      return this.appTheme.tones
    }
  },
  watch: {
    // Chaque changement est enregistré et appliqué tout de suite à toute l'application
    settings: {
      handler(next) {
        if (!this.profileId) return
        this.settingsStore.updateSettings(this.profileId, next)
        this.statusMessage = 'Réglages enregistrés ✔'
      },
      deep: true
    }
  },
  async created() {
    await this.loadCurrentProfile()
  },
  methods: {
    async loadCurrentProfile() {
      // La route garantit un profil enfant/ado (?profile=)
      if (!this.profileId) return
      try {
        this.currentProfile = await this.profileStore.loadProfile(this.profileId)
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
      }
    },

    selectTheme(themeId) {
      this.settings.theme = themeId
    },

    // Libellé d'une couleur dans le thème actif (ex. Pat' Patrouille : le chiot de cette couleur)
    toneOption(tone) {
      return this.toneConfig?.options?.[tone.id] || tone
    },

    selectAppTheme(themeId) {
      if (!this.profileId) return
      // Espace de l'enfant : son thème s'applique tout de suite (fondu enchaîné)
      this.themeStore.setProfileTheme(this.profileId, themeId, { animate: true })
      this.statusMessage = 'Thème appliqué ✔'
    },

    resetSettings() {
      this.settings = { ...DEFAULT_CHILD_SETTINGS }
      // Le thème n'est remis à celui de la famille que si l'enfant a le droit de le choisir
      if (this.profileId && this.themeStore.childChoice) {
        this.themeStore.setProfileTheme(this.profileId, null, { animate: true })
      }
      this.$toast.success('Réglages remis par défaut')
    },

    goBack() {
      this.$router.push({
        path: '/user-dashboard',
        query: {
          profile: this.profileId
        }
      })
    },

    showHelp() {
      this.$router.push({
        name: 'ChildHelp',
        query: {
          profile: this.profileId
        }
      })
    }
  }
}
</script>

<style scoped>
/* NOTE: .glass-card-dashboard est centralisé (src/styles/liquid-glass.css) ; fond animé : AppBackground.vue */

/* Interrupteur (case à cocher visuellement masquée, piste décorative) */
.toggle-track {
  position: relative;
  display: block;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: background 0.2s ease;
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: #fff;
  transition: transform 0.2s ease;
}

.peer:checked ~ .toggle-track::after {
  transform: translateX(1.25rem);
}

/* Piste cochée : couleur posée ici, une classe Tailwind peer-checked:… perdrait face au fond
   ci-dessus (styles scopés hors couche). Palette Tailwind : les thèmes la recolorent. */
.peer:checked ~ .toggle-track--accent {
  background: linear-gradient(to right, var(--color-purple-600, #9333ea), var(--color-pink-600, #db2777));
  border-color: transparent;
}

.peer:checked ~ .toggle-track--success {
  background: var(--color-green-600, #16a34a);
  border-color: transparent;
}

.peer:focus-visible ~ .toggle-track {
  outline: 2px solid var(--td-focus-ring, #a78bfa);
  outline-offset: 2px;
}

/* Responsive design */
@media (max-width: 768px) {
  .max-w-4xl {
    max-width: 100%;
    padding: 0 1rem;
  }
}

/* Input styles */
select option {
  background: var(--td-surface-option, #1e293b);
  color: white;
}
</style>
