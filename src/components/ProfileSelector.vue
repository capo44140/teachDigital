<template>
  <div class="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
    <!-- Titre -->
    <h1 class="text-4xl font-bold text-white mb-12">Qui est-ce ?</h1>
    
    <!-- Grille des profils -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12 max-w-4xl">
      <!-- Profil Parent (Admin) -->
      <div 
        @click="selectProfile('parent')"
        class="profile-card group cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="profile-image bg-gradient-to-br from-teal-400 to-blue-500 relative">
          <div class="absolute inset-0 flex items-center justify-center">
            <!-- Icône main avec cadenas -->
            <div class="relative">
              <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9v1H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5z"/>
              </svg>
              <!-- Cadenas admin -->
              <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div class="profile-name">Parent</div>
        <div class="admin-badge">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
      </div>

      <!-- Profil Ayna -->
      <div 
        @click="selectProfile('ayna')"
        class="profile-card group cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="profile-image bg-gradient-to-br from-purple-500 to-pink-500">
          <div class="absolute inset-0 flex items-center justify-center">
            <!-- Avatar Wednesday Addams style -->
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div class="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <div class="w-6 h-6 bg-gray-800 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="profile-name">Ayna</div>
      </div>

      <!-- Profil Nolann -->
      <div 
        @click="selectProfile('nolann')"
        class="profile-card group cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="profile-image bg-gradient-to-br from-red-500 to-blue-500 relative">
          <div class="absolute inset-0 flex items-center justify-center">
            <!-- Robot avatar -->
            <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <div class="w-12 h-12 bg-gray-300 rounded flex flex-col items-center justify-center">
                <div class="w-8 h-2 bg-blue-500 rounded mb-1"></div>
                <div class="w-6 h-4 bg-red-500 rounded"></div>
              </div>
            </div>
          </div>
          <!-- Badge Jeunesse -->
          <div class="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            jeunesse
          </div>
        </div>
        <div class="profile-name">Nolann</div>
      </div>

      <!-- Profil Elyo -->
      <div 
        @click="selectProfile('elyo')"
        class="profile-card group cursor-pointer transform transition-all duration-300 hover:scale-105"
      >
        <div class="profile-image bg-gradient-to-br from-green-400 to-emerald-500 relative">
          <div class="absolute inset-0 flex items-center justify-center">
            <!-- Personnage vert amorphe -->
            <div class="w-16 h-16 bg-green-300 rounded-full flex items-center justify-center">
              <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center relative">
                <!-- Yeux -->
                <div class="absolute top-2 left-2 w-2 h-2 bg-white rounded-full"></div>
                <div class="absolute top-2 right-2 w-2 h-2 bg-white rounded-full"></div>
                <div class="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                <!-- Sourire -->
                <div class="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
          <!-- Badge Jeunesse -->
          <div class="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
            jeunesse
          </div>
        </div>
        <div class="profile-name">Elyo</div>
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

    <!-- Bouton Gérer les profils -->
    <button 
      @click="manageProfiles"
      class="px-8 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-gray-900 transition-all duration-300 font-semibold"
    >
      Gérer les profils
    </button>
  </div>
</template>

<script>
export default {
  name: 'ProfileSelector',
  data() {
    return {
      selectedProfile: null
    }
  },
  methods: {
    selectProfile(profile) {
      this.selectedProfile = profile
      console.log('Profil sélectionné:', profile)
      
      // Sauvegarder le profil sélectionné
      localStorage.setItem('selectedProfile', profile)
      
      // Émettre un événement vers le composant parent
      this.$emit('profile-selected', profile)
      
      // Vérifier si c'est le profil parent (nécessite un PIN)
      if (profile === 'parent') {
        this.$router.push({ path: '/pin-lock', query: { profile: profile } })
      } else {
        // Rediriger vers l'application principale pour les autres profils
        this.$router.push({ path: '/dashboard', query: { profile: profile } })
      }
    },
    
    addProfile() {
      console.log('Ajouter un nouveau profil')
      // Logique pour ajouter un nouveau profil
      this.$emit('add-profile')
    },
    
    manageProfiles() {
      console.log('Gérer les profils')
      // Rediriger vers la page de gestion des profils
      this.$router.push('/manage-profiles')
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
