<template>
  <div id="app">
    <PullToRefresh @refresh="onPullRefresh">
      <main id="main-content" role="main">
        <router-view />
      </main>
    </PullToRefresh>

    <!-- Toasts globaux (notifications transitoires) -->
    <ToastContainer />

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
import PullToRefresh from './components/PullToRefresh.vue'
import ToastContainer from './components/ToastContainer.vue'
import OnboardingTour from './components/OnboardingTour.vue'
import { useApiStore } from './stores/apiStore.js'
import { useOnboardingStore } from './stores/onboardingStore.js'

export default {
  name: 'App',
  components: {
    PullToRefresh,
    ToastContainer,
    OnboardingTour
  },
  setup() {
    const updateService = inject('updateService')
    const apiStore = useApiStore()
    const onboardingStore = useOnboardingStore()

    return {
      updateService,
      apiStore,
      onboardingStore
    }
  },
  watch: {
    // Déclenche l'onboarding au login (ou au reload si user déjà persisté)
    'apiStore.user': {
      handler(profile) {
        if (profile) this.onboardingStore.startForProfileIfNeeded(profile)
      },
      immediate: true
    }
  },
  methods: {
    async onPullRefresh(done) {
      try {
        // Recharger la page courante via le router
        const currentRoute = this.$router.currentRoute.value
        
        // Forcer le rechargement des données en remplaçant la route
        await this.$router.replace({
          path: currentRoute.fullPath,
          force: true
        })

        // Recharger la page pour récupérer les données fraîches
        window.location.reload()
      } catch (error) {
        console.error('Erreur lors du refresh:', error)
      } finally {
        done()
      }
    }
  }
}
</script>
