<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header avec navigation -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
              aria-label="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Paramètres Parent</h1>
              <p class="text-sm text-white/70 hidden sm:block">Configurez l'expérience d'apprentissage de votre famille</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <!-- Pas de <main> imbriqué : App.vue fournit déjà le <main id="main-content"> -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-4xl mx-auto space-y-8">
        <!-- Section Apparence -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-pink-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
            </svg>
            Apparence
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-pink-500/30 rounded-lg flex items-center justify-center text-2xl" aria-hidden="true">
                  {{ familyTheme.emoji }}
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Thèmes de l'application</h3>
                  <p class="text-sm text-white/70">Thème de la famille : {{ familyTheme.name }} — un thème par enfant possible</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/50 transition-all text-sm"
                aria-label="Personnaliser les thèmes de l'application"
                @click="goToThemeSettings"
              >
                Personnaliser
              </button>
            </div>
          </div>
        </div>

        <!-- Section Profils et Sécurité -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
            Gestion des Profils et Sécurité
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Gérer les profils</h3>
                  <p class="text-sm text-white/70">Créer, modifier et supprimer les profils des enfants</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all text-sm"
                aria-label="Gérer les profils"
                @click="goToProfileManagement"
              >
                Gérer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-red-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Paramètres de sécurité</h3>
                  <p class="text-sm text-white/70">Configurer les codes PIN et la sécurité des profils</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all text-sm"
                aria-label="Configurer les paramètres de sécurité"
                @click="goToPinSettings"
              >
                Configurer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-amber-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Code d'entrée familial</h3>
                  <p class="text-sm text-white/70">Code demandé à l'ouverture de l'app avant les profils</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/50 transition-all text-sm"
                aria-label="Modifier le code d'entrée familial"
                @click="goToFamilyGateSettings"
              >
                Modifier
              </button>
            </div>
          </div>
        </div>

        <!-- Section Apprentissage -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            Gestion de l'Apprentissage
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Suivi des progrès</h3>
                  <p class="text-sm text-white/70">Consulter les statistiques et progrès des enfants</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all text-sm"
                aria-label="Voir le suivi des progrès"
                @click="goToProgressTracking"
              >
                Voir
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Gestion des quiz</h3>
                  <p class="text-sm text-white/70">Créer et gérer les interrogations pour les enfants</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm"
                aria-label="Gérer les quiz"
                @click="goToQuizManagement"
              >
                Gérer
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-indigo-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Scanner de leçons</h3>
                  <p class="text-sm text-white/70">Scanner et importer de nouvelles leçons</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 transition-all text-sm"
                aria-label="Scanner des leçons"
                @click="goToLessonScanner"
              >
                Scanner
              </button>
            </div>
          </div>
        </div>

        <!-- Section Configuration Technique -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg aria-hidden="true" class="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Configuration Technique
          </h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-white/15 transition-all">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-cyan-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">Configuration IA</h3>
                  <p class="text-sm text-white/70">Gérer les modèles LM Studio et le mode OCR</p>
                </div>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all text-sm"
                aria-label="Configurer l'IA"
                @click="goToAISettings"
              >
                Configurer
              </button>
            </div>
          </div>
        </div>

        <!-- Installation de l'application (PWA) -->
        <InstallAppCard />
      </div>
    </div>
  </div>
</template>

<script>
import InstallAppCard from '../components/InstallAppCard.vue'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { useThemeStore } from '../stores/themeStore.js'

export default {
  name: 'ParentSettings',
  components: {
    InstallAppCard
  },
  setup() {
    const parentNav = useParentNavigation()
    const themeStore = useThemeStore()
    return { parentNav, themeStore }
  },
  computed: {
    familyTheme() {
      return this.themeStore.familyTheme
    }
  },
  methods: {
    goBack() {
      this.parentNav.goToDashboard()
    },

    goToThemeSettings() {
      this.parentNav.goToParent('/theme-settings')
    },

    goToProfileManagement() {
      this.parentNav.goToParent('/manage-profiles')
    },

    goToPinSettings() {
      this.parentNav.goToParent('/pin-settings')
    },

    goToFamilyGateSettings() {
      this.parentNav.goToParent('/family-gate-settings')
    },

    goToProgressTracking() {
      this.parentNav.goToParent('/parent-progress-tracking')
    },

    goToQuizManagement() {
      this.parentNav.goToParent('/parent-quiz-management')
    },

    goToLessonScanner() {
      this.parentNav.goToParent('/lesson-scanner')
    },

    goToAISettings() {
      this.parentNav.goToParent('/ai-settings')
    }
  }
}
</script>
