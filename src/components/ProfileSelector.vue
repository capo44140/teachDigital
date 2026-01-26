<template>
  <!-- 
    LIQUID GLASS DESIGN - Style iOS
    
    Sélecteur de profils avec effet Liquid Glass:
    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes de profil semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden flex flex-col items-center justify-center p-6">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Contenu relative -->
    <div class="relative z-10 w-full flex flex-col items-center">
      <!-- En-tête avec logo -->
      <div class="text-center mb-16">
        <div class="flex items-center justify-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
        </div>
        <h1 class="text-5xl font-bold text-white mb-2">Qui est-ce ?</h1>
        <p class="text-white/60 text-lg">Sélectionnez un profil pour commencer</p>
      </div>
    
      <!-- Skeleton loading pendant le chargement -->
      <div v-if="isLoading" class="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl">
        <ProfileSkeleton 
          v-for="n in 5" 
          :key="n" 
          type="selector" 
        />
      </div>

      <!-- Grille des profils -->
      <div v-else class="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl">
        <!-- Profils dynamiques -->
        <div 
          v-for="profile in profiles"
          :key="profile.id"
          :data-testid="`profile-${profile.name.toLowerCase()}`"
          class="profile-card-glass group cursor-pointer"
          @click="selectProfile(profile)"
        >
          <!-- Carte de profil -->
          <div class="profile-card-container">
            <!-- Image du profil -->
            <div class="profile-image-glass relative" :class="profile.avatar_class">
              <div v-if="profile.image_data" class="w-full h-full rounded-2xl overflow-hidden">
                <img 
                  :src="profile.image_data" 
                  :alt="profile.name"
                  class="w-full h-full object-cover"
                >
              </div>
              <div v-else class="absolute inset-0 flex items-center justify-center">
                <div v-html="profile.avatar_content"></div>
              </div>
              
              <!-- Badges de statut -->
              <div 
                v-if="profile.is_admin"
                class="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center backdrop-blur-xl shadow-lg border border-yellow-300/50"
              >
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div 
                v-if="profile.is_child"
                class="absolute -bottom-2 -right-2 bg-gradient-to-br from-red-400 to-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-xl border border-red-300/50"
              >
                👶
              </div>
              <div 
                v-if="profile.is_teen"
                class="absolute -bottom-2 -right-2 bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-xl border border-orange-300/50"
              >
                🧑
              </div>
            </div>

            <!-- Informations du profil -->
            <div class="profile-info-glass">
              <h3 class="profile-name-glass">{{ profile.name }}</h3>
              <div v-if="profile.is_admin" class="admin-badge-glass">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Ajouter un profil -->
        <div 
          class="profile-card-glass group cursor-pointer"
          @click="addProfile"
        >
          <div class="profile-card-container">
            <div class="profile-image-glass bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-dashed border-white/20 hover:border-white/40 transition-colors">
              <div class="absolute inset-0 flex items-center justify-center">
                <svg class="w-12 h-12 text-white/60 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </div>
            </div>
            <div class="profile-info-glass">
              <h3 class="profile-name-glass text-white/60">Ajouter</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Demande de création de profil -->
      <div
        v-if="isRequestModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-6"
      >
        <div class="absolute inset-0 bg-black/60" @click="closeRequestModal"></div>
        <div class="relative w-full max-w-lg backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 class="text-xl font-bold text-white">Demander un nouveau profil</h2>
              <p class="text-white/60 text-sm mt-1">
                Le parent recevra une notification pour valider la création.
              </p>
            </div>
            <button
              class="p-2 text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-xl hover:bg-white/10 transition-all"
              title="Fermer"
              @click="closeRequestModal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-white/80 text-sm font-medium mb-2">Nom du profil</label>
              <input
                v-model="requestedName"
                type="text"
                maxlength="40"
                autocomplete="off"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                placeholder="Ex: Lucas"
                @keyup.enter="submitProfileRequest"
              >
            </div>

            <div>
              <label class="block text-white/80 text-sm font-medium mb-2">Type</label>
              <select
                v-model="requestedType"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="child" class="bg-slate-900">Enfant</option>
                <option value="teen" class="bg-slate-900">Adolescent</option>
              </select>
            </div>

            <div v-if="requestError" class="text-red-200 text-sm bg-red-500/10 border border-red-400/20 rounded-xl p-3">
              {{ requestError }}
            </div>
            <div v-if="requestSuccess" class="text-green-200 text-sm bg-green-500/10 border border-green-400/20 rounded-xl p-3">
              {{ requestSuccess }}
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                class="px-4 py-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl hover:bg-white/10 transition-all"
                :disabled="isSubmittingRequest"
                @click="closeRequestModal"
              >
                Annuler
              </button>
              <button
                class="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-60"
                :disabled="isSubmittingRequest"
                @click="submitProfileRequest"
              >
                {{ isSubmittingRequest ? 'Envoi…' : 'Envoyer la demande' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import ProfileSkeleton from './ProfileSkeleton.vue'
import { ProfileService } from '../services/profile/index.js'

export default {
  name: 'ProfileSelector',
  components: {
    ProfileSkeleton
  },
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      selectedProfile: null,
      isRequestModalOpen: false,
      requestedName: '',
      requestedType: 'child',
      isSubmittingRequest: false,
      requestError: '',
      requestSuccess: ''
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
    const session = sessionService.getValidSession()
    if (session) {
      console.log('Session valide trouvée, redirection automatique vers le dashboard')
      this.$router.push({ 
        path: '/dashboard', 
        query: { 
          profile: session.profileId,
          unlocked: 'true'
        } 
      })
      return
    }
    
    await this.profileStore.loadProfiles()
  },
  methods: {
    selectProfile(profile) {
      this.selectedProfile = profile
      console.log('Profil sélectionné:', profile)
      
      localStorage.setItem('selectedProfile', JSON.stringify(profile))
      this.$emit('profile-selected', profile)
      
      if (profile.is_admin) {
        this.showAuthOptions(profile)
      } else {
        this.$router.push({ path: '/user-dashboard', query: { profile: profile.id } })
      }
    },

    showAuthOptions(profile) {
      this.$router.push({ 
        path: '/pin-lock', 
        query: { 
          profile: profile.id,
          name: profile.name
        } 
      })
    },
    
    addProfile() {
      this.requestError = ''
      this.requestSuccess = ''
      this.requestedName = ''
      this.requestedType = 'child'
      this.isRequestModalOpen = true
    }
    ,
    closeRequestModal() {
      if (this.isSubmittingRequest) return
      this.isRequestModalOpen = false
    },
    async submitProfileRequest() {
      if (this.isSubmittingRequest) return
      this.requestError = ''
      this.requestSuccess = ''

      const name = (this.requestedName || '').trim()
      if (!name || name.length < 2) {
        this.requestError = 'Veuillez saisir un nom (au moins 2 caractères).'
        return
      }

      this.isSubmittingRequest = true
      try {
        const response = await ProfileService.requestProfileCreation({
          name,
          type: this.requestedType
        })
        if (response?.success) {
          this.requestSuccess = response.message || 'Demande envoyée.'
          this.$emit('add-profile', { name, type: this.requestedType, requestId: response?.data?.requestId })
          // Fermer après un court délai pour laisser le feedback
          setTimeout(() => {
            this.isRequestModalOpen = false
          }, 900)
        } else {
          this.requestError = response?.message || 'Erreur lors de l’envoi de la demande.'
        }
      } catch (error) {
        this.requestError = error?.message || 'Erreur lors de l’envoi de la demande.'
      } finally {
        this.isSubmittingRequest = false
      }
    }
  }
}
</script>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Glass Card Profile */
.profile-card-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
}

.profile-card-glass:hover {
  transform: translateY(-8px);
}

.profile-card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.profile-image-glass {
  width: 6.5rem;
  height: 6.5rem;
  border-radius: 1.5rem;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.profile-card-glass:hover .profile-image-glass {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.profile-info-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.profile-name-glass {
  color: white;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s ease;
}

.profile-card-glass:hover .profile-name-glass {
  text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
}

.admin-badge-glass {
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
  font-size: 0.75rem;
}

/* Animation pour le pulse */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .profile-image-glass {
    width: 5.5rem;
    height: 5.5rem;
  }

  .profile-name-glass {
    font-size: 0.9rem;
  }

  h1 {
    font-size: 2.25rem;
  }

  p {
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .profile-image-glass {
    width: 6rem;
    height: 6rem;
  }
}
</style>
