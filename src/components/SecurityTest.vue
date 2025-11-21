<template>
  <!-- 
    LIQUID GLASS DESIGN - Test de Sécurité
    
    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec navigation -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white flex items-center">
                <div class="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-400 rounded-xl mr-3 flex items-center justify-center">
                  <span class="text-lg">🔒</span>
                </div>
                Test de Sécurité
              </h1>
              <p class="text-sm text-white/60 hidden sm:block">Vérification des restrictions d'accès</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-6xl mx-auto space-y-8">
        <!-- Titre principal -->
        <div class="glass-card-dashboard text-center">
          <h2 class="text-3xl font-bold text-white mb-2">Tests de Sécurité des Profils</h2>
          <p class="text-white/60">Vérifiez les restrictions d'accès selon le type de profil</p>
        </div>
        
        <!-- Informations sur le profil actuel -->
        <div class="glass-card-dashboard">
          <h3 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Profil Actuel
          </h3>
          <div v-if="currentProfile" class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <span class="text-white/80 font-medium">Nom:</span>
              <span class="text-white font-semibold">{{ currentProfile.name }}</span>
            </div>
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <span class="text-white/80 font-medium">Type:</span>
              <span v-if="currentProfile.is_admin" class="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg backdrop-blur-xl border border-red-400/30 font-semibold">Administrateur</span>
              <span v-else-if="currentProfile.is_teen" class="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg backdrop-blur-xl border border-orange-400/30 font-semibold">Adolescent</span>
              <span v-else-if="currentProfile.is_child" class="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg backdrop-blur-xl border border-green-400/30 font-semibold">Enfant</span>
              <span v-else class="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-lg backdrop-blur-xl border border-gray-400/30">Autre</span>
            </div>
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <span class="text-white/80 font-medium">ID:</span>
              <span class="text-white font-mono">{{ currentProfile.id }}</span>
            </div>
          </div>
          <div v-else class="text-center text-white/60 py-8">
            <div class="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
              <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <p class="text-lg font-medium">Aucun profil sélectionné</p>
            <p class="text-sm text-white/40 mt-1">Sélectionnez un profil pour commencer les tests</p>
          </div>
        </div>

        <!-- Tests de navigation -->
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Test Navigation Admin -->
          <div class="glass-card-dashboard">
            <h3 class="text-lg font-bold text-white mb-6 flex items-center">
              <svg class="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Test Navigation Admin
            </h3>
            <p class="text-sm text-white/60 mb-6">Tentative d'accès aux pages réservées aux administrateurs</p>
            <div class="space-y-3">
              <button 
                class="w-full px-4 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 rounded-xl hover:from-red-500/30 hover:to-red-600/30 transition-all duration-300 backdrop-blur-xl border border-red-400/30 hover:border-red-400/50 font-medium"
                @click="testAdminAccess('/dashboard')"
              >
                Dashboard Admin
              </button>
              <button 
                class="w-full px-4 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 rounded-xl hover:from-red-500/30 hover:to-red-600/30 transition-all duration-300 backdrop-blur-xl border border-red-400/30 hover:border-red-400/50 font-medium"
                @click="testAdminAccess('/manage-profiles')"
              >
                Gestion Profils
              </button>
              <button 
                class="w-full px-4 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 rounded-xl hover:from-red-500/30 hover:to-red-600/30 transition-all duration-300 backdrop-blur-xl border border-red-400/30 hover:border-red-400/50 font-medium"
                @click="testAdminAccess('/lesson-scanner')"
              >
                Scanner Leçons
              </button>
            </div>
          </div>

          <!-- Test Navigation Enfant -->
          <div class="glass-card-dashboard">
            <h3 class="text-lg font-bold text-white mb-6 flex items-center">
              <svg class="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Test Navigation Enfant
            </h3>
            <p class="text-sm text-white/60 mb-6">Tentative d'accès aux pages pour enfants/adolescents</p>
            <div class="space-y-3">
              <button 
                class="w-full px-4 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 rounded-xl hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300 backdrop-blur-xl border border-green-400/30 hover:border-green-400/50 font-medium"
                @click="testChildAccess('/user-dashboard')"
              >
                Dashboard Utilisateur
              </button>
              <button 
                class="w-full px-4 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 rounded-xl hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 backdrop-blur-xl border border-blue-400/30 hover:border-blue-400/50 font-medium"
                @click="testQuizAccess()"
              >
                Accès Quiz
              </button>
            </div>
          </div>
        </div>

        <!-- Résultats des tests -->
        <div v-if="testResults.length > 0" class="glass-card-dashboard">
          <h3 class="text-lg font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Résultats des Tests
          </h3>
          <div class="space-y-4">
            <div v-for="(result, index) in testResults" :key="index" 
                 class="flex items-center justify-between p-4 rounded-xl backdrop-blur-xl border transition-all duration-300"
                 :class="result.success ? 'bg-green-500/10 border-green-400/30 text-green-100' : 'bg-red-500/10 border-red-400/30 text-red-100'">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <span class="text-2xl">{{ result.success ? '✅' : '❌' }}</span>
                  <span class="font-semibold text-lg">{{ result.test }}</span>
                </div>
                <p class="text-sm opacity-80">{{ result.message }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions de test -->
        <div class="glass-card-dashboard text-center">
          <h3 class="text-lg font-bold text-white mb-6 flex items-center justify-center">
            <svg class="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Actions de Test
          </h3>
          <div class="flex flex-wrap justify-center gap-4">
            <button 
              class="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 font-medium"
              @click="runAllTests"
            >
              Lancer Tous les Tests
            </button>
            <button 
              class="px-8 py-3 bg-gradient-to-r from-gray-500 to-slate-500 text-white rounded-xl hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300 font-medium"
              @click="clearResults"
            >
              Effacer Résultats
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'SecurityTest',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      currentProfile: null,
      testResults: []
    }
  },
  async created() {
    await this.loadCurrentProfile()
  },
  methods: {
    async loadCurrentProfile() {
      const profileId = this.$route.query.profile || localStorage.getItem('selectedProfile')
      if (profileId) {
        await this.profileStore.loadProfiles()
        this.currentProfile = this.profileStore.getProfileById(profileId)
      }
    },
    
    testAdminAccess(route) {
      const result = {
        test: `Accès ${route}`,
        success: false,
        message: ''
      }
      
      if (!this.currentProfile) {
        result.message = 'Aucun profil sélectionné'
      } else if (this.currentProfile.is_admin) {
        result.success = true
        result.message = 'Accès autorisé (profil admin)'
      } else {
        result.message = 'Accès refusé (profil non-admin)'
      }
      
      this.testResults.push(result)
    },
    
    testChildAccess(route) {
      const result = {
        test: `Accès ${route}`,
        success: false,
        message: ''
      }
      
      if (!this.currentProfile) {
        result.message = 'Aucun profil sélectionné'
      } else if (this.currentProfile.is_child || this.currentProfile.is_teen) {
        result.success = true
        result.message = 'Accès autorisé (profil enfant/teen)'
      } else {
        result.message = 'Accès refusé (profil non-enfant)'
      }
      
      this.testResults.push(result)
    },
    
    testQuizAccess() {
      const result = {
        test: 'Accès Quiz',
        success: false,
        message: ''
      }
      
      if (!this.currentProfile) {
        result.message = 'Aucun profil sélectionné'
      } else {
        // Simuler l'accès à un quiz
        const childId = this.currentProfile.id
        const quizRoute = {
          name: 'QuizGenerator',
          query: { childId: childId, lessonId: 1 }
        }
        
        if (this.currentProfile.is_child || this.currentProfile.is_teen || this.currentProfile.is_admin) {
          result.success = true
          result.message = 'Accès au quiz autorisé'
        } else {
          result.message = 'Accès au quiz refusé'
        }
      }
      
      this.testResults.push(result)
    },
    
    runAllTests() {
      this.clearResults()
      
      // Tests d'accès admin
      this.testAdminAccess('/dashboard')
      this.testAdminAccess('/manage-profiles')
      this.testAdminAccess('/lesson-scanner')
      
      // Tests d'accès enfant
      this.testChildAccess('/user-dashboard')
      this.testQuizAccess()
    },
    
    clearResults() {
      this.testResults = []
    },
    
    goBack() {
      if (this.currentProfile && this.currentProfile.is_admin) {
        this.$router.push({ path: '/dashboard', query: { profile: this.currentProfile.id } })
      } else {
        this.$router.push('/')
      }
    }
  }
}
</script>

<style scoped>
/* Liquid Glass Design Styles */
.glass-card-dashboard {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 2rem;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

/* Background blob animations */
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

/* Button styles */
button {
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

/* Test result animations */
.test-result {
  transition: all 0.3s ease;
}

.test-result:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Animation pour les résultats de test */
.glass-card-dashboard > div:last-child > div {
  animation: fadeInUp 0.3s ease-out;
  animation-fill-mode: both;
}

.glass-card-dashboard > div:last-child > div:nth-child(1) { animation-delay: 0.1s; }
.glass-card-dashboard > div:last-child > div:nth-child(2) { animation-delay: 0.2s; }
.glass-card-dashboard > div:last-child > div:nth-child(3) { animation-delay: 0.3s; }
.glass-card-dashboard > div:last-child > div:nth-child(4) { animation-delay: 0.4s; }
.glass-card-dashboard > div:last-child > div:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .glass-card-dashboard {
    padding: 1.5rem;
  }
  
  .max-w-6xl {
    max-width: 100%;
    padding: 0 1rem;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
