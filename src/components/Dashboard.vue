<template>
  <!-- 
    LIQUID GLASS DESIGN - Dashboard Parent
    
    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec profil sélectionné -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center space-x-4">
            <div 
              class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center cursor-pointer group relative backdrop-blur-xl shadow-lg"
              title="TeachDigital"
            >
              <span class="text-white font-bold text-lg">TD</span>
              <!-- Tooltip -->
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-slate-800/80 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/20">
                TeachDigital
              </div>
            </div>
            <h1 class="text-2xl font-bold text-white hidden sm:block">TeachDigital</h1>
          </div>
          
          <!-- Profil et actions -->
          <div class="flex items-center space-x-4">
            <!-- Profil actuel -->
            <div v-if="currentProfile" class="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 transition-all">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                <span class="text-white text-sm font-semibold">{{ currentProfile.initial }}</span>
              </div>
              <span class="text-white font-medium text-sm hidden sm:inline">{{ currentProfile.name }}</span>
            </div>
            <div v-else class="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <span class="text-white text-sm font-semibold">?</span>
              </div>
              <span class="text-white/60 font-medium text-sm">Chargement...</span>
            </div>
            
            <!-- Bouton changer de profil -->
            <button 
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Changer de profil"
              @click="changeProfile"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </button>
            
            <!-- Bouton de déconnexion -->
            <button 
              class="p-2 text-red-400/80 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-xl backdrop-blur-xl hover:bg-red-400/10 transition-all"
              title="Se déconnecter"
              @click="logout"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Bienvenue -->
      <div class="text-center mb-16">
        <h2 class="text-5xl font-bold text-white mb-4">
          Bienvenue {{ currentProfile?.name || 'Administrateur' }} ! 👋
        </h2>
        <p class="text-white/60 text-lg">
          {{ currentProfile?.welcomeMessage || 'Gérez l\'apprentissage de votre famille' }}
        </p>
      </div>

      <!-- Indicateur de chargement -->
      <div v-if="isLoadingProfile" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4"></div>
        <p class="text-white/60 text-lg">Chargement du profil...</p>
      </div>

      <!-- Fonctionnalités d'administration -->
      <div v-else-if="currentProfile && (currentProfile.isAdmin || currentProfile.name === 'Parent' || currentProfile.id === '1' || currentProfile.id === 1)">
        <!-- Grille des cartes -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Gérer les profils -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="manageProfiles"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gérer les profils</h3>
                <p class="text-white/60 text-sm mt-1">Configurez les profils de votre famille</p>
              </div>
            </div>
          </div>

          <!-- Scanner des leçons -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openLessonScanner"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Scanner des leçons</h3>
                <p class="text-white/60 text-sm mt-1">Créez des quiz à partir d'images</p>
              </div>
            </div>
          </div>

          <!-- Gérer les interrogations -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openQuizManagement"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gérer les interrogations</h3>
                <p class="text-white/60 text-sm mt-1">Organisez et suivez les quiz</p>
              </div>
            </div>
          </div>

          <!-- Quiz à partir de texte -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openTextQuizGenerator"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Quiz à partir de texte</h3>
                <p class="text-white/60 text-sm mt-1">Générez des quiz depuis du texte</p>
              </div>
            </div>
          </div>

          <!-- Test de sécurité -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openSecurityTest"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Test de sécurité</h3>
                <p class="text-white/60 text-sm mt-1">Vérifiez la sécurité du système</p>
              </div>
            </div>
          </div>

          <!-- Test des notifications -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openNotificationTest"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Test des notifications</h3>
                <p class="text-white/60 text-sm mt-1">Testez le système de notifications</p>
              </div>
            </div>
          </div>

          <!-- Suivi des progrès -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openProgressTracking"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Suivi des progrès</h3>
                <p class="text-white/60 text-sm mt-1">Consultez les statistiques</p>
              </div>
            </div>
          </div>

          <!-- Paramètres -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openParentSettings"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Paramètres</h3>
                <p class="text-white/60 text-sm mt-1">Configurez l'application</p>
              </div>
            </div>
          </div>

          <!-- Gestion des activités -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openActivityManagement"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gestion des activités</h3>
                <p class="text-white/60 text-sm mt-1">Organisez les activités</p>
              </div>
            </div>
          </div>

          <!-- Vidéos YouTube -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openYouTubeManager"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Vidéos YouTube</h3>
                <p class="text-white/60 text-sm mt-1">Gérez les vidéos éducatives</p>
              </div>
            </div>
          </div>

          <!-- Gestion des badges -->
          <div 
            class="glass-card-dashboard group cursor-pointer"
            @click="openBadgeManager"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-white group-hover:text-white transition-colors">Gestion des badges</h3>
                <p class="text-white/60 text-sm mt-1">Créez et gérez les badges</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Footer -->
    <VersionInfo position="bottom-right" />
    <MigrationControl />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import sessionService from '../services/sessionService.js'
import VersionInfo from './VersionInfo.vue'
import MigrationControl from './MigrationControl.vue'

export default {
  name: 'Dashboard',
  components: {
    VersionInfo,
    MigrationControl
  },
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
    isLoadingProfile() {
      return !this.currentProfile
    }
  },
  async created() {
    console.log('🚀 [DASHBOARD] Initialisation du dashboard')
    await this.loadCurrentProfile()
    
    // S'assurer qu'un profil est toujours disponible
    if (!this.currentProfile) {
      console.warn('⚠️ [DASHBOARD] Aucun profil trouvé, utilisation du profil parent par défaut')
      this.currentProfile = this.profiles.parent
    }
    
    // S'assurer que le profil parent a les droits d'admin
    if (this.currentProfile && (this.currentProfile.name === 'Parent' || this.currentProfile.id === '1' || this.currentProfile.id === 1)) {
      this.currentProfile.isAdmin = true
      console.log('✅ [DASHBOARD] Droits admin confirmés pour le profil parent')
    }
    
    console.log('🏁 [DASHBOARD] Profil final dans created():', this.currentProfile)
  },
  methods: {
    async loadCurrentProfile() {
      try {
        console.log('👤 [DASHBOARD] Début du chargement du profil')
        
        // Récupérer le profil depuis les paramètres d'URL ou localStorage
        const profileId = this.$route.query.profile
        console.log('🔍 [DASHBOARD] ProfileId depuis URL:', profileId)
        
        if (profileId) {
          console.log('📚 [DASHBOARD] Chargement du profil depuis la base de données...')
          // Charger le profil depuis la base de données
          await this.profileStore.loadProfile(profileId)
          this.currentProfile = this.profileStore.currentProfile
          console.log('📊 [DASHBOARD] Profil chargé:', this.currentProfile)
          
          // Si le profil n'est pas trouvé, utiliser le profil parent par défaut
          if (!this.currentProfile) {
            console.warn('⚠️ [DASHBOARD] Profil non trouvé, utilisation du profil parent par défaut')
            this.currentProfile = this.profiles.parent
          }
        } else {
          // Profil par défaut
          console.log('🏠 [DASHBOARD] Aucun profileId, utilisation du profil parent par défaut')
          this.currentProfile = this.profiles.parent
        }
        
        // S'assurer que le profil parent a les droits d'admin
        if (this.currentProfile && (this.currentProfile.name === 'Parent' || this.currentProfile.id === '1' || this.currentProfile.id === 1)) {
          this.currentProfile.isAdmin = true
          console.log('✅ [DASHBOARD] Droits admin accordés au profil parent')
        }
        
        console.log('🏁 [DASHBOARD] Profil final utilisé:', this.currentProfile)
      } catch (error) {
        console.error('❌ [DASHBOARD] Erreur lors du chargement du profil:', error)
        // En cas d'erreur, utiliser le profil parent par défaut
        this.currentProfile = this.profiles.parent
        console.log('🔄 [DASHBOARD] Profil de fallback utilisé:', this.currentProfile)
      }
    },
    
    changeProfile() {
      this.$router.push('/')
    },
    manageProfiles() {
      this.$router.push({ 
        path: '/manage-profiles', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openLessonScanner() {
      this.$router.push({ 
        path: '/lesson-scanner', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openQuizManagement() {
      this.$router.push({ 
        path: '/parent-quiz-management', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openTextQuizGenerator() {
      this.$router.push({ 
        path: '/text-quiz-generator', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openSecurityTest() {
      this.$router.push({ 
        path: '/security-test', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openNotificationTest() {
      this.$router.push({ 
        path: '/notification-test', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openProgressTracking() {
      this.$router.push({ 
        path: '/parent-progress-tracking', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openParentSettings() {
      this.$router.push({ 
        path: '/parent-settings', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openActivityManagement() {
      this.$router.push({ 
        path: '/parent-activity-management', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        } 
      })
    },
    openYouTubeManager() {
      this.$router.push({ 
        path: '/youtube-video-manager', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    openBadgeManager() {
      this.$router.push({ 
        path: '/badge-admin-manager', 
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    logout() {
      // Effacer la session
      sessionService.clearSession()
      
      // Nettoyer le localStorage
      localStorage.removeItem('selectedProfile')
      
      // Rediriger vers la page de sélection de profil
      this.$router.push('/')
      
      console.log('🚪 Déconnexion effectuée')
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

/* Responsive */
@media (max-width: 640px) {
  h2 {
    font-size: 2rem;
  }

  p {
    font-size: 0.95rem;
  }
}

@media (max-width: 768px) {
  /* Styles spécifiques du dashboard uniquement */
}
</style>
