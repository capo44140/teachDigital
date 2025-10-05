<template>
  <div class="min-h-screen bg-white">
    <!-- En-tête -->
    <header class="bg-gray-100 px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo TeachDigital -->
        <div class="flex items-center space-x-4">
          <button 
            @click="goBack"
            class="p-2 hover:bg-gray-200 rounded-full transition-colors"
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
      <h2 class="text-3xl font-bold text-black text-center mb-8">Modifiez votre profil</h2>

      <!-- Section de modification du profil -->
      <div class="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <!-- Avatar et nom -->
        <div class="flex items-center space-x-6 mb-8">
          <!-- Avatar -->
          <div class="relative">
            <div 
              :class="profile.avatar_class"
              class="w-24 h-24 rounded-lg flex items-center justify-center relative"
            >
              <div v-html="profile.avatar_content"></div>
              
              <!-- Badge de type de profil -->
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
              
              <!-- Icône de modification -->
              <div class="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                   @click="changeAvatar">
                <svg class="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Champ de saisie du nom -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-500 mb-2">Nom</label>
            <input 
              v-model="profile.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
              placeholder="Nom du profil"
            >
          </div>
        </div>

        <!-- Champ de description -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-500 mb-2">Description</label>
          <textarea 
            v-model="profile.description"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows="3"
            placeholder="Description du profil"
          ></textarea>
        </div>

        <!-- Champ de niveau (seulement pour les enfants et adolescents) -->
        <div v-if="profile.type !== 'admin'" class="mb-6">
          <label class="block text-sm font-medium text-gray-500 mb-2">Niveau</label>
          <select 
            v-model="profile.level"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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

        <!-- Champ de statut de verrouillage -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-500 mb-2">Statut du profil</label>
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <input 
                v-model="profile.is_active"
                type="checkbox"
                id="is_active"
                class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              >
              <label for="is_active" class="text-sm text-gray-700">Profil actif</label>
            </div>
            <div class="flex items-center space-x-2">
              <input 
                v-model="profile.is_locked"
                type="checkbox"
                id="is_locked"
                class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              >
              <label for="is_locked" class="text-sm text-gray-700">Profil verrouillé</label>
            </div>
          </div>
        </div>

        <!-- Boutons d'action -->
        <div class="space-y-4">
          <!-- Bouton Enregistrer -->
          <button 
            @click="saveProfile"
            class="w-full bg-black text-white py-3 px-6 rounded-md font-medium hover:bg-gray-800 transition-colors"
          >
            Enregistrer
          </button>
          
          <!-- Bouton Annuler -->
          <button 
            @click="cancelEdit"
            class="w-full text-black py-2 px-6 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          
          <!-- Bouton Supprimer le profil -->
          <button 
            @click="deleteProfile"
            class="w-full text-red-600 py-2 px-6 rounded-md font-medium hover:bg-red-50 transition-colors"
          >
            Supprimer le profil
          </button>
        </div>
      </div>

      <!-- Section paramètres du profil -->
      <div class="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm">
        <!-- Paramètres du profil -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div 
                :class="profile.avatar_class"
                class="w-12 h-12 rounded-lg flex items-center justify-center"
              >
                <div v-html="profile.avatar_content"></div>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-black">{{ profile.name }}</h3>
                <p class="text-sm text-gray-500">Modifiez vos informations personnelles et de contact</p>
              </div>
            </div>
            <button 
              @click="goToProfileSettings"
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de changement d'avatar -->
    <div 
      v-if="showAvatarModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="closeAvatarModal"
    >
      <div 
        class="bg-white rounded-lg max-w-md w-full p-6"
        @click.stop
      >
        <h3 class="text-xl font-semibold text-black mb-4">Choisir un avatar</h3>
        
        <div class="grid grid-cols-4 gap-4 mb-6">
          <button 
            v-for="avatar in availableAvatars"
            :key="avatar.id"
            @click="selectAvatar(avatar)"
            :class="[
              'w-16 h-16 rounded-lg flex items-center justify-center transition-all',
              avatar.class,
              selectedAvatar?.id === avatar.id ? 'ring-4 ring-red-500' : 'hover:scale-105'
            ]"
          >
            <div v-html="avatar.content"></div>
          </button>
        </div>

        <div class="flex justify-end space-x-3">
          <button 
            @click="closeAvatarModal"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button 
            @click="confirmAvatarChange"
            class="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'EditProfilePage',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      showAvatarModal: false,
      selectedAvatar: null,
      profile: {
        id: null,
        name: '',
        description: '',
        type: 'child',
        is_admin: false,
        is_child: true,
        is_teen: false,
        is_active: true,
        is_locked: false,
        color: 'green',
        avatar_class: 'bg-gradient-to-br from-green-400 to-emerald-500',
        avatar_content: '',
        level: '',
        created_at: null
      },
      availableAvatars: [
        {
          id: 1,
          name: 'Vert',
          class: 'bg-gradient-to-br from-green-400 to-emerald-500',
          content: `
            <div class="w-12 h-12 bg-green-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 2,
          name: 'Bleu',
          class: 'bg-gradient-to-br from-blue-400 to-cyan-500',
          content: `
            <div class="w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 3,
          name: 'Rouge',
          class: 'bg-gradient-to-br from-red-400 to-pink-500',
          content: `
            <div class="w-12 h-12 bg-red-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 4,
          name: 'Violet',
          class: 'bg-gradient-to-br from-purple-400 to-indigo-500',
          content: `
            <div class="w-12 h-12 bg-purple-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 5,
          name: 'Orange',
          class: 'bg-gradient-to-br from-orange-400 to-yellow-500',
          content: `
            <div class="w-12 h-12 bg-orange-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 6,
          name: 'Teal',
          class: 'bg-gradient-to-br from-teal-400 to-blue-500',
          content: `
            <div class="w-12 h-12 bg-teal-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 7,
          name: 'Rose',
          class: 'bg-gradient-to-br from-pink-400 to-rose-500',
          content: `
            <div class="w-12 h-12 bg-pink-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        },
        {
          id: 8,
          name: 'Indigo',
          class: 'bg-gradient-to-br from-indigo-400 to-purple-500',
          content: `
            <div class="w-12 h-12 bg-indigo-300 rounded-full flex items-center justify-center">
              <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center relative">
                <div class="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          `
        }
      ]
    }
  },
  async mounted() {
    // Charger les données du profil depuis la base de données
    await this.loadProfile()
  },
  methods: {
    async loadProfile() {
      const profileId = this.$route.params.id
      if (profileId) {
        try {
          await this.profileStore.loadProfile(profileId)
          this.profile = { ...this.profileStore.currentProfile }
        } catch (error) {
          console.error('Erreur lors du chargement du profil:', error)
          this.$router.push({ 
          path: '/manage-profiles',
          query: { 
            profile: this.$route.query.profile || '1',
            unlocked: 'true'
          } 
        })
        }
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
    
    async saveProfile() {
      try {
        await this.profileStore.updateProfile(this.profile.id, {
          name: this.profile.name,
          description: this.profile.description,
          type: this.profile.type,
          color: this.profile.color,
          level: this.profile.level,
          isActive: this.profile.is_active,
          isLocked: this.profile.is_locked,
          avatarClass: this.profile.avatar_class,
          avatarContent: this.profile.avatar_content
        })
        this.$router.push({ 
          path: '/manage-profiles',
          query: { 
            profile: this.$route.query.profile || '1',
            unlocked: 'true'
          } 
        })
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error)
      }
    },
    
    cancelEdit() {
      this.$router.push('/manage-profiles')
    },
    
    async deleteProfile() {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le profil "${this.profile.name}" ?`)) {
        try {
          await this.profileStore.deleteProfile(this.profile.id)
          this.$router.push({ 
          path: '/manage-profiles',
          query: { 
            profile: this.$route.query.profile || '1',
            unlocked: 'true'
          } 
        })
        } catch (error) {
          console.error('Erreur lors de la suppression du profil:', error)
        }
      }
    },
    
    changeAvatar() {
      this.showAvatarModal = true
      this.selectedAvatar = this.availableAvatars.find(avatar => 
        avatar.class === this.profile.avatar_class
      )
    },
    
    selectAvatar(avatar) {
      this.selectedAvatar = avatar
    },
    
    confirmAvatarChange() {
      if (this.selectedAvatar) {
        this.profile.avatar_class = this.selectedAvatar.class
        this.profile.avatar_content = this.selectedAvatar.content
      }
      this.closeAvatarModal()
    },
    
    closeAvatarModal() {
      this.showAvatarModal = false
      this.selectedAvatar = null
    },
    
    goToProfileSettings() {
      this.$router.push({ 
        path: `/profile-settings/${this.profile.id}`,
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    }
  }
}
</script>

<style scoped>
/* Styles personnalisés pour l'interface Netflix-like */
input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Animation pour les boutons */
button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.98);
}

/* Style pour le toggle switch */
.peer:checked ~ .peer-checked\:after\:translate-x-full:after {
  transform: translateX(100%);
}
</style>
