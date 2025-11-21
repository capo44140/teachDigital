<template>
  <div class="min-h-screen bg-white">
    <!-- En-tête -->
    <header class="bg-gray-100 px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo TeachDigital -->
        <div class="flex items-center space-x-4">
          <button 
            class="p-2 hover:bg-gray-200 rounded-full transition-colors"
            @click="goBack"
          >
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-2xl font-bold text-red-600">TeachDigital</h1>
        </div>
        
        <!-- Menu utilisateur -->
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="max-w-2xl mx-auto px-6 py-8">
      <!-- Titre principal -->
      <h2 class="text-3xl font-bold text-black text-center mb-8">Gérez votre profil et vos préférences</h2>

      <!-- Section du profil -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <!-- Informations du profil -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div 
                :class="profile.avatarClass"
                class="w-12 h-12 rounded-lg flex items-center justify-center"
              >
                <div v-html="profile.avatarContent"></div>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-black">{{ profile.name }}</h3>
                <p class="text-sm text-gray-500">Modifiez vos informations personnelles et de contact</p>
              </div>
            </div>
            <button 
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              @click="goToEditProfile"
            >
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Verrouillage du profil -->
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-black">Verrouillage du profil</h3>
                <p class="text-sm text-gray-500">Exigez un code PIN pour accéder à ce profil</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="profile.isLocked"
                  type="checkbox"
                  class="sr-only peer"
                  @change="toggleProfileLock"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
              <button 
                class="p-2 hover:bg-gray-100 rounded-full transition-colors"
                @click="goToPinSettings"
              >
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section paramètres avancés -->
      <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
        <!-- Paramètres de confidentialité -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-black">Paramètres de confidentialité</h3>
                <p class="text-sm text-gray-500">Contrôlez qui peut voir vos informations</p>
              </div>
            </div>
            <button 
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              @click="goToPrivacySettings"
            >
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Paramètres de notifications -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-black">Notifications</h3>
                <p class="text-sm text-gray-500">Gérez vos préférences de notifications</p>
              </div>
            </div>
            <button 
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              @click="goToNotificationSettings"
            >
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Paramètres de l'application -->
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-black">Paramètres de l'application</h3>
                <p class="text-sm text-gray-500">Personnalisez votre expérience</p>
              </div>
            </div>
            <button 
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              @click="goToAppSettings"
            >
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProfileSettings',
  data() {
    return {
      profile: {
        id: 1,
        name: 'Elyo',
        isLocked: false,
        avatarClass: 'bg-gradient-to-br from-green-400 to-emerald-500',
        avatarContent: `
          <div class="w-12 h-12 bg-green-300 rounded-full flex items-center justify-center">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center relative">
              <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
            </div>
          </div>
        `
      }
    }
  },
  mounted() {
    this.loadProfile()
  },
  methods: {
    loadProfile() {
      // Charger les données du profil depuis l'URL ou le store
      const profileId = this.$route.params.id
      if (profileId) {
        console.log('Chargement des paramètres du profil:', profileId)
      }
    },
    
    goBack() {
      this.$router.push({ 
        path: '/manage-profiles',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    
    goToEditProfile() {
      this.$router.push({ 
        path: `/edit-profile/${this.profile.id}`,
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    
    goToPinSettings() {
      this.$router.push('/pin-settings')
    },
    
    toggleProfileLock() {
      console.log('Verrouillage du profil:', this.profile.isLocked)
      // Ici, vous pourriez sauvegarder le statut de verrouillage
    },
    
    goToPrivacySettings() {
      // Rediriger vers les paramètres de confidentialité
      console.log('Redirection vers les paramètres de confidentialité')
    },
    
    goToNotificationSettings() {
      // Rediriger vers les paramètres de notifications
      console.log('Redirection vers les paramètres de notifications')
    },
    
    goToAppSettings() {
      // Rediriger vers les paramètres de l'application
      console.log('Redirection vers les paramètres de l\'application')
    }
  }
}
</script>

<style scoped>
/* Styles personnalisés pour l'interface Netflix-like */
.peer:checked ~ .peer-checked\:after\:translate-x-full:after {
  transform: translateX(100%);
}

button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.98);
}
</style>
