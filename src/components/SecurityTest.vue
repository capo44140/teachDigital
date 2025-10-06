<template>
  <div class="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
    <!-- Header -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">🔒</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">Test de Sécurité</h1>
              <p class="text-sm text-gray-600">Vérification des restrictions d'accès</p>
            </div>
          </div>
          <button 
            @click="goBack"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Retour
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">Tests de Sécurité des Profils</h2>
        
        <!-- Informations sur le profil actuel -->
        <div class="mb-8 p-6 bg-blue-50 rounded-lg">
          <h3 class="text-xl font-semibold text-blue-800 mb-4">Profil Actuel</h3>
          <div v-if="currentProfile" class="space-y-2">
            <p><strong>Nom:</strong> {{ currentProfile.name }}</p>
            <p><strong>Type:</strong> 
              <span v-if="currentProfile.is_admin" class="text-red-600 font-semibold">Administrateur</span>
              <span v-else-if="currentProfile.is_teen" class="text-orange-600 font-semibold">Adolescent</span>
              <span v-else-if="currentProfile.is_child" class="text-green-600 font-semibold">Enfant</span>
              <span v-else class="text-gray-600">Autre</span>
            </p>
            <p><strong>ID:</strong> {{ currentProfile.id }}</p>
          </div>
          <div v-else class="text-gray-600">
            Aucun profil sélectionné
          </div>
        </div>

        <!-- Tests de navigation -->
        <div class="grid md:grid-cols-2 gap-6 mb-8">
          <div class="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Test Navigation Admin</h3>
            <p class="text-sm text-gray-600 mb-4">Tentative d'accès aux pages réservées aux administrateurs</p>
            <div class="space-y-2">
              <button 
                @click="testAdminAccess('/dashboard')"
                class="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Dashboard Admin
              </button>
              <button 
                @click="testAdminAccess('/manage-profiles')"
                class="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Gestion Profils
              </button>
              <button 
                @click="testAdminAccess('/lesson-scanner')"
                class="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Scanner Leçons
              </button>
            </div>
          </div>

          <div class="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Test Navigation Enfant</h3>
            <p class="text-sm text-gray-600 mb-4">Tentative d'accès aux pages pour enfants/adolescents</p>
            <div class="space-y-2">
              <button 
                @click="testChildAccess('/user-dashboard')"
                class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Dashboard Utilisateur
              </button>
              <button 
                @click="testQuizAccess()"
                class="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Accès Quiz
              </button>
            </div>
          </div>
        </div>

        <!-- Résultats des tests -->
        <div v-if="testResults.length > 0" class="bg-gray-50 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Résultats des Tests</h3>
          <div class="space-y-3">
            <div v-for="(result, index) in testResults" :key="index" 
                 class="flex items-center justify-between p-3 rounded-lg"
                 :class="result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
              <div>
                <span class="font-medium">{{ result.test }}</span>
                <p class="text-sm">{{ result.message }}</p>
              </div>
              <div class="text-2xl">
                {{ result.success ? '✅' : '❌' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Actions de test -->
        <div class="text-center mt-8">
          <button 
            @click="runAllTests"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-4"
          >
            Lancer Tous les Tests
          </button>
          <button 
            @click="clearResults"
            class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Effacer Résultats
          </button>
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
/* Styles personnalisés pour les tests de sécurité */
.test-result {
  transition: all 0.3s ease;
}

.test-result:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
