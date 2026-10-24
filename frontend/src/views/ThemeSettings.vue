<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header avec navigation -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center space-x-4">
          <button
            type="button"
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            title="Retour aux paramètres"
            aria-label="Retour aux paramètres"
            @click="goBack"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-white">Thèmes de l'application</h1>
            <p class="text-sm text-white/70 hidden sm:block">L'apparence de TeachDigital, pour toute la famille ou pour chaque enfant</p>
          </div>
        </div>
      </nav>
    </header>

    <!-- Pas de <main> imbriqué : App.vue fournit déjà le <main id="main-content"> -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-5xl mx-auto space-y-8">
        <!-- Thème de la famille -->
        <section class="glass-card-dashboard" aria-labelledby="family-theme-title">
          <div>
            <h2 id="family-theme-title" class="text-xl font-bold text-white">Thème de la famille</h2>
            <p class="text-sm text-white/70 mt-1">
              Il habille l'écran d'accueil, le choix du profil et l'espace parent, et c'est le thème des enfants
              qui n'en ont pas d'autre. Le changement s'applique tout de suite.
            </p>
          </div>
          <ThemePicker
            name="family-theme"
            legend="Thème de la famille"
            :model-value="themeStore.family"
            @update:model-value="selectFamilyTheme"
          />
        </section>

        <!-- Thèmes des enfants -->
        <section class="glass-card-dashboard" aria-labelledby="children-themes-title">
          <div>
            <h2 id="children-themes-title" class="text-xl font-bold text-white">Thèmes des enfants</h2>
            <p class="text-sm text-white/70 mt-1">
              Chaque enfant peut avoir son propre thème dans son espace ; sinon, il suit celui de la famille.
            </p>
          </div>

          <div class="flex items-center justify-between gap-4 p-4 bg-white/10 rounded-xl border border-white/20">
            <div>
              <p id="child-choice-label" class="font-medium text-white">Laisser les enfants changer leur thème</p>
              <p id="child-choice-desc" class="text-sm text-white/70">Depuis « Mes paramètres », dans leur espace</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                role="switch"
                class="sr-only peer"
                :checked="themeStore.childChoice"
                aria-labelledby="child-choice-label"
                aria-describedby="child-choice-desc"
                @change="themeStore.setChildChoice($event.target.checked)"
              >
              <span class="toggle-track toggle-track--accent" aria-hidden="true"></span>
            </label>
          </div>

          <div v-if="isLoadingProfiles" class="text-center py-6" role="status">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white/80 mb-2" aria-hidden="true"></div>
            <p class="text-white/70">Chargement des profils...</p>
          </div>

          <div v-else-if="profilesError" class="p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl" role="alert">
            <p>{{ profilesError }}</p>
            <button
              type="button"
              class="mt-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              @click="loadProfiles"
            >
              Réessayer
            </button>
          </div>

          <p v-else-if="children.length === 0" class="text-white/70">
            Aucun profil enfant ou adolescent pour le moment.
          </p>

          <ul v-else class="space-y-3" aria-label="Thème de chaque enfant">
            <li
              v-for="child in children"
              :key="child.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/10 rounded-xl border border-white/20"
            >
              <div class="flex items-center space-x-3 min-w-0">
                <span class="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold" aria-hidden="true">
                  <img v-if="child.image_data" :src="child.image_data" alt="" class="w-full h-full object-cover">
                  <template v-else>{{ initialOf(child) }}</template>
                </span>
                <span class="min-w-0">
                  <span class="block font-medium text-white truncate">{{ child.name }}</span>
                  <span class="block text-xs text-white/70">
                    {{ child.is_teen ? 'Adolescent' : 'Enfant' }} · {{ themeStore.themeForProfile(child.id).emoji }} {{ themeStore.themeForProfile(child.id).name }}
                  </span>
                </span>
              </div>
              <div>
                <label :for="`child-theme-${child.id}`" class="sr-only">Thème de {{ child.name }}</label>
                <select
                  :id="`child-theme-${child.id}`"
                  :value="themeStore.profileThemeId(child.id) || ''"
                  class="w-full sm:w-72 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  @change="selectChildTheme(child, $event.target.value)"
                >
                  <option value="">👪 Comme la famille</option>
                  <option v-for="theme in themeStore.themes" :key="theme.id" :value="theme.id">
                    {{ theme.emoji }} {{ theme.name }}
                  </option>
                </select>
              </div>
            </li>
          </ul>
        </section>

        <!-- Retour au thème d'origine -->
        <section class="glass-card-dashboard" aria-labelledby="reset-themes-title">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="reset-themes-title" class="text-xl font-bold text-white">Thème d'origine</h2>
              <p class="text-sm text-white/70 mt-1">Remettre « Liquid Glass » pour la famille et pour tous les enfants.</p>
            </div>
            <button
              type="button"
              class="px-5 py-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all flex-shrink-0"
              @click="resetThemes"
            >
              Tout réinitialiser
            </button>
          </div>
        </section>

        <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import ThemePicker from '../components/ThemePicker.vue'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { useProfileStore } from '../stores/profileStore.js'
import { useThemeStore } from '../stores/themeStore.js'
import { describeError } from '../utils/apiErrors.js'

export default {
  name: 'ThemeSettings',
  components: { ThemePicker },
  setup() {
    const parentNav = useParentNavigation()
    const profileStore = useProfileStore()
    const themeStore = useThemeStore()
    return { parentNav, profileStore, themeStore }
  },
  data() {
    return {
      isLoadingProfiles: false,
      profilesError: '',
      statusMessage: ''
    }
  },
  computed: {
    // Profils enfant et ado actifs
    children() {
      return this.profileStore.nonAdminProfiles
    }
  },
  async created() {
    await this.loadProfiles()
  },
  methods: {
    async loadProfiles() {
      this.isLoadingProfiles = true
      this.profilesError = ''
      try {
        await this.profileStore.loadProfiles()
      } catch (error) {
        this.profilesError = describeError(error, 'Les profils n\'ont pas pu être chargés.').message
      } finally {
        this.isLoadingProfiles = false
      }
    },

    initialOf(profile) {
      return (profile.name || '?').charAt(0).toUpperCase()
    },

    selectFamilyTheme(themeId) {
      // Espace parent : le thème de la famille s'applique tout de suite (fondu enchaîné)
      this.themeStore.setFamilyTheme(themeId, { animate: true })
      this.statusMessage = `Thème de la famille : ${this.themeStore.familyTheme.name}`
    },

    selectChildTheme(child, themeId) {
      this.themeStore.setProfileTheme(child.id, themeId || null)
      this.statusMessage = `Thème de ${child.name} : ${this.themeStore.themeForProfile(child.id).name}`
    },

    async resetThemes() {
      const confirmed = await this.$confirm({
        title: 'Revenir au thème d\'origine ?',
        message: 'Toute la famille retrouvera le thème « Liquid Glass », et les thèmes choisis pour chaque enfant seront oubliés.',
        confirmLabel: 'Tout réinitialiser'
      })
      if (!confirmed) return
      this.themeStore.resetAll({ animate: true })
      this.$toast.success('Thème d\'origine rétabli')
    },

    goBack() {
      this.parentNav.goToSettings()
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

/* Piste cochée (une classe Tailwind peer-checked:… perdrait face au fond ci-dessus) */
.peer:checked ~ .toggle-track--accent {
  background: linear-gradient(to right, var(--color-purple-600, #9333ea), var(--color-pink-600, #db2777));
  border-color: transparent;
}

.peer:focus-visible ~ .toggle-track {
  outline: 2px solid var(--td-focus-ring, #a78bfa);
  outline-offset: 2px;
}

select option {
  background: var(--td-surface-option, #1e293b);
  color: white;
}
</style>
