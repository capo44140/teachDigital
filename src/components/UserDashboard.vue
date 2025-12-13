<template>
  <!-- 
    LIQUID GLASS DESIGN - User Dashboard
    
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
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Bienvenue -->
      <div class="text-center mb-16">
        <h2 class="text-5xl font-bold text-white mb-4">
          Salut {{ currentProfile?.name || 'Utilisateur' }} ! 👋
        </h2>
        <p class="text-white/60 text-lg">
          {{ currentProfile?.welcomeMessage || 'Bienvenue dans votre espace d\'apprentissage !' }}
        </p>
      </div>

      <!-- Mes vidéos éducatives -->
      <div class="mb-16">
        <h3 class="text-3xl font-bold text-white mb-8 text-center">Mes vidéos éducatives 🎬</h3>
        <div class="text-center mb-8">
          <p class="text-white/60 mb-6 text-lg">Découvre des vidéos adaptées à ton âge pour apprendre en s'amusant !</p>
          <button 
            class="glass-button-action group"
            @click="openYouTubeViewer"
          >
            <svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>Voir mes vidéos</span>
          </button>
        </div>
      </div>

      <!-- Mes cours disponibles -->
      <div class="mb-16">
        <h3 class="text-3xl font-bold text-white mb-8 text-center">Mes cours disponibles 📚</h3>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="course in (currentProfile?.courses || [])" :key="course.id" 
               class="glass-card-user group cursor-pointer"
               @click="startCourse(course)">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                   :class="course.color">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.5 2 21.08 4.905 24 8.5 24m0-13c5.5 0 10 4.745 10 10.5 0 3.582-2.905 6.5-6.5 6.5m0-13v13m0 0c3.595 0 6.5-2.918 6.5-6.5 0-5.755-4.5-10.5-10-10.5"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-lg font-bold text-white mb-1 truncate">{{ course.title }}</h4>
                <p class="text-white/60 text-sm mb-3 line-clamp-2">{{ course.description }}</p>
                <div class="flex items-center justify-between pt-2 border-t border-white/10">
                  <span class="text-xs text-white/50">⏱️ {{ course.duration }}</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">Commencer →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mes défis du jour -->
      <div class="mb-16">
        <h3 class="text-3xl font-bold text-white mb-8 text-center">Mes défis du jour 🎯</h3>
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Défi du jour -->
          <div class="glass-card-challenge from-yellow-500/20 to-orange-500/20 border-yellow-400/30">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="text-xl font-bold text-white mb-2">Défi du jour</h4>
                <p class="text-white/70 mb-4">Complète 3 exercices de programmation pour débloquer un nouveau badge !</p>
                <div class="flex items-center justify-between pt-4 border-t border-yellow-400/20">
                  <span class="text-sm text-white/60">Progression: 1/3</span>
                  <div class="w-24 bg-white/10 rounded-full h-2">
                    <div class="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" style="width: 33%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mes badges -->
          <div class="glass-card-challenge from-green-500/20 to-blue-500/20 border-green-400/30 cursor-pointer group hover:border-green-400/50 transition-all"
               @click="viewBadges">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="text-xl font-bold text-white mb-2">Mes badges</h4>
                <p class="text-white/70 mb-4">{{ badgeMessage }}</p>
                <div class="flex items-center justify-between pt-4 border-t border-green-400/20">
                  <div class="flex space-x-2">
                    <div v-for="badge in recentBadgesDisplay" :key="badge.id" class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm backdrop-blur-sm">
                      {{ badge.icon }}
                    </div>
                    <div v-for="n in Math.max(0, 3 - recentBadgesDisplay.length)" :key="'empty-' + n" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                      <span class="text-white/40 text-xs">?</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-bold text-white">{{ badgeStats.unlocked }}/{{ badgeStats.total }}</div>
                    <div class="text-xs text-white/50">Débloqués</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mes interrogations -->
      <div v-if="userLessons.length > 0" class="mb-16">
        <h3 class="text-3xl font-bold text-white mb-8 text-center">Mes interrogations 📝</h3>
        <div v-if="isLoadingLessons" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4"></div>
          <p class="text-white/60">Chargement des leçons...</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="lesson in userLessons" :key="lesson.id" 
               class="glass-card-user group cursor-pointer"
               @click="startLesson(lesson)">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-bold text-white truncate flex-1">{{ lesson.title }}</h4>
                  <span class="text-xs text-white/50 ml-2">{{ formatDate(lesson.created_at) }}</span>
                </div>
                <p class="text-white/60 text-sm mb-3 line-clamp-2">{{ lesson.description || 'Aucune description' }}</p>
                <div class="flex items-center justify-between pt-2 border-t border-white/10">
                  <span class="text-xs px-2 py-1 rounded-full bg-blue-500/30 text-blue-200">
                    {{ lesson.subject || 'Général' }}
                  </span>
                  <span class="text-xs text-white/40">{{ lesson.level || 'Tous niveaux' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mes activités récentes -->
      <div class="mb-16">
        <h3 class="text-3xl font-bold text-white mb-8 text-center">Mes activités récentes 📊</h3>
        <div class="space-y-4">
          <div v-for="activity in recentActivities" :key="activity.id" 
               class="glass-card-activity">
            <div class="flex items-start space-x-4">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                   :class="activity.color">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="activity.icon"></path>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-white">{{ activity.title }}</p>
                <p class="text-sm text-white/60">{{ activity.description }}</p>
              </div>
              <span class="text-sm text-white/40 ml-4 flex-shrink-0">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Paramètres rapides -->
      <div class="text-center">
        <h3 class="text-3xl font-bold text-white mb-8">Paramètres rapides ⚙️</h3>
        <div class="flex flex-wrap justify-center gap-4">
          <button 
            class="glass-button-quick"
            @click="viewProgress"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span>Suivi des progrès</span>
          </button>
          <button 
            class="glass-button-quick glass-button-secondary"
            @click="showSettings"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Paramètres</span>
          </button>
          <button 
            class="glass-button-quick glass-button-secondary"
            @click="showHelp"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Aide</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { useBadgeStore } from '../stores/badgeStore.js'
import { LessonService } from '../services/lessonService.js'

export default {
  name: 'UserDashboard',
  setup() {
    const profileStore = useProfileStore()
    const badgeStore = useBadgeStore()
    return { profileStore, badgeStore }
  },
  data() {
    return {
      currentProfile: null,
      userLessons: [],
      isLoadingLessons: false,
      badgeStats: {
        total: 0,
        unlocked: 0,
        points: 0
      },
      recentBadges: [],
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
  computed: {
    badgeMessage() {
      if (this.badgeStats.unlocked === 0) {
        return 'Commence à apprendre pour débloquer des badges !'
      } else if (this.badgeStats.unlocked < 3) {
        return `Tu as débloqué ${this.badgeStats.unlocked} badge${this.badgeStats.unlocked > 1 ? 's' : ''} ! Continue comme ça !`
      } else {
        return `Bravo ! ${this.badgeStats.unlocked} badges débloqués ! Tu es sur la bonne voie !`
      }
    },
    recentBadgesDisplay() {
      return this.recentBadges.slice(0, 3)
    }
  },
  async created() {
    await this.loadCurrentProfile()
  },
  methods: {
    async loadCurrentProfile() {
      try {
        // Récupérer le profil depuis les paramètres d'URL ou le store
        const profileId = this.$route.query.profile
        
        if (profileId) {
          await this.profileStore.loadProfile(profileId)
          this.currentProfile = this.profileStore.currentProfile
          // Charger les leçons du profil
          await this.loadUserLessons(profileId)
          // Charger les badges du profil
          await this.loadBadges(profileId)
        } else {
          // Profil par défaut pour les utilisateurs non-admin
          this.currentProfile = {
            id: 'user',
            name: 'Utilisateur',
            initial: 'U',
            bgColor: 'bg-purple-500',
            is_child: true,
            is_teen: false,
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
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
        // Profil de fallback en cas d'erreur
        this.currentProfile = {
          id: 'fallback',
          name: 'Utilisateur',
          initial: 'U',
          bgColor: 'bg-gray-500',
          is_child: true,
          is_teen: false,
          welcomeMessage: 'Bienvenue !',
          courses: []
        }
      }
    },
    
    async loadBadges(profileId) {
      try {
        await this.badgeStore.loadProfileBadges(profileId)
        this.badgeStats = this.badgeStore.badgeStats
        this.recentBadges = await this.badgeStore.getRecentBadges(profileId, 5)
      } catch (error) {
        console.error('Erreur lors du chargement des badges:', error)
      }
    },
    
    async loadUserLessons(profileId) {
      this.isLoadingLessons = true
      try {
        this.userLessons = await LessonService.getLessonsByProfile(profileId)
        console.log('Leçons chargées:', this.userLessons)
      } catch (error) {
        console.error('Erreur lors du chargement des leçons:', error)
      } finally {
        this.isLoadingLessons = false
      }
    },
    
    changeProfile() {
      if (this.currentProfile && this.currentProfile.is_admin) {
        console.warn('Tentative de changement de profil depuis un compte admin - redirection vers le dashboard admin')
        this.$router.push({ path: '/dashboard', query: { profile: this.currentProfile.id } })
        return
      }
      this.$router.push('/')
    },
    
    startCourse(course) {
      console.log('Démarrage du cours:', course.title)
      alert(`Démarrage du cours: ${course.title}`)
    },
    
    startLesson(lesson) {
      console.log('Démarrer la leçon:', lesson)
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.currentProfile.id,
          lessonId: lesson.id
        }
      })
    },
    
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    },
    
    showSettings() {
      console.log('Affichage des paramètres')
      this.$router.push({
        name: 'ChildSettings',
        query: {
          profile: this.currentProfile.id
        }
      })
    },
    showHelp() {
      console.log('Affichage de l\'aide')
      this.$router.push({
        name: 'ChildHelp',
        query: {
          profile: this.currentProfile.id
        }
      })
    },
    viewProgress() {
      console.log('Accès au suivi des progrès')
      this.$router.push({
        name: 'ProgressTracking',
        query: {
          childId: this.currentProfile.id
        }
      })
    },
    
    viewBadges() {
      console.log('Accès aux badges')
      this.$router.push({
        name: 'BadgeManager',
        query: {
          profile: this.currentProfile.id
        }
      })
    },
    
    openYouTubeViewer() {
      console.log('Ouverture du visualiseur YouTube')
      
      if (!this.currentProfile?.id) {
        console.error('Aucun profil chargé')
        alert('Erreur: Aucun profil chargé. Veuillez vous reconnecter.')
        return
      }
      
      this.$router.push({
        name: 'YouTubeKidsViewer',
        query: {
          profile: this.currentProfile.id
        }
      }).catch(error => {
        console.error('Erreur de navigation:', error)
        alert('Erreur de navigation: ' + error.message)
      })
    }
  }
}
</script>

<style scoped>
/* Glass Card User */
.glass-card-user {
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

.glass-card-user:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

/* Glass Card Challenge */
.glass-card-challenge {
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

.glass-card-challenge:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

/* Glass Card Activity */
.glass-card-activity {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.glass-card-activity:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Glass Button Action */
.glass-button-action {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.glass-button-action:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* Glass Button Quick */
.glass-button-quick {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 500;
  font-size: 0.95rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.glass-button-quick:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3));
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.glass-button-secondary {
  background: rgba(255, 255, 255, 0.08);
}

.glass-button-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Responsive */
@media (max-width: 640px) {
  .glass-card-user,
  .glass-card-challenge {
    padding: 1rem;
    border-radius: 1rem;
  }

  .glass-card-activity {
    padding: 0.75rem;
    border-radius: 0.75rem;
  }

  h2 {
    font-size: 2rem;
  }

  h3 {
    font-size: 1.5rem;
  }

  p {
    font-size: 0.95rem;
  }

  .glass-button-quick {
    padding: 0.625rem 1rem;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .glass-card-user,
  .glass-card-challenge {
    padding: 1.25rem;
    border-radius: 1.25rem;
  }
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
