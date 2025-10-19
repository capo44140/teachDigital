<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header avec navigation -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Retour au tableau de bord"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">Paramètres Parent</h1>
              <p class="text-sm text-gray-600">Configurez l'expérience d'apprentissage de votre famille</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Section Profils et Sécurité -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
              Gestion des Profils et Sécurité
            </h2>
          </div>
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-800">Gérer les profils</h3>
                  <p class="text-sm text-gray-600">Créer, modifier et supprimer les profils des enfants</p>
                </div>
              </div>
              <button 
                @click="goToProfileManagement"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Gérer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-800">Paramètres de sécurité</h3>
                  <p class="text-sm text-gray-600">Configurer les codes PIN et la sécurité des profils</p>
                </div>
              </div>
              <button 
                @click="goToPinSettings"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Configurer
              </button>
            </div>
          </div>
        </div>

        <!-- Section Apprentissage -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Gestion de l'Apprentissage
            </h2>
          </div>
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-800">Suivi des progrès</h3>
                  <p class="text-sm text-gray-600">Consulter les statistiques et progrès des enfants</p>
                </div>
              </div>
              <button 
                @click="goToProgressTracking"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Voir
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-800">Gestion des quiz</h3>
                  <p class="text-sm text-gray-600">Créer et gérer les interrogations pour les enfants</p>
                </div>
              </div>
              <button 
                @click="goToQuizManagement"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Gérer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-800">Scanner de leçons</h3>
                  <p class="text-sm text-gray-600">Scanner et importer de nouvelles leçons</p>
                </div>
              </div>
              <button 
                @click="goToLessonScanner"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Scanner
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-gray-800">Gestion des activités</h3>
                  <p class="text-sm text-gray-600">Organiser et suivre les activités des enfants</p>
                </div>
              </div>
              <button 
                @click="goToActivityManagement"
                class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Gérer
              </button>
            </div>
          </div>
        </div>

        <!-- Section Notifications et Préférences -->
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L16 7m-5 5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Notifications et Préférences
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- Notifications par email -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Notifications par email</h3>
                <p class="text-sm text-gray-600">Recevoir des rapports hebdomadaires sur les progrès</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.emailNotifications" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Notifications push -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Notifications push</h3>
                <p class="text-sm text-gray-600">Recevoir des alertes en temps réel</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.pushNotifications" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Mode sombre -->
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Mode sombre</h3>
                <p class="text-sm text-gray-600">Activer le thème sombre pour l'interface</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  v-model="settings.darkMode" 
                  type="checkbox" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Section Informations -->
        <div class="bg-white rounded-xl shadow-lg">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-800 flex items-center">
              <svg class="w-6 h-6 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Informations
            </h2>
          </div>
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Version de l'application</h3>
                <p class="text-sm text-gray-600">Version actuelle: {{ appVersion }}</p>
              </div>
              <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {{ appVersion }}
              </span>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 class="text-lg font-medium text-gray-800">Support technique</h3>
                <p class="text-sm text-gray-600">Besoin d'aide ? Contactez notre équipe</p>
              </div>
              <button 
                @click="openSupport"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Contacter
              </button>
            </div>
          </div>
        </div>

        <!-- Boutons d'action -->
        <div class="flex justify-center space-x-4 mt-8">
          <button 
            @click="saveSettings"
            class="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Sauvegarder les paramètres
          </button>
          <button 
            @click="resetSettings"
            class="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </main>

    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
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
/* Styles pour les toggles */
.peer:checked ~ .peer-checked\:after\:translate-x-full:after {
  transform: translateX(100%);
}

/* Animations */
button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.98);
}

/* Hover effects */
.hover\:scale-105:hover {
  transform: scale(1.05);
}
</style>
