<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Bouton retour et titre -->
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-white">Gestion des profils</h1>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-3">
            <button 
              @click="openPinSettings"
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all flex items-center space-x-2 text-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span>Code PIN</span>
            </button>
            <button 
              @click="addNewProfile"
              class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center space-x-2 text-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>Nouveau profil</span>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Statistiques -->
      <div class="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Total profils</p>
            <p class="text-3xl font-bold text-white">{{ profiles.length }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Profils actifs</p>
            <p class="text-3xl font-bold text-white">{{ activeProfiles }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Profils enfants</p>
            <p class="text-3xl font-bold text-white">{{ childProfiles }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Profils adolescents</p>
            <p class="text-3xl font-bold text-white">{{ teenProfiles }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Profils admin</p>
            <p class="text-3xl font-bold text-white">{{ adminProfiles }}</p>
          </div>
        </div>
      </div>

      <!-- Messages d'erreur -->
      <div v-if="error" class="mb-6 bg-red-500/20 border border-red-500/30 backdrop-blur-xl text-red-200 px-6 py-4 rounded-xl flex items-center space-x-3">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Indicateur de chargement -->
      <div v-if="isLoading" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4"></div>
        <p class="text-white/60 text-lg">Chargement des profils...</p>
      </div>

      <!-- Liste des profils -->
      <div v-else class="space-y-4">
        <div v-if="profiles.length === 0" class="glass-card-dashboard text-center py-16">
          <p class="text-white/60 text-lg mb-4">Aucun profil trouvé</p>
          <button 
            @click="addNewProfile"
            class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Créer le premier profil
          </button>
        </div>

        <div 
          v-for="profile in profiles" 
          :key="profile.id"
          class="glass-card-profile group"
        >
          <div class="flex items-start space-x-4">
            <!-- Avatar du profil -->
            <div class="relative flex-shrink-0">
              <div v-if="profile.image_data" class="w-16 h-16 rounded-xl overflow-hidden shadow-lg">
                <img 
                  :src="profile.image_data" 
                  :alt="profile.name"
                  class="w-full h-full object-cover"
                >
              </div>
              <div 
                v-else
                :class="profile.avatar_class"
                class="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg"
              >
                <div v-html="profile.avatar_content" class="w-full h-full flex items-center justify-center"></div>
              </div>
              
              <!-- Badges de statut -->
              <div 
                v-if="profile.isAdmin"
                class="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-slate-900"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>

            <!-- Informations du profil -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-3 mb-1">
                <h3 class="text-lg font-bold text-white truncate">{{ profile.name }}</h3>
                <div v-if="profile.is_child" class="px-2 py-1 bg-red-500/30 text-red-200 text-xs rounded-full font-medium">
                  Enfant
                </div>
                <div v-if="profile.is_teen" class="px-2 py-1 bg-orange-500/30 text-orange-200 text-xs rounded-full font-medium">
                  Adolescent
                </div>
              </div>
              <p class="text-white/60 text-sm mb-2 line-clamp-2">{{ profile.description || 'Aucune description' }}</p>
              <div class="flex items-center space-x-4 text-sm">
                <span 
                  :class="profile.is_active ? 'text-green-400' : 'text-red-400'"
                  class="font-medium flex items-center space-x-1"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8"/>
                  </svg>
                  <span>{{ profile.is_active ? 'Actif' : 'Inactif' }}</span>
                </span>
                <span v-if="profile.level" class="text-blue-400 font-medium">{{ profile.level }}</span>
                <span class="text-white/40">{{ formatDate(profile.created_at) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-2 flex-shrink-0">
              <button 
                @click="manageImage(profile)"
                class="p-2 text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-xl hover:bg-white/10 transition-all"
                title="Gérer l'image"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </button>
              <button 
                @click="editProfile(profile)"
                class="p-2 text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-xl hover:bg-white/10 transition-all"
                title="Modifier"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button 
                @click="toggleProfileStatus(profile)"
                :class="profile.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'"
                class="p-2 border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-xl hover:bg-white/10 transition-all"
                :title="profile.is_active ? 'Désactiver' : 'Activer'"
              >
                <svg v-if="profile.is_active" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
              <button 
                @click="deleteProfile(profile)"
                class="p-2 text-red-400/60 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-lg backdrop-blur-xl hover:bg-red-400/10 transition-all"
                title="Supprimer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal de gestion d'image -->
    <div 
      v-if="showImageModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click="closeImageModal"
    >
      <div 
        class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl max-w-md w-full p-8 border border-white/10"
        @click.stop
      >
        <h3 class="text-xl font-bold text-white mb-6">
          Gérer l'image de {{ selectedProfile?.name }}
        </h3>
        
        <div class="flex justify-center mb-8">
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

        <div class="flex justify-end">
          <button 
            @click="closeImageModal"
            class="px-6 py-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal d'ajout/modification de profil -->
    <div 
      v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click="closeModal"
    >
      <div 
        class="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl max-w-md w-full p-8 border border-white/10 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <h3 class="text-xl font-bold text-white mb-6">
          {{ editingProfile ? 'Modifier le profil' : 'Nouveau profil' }}
        </h3>
        
        <form @submit.prevent="saveProfile" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Nom</label>
            <input 
              v-model="form.name"
              type="text"
              required
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              placeholder="Nom du profil"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea 
              v-model="form.description"
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
              rows="3"
              placeholder="Description du profil"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">Type de profil</label>
            <select 
              v-model="form.type"
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="child" class="bg-slate-900">Enfant</option>
              <option value="teen" class="bg-slate-900">Adolescent</option>
              <option value="admin" class="bg-slate-900">Parent/Admin</option>
            </select>
          </div>

          <div v-if="form.type !== 'admin'">
            <label class="block text-sm font-medium text-white/80 mb-2">Niveau</label>
            <select 
              v-model="form.level"
              class="w-full px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="" class="bg-slate-900">Sélectionner un niveau</option>
              <option value="CP" class="bg-slate-900">CP (6 ans)</option>
              <option value="CE1" class="bg-slate-900">CE1 (7 ans)</option>
              <option value="CE2" class="bg-slate-900">CE2 (8 ans)</option>
              <option value="CM1" class="bg-slate-900">CM1 (9 ans)</option>
              <option value="CM2" class="bg-slate-900">CM2 (10 ans)</option>
              <option value="6ème" class="bg-slate-900">6ème (11 ans)</option>
              <option value="5ème" class="bg-slate-900">5ème (12 ans)</option>
              <option value="4ème" class="bg-slate-900">4ème (13 ans)</option>
              <option value="3ème" class="bg-slate-900">3ème (14 ans)</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-white/80 mb-3">Couleur du profil</label>
            <div class="grid grid-cols-4 gap-2">
              <button 
                v-for="color in profileColors"
                :key="color.name"
                @click="form.color = color.name"
                :class="[
                  'w-12 h-12 rounded-lg border-2 transition-all',
                  color.class,
                  form.color === color.name ? 'border-white ring-2 ring-white' : 'border-white/30'
                ]"
                type="button"
              ></button>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button 
              type="button"
              @click="closeModal"
              class="px-6 py-2 text-white/80 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
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
      this.$router.push({ 
        path: '/dashboard',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
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
      // Rediriger vers la page de modification de profil avec les paramètres de session
      this.$router.push({ 
        path: `/edit-profile/${profile.id}`,
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
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
/* Animations */
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Glass Cards */
.glass-card-dashboard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.glass-card-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-stat:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.glass-card-profile {
  display: flex;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-profile:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

/* Responsive */
@media (max-width: 640px) {
  .glass-card-profile {
    padding: 1rem;
    border-radius: 1rem;
  }

  h1 {
    font-size: 1.5rem;
  }
}

@media (max-width: 768px) {
  .glass-card-profile {
    padding: 1.25rem;
    border-radius: 1.25rem;
  }
}
</style>
