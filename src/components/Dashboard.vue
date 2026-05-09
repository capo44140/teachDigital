<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <DashboardHeader
      :profile="currentProfile"
      :profile-image="currentProfileImage"
      @change-profile="changeProfile"
      @logout="logout"
    />

    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="text-center mb-16">
        <h2 class="text-5xl font-bold text-white mb-4">
          Bienvenue {{ currentProfile?.name || 'Administrateur' }} ! 👋
        </h2>
        <p class="text-white/60 text-lg">
          {{ currentProfile?.welcomeMessage || 'Gérez l\'apprentissage de votre famille' }}
        </p>
      </div>

      <div v-if="isLoadingProfile" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4"></div>
        <p class="text-white/60 text-lg">Chargement du profil...</p>
      </div>

      <div v-else-if="currentProfile && (currentProfile.isAdmin || currentProfile.name === 'Parent' || currentProfile.id === '1' || currentProfile.id === 1)">
        <DashboardFeatureGrid :profile-id="$route.query.profile || '1'" />
      </div>
    </main>

    <VersionInfo position="bottom-right" />
    <MigrationControl />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import VersionInfo from './VersionInfo.vue'
import MigrationControl from './MigrationControl.vue'
import DashboardHeader from './DashboardHeader.vue'
import DashboardFeatureGrid from './DashboardFeatureGrid.vue'

export default {
  name: 'Dashboard',
  components: { VersionInfo, MigrationControl, DashboardHeader, DashboardFeatureGrid },
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      profiles: {
        parent: {
          name: 'Parent',
          initial: 'P',
          bgColor: 'bg-teal-500',
          isAdmin: true,
          welcomeMessage: 'Gérez l\'apprentissage de votre famille',
          courses: []
        }
      },
      currentProfile: null
    }
  },
  computed: {
    currentProfileImage() {
      if (!this.currentProfile) return null
      return this.currentProfile.image_data || this.currentProfile.image_url || null
    },
    isLoadingProfile() {
      return !this.currentProfile
    }
  },
  async created() {
    await this.loadCurrentProfile()
    if (!this.currentProfile) {
      this.currentProfile = this.profiles.parent
    }
    if (this.currentProfile && (this.currentProfile.name === 'Parent' || this.currentProfile.id === '1' || this.currentProfile.id === 1)) {
      this.currentProfile.isAdmin = true
    }
  },
  methods: {
    async loadCurrentProfile() {
      try {
        const profileId = this.$route.query.profile
        if (profileId) {
          await this.profileStore.loadProfile(profileId)
          this.currentProfile = this.profileStore.currentProfile
          if (!this.currentProfile) {
            this.currentProfile = this.profiles.parent
          }
        } else {
          this.currentProfile = this.profiles.parent
        }
        if (this.currentProfile && (this.currentProfile.name === 'Parent' || this.currentProfile.id === '1' || this.currentProfile.id === 1)) {
          this.currentProfile.isAdmin = true
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
        this.currentProfile = this.profiles.parent
      }
    },
    changeProfile() {
      this.$router.push('/')
    },
    logout() {
      sessionService.clearSession()
      localStorage.removeItem('selectedProfile')
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
