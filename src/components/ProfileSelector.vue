<template>
  <div class="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
    <!-- Titre -->
    <h1 class="text-4xl font-bold text-white mb-12">Qui est-ce ?</h1>
    
    <!-- Indicateur de chargement -->
    <div v-if="isLoading" class="mb-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      <p class="mt-2 text-gray-400">Chargement des profils...</p>
    </div>

    <!-- Grille des profils -->
    <div v-else class="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12 max-w-4xl">
      <!-- Profils dynamiques -->
      <div 
        v-for="profile in profiles"
        :key="profile.id"
        @click="selectProfile(profile)"
        class="profile-card group cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="profile-image relative" :class="profile.avatar_class">
          <!-- Image réelle si disponible -->
          <div v-if="profile.image_data" class="w-full h-full rounded-lg overflow-hidden">
            <img 
              :src="profile.image_data" 
              :alt="profile.name"
              class="w-full h-full object-cover"
            >
          </div>
          <!-- Avatar par défaut sinon -->
          <div v-else class="absolute inset-0 flex items-center justify-center">
            <div v-html="profile.avatar_content"></div>
          </div>
          
          <!-- Badges de statut -->
          <div 
            v-if="profile.is_admin"
            class="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
          >
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
          <div 
            v-if="profile.is_child"
            class="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold"
          >
            jeunesse
          </div>
          <div 
            v-if="profile.is_teen"
            class="absolute -bottom-1 -right-1 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold"
          >
            adolescent
          </div>
        </div>
        <div class="profile-name">{{ profile.name }}</div>
        <div v-if="profile.is_admin" class="admin-badge">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
      </div>

      <!-- Ajouter un profil -->
      <div 
        @click="addProfile"
        class="profile-card group cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="profile-image bg-gray-700 border-2 border-dashed border-gray-500">
          <div class="absolute inset-0 flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </div>
        </div>
        <div class="profile-name text-gray-400">Ajouter un profil</div>
      </div>
    </div>

  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'ProfileSelector',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      selectedProfile: null
    }
  },
  computed: {
    profiles() {
      return this.profileStore.profiles
    },
    isLoading() {
      return this.profileStore.isLoading
    }
  },
  async mounted() {
    // Charger les profils depuis la base de données
    await this.profileStore.loadProfiles()
  },
  methods: {
    selectProfile(profile) {
      this.selectedProfile = profile
      console.log('Profil sélectionné:', profile)
      
      // Sauvegarder le profil sélectionné
      localStorage.setItem('selectedProfile', JSON.stringify(profile))
      
      // Émettre un événement vers le composant parent
      this.$emit('profile-selected', profile)
      
      // Vérifier si c'est le profil admin (nécessite un PIN)
      if (profile.is_admin) {
        this.$router.push({ path: '/pin-lock', query: { profile: profile.id } })
      } else {
        // Rediriger vers l'application principale pour les autres profils
        this.$router.push({ path: '/dashboard', query: { profile: profile.id } })
      }
    },
    
    addProfile() {
      console.log('Ajouter un nouveau profil')
      // Logique pour ajouter un nouveau profil
      this.$emit('add-profile')
    }
  }
}
</script>

<style scoped>
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.profile-image {
  width: 6rem;
  height: 6rem;
  border-radius: 0.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.profile-name {
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
  text-align: center;
}

.admin-badge {
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

/* Animation pour le hover */
.profile-card:hover .profile-image {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
