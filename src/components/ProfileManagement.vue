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

      <!-- Messages d'erreur -->
      <div v-if="error" class="mb-6 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          {{ error }}
        </div>
      </div>

      <!-- Liste des profils -->
      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-700">
          <h2 class="text-xl font-semibold text-white">Liste des profils</h2>
        </div>
        
        <!-- Indicateur de chargement -->
        <div v-if="isLoading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p class="mt-2 text-gray-400">Chargement des profils...</p>
        </div>

        <!-- Liste des profils -->
        <div v-else class="divide-y divide-gray-700">
          <div 
            v-for="profile in profiles" 
            :key="profile.id"
            class="p-6 hover:bg-gray-750 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Avatar du profil -->
                <div class="relative">
                  <!-- Image réelle si disponible -->
                  <div v-if="profile.image_data" class="w-16 h-16 rounded-lg overflow-hidden">
                    <img 
                      :src="profile.image_data" 
                      :alt="profile.name"
                      class="w-full h-full object-cover"
                    >
                  </div>
                  <!-- Avatar par défaut sinon -->
                  <div 
                    v-else
                    :class="profile.avatar_class"
                    class="w-16 h-16 rounded-lg flex items-center justify-center"
                  >
                    <div v-html="profile.avatar_content"></div>
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

                <!-- Informations du profil -->
                <div>
                  <h3 class="text-lg font-semibold text-white">{{ profile.name }}</h3>
                  <p class="text-gray-400">{{ profile.description }}</p>
                  <div class="flex items-center space-x-4 mt-2">
                    <span 
                      :class="profile.is_active ? 'text-green-400' : 'text-red-400'"
                      class="text-sm font-medium"
                    >
                      {{ profile.is_active ? 'Actif' : 'Inactif' }}
                    </span>
                    <span v-if="profile.level" class="text-blue-400 text-sm font-medium">
                      {{ profile.level }}
                    </span>
                    <span class="text-gray-500 text-sm">
                      Créé le {{ formatDate(profile.created_at) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <button 
                  @click="manageImage(profile)"
                  class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Gérer l'image"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </button>
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
                  :class="profile.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'"
                  class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  :title="profile.is_active ? 'Désactiver' : 'Activer'"
                >
                  <svg v-if="profile.is_active" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <!-- Modal de gestion d'image -->
    <div 
      v-if="showImageModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="closeImageModal"
    >
      <div 
        class="bg-gray-800 rounded-lg max-w-md w-full p-6"
        @click.stop
      >
        <h3 class="text-xl font-semibold text-white mb-4">
          Gérer l'image de {{ selectedProfile?.name }}
        </h3>
        
        <div class="flex justify-center mb-6">
          <ImageUpload
            :profile-id="selectedProfile?.id"
            :current-image="selectedProfile?.image_data"
            :alt-text="`Image de ${selectedProfile?.name}`"
            size="large"
            @image-uploaded="onImageUploaded"
            @image-removed="onImageRemoved"
            @upload-error="onUploadError"
          />
        </div>

        <div class="flex justify-end space-x-3">
          <button 
            @click="closeImageModal"
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Fermer
          </button>
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

            <div v-if="form.type !== 'admin'">
              <label class="block text-sm font-medium text-gray-300 mb-2">Niveau</label>
              <select 
                v-model="form.level"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un niveau</option>
                <option value="CP">CP (6 ans)</option>
                <option value="CE1">CE1 (7 ans)</option>
                <option value="CE2">CE2 (8 ans)</option>
                <option value="CM1">CM1 (9 ans)</option>
                <option value="CM2">CM2 (10 ans)</option>
                <option value="6ème">6ème (11 ans)</option>
                <option value="5ème">5ème (12 ans)</option>
                <option value="4ème">4ème (13 ans)</option>
                <option value="3ème">3ème (14 ans)</option>
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
import { useProfileStore } from '../stores/profileStore.js'
import ImageUpload from './ImageUpload.vue'

export default {
  name: 'ProfileManagement',
  components: {
    ImageUpload
  },
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      showModal: false,
      showImageModal: false,
      editingProfile: null,
      selectedProfile: null,
      form: {
        name: '',
        description: '',
        type: 'child',
        color: 'purple',
        level: ''
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
      ]
    }
  },
  computed: {
    profiles() {
      return this.profileStore.profiles
    },
    activeProfiles() {
      return this.profileStore.stats.active
    },
    childProfiles() {
      return this.profileStore.stats.children
    },
    teenProfiles() {
      return this.profileStore.stats.teens
    },
    adminProfiles() {
      return this.profileStore.stats.admins
    },
    isLoading() {
      return this.profileStore.isLoading
    },
    error() {
      return this.profileStore.error
    }
  },
  async mounted() {
    // Charger les profils depuis la base de données
    await this.profileStore.loadProfiles()
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
        color: 'purple',
        level: ''
      }
      this.showModal = true
    },
    editProfile(profile) {
      // Rediriger vers la page de modification de profil
      this.$router.push(`/edit-profile/${profile.id}`)
    },
    async saveProfile() {
      try {
        if (this.editingProfile) {
          // Modifier le profil existant
          await this.profileStore.updateProfile(this.editingProfile.id, {
            name: this.form.name,
            description: this.form.description,
            type: this.form.type,
            color: this.form.color,
            level: this.form.level,
            avatarClass: this.getAvatarClass(this.form.color),
            avatarContent: this.getAvatarContent(this.form.type)
          })
        } else {
          // Créer un nouveau profil
          await this.profileStore.createProfile({
            name: this.form.name,
            description: this.form.description,
            type: this.form.type,
            color: this.form.color,
            level: this.form.level,
            avatarClass: this.getAvatarClass(this.form.color),
            avatarContent: this.getAvatarContent(this.form.type)
          })
        }
        this.closeModal()
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error)
        // L'erreur sera affichée via le store
      }
    },
    async toggleProfileStatus(profile) {
      try {
        await this.profileStore.toggleProfileStatus(profile.id)
      } catch (error) {
        console.error('Erreur lors du basculement du statut:', error)
      }
    },
    async deleteProfile(profile) {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profile.name}" ?`)) {
        try {
          await this.profileStore.deleteProfile(profile.id)
        } catch (error) {
          console.error('Erreur lors de la suppression du profil:', error)
        }
      }
    },
    closeModal() {
      this.showModal = false
      this.editingProfile = null
    },
    manageImage(profile) {
      this.selectedProfile = profile
      this.showImageModal = true
    },
    closeImageModal() {
      this.showImageModal = false
      this.selectedProfile = null
    },
    onImageUploaded(imageData) {
      // Mettre à jour le profil dans la liste
      const index = this.profiles.findIndex(p => p.id === this.selectedProfile.id)
      if (index !== -1) {
        this.profiles[index].image_data = imageData.imageData
        this.profiles[index].image_type = imageData.imageType
      }
      console.log('✅ Image mise à jour avec succès')
    },
    onImageRemoved() {
      // Supprimer l'image du profil dans la liste
      const index = this.profiles.findIndex(p => p.id === this.selectedProfile.id)
      if (index !== -1) {
        this.profiles[index].image_data = null
        this.profiles[index].image_type = null
      }
      console.log('✅ Image supprimée avec succès')
    },
    onUploadError(error) {
      console.error('❌ Erreur lors de l\'upload:', error)
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
