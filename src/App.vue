<template>
  <div id="app">
    <PullToRefresh @refresh="onPullRefresh">
      <main id="main-content" role="main">
        <router-view />
      </main>
    </PullToRefresh>
    
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

export default {
  name: 'App',
  components: {
    PullToRefresh
  },
  setup() {
    const updateService = inject('updateService')
    
    return {
      updateService
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
