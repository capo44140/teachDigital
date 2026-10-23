<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- En-tête -->
      <div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Retour au tableau de bord"
              title="Retour"
              @click="goBack"
            >
              <svg aria-hidden="true" class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </button>
            <div>
              <h1 class="text-3xl font-bold text-purple-600 flex items-center">
                <svg aria-hidden="true" class="w-10 h-10 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Centre d'aide
              </h1>
              <p class="text-gray-600">Bienvenue {{ currentProfile?.name || 'petit explorateur' }} ! <span aria-hidden="true">🌟</span></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sections d'aide -->
      <div class="space-y-4">
        <!-- Comment utiliser l'application -->
        <div class="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
          <h2>
            <button
              id="help-toggle-basics"
              type="button"
              class="w-full text-left flex items-center justify-between cursor-pointer"
              :aria-expanded="expandedSections.basics ? 'true' : 'false'"
              aria-controls="help-panel-basics"
              @click="toggleSection('basics')"
            >
              <span class="flex items-center space-x-4">
                <span class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl" aria-hidden="true">
                  🚀
                </span>
                <span>
                  <span class="block text-2xl font-bold text-gray-800">Comment utiliser l'application</span>
                  <span class="block text-gray-600">Découvre toutes les fonctionnalités</span>
                </span>
              </span>
              <svg
                aria-hidden="true"
                class="w-6 h-6 text-gray-400 transform transition-transform"
                :class="{ 'rotate-180': expandedSections.basics }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </h2>

          <div
            v-if="expandedSections.basics"
            id="help-panel-basics"
            role="region"
            aria-labelledby="help-toggle-basics"
            class="mt-6 space-y-4 animate-fadeIn"
          >
            <div class="bg-blue-50 rounded-lg p-4">
              <h3 class="font-bold text-blue-800 mb-2">📚 Mes leçons</h3>
              <p class="text-gray-700">Retrouve ici toutes les leçons que ton parent ou enseignant a ajoutées pour toi. Clique sur une leçon pour commencer le quiz !</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
              <h3 class="font-bold text-green-800 mb-2">📊 Suivi des progrès</h3>
              <p class="text-gray-700">Consulte tes résultats et vois comme tu progresses ! Tu peux voir tes scores et le nombre de questions auxquelles tu as répondu.</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4">
              <h3 class="font-bold text-purple-800 mb-2">📺 Vidéos YouTube</h3>
              <p class="text-gray-700">Regarde des vidéos éducatives sélectionnées pour toi. Tous les contenus sont adaptés à ton âge !</p>
            </div>
          </div>
        </div>

        <!-- Questions fréquentes -->
        <div class="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
          <h2>
            <button
              id="help-toggle-faq"
              type="button"
              class="w-full text-left flex items-center justify-between cursor-pointer"
              :aria-expanded="expandedSections.faq ? 'true' : 'false'"
              aria-controls="help-panel-faq"
              @click="toggleSection('faq')"
            >
              <span class="flex items-center space-x-4">
                <span class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl" aria-hidden="true">
                  💡
                </span>
                <span>
                  <span class="block text-2xl font-bold text-gray-800">Questions fréquentes</span>
                  <span class="block text-gray-600">Trouve des réponses à tes questions</span>
                </span>
              </span>
              <svg
                aria-hidden="true"
                class="w-6 h-6 text-gray-400 transform transition-transform"
                :class="{ 'rotate-180': expandedSections.faq }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </h2>

          <div
            v-if="expandedSections.faq"
            id="help-panel-faq"
            role="region"
            aria-labelledby="help-toggle-faq"
            class="mt-6 space-y-4 animate-fadeIn"
          >
            <div class="border-l-4 border-green-500 pl-4 py-2">
              <h3 class="font-bold text-gray-800 mb-2">Comment démarrer un quiz ?</h3>
              <p class="text-gray-700">Clique sur le bouton "Démarrer le quiz" sur n'importe quelle leçon dans la section "Mes leçons". Les questions seront générées automatiquement !</p>
            </div>
            <div class="border-l-4 border-blue-500 pl-4 py-2">
              <h3 class="font-bold text-gray-800 mb-2">Est-ce que mes parents voient mes résultats ?</h3>
              <p class="text-gray-700">Oui, tes parents peuvent suivre tes progrès pour t'encourager et t'aider. Mais ne t'inquiète pas, ils sont là pour te soutenir !</p>
            </div>
            <div class="border-l-4 border-purple-500 pl-4 py-2">
              <h3 class="font-bold text-gray-800 mb-2">Comment changer de profil ?</h3>
              <p class="text-gray-700">Clique sur le bouton "Changer de profil" en haut de l'écran pour retourner à la sélection des profils.</p>
            </div>
            <div class="border-l-4 border-pink-500 pl-4 py-2">
              <h3 class="font-bold text-gray-800 mb-2">Que faire si je ne comprends pas une leçon ?</h3>
              <p class="text-gray-700">N'hésite pas à demander de l'aide à tes parents ou ton enseignant. Tu peux aussi refaire le quiz plusieurs fois pour mieux apprendre !</p>
            </div>
          </div>
        </div>

        <!-- Conseils et astuces -->
        <div class="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
          <h2>
            <button
              id="help-toggle-tips"
              type="button"
              class="w-full text-left flex items-center justify-between cursor-pointer"
              :aria-expanded="expandedSections.tips ? 'true' : 'false'"
              aria-controls="help-panel-tips"
              @click="toggleSection('tips')"
            >
              <span class="flex items-center space-x-4">
                <span class="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white text-3xl" aria-hidden="true">
                  ⭐
                </span>
                <span>
                  <span class="block text-2xl font-bold text-gray-800">Conseils et astuces</span>
                  <span class="block text-gray-600">Pour devenir un super apprenant</span>
                </span>
              </span>
              <svg
                aria-hidden="true"
                class="w-6 h-6 text-gray-400 transform transition-transform"
                :class="{ 'rotate-180': expandedSections.tips }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </h2>

          <div
            v-if="expandedSections.tips"
            id="help-panel-tips"
            role="region"
            aria-labelledby="help-toggle-tips"
            class="mt-6 space-y-3 animate-fadeIn"
          >
            <div class="flex items-start space-x-3 bg-yellow-50 rounded-lg p-3">
              <span class="text-2xl" aria-hidden="true">🎯</span>
              <p class="text-gray-700"><strong>Concentre-toi</strong> : Trouve un endroit calme pour faire tes quiz.</p>
            </div>
            <div class="flex items-start space-x-3 bg-yellow-50 rounded-lg p-3">
              <span class="text-2xl" aria-hidden="true">📝</span>
              <p class="text-gray-700"><strong>Prends ton temps</strong> : Lis bien chaque question avant de répondre.</p>
            </div>
            <div class="flex items-start space-x-3 bg-yellow-50 rounded-lg p-3">
              <span class="text-2xl" aria-hidden="true">🔄</span>
              <p class="text-gray-700"><strong>Pratique régulièrement</strong> : Plus tu pratiques, plus tu progresses !</p>
            </div>
            <div class="flex items-start space-x-3 bg-yellow-50 rounded-lg p-3">
              <span class="text-2xl" aria-hidden="true">💪</span>
              <p class="text-gray-700"><strong>Ne te décourage pas</strong> : Même les erreurs sont des occasions d'apprendre.</p>
            </div>
            <div class="flex items-start space-x-3 bg-yellow-50 rounded-lg p-3">
              <span class="text-2xl" aria-hidden="true">🎉</span>
              <p class="text-gray-700"><strong>Célèbre tes réussites</strong> : Sois fier de chaque progrès, même petit !</p>
            </div>
          </div>
        </div>

        <!-- Sécurité et bien-être -->
        <div class="bg-white rounded-2xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
          <h2>
            <button
              id="help-toggle-safety"
              type="button"
              class="w-full text-left flex items-center justify-between cursor-pointer"
              :aria-expanded="expandedSections.safety ? 'true' : 'false'"
              aria-controls="help-panel-safety"
              @click="toggleSection('safety')"
            >
              <span class="flex items-center space-x-4">
                <span class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-3xl" aria-hidden="true">
                  🛡️
                </span>
                <span>
                  <span class="block text-2xl font-bold text-gray-800">Sécurité et bien-être</span>
                  <span class="block text-gray-600">Ton confort est important</span>
                </span>
              </span>
              <svg
                aria-hidden="true"
                class="w-6 h-6 text-gray-400 transform transition-transform"
                :class="{ 'rotate-180': expandedSections.safety }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </h2>

          <div
            v-if="expandedSections.safety"
            id="help-panel-safety"
            role="region"
            aria-labelledby="help-toggle-safety"
            class="mt-6 space-y-4 animate-fadeIn"
          >
            <div class="bg-red-50 rounded-lg p-4">
              <h3 class="font-bold text-red-800 mb-2">👀 Protection de tes yeux</h3>
              <p class="text-gray-700">Fais des pauses régulières ! Regarde au loin toutes les 20 minutes pendant 20 secondes.</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-4">
              <h3 class="font-bold text-orange-800 mb-2">⏰ Gestion du temps</h3>
              <p class="text-gray-700">N'oublie pas de prendre des pauses entre les leçons. L'apprentissage est plus efficace avec du repos !</p>
            </div>
            <div class="bg-pink-50 rounded-lg p-4">
              <h3 class="font-bold text-pink-800 mb-2">🤝 Demande de l'aide</h3>
              <p class="text-gray-700">Si tu te sens frustré ou bloqué, parles-en à tes parents ou ton enseignant. Ils sont là pour t'aider !</p>
            </div>
          </div>
        </div>

        <!-- Contact et support -->
        <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white">
          <div class="flex items-center space-x-4 mb-4">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-4xl" aria-hidden="true">
              👋
            </div>
            <div>
              <h2 class="text-2xl font-bold">Besoin d'aide supplémentaire ?</h2>
              <p class="text-purple-100">Nous sommes là pour toi !</p>
            </div>
          </div>
          <div class="bg-white bg-opacity-20 rounded-lg p-4">
            <p class="mb-3">Si tu as des questions ou des problèmes, parle à tes parents. Ils peuvent nous contacter pour t'aider !</p>
            <p class="text-sm text-purple-100">Ensemble, on peut tout résoudre ! <span aria-hidden="true">🌟</span></p>
          </div>
        </div>
      </div>

      <!-- Bouton de retour fixe en bas -->
      <div class="fixed bottom-6 right-6">
        <button
          type="button"
          class="bg-white text-purple-600 font-bold py-4 px-6 rounded-full shadow-2xl hover:bg-purple-50 transition-all duration-300 transform hover:scale-110 flex items-center space-x-2"
          @click="goBack"
        >
          <svg aria-hidden="true" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          <span>Retour</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'ChildHelp',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      expandedSections: {
        basics: false,
        faq: false,
        tips: false,
        safety: false
      }
    }
  },
  computed: {
    currentProfile() {
      const profileId = this.$route.query.profile
      return this.profileStore.getProfileById(profileId)
    }
  },
  methods: {
    toggleSection(section) {
      this.expandedSections[section] = !this.expandedSections[section]
    },
    goBack() {
      this.$router.push({
        name: 'UserDashboard',
        query: {
          profile: this.$route.query.profile
        }
      })
    }
  }
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

/* Smooth transitions */
* {
  transition: all 0.3s ease;
}
</style>

