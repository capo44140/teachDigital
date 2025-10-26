<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec navigation -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Paramètres Parent</h1>
              <p class="text-sm text-white/60 hidden sm:block">Configurez l'expérience d'apprentissage de votre famille</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-4xl mx-auto space-y-8">
        <!-- Section Profils et Sécurité -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
            Gestion des Profils et Sécurité
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Gérer les profils</h3>
                  <p class="text-sm text-white/60">Créer, modifier et supprimer les profils des enfants</p>
                </div>
              </div>
              <button 
                @click="goToProfileManagement"
                class="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all text-sm"
              >
                Gérer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-red-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Paramètres de sécurité</h3>
                  <p class="text-sm text-white/60">Configurer les codes PIN et la sécurité des profils</p>
                </div>
              </div>
              <button 
                @click="goToPinSettings"
                class="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all text-sm"
              >
                Configurer
              </button>
            </div>
          </div>
        </div>

        <!-- Section Apprentissage -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            Gestion de l'Apprentissage
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Suivi des progrès</h3>
                  <p class="text-sm text-white/60">Consulter les statistiques et progrès des enfants</p>
                </div>
              </div>
              <button 
                @click="goToProgressTracking"
                class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all text-sm"
              >
                Voir
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Gestion des quiz</h3>
                  <p class="text-sm text-white/60">Créer et gérer les interrogations pour les enfants</p>
                </div>
              </div>
              <button 
                @click="goToQuizManagement"
                class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm"
              >
                Gérer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-indigo-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Scanner de leçons</h3>
                  <p class="text-sm text-white/60">Scanner et importer de nouvelles leçons</p>
                </div>
              </div>
              <button 
                @click="goToLessonScanner"
                class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 transition-all text-sm"
              >
                Scanner
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import VersionInfo from './VersionInfo.vue'

export default {
  name: 'ParentSettings',
  components: {
    VersionInfo
  },
  data() {
    return {
      settings: {
        emailNotifications: true,
        pushNotifications: false,
        darkMode: false
      },
      appVersion: '1.0.0'
    }
  },
  mounted() {
    this.loadSettings()
    this.loadAppVersion()
  },
  methods: {
    loadSettings() {
      // Charger les paramètres depuis le localStorage
      const savedSettings = localStorage.getItem('parentSettings')
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) }
      }
    },
    
    async loadAppVersion() {
      // Charger la version depuis le fichier version.json
      try {
        const response = await fetch('/version.json')
        if (response.ok) {
          const versionData = await response.json()
          this.appVersion = versionData.version || '1.0.0'
        } else {
          this.appVersion = '1.0.0'
        }
      } catch (error) {
        console.warn('Impossible de charger les informations de version:', error)
        this.appVersion = '1.0.0'
      }
    },
    
    saveSettings() {
      // Sauvegarder les paramètres dans le localStorage
      localStorage.setItem('parentSettings', JSON.stringify(this.settings))
      
      // Afficher une notification de succès
      this.$emit('notification', {
        type: 'success',
        message: 'Paramètres sauvegardés avec succès !'
      })
      
      console.log('Paramètres sauvegardés:', this.settings)
    },
    
    resetSettings() {
      // Réinitialiser les paramètres par défaut
      this.settings = {
        emailNotifications: true,
        pushNotifications: false,
        darkMode: false
      }
      
      // Sauvegarder les paramètres réinitialisés
      this.saveSettings()
      
      console.log('Paramètres réinitialisés')
    },
    
    goBack() {
      this.$router.push({ 
        path: '/dashboard',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    goToProfileManagement() {
      this.$router.push({ 
        path: '/manage-profiles',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    goToPinSettings() {
      this.$router.push({ 
        path: '/pin-settings',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    goToProgressTracking() {
      this.$router.push({ 
        path: '/parent-progress-tracking',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    goToQuizManagement() {
      this.$router.push({ 
        path: '/parent-quiz-management',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    goToLessonScanner() {
      this.$router.push({ 
        path: '/lesson-scanner',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    goToActivityManagement() {
      this.$router.push({ 
        path: '/parent-activity-management',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },
    
    openSupport() {
      // Ouvrir une fenêtre de support ou rediriger vers une page de contact
      window.open('mailto:support@teachdigital.com?subject=Support Technique', '_blank')
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
}

@media (max-width: 640px) {
  .glass-card-dashboard {
    padding: 1rem;
    border-radius: 1rem;
  }
}
</style>
