<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
    <!-- Header avec profil sélectionné -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">TD</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-800">TeachDigital</h1>
              <p class="text-sm text-gray-600">Connecté en tant que {{ currentProfile.name }}</p>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Profil actuel -->
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="currentProfile.bgColor">
                <span class="text-white text-sm font-semibold">{{ currentProfile.initial }}</span>
              </div>
              <span class="text-gray-700 font-medium">{{ currentProfile.name }}</span>
            </div>
            
            <!-- Bouton changer de profil -->
            <button 
              @click="changeProfile"
              class="p-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
              title="Changer de profil"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-12">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold text-gray-800 mb-4">
          Salut {{ currentProfile.name }} ! 👋
        </h2>
        <p class="text-xl text-gray-600">
          {{ currentProfile.welcomeMessage }}
        </p>
      </div>

      <!-- Section des cours disponibles -->
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center">Mes cours disponibles</h3>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="course in currentProfile.courses" :key="course.id" 
               class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div class="flex items-center mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="course.color">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="course.icon"></path>
                </svg>
              </div>
              <h4 class="text-xl font-semibold text-gray-800 ml-4">{{ course.title }}</h4>
            </div>
            <p class="text-gray-600 mb-4">{{ course.description }}</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">{{ course.duration }}</span>
              <button 
                @click="startCourse(course)"
                class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
              >
                Commencer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section des défis et récompenses -->
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center">Mes défis du jour</h3>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-xl text-white">
            <div class="flex items-center mb-4">
              <svg class="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h4 class="text-xl font-bold">Défi du jour</h4>
            </div>
            <p class="mb-4">Complète 3 exercices de programmation pour débloquer un nouveau badge !</p>
            <div class="flex items-center justify-between">
              <span class="text-sm">Progression: 1/3</span>
              <div class="w-24 bg-white bg-opacity-30 rounded-full h-2">
                <div class="bg-white h-2 rounded-full" style="width: 33%"></div>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-r from-green-400 to-blue-500 p-6 rounded-xl text-white">
            <div class="flex items-center mb-4">
              <svg class="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h4 class="text-xl font-bold">Mes badges</h4>
            </div>
            <p class="mb-4">Tu as gagné 5 badges cette semaine ! Continue comme ça !</p>
            <div class="flex space-x-2">
              <div class="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center">
                <span class="text-yellow-800 font-bold">1</span>
              </div>
              <div class="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center">
                <span class="text-yellow-800 font-bold">2</span>
              </div>
              <div class="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center">
                <span class="text-yellow-800 font-bold">3</span>
              </div>
              <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span class="text-gray-600 font-bold">?</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section des activités récentes -->
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center">Mes activités récentes</h3>
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="space-y-4">
            <div v-for="activity in recentActivities" :key="activity.id" 
                 class="flex items-center p-4 bg-gray-50 rounded-lg">
              <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4" :class="activity.color">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="activity.icon"></path>
                </svg>
              </div>
              <div class="flex-1">
                <p class="font-semibold text-gray-800">{{ activity.title }}</p>
                <p class="text-sm text-gray-600">{{ activity.description }}</p>
              </div>
              <span class="text-sm text-gray-500">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section des paramètres rapides -->
      <div class="text-center">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Paramètres rapides</h3>
        <div class="flex justify-center space-x-4">
          <button 
            @click="showSettings"
            class="px-6 py-3 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Paramètres
          </button>
          <button 
            @click="showHelp"
            class="px-6 py-3 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Aide
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'

export default {
  name: 'UserDashboard',
  setup() {
    const profileStore = useProfileStore()
    return { profileStore }
  },
  data() {
    return {
      currentProfile: null,
      recentActivities: [
        {
          id: 1,
          title: 'Cours de programmation terminé',
          description: 'Tu as complété le module "Variables et boucles"',
          time: 'Il y a 2 heures',
          color: 'bg-green-500',
          icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
          id: 2,
          title: 'Nouveau badge débloqué',
          description: 'Badge "Codeur en herbe" obtenu !',
          time: 'Hier',
          color: 'bg-yellow-500',
          icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
        },
        {
          id: 3,
          title: 'Défi quotidien',
          description: 'Tu as résolu 3 problèmes de logique',
          time: 'Il y a 3 jours',
          color: 'bg-blue-500',
          icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
        }
      ]
    }
  },
  async created() {
    // Récupérer le profil depuis les paramètres d'URL ou le store
    const profileId = this.$route.query.profile
    if (profileId) {
      await this.profileStore.loadProfile(profileId)
      this.currentProfile = this.profileStore.currentProfile
    } else {
      // Profil par défaut pour les utilisateurs non-admin
      this.currentProfile = {
        id: 'user',
        name: 'Utilisateur',
        initial: 'U',
        bgColor: 'bg-purple-500',
        welcomeMessage: 'Découvre de nouveaux cours passionnants !',
        courses: [
          {
            id: 1,
            title: 'Programmation créative',
            description: 'Apprends à créer des animations et des jeux',
            duration: '2h',
            color: 'bg-purple-500',
            icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
          },
          {
            id: 2,
            title: 'Design numérique',
            description: 'Crée des designs modernes et attrayants',
            duration: '1h30',
            color: 'bg-pink-500',
            icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z'
          },
          {
            id: 3,
            title: 'Mathématiques amusantes',
            description: 'Apprends les maths en jouant',
            duration: '45 min',
            color: 'bg-blue-500',
            icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
          }
        ]
      }
    }
  },
  methods: {
    changeProfile() {
      this.$router.push('/')
    },
    startCourse(course) {
      console.log('Démarrage du cours:', course.title)
      // Ici, vous pourriez rediriger vers une page de cours spécifique
      alert(`Démarrage du cours: ${course.title}`)
    },
    showSettings() {
      console.log('Affichage des paramètres')
      alert('Fonctionnalité de paramètres à implémenter')
    },
    showHelp() {
      console.log('Affichage de l\'aide')
      alert('Fonctionnalité d\'aide à implémenter')
    }
  }
}
</script>

<style scoped>
/* Animations personnalisées */
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0,0,0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.hover\:scale-105:hover {
  transform: scale(1.05);
}

/* Gradient animé pour les boutons */
.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
