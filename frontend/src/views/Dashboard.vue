<template>
  <div class="min-h-screen overflow-hidden">
    <DashboardHeader
      :profile="currentProfile"
      :profile-image="currentProfileImage"
      @change-profile="changeProfile"
      @logout="logout"
    >
      <template #actions>
        <!-- Cloche + panneau des notifications du parent (compteur actualisé au montage) -->
        <NotificationCenter v-if="parentProfileId" :profile-id="parentProfileId" />
      </template>
    </DashboardHeader>

    <!-- Pas de <main> imbriqué : App.vue fournit déjà le <main id="main-content"> -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="text-center mb-16">
        <h2 class="text-5xl font-bold text-white mb-4">
          Bienvenue {{ displayName }} ! 👋
        </h2>
        <p class="text-white/70 text-lg">
          Gérez l'apprentissage de votre famille
        </p>
      </div>

      <div v-if="isLoadingProfile" class="text-center py-16" role="status">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4" aria-hidden="true"></div>
        <p class="text-white/70 text-lg">Chargement du profil...</p>
      </div>

      <!-- L'accès à cette page est déjà vérifié par le router (session parent + jeton admin) -->
      <DashboardFeatureGrid v-else />
    </div>

    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { leaveParentSpace } from '../services/parentAccessService.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import VersionInfo from '../components/VersionInfo.vue'
import DashboardHeader from '../components/dashboard/DashboardHeader.vue'
import DashboardFeatureGrid from '../components/dashboard/DashboardFeatureGrid.vue'
import NotificationCenter from '../components/notifications/NotificationCenter.vue'

export default {
  name: 'Dashboard',
  components: { VersionInfo, DashboardHeader, DashboardFeatureGrid, NotificationCenter },
  setup() {
    const profileStore = useProfileStore()
    const parentNav = useParentNavigation()
    return { profileStore, parentNav }
  },
  data() {
    return {
      currentProfile: null,
      isLoadingProfile: true,
      // Profil parent de la session : destinataire des notifications
      parentProfileId: this.parentNav.getParentProfileId()
    }
  },
  computed: {
    currentProfileImage() {
      if (!this.currentProfile) return null
      return this.currentProfile.image_data || this.currentProfile.image_url || null
    },
    displayName() {
      return this.currentProfile?.name || this.parentNav.getParentProfileName() || 'Parent'
    }
  },
  async created() {
    await this.loadCurrentProfile()
  },
  methods: {
    async loadCurrentProfile() {
      // Profil parent de la session (et non un identifiant codé en dur)
      const parentId = this.parentNav.getParentProfileId()
      try {
        if (parentId) {
          this.currentProfile = await this.profileStore.loadProfile(parentId)
        }
      } catch (error) {
        // Profil indisponible (hors ligne…) : l'en-tête utilise le nom de la session
        console.warn('Profil parent indisponible:', error?.message || error)
        this.currentProfile = { id: parentId, name: this.parentNav.getParentProfileName() || 'Parent' }
      } finally {
        this.isLoadingProfile = false
      }
    },
    // Quitter l'espace parent : le jeton parent ne doit pas rester disponible
    // pour le profil enfant qui sera choisi ensuite
    changeProfile() {
      this.exitParentSpace()
    },
    logout() {
      this.exitParentSpace()
    },
    exitParentSpace() {
      // Suppression locale immédiate (jeton profil + session parent), l'appel réseau suit
      leaveParentSpace()
      this.profileStore.clearSelectedProfile()
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
@media (max-width: 640px) {
  h2 { font-size: 2rem; }
  p { font-size: 0.95rem; }
}
</style>
