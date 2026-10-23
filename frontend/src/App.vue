<template>
  <div id="app">
    <!-- Lien d'évitement : premier élément atteint au clavier, visible seulement au focus -->
    <a href="#main-content" class="skip-link">Aller au contenu</a>

    <!-- Fond animé partagé (un seul pour toute l'application) -->
    <AppBackground :tone="backgroundTone" />

    <!-- Bandeau hors ligne -->
    <OfflineBanner />

    <PullToRefresh :disabled="isPullToRefreshDisabled" @refresh="onPullRefresh">
      <main id="main-content" tabindex="-1">
        <!-- La clé force le remontage de la page courante lors d'un « tirer pour actualiser » -->
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="refreshKey" />
        </router-view>
      </main>
    </PullToRefresh>

    <!-- Toasts globaux (notifications transitoires) -->
    <ToastContainer />

    <!-- Confirmations (remplace window.confirm) -->
    <ConfirmDialog />

    <!-- Onboarding 1er login enfant/ado -->
    <OnboardingTour />

    <!-- Popup de mise à jour globale -->
    <UpdateNotification
      :show="updateService.state.showNotification"
      :current-version="updateService.state.currentVersion"
      :new-version="updateService.state.newVersion"
      @update="updateService.forceUpdate"
      @cancel="updateService.cancelUpdate"
    />
  </div>
</template>

<script>
import { inject } from 'vue'
import AppBackground from './components/AppBackground.vue'
import OfflineBanner from './components/OfflineBanner.vue'
import PullToRefresh from './components/PullToRefresh.vue'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import OnboardingTour from './components/OnboardingTour.vue'
import { useProfileStore } from './stores/profileStore.js'
import { useOnboardingStore } from './stores/onboardingStore.js'
import { useSettingsStore, resolveActiveChildProfileId } from './stores/settingsStore.js'

export default {
  name: 'App',
  components: {
    AppBackground,
    OfflineBanner,
    PullToRefresh,
    ToastContainer,
    ConfirmDialog,
    OnboardingTour
  },
  setup() {
    const updateService = inject('updateService')
    const profileStore = useProfileStore()
    const onboardingStore = useOnboardingStore()
    const settingsStore = useSettingsStore()

    return {
      updateService,
      profileStore,
      onboardingStore,
      settingsStore
    }
  },
  data() {
    return {
      refreshKey: 0
    }
  },
  computed: {
    // Profil enfant/ado sélectionné, uniquement lorsqu'on est dans son espace
    onboardingProfile() {
      const profile = this.profileStore.selectedProfile
      const route = this.$route
      if (!profile || !route?.meta?.requiresChildOrTeen) return null
      return profile
    },
    // Profil enfant dont les préférences d'affichage s'appliquent (null hors espace enfant)
    activeChildProfileId() {
      return resolveActiveChildProfileId(this.$route, this.profileStore.selectedProfile)
    },
    // Couleur préférée de l'enfant, sinon teinte propre à la page
    backgroundTone() {
      return this.settingsStore.activeSettings.theme || this.$route?.meta?.bgTone || 'purple'
    },
    isPullToRefreshDisabled() {
      return !!this.$route?.meta?.disablePullToRefresh
    }
  },
  watch: {
    // Déclenche l'onboarding à l'arrivée d'un enfant/ado dans son espace
    onboardingProfile: {
      handler(profile) {
        if (profile) this.onboardingStore.startForProfileIfNeeded(profile)
      },
      immediate: true
    },
    // Appliquer les préférences du profil actif (ou les valeurs par défaut)
    activeChildProfileId: {
      handler(profileId) {
        this.settingsStore.setActiveProfile(profileId)
      },
      immediate: true
    }
  },
  methods: {
    async onPullRefresh(done) {
      try {
        // Données fraîches : oublier le cache des profils puis remonter la page courante
        // (ses hooks de chargement s'exécutent à nouveau, sans recharger toute l'application)
        this.profileStore.invalidateCache()
        this.refreshKey++
        await this.$nextTick()
      } finally {
        done()
      }
    }
  }
}
</script>

<style>
/* Lien d'évitement « Aller au contenu » : hors écran tant qu'il n'a pas le focus clavier */
.skip-link {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10001;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background: #1e1b4b;
  color: #fff;
  font-weight: 600;
  transform: translateY(-200%);
  transition: transform 0.15s ease;
}

.skip-link:focus {
  transform: translateY(0);
}

/* Cible du lien d'évitement : focus programmatique sans contour */
#main-content:focus {
  outline: none;
}
</style>
