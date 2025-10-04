<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <!-- Header avec navigation -->
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center space-x-4">
          <button 
            @click="goBack"
            class="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-3xl font-bold text-white">Gestion des profils</h1>
        </div>
        <div class="flex space-x-3">
          <button 
            @click="openPinSettings"
            class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span>Code PIN</span>
          </button>
          <button 
            @click="addNewProfile"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>Nouveau profil</span>
          </button>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="text-2xl font-bold text-white">{{ profiles.length }}</div>
          <div class="text-gray-400">Total profils</div>
        </div>
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="text-2xl font-bold text-green-400">{{ activeProfiles }}</div>
          <div class="text-gray-400">Profils actifs</div>
        </div>
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="text-2xl font-bold text-yellow-400">{{ childProfiles }}</div>
          <div class="text-gray-400">Profils enfants</div>
        </div>
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="text-2xl font-bold text-orange-400">{{ teenProfiles }}</div>
          <div class="text-gray-400">Profils adolescents</div>
        </div>
        <div class="bg-gray-800 p-6 rounded-lg">
          <div class="text-2xl font-bold text-blue-400">{{ adminProfiles }}</div>
          <div class="text-gray-400">Profils admin</div>
        </div>
      </div>

      <!-- Liste des profils -->
      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-700">
          <h2 class="text-xl font-semibold text-white">Liste des profils</h2>
        </div>
        
        <div class="divide-y divide-gray-700">
          <div 
            v-for="profile in profiles" 
            :key="profile.id"
            class="p-6 hover:bg-gray-750 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Avatar du profil -->
                <div class="relative">
                  <div 
                    :class="profile.avatarClass"
                    class="w-16 h-16 rounded-lg flex items-center justify-center"
                  >
                    <div v-html="profile.avatarContent"></div>
                  </div>
                  <!-- Badge de statut -->
                  <div 
                    v-if="profile.isAdmin"
                    class="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
                  >
                    <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <div 
                    v-if="profile.isChild"
                    class="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold"
                  >
                    jeunesse
                  </div>
                  <div 
                    v-if="profile.isTeen"
                    class="absolute -bottom-1 -right-1 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold"
                  >
                    adolescent
                  </div>
                </div>

                <!-- Informations du profil -->
                <div>
                  <h3 class="text-lg font-semibold text-white">{{ profile.name }}</h3>
                  <p class="text-gray-400">{{ profile.description }}</p>
                  <div class="flex items-center space-x-4 mt-2">
                    <span 
                      :class="profile.isActive ? 'text-green-400' : 'text-red-400'"
                      class="text-sm font-medium"
                    >
                      {{ profile.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                    <span class="text-gray-500 text-sm">
                      Créé le {{ formatDate(profile.createdAt) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <button 
                  @click="editProfile(profile)"
                  class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button 
                  @click="toggleProfileStatus(profile)"
                  :class="profile.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'"
                  class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  :title="profile.isActive ? 'Désactiver' : 'Activer'"
                >
                  <svg v-if="profile.isActive" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
                <button 
                  @click="deleteProfile(profile)"
                  class="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'ajout/modification de profil -->
    <div 
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="closeModal"
    >
      <div 
        class="bg-gray-800 rounded-lg max-w-md w-full p-6"
        @click.stop
      >
        <h3 class="text-xl font-semibold text-white mb-4">
          {{ editingProfile ? 'Modifier le profil' : 'Nouveau profil' }}
        </h3>
        
        <form @submit.prevent="saveProfile">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Nom</label>
              <input 
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nom du profil"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea 
                v-model="form.description"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Description du profil"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Type de profil</label>
              <select 
                v-model="form.type"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="child">Enfant</option>
                <option value="teen">Adolescent</option>
                <option value="admin">Parent/Admin</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Couleur du profil</label>
              <div class="grid grid-cols-4 gap-2">
                <button 
                  v-for="color in profileColors"
                  :key="color.name"
                  @click="form.color = color.name"
                  :class="[
                    'w-12 h-12 rounded-lg border-2 transition-all',
                    color.class,
                    form.color === color.name ? 'border-white ring-2 ring-white' : 'border-gray-600'
                  ]"
                  type="button"
                ></button>
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button 
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {{ editingProfile ? 'Modifier' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProfileManagement',
  data() {
    return {
      showModal: false,
      editingProfile: null,
      form: {
        name: '',
        description: '',
        type: 'child',
        color: 'purple'
      },
      profileColors: [
        { name: 'purple', class: 'bg-gradient-to-br from-purple-500 to-pink-500' },
        { name: 'blue', class: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
        { name: 'green', class: 'bg-gradient-to-br from-green-500 to-emerald-500' },
        { name: 'red', class: 'bg-gradient-to-br from-red-500 to-orange-500' },
        { name: 'yellow', class: 'bg-gradient-to-br from-yellow-500 to-orange-500' },
        { name: 'indigo', class: 'bg-gradient-to-br from-indigo-500 to-purple-500' },
        { name: 'teal', class: 'bg-gradient-to-br from-teal-500 to-blue-500' },
        { name: 'pink', class: 'bg-gradient-to-br from-pink-500 to-rose-500' }
      ],
      profiles: [
        {
          id: 1,
          name: 'Parent',
          description: 'Profil administrateur avec accès complet',
          type: 'admin',
          isAdmin: true,
          isChild: false,
          isTeen: false,
          isActive: true,
          color: 'teal',
          avatarClass: 'bg-gradient-to-br from-teal-400 to-blue-500',
          avatarContent: `
            <div class="relative">
              <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9v1H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5z"/>
              </svg>
            </div>
          `,
          createdAt: new Date('2024-01-01')
        },
        {
          id: 2,
          name: 'Ayna',
          description: 'Profil enfant - Accès limité',
          type: 'child',
          isAdmin: false,
          isChild: true,
          isTeen: false,
          isActive: true,
          color: 'purple',
          avatarClass: 'bg-gradient-to-br from-purple-500 to-pink-500',
          avatarContent: `
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div class="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <div class="w-6 h-6 bg-gray-800 rounded-full"></div>
                </div>
              </div>
            </div>
          `,
          createdAt: new Date('2024-01-15')
        },
        {
          id: 3,
          name: 'Nolann',
          description: 'Profil enfant - Accès limité',
          type: 'child',
          isAdmin: false,
          isChild: true,
          isTeen: false,
          isActive: true,
          color: 'red',
          avatarClass: 'bg-gradient-to-br from-red-500 to-blue-500',
          avatarContent: `
            <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <div class="w-12 h-12 bg-gray-300 rounded flex flex-col items-center justify-center">
                <div class="w-8 h-2 bg-blue-500 rounded mb-1"></div>
                <div class="w-6 h-4 bg-red-500 rounded"></div>
              </div>
            </div>
          `,
          createdAt: new Date('2024-01-20')
        },
        {
          id: 4,
          name: 'Elyo',
          description: 'Profil enfant - Accès limité',
          type: 'child',
          isAdmin: false,
          isChild: true,
          isTeen: false,
          isActive: true,
          color: 'green',
          avatarClass: 'bg-gradient-to-br from-green-400 to-emerald-500',
          avatarContent: `
            <div class="w-16 h-16 bg-green-300 rounded-full flex items-center justify-center">
              <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-2 left-2 w-2 h-2 bg-white rounded-full"></div>
                <div class="absolute top-2 right-2 w-2 h-2 bg-white rounded-full"></div>
                <div class="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                <div class="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded-full"></div>
              </div>
            </div>
          `,
          createdAt: new Date('2024-01-25')
        },
        {
          id: 5,
          name: 'Lucas',
          description: 'Profil adolescent - Accès modéré',
          type: 'teen',
          isAdmin: false,
          isChild: false,
          isTeen: true,
          isActive: true,
          color: 'orange',
          avatarClass: 'bg-gradient-to-br from-orange-500 to-red-500',
          avatarContent: `
            <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <div class="w-12 h-12 bg-orange-300 rounded-lg flex items-center justify-center">
                <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center relative">
                  <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                  <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                  <div class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          `,
          createdAt: new Date('2024-02-01')
        }
      ]
    }
  },
  computed: {
    activeProfiles() {
      return this.profiles.filter(p => p.isActive).length
    },
    childProfiles() {
      return this.profiles.filter(p => p.isChild).length
    },
    teenProfiles() {
      return this.profiles.filter(p => p.isTeen).length
    },
    adminProfiles() {
      return this.profiles.filter(p => p.isAdmin).length
    }
  },
  methods: {
    goBack() {
      this.$router.push('/')
    },
    openPinSettings() {
      this.$router.push('/pin-settings')
    },
    addNewProfile() {
      this.editingProfile = null
      this.form = {
        name: '',
        description: '',
        type: 'child',
        color: 'purple'
      }
      this.showModal = true
    },
    editProfile(profile) {
      this.editingProfile = profile
      this.form = {
        name: profile.name,
        description: profile.description,
        type: profile.type,
        color: profile.color
      }
      this.showModal = true
    },
    saveProfile() {
      if (this.editingProfile) {
        // Modifier le profil existant
        const index = this.profiles.findIndex(p => p.id === this.editingProfile.id)
        this.profiles[index] = {
          ...this.profiles[index],
          name: this.form.name,
          description: this.form.description,
          type: this.form.type,
          isAdmin: this.form.type === 'admin',
          isChild: this.form.type === 'child',
          isTeen: this.form.type === 'teen',
          color: this.form.color
        }
      } else {
        // Créer un nouveau profil
        const newProfile = {
          id: Date.now(),
          name: this.form.name,
          description: this.form.description,
          type: this.form.type,
          isAdmin: this.form.type === 'admin',
          isChild: this.form.type === 'child',
          isTeen: this.form.type === 'teen',
          isActive: true,
          color: this.form.color,
          avatarClass: this.getAvatarClass(this.form.color),
          avatarContent: this.getAvatarContent(this.form.type),
          createdAt: new Date()
        }
        this.profiles.push(newProfile)
      }
      this.closeModal()
    },
    toggleProfileStatus(profile) {
      profile.isActive = !profile.isActive
    },
    deleteProfile(profile) {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profile.name}" ?`)) {
        const index = this.profiles.findIndex(p => p.id === profile.id)
        this.profiles.splice(index, 1)
      }
    },
    closeModal() {
      this.showModal = false
      this.editingProfile = null
    },
    formatDate(date) {
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date)
    },
    getAvatarClass(color) {
      const colorMap = {
        purple: 'bg-gradient-to-br from-purple-500 to-pink-500',
        blue: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        green: 'bg-gradient-to-br from-green-500 to-emerald-500',
        red: 'bg-gradient-to-br from-red-500 to-orange-500',
        yellow: 'bg-gradient-to-br from-yellow-500 to-orange-500',
        indigo: 'bg-gradient-to-br from-indigo-500 to-purple-500',
        teal: 'bg-gradient-to-br from-teal-500 to-blue-500',
        pink: 'bg-gradient-to-br from-pink-500 to-rose-500'
      }
      return colorMap[color] || colorMap.purple
    },
    getAvatarContent(type) {
      if (type === 'admin') {
        return `
          <div class="relative">
            <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9v1H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5z"/>
            </svg>
          </div>
        `
      } else if (type === 'teen') {
        return `
          <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
            <div class="w-12 h-12 bg-orange-300 rounded-lg flex items-center justify-center">
              <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center relative">
                <!-- Yeux -->
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <!-- Sourire -->
                <div class="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        `
      } else {
        return `
          <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <div class="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div class="w-6 h-6 bg-gray-800 rounded-full"></div>
              </div>
            </div>
          </div>
        `
      }
    }
  }
}
</script>

<style scoped>
.hover\:bg-gray-750:hover {
  background-color: rgb(55 65 81);
}
</style>
