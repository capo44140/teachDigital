<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header avec profil sélectionné -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
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
              class="p-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
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
          Bienvenue {{ currentProfile.name }} !
        </h2>
        <p class="text-xl text-gray-600">
          {{ currentProfile.welcomeMessage }}
        </p>
      </div>

      <!-- Contenu spécifique au profil -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Cartes de cours -->
        <div v-for="course in currentProfile.courses" :key="course.id" 
             class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="course.color">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="course.icon"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-800 ml-4">{{ course.title }}</h3>
          </div>
          <p class="text-gray-600 mb-4">{{ course.description }}</p>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">{{ course.duration }}</span>
            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Commencer
            </button>
          </div>
        </div>
      </div>

      <!-- Section admin pour les parents -->
      <div v-if="currentProfile.isAdmin" class="mt-16 bg-yellow-50 border border-yellow-200 rounded-xl p-8">
        <div class="flex items-center mb-4">
          <svg class="w-8 h-8 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
          </svg>
          <h3 class="text-2xl font-bold text-yellow-800">Panneau d'administration</h3>
        </div>
        <p class="text-yellow-700 mb-6">En tant que parent, vous avez accès aux fonctionnalités d'administration.</p>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button 
            @click="manageProfiles"
            class="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
            title="Gérer les profils"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Gérer les profils</span>
          </button>
          
          <button 
            @click="openLessonScanner"
            class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            title="Scanner des leçons"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
            <span>Scanner des leçons</span>
          </button>
          
          <button 
            @click="openQuizManagement"
            class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
            title="Gérer les interrogations"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Gérer les interrogations</span>
          </button>
          
          <button class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
            Voir les statistiques
          </button>
          <button class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
            Paramètres
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  data() {
    return {
      profiles: {
        parent: {
          name: 'Parent',
          initial: 'P',
          bgColor: 'bg-teal-500',
          isAdmin: true,
          welcomeMessage: 'Gérez l\'apprentissage de votre famille',
          courses: [
            {
              id: 1,
              title: 'Gestion des profils',
              description: 'Configurez et gérez les profils de votre famille',
              duration: '5 min',
              color: 'bg-yellow-500',
              icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
            },
            {
              id: 2,
              title: 'Suivi des progrès',
              description: 'Consultez les statistiques d\'apprentissage',
              duration: '10 min',
              color: 'bg-green-500',
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
            }
          ]
        },
        ayna: {
          name: 'Ayna',
          initial: 'A',
          bgColor: 'bg-purple-500',
          isAdmin: false,
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
            }
          ]
        },
        nolann: {
          name: 'Nolann',
          initial: 'N',
          bgColor: 'bg-red-500',
          isAdmin: false,
          welcomeMessage: 'Prêt pour de nouvelles aventures numériques ?',
          courses: [
            {
              id: 1,
              title: 'Robots et IA',
              description: 'Découvre le monde fascinant de la robotique',
              duration: '1h',
              color: 'bg-red-500',
              icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
            },
            {
              id: 2,
              title: 'Mathématiques amusantes',
              description: 'Apprends les maths en jouant',
              duration: '45 min',
              color: 'bg-blue-500',
              icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
            }
          ]
        },
        elyo: {
          name: 'Elyo',
          initial: 'E',
          bgColor: 'bg-green-500',
          isAdmin: false,
          welcomeMessage: 'Explorons ensemble le monde numérique !',
          courses: [
            {
              id: 1,
              title: 'Découverte des couleurs',
              description: 'Apprends les couleurs avec des jeux interactifs',
              duration: '30 min',
              color: 'bg-green-500',
              icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z'
            },
            {
              id: 2,
              title: 'Formes et motifs',
              description: 'Reconnais les formes et crée des motifs',
              duration: '25 min',
              color: 'bg-yellow-500',
              icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
            }
          ]
        }
      },
      currentProfile: null
    }
  },
  created() {
    // Récupérer le profil sélectionné depuis le localStorage ou les paramètres d'URL
    const selectedProfile = this.$route.query.profile || localStorage.getItem('selectedProfile') || 'parent'
    this.currentProfile = this.profiles[selectedProfile] || this.profiles.parent
  },
  methods: {
    changeProfile() {
      this.$router.push('/')
    },
    manageProfiles() {
      this.$router.push('/manage-profiles')
    },
    openLessonScanner() {
      this.$router.push('/lesson-scanner')
    },
    openQuizManagement() {
      this.$router.push('/parent-quiz-management')
    }
  }
}
</script>
