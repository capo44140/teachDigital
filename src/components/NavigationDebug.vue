<template>
  <div class="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm max-w-sm">
    <h3 class="font-bold mb-2">🐛 Debug Navigation</h3>
    <div class="space-y-1">
      <div><strong>Route actuelle:</strong> {{ $route.path }}</div>
      <div><strong>Profil ID:</strong> {{ currentProfileId || 'Aucun' }}</div>
      <div><strong>Profil chargé:</strong> {{ currentProfile ? 'Oui' : 'Non' }}</div>
      <div v-if="currentProfile">
        <div><strong>Nom:</strong> {{ currentProfile.name }}</div>
        <div><strong>Type:</strong> 
          <span v-if="currentProfile.is_admin" class="text-red-400">Admin</span>
          <span v-else-if="currentProfile.is_teen" class="text-orange-400">Teen</span>
          <span v-else-if="currentProfile.is_child" class="text-green-400">Enfant</span>
          <span v-else class="text-gray-400">Autre</span>
        </div>
      </div>
      <div><strong>localStorage:</strong> {{ localStorageProfile || 'Vide' }}</div>
    </div>
    <button 
      class="mt-2 px-2 py-1 bg-blue-600 rounded text-xs"
      @click="toggleDebug"
    >
      {{ showDebug ? 'Masquer' : 'Afficher' }}
    </button>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'NavigationDebug',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      showDebug: true,
      currentProfileId: null,
      currentProfile: null,
      localStorageProfile: null
    }
  },
  async mounted() {
    await this.updateDebugInfo()
    // Mettre à jour toutes les secondes
    setInterval(this.updateDebugInfo, 1000)
  },
  methods: {
    async updateDebugInfo() {
      // Récupérer l'ID du profil depuis l'URL ou localStorage
      this.currentProfileId = this.$route.query.profile
      
      if (!this.currentProfileId) {
        const storedProfile = localStorage.getItem('selectedProfile')
        if (storedProfile) {
          try {
            const parsedProfile = JSON.parse(storedProfile)
            this.currentProfileId = parsedProfile.id
            this.localStorageProfile = parsedProfile.name
          } catch (error) {
            this.localStorageProfile = 'Erreur parsing'
          }
        }
      }
      
      // Charger le profil complet
      if (this.currentProfileId) {
        try {
          await this.profileStore.loadProfiles()
          this.currentProfile = this.profileStore.getProfileById(this.currentProfileId)
        } catch (error) {
          console.error('Erreur lors du chargement du profil:', error)
        }
      }
    },
    
    toggleDebug() {
      this.showDebug = !this.showDebug
    }
  }
}
</script>

<style scoped>
/* Styles pour le composant de debug */
</style>
