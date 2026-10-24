<template>
  <!--
    LIQUID GLASS DESIGN - User Dashboard

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen overflow-hidden">
    <!-- Header avec profil sélectionné -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center space-x-4">
            <div
              class="td-brand-mark w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-lg"
              aria-hidden="true"
            >
              <span class="text-white font-bold text-lg">TD</span>
            </div>
            <p class="td-brand-name text-2xl font-bold text-white hidden sm:block">TeachDigital</p>
          </div>

          <!-- Profil et actions -->
          <div class="flex items-center space-x-4">
            <!-- Profil actuel -->
            <div v-if="currentProfile" class="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 transition-all">
              <div class="w-8 h-8 rounded-lg overflow-hidden border border-white/20 bg-white/10 backdrop-blur-xl">
                <img
                  v-if="currentProfileImage"
                  :src="currentProfileImage"
                  :alt="`Photo de ${currentProfile.name}`"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                >
                <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400" aria-hidden="true">
                  <span class="text-white text-sm font-semibold">{{ currentProfile.initial }}</span>
                </div>
              </div>
              <span class="text-white font-medium text-sm hidden sm:inline">{{ currentProfile.name }}</span>
            </div>
            <div v-else class="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10" role="status">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center" aria-hidden="true">
                <span class="text-white text-sm font-semibold">?</span>
              </div>
              <span class="text-white/70 font-medium text-sm">Chargement...</span>
            </div>

            <!-- Bouton changer de profil -->
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Changer de profil"
              aria-label="Changer de profil"
              @click="changeProfile"
            >
              <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div v-if="profileError" class="relative z-10 container mx-auto px-6 py-12">
      <div class="glass-card-dashboard text-center py-16 max-w-xl mx-auto" role="alert">
        <h2 class="text-2xl font-bold text-white mb-4">Ton espace n'a pas pu être chargé</h2>
        <p class="text-white/70 mb-2">{{ profileError }}</p>
        <p v-if="profileErrorRef" class="text-xs text-white/70 mb-6">{{ profileErrorRef }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl border border-white/20"
            @click="loadCurrentProfile"
          >
            Réessayer
          </button>
          <button
            type="button"
            class="px-6 py-3 bg-white/10 text-white rounded-xl border border-white/20"
            @click="changeProfile"
          >
            Changer de profil
          </button>
        </div>
      </div>
    </div>

    <div v-else class="relative z-10 container mx-auto px-6 py-12">
      <!-- Sections indisponibles (les autres restent affichées) -->
      <div v-if="failedSections.length" class="mb-8 bg-red-500/20 border border-red-500/30 text-red-100 px-6 py-4 rounded-xl" role="alert">
        <p>Certaines informations n'ont pas pu être chargées : {{ failedSections.join(', ') }}.</p>
        <button
          type="button"
          class="mt-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
          @click="loadSections(currentProfile.id)"
        >
          Réessayer
        </button>
      </div>

      <!-- Bienvenue -->
      <div class="text-center mb-16">
        <h1 class="text-5xl font-bold text-white mb-4">
          Salut {{ currentProfile?.name || 'Utilisateur' }} ! <span aria-hidden="true">👋</span>
        </h1>
        <p class="text-white/70 text-lg">
          {{ currentProfile?.welcomeMessage || 'Bienvenue dans votre espace d\'apprentissage !' }}
        </p>
      </div>

      <!-- Mes vidéos éducatives -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-white mb-8 text-center">Mes vidéos éducatives <span aria-hidden="true">🎬</span></h2>
        <div class="text-center mb-8">
          <p class="text-white/70 mb-6 text-lg">Découvre des vidéos adaptées à ton âge pour apprendre en s'amusant !</p>
          <button
            type="button"
            class="glass-button-action group"
            :disabled="!currentProfile"
            @click="openYouTubeViewer"
          >
            <svg aria-hidden="true" class="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>Voir mes vidéos</span>
          </button>
        </div>
      </div>

      <!-- Mes cours disponibles (pages HTML publiées par un parent) -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-white mb-8 text-center">Mes cours disponibles <span aria-hidden="true">📚</span></h2>
        <div v-if="isLoadingCoursePages" class="text-center py-12" role="status">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4" aria-hidden="true"></div>
          <p class="text-white/70">Chargement des cours...</p>
        </div>
        <p v-else-if="coursePages.length === 0" class="text-white/70 text-center text-lg">
          Pas encore de cours ici. Ils apparaîtront dès qu'ils seront publiés pour toi !
        </p>
        <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            v-for="page in coursePages"
            :key="page.id"
            type="button"
            class="glass-card-user group cursor-pointer text-left w-full"
            @click="openCoursePage(page)"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-white mb-1 truncate">{{ page.title }}</h3>
                <p class="text-white/70 text-sm mb-3 line-clamp-2">{{ page.description || 'Révise ton cours et entraîne-toi.' }}</p>
                <div class="flex items-center justify-between pt-2 border-t border-white/10">
                  <span class="text-xs px-2 py-1 rounded-full bg-indigo-500/30 text-indigo-200">{{ page.subject || 'Cours' }}</span>
                  <span class="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">Commencer <span aria-hidden="true">→</span></span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Mes badges (GET /api/badges/profile/:id + badges récents) -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-white mb-8 text-center">Mes badges <span aria-hidden="true">🏆</span></h2>
        <div class="max-w-xl mx-auto">
          <button
            type="button"
            class="glass-card-challenge from-green-500/20 to-blue-500/20 border-green-400/30 cursor-pointer group hover:border-green-400/50 transition-all text-left w-full"
            @click="viewBadges"
          >
            <span class="flex items-start space-x-4">
              <span class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg aria-hidden="true" class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </span>
              <span class="flex-1 block">
                <span class="block text-xl font-bold text-white mb-2">Voir mes badges</span>
                <span class="block text-white/70 mb-4">{{ badgeMessage }}</span>
                <span class="flex items-center justify-between pt-4 border-t border-green-400/20">
                  <span class="flex space-x-2" aria-hidden="true">
                    <span v-for="badge in recentBadgesDisplay" :key="badge.id" class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm backdrop-blur-sm">
                      {{ badge.icon }}
                    </span>
                    <span v-for="n in Math.max(0, 3 - recentBadgesDisplay.length)" :key="'empty-' + n" class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                      <span class="text-white/70 text-xs">?</span>
                    </span>
                  </span>
                  <span class="text-right block">
                    <span class="block text-2xl font-bold text-white">{{ badgeStats.unlocked }}/{{ badgeStats.total }}</span>
                    <span class="block text-xs text-white/70">Débloqués</span>
                  </span>
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>

      <!-- Mes interrogations -->
      <div v-if="userLessons.length > 0" class="mb-16">
        <h2 class="text-3xl font-bold text-white mb-8 text-center">Mes interrogations <span aria-hidden="true">📝</span></h2>
        <div v-if="isLoadingLessons" class="text-center py-12" role="status">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4" aria-hidden="true"></div>
          <p class="text-white/70">Chargement des leçons...</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            v-for="lesson in userLessons"
            :key="lesson.id"
            type="button"
            class="glass-card-user group cursor-pointer text-left w-full"
            @click="startLesson(lesson)"
          >
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg aria-hidden="true" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-2">
                  <h3 class="font-bold text-white truncate flex-1">{{ lesson.title }}</h3>
                  <span class="text-xs text-white/70 ml-2">{{ formatDate(lesson.created_at) }}</span>
                </div>
                <p class="text-white/70 text-sm mb-3 line-clamp-2">{{ lesson.description || 'Aucune description' }}</p>
                <div class="flex items-center justify-between pt-2 border-t border-white/10">
                  <span class="text-xs px-2 py-1 rounded-full bg-blue-500/30 text-blue-200">
                    {{ lesson.subject || 'Général' }}
                  </span>
                  <span class="text-xs text-white/70">{{ lesson.level || 'Tous niveaux' }}</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Mes activités récentes : activités assignées par le parent (GET /api/activities?child_id=) -->
      <div class="mb-16">
        <h2 class="text-3xl font-bold text-white mb-8 text-center">Mes activités récentes <span aria-hidden="true">📊</span></h2>
        <p v-if="isLoadingActivities" class="text-white/70 text-center" role="status">Chargement des activités...</p>
        <p v-else-if="recentActivities.length === 0" class="text-white/70 text-center text-lg">
          Aucune activité pour le moment.
        </p>
        <ul v-else class="space-y-4">
          <li v-for="activity in recentActivities" :key="activity.id" class="glass-card-activity">
            <div class="flex items-start space-x-4">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="activityStatus(activity).color"
                aria-hidden="true"
              >
                <svg aria-hidden="true" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="activityStatus(activity).icon"></path>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-white">{{ activity.title }}</p>
                <p v-if="activity.description" class="text-sm text-white/70 line-clamp-2">{{ activity.description }}</p>
                <p class="text-xs text-white/70 mt-1">
                  {{ activityStatus(activity).label }}<template v-if="activity.due_date"> · à rendre le {{ formatDate(activity.due_date) }}</template>
                </p>
              </div>
              <span class="text-sm text-white/70 ml-4 flex-shrink-0">{{ formatDate(activity.updated_at || activity.created_at) }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Paramètres rapides -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-white mb-8">Paramètres rapides <span aria-hidden="true">⚙️</span></h2>
        <div class="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            class="glass-button-quick"
            @click="viewProgress"
          >
            <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span>Suivi des progrès</span>
          </button>
          <button
            type="button"
            class="glass-button-quick glass-button-secondary"
            @click="showSettings"
          >
            <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Paramètres</span>
          </button>
          <button
            type="button"
            class="glass-button-quick glass-button-secondary"
            @click="showHelp"
          >
            <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Aide</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDate as formatDateFr } from '../utils/progressFormatters.js'
import { useProfileStore } from '../stores/profileStore.js'
import { useBadgeStore } from '../stores/badgeStore.js'
import { LessonService } from '../services/lessonService.js'
import { getCoursePages } from '../services/coursePageService.js'
import activityService from '../services/activityService.js'
import { describeError } from '../utils/apiErrors.js'

// Nombre d'activités affichées dans « Mes activités récentes »
const RECENT_ACTIVITIES_LIMIT = 5

// Libellé, couleur et pictogramme par statut d'activité (active, paused, completed, cancelled)
const ACTIVITY_STATUS = {
  active: { label: 'À faire', color: 'bg-green-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  paused: { label: 'En pause', color: 'bg-yellow-500', icon: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  completed: { label: 'Terminée', color: 'bg-blue-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  cancelled: { label: 'Annulée', color: 'bg-slate-500', icon: 'M6 18L18 6M6 6l12 12' }
}

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
      // Profil introuvable / API injoignable : écran d'erreur (jamais de profil fictif)
      profileError: '',
      profileErrorRef: null,
      // Libellés des sections dont le chargement a échoué
      failedSections: [],
      coursePages: [],
      isLoadingCoursePages: false,
      userLessons: [],
      isLoadingLessons: false,
      badgeStats: {
        total: 0,
        unlocked: 0,
        points: 0
      },
      recentBadges: [],
      // Activités assignées par le parent (les plus récentes d'abord, côté serveur)
      recentActivities: [],
      isLoadingActivities: false
    }
  },
  computed: {
    currentProfileImage() {
      if (!this.currentProfile) return null
      return this.currentProfile.image_data || this.currentProfile.image_url || null
    },
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
      this.profileError = ''
      this.profileErrorRef = null
      const profileId = this.$route.query.profile
      if (!profileId) {
        this.$router.replace('/')
        return
      }

      try {
        this.currentProfile = await this.profileStore.loadProfile(profileId)
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
        const { message, requestId } = describeError(error, 'Profil introuvable.')
        this.profileError = message
        this.profileErrorRef = requestId ? `Réf. ${requestId}` : null
        return
      }

      await this.loadSections(this.currentProfile.id)
    },

    // Cours, interrogations et badges en parallèle : un échec n'empêche pas les autres
    async loadSections(profileId) {
      const sections = [
        { label: 'cours', load: () => this.loadCoursePages(profileId) },
        { label: 'interrogations', load: () => this.loadUserLessons(profileId) },
        { label: 'badges', load: () => this.loadBadges(profileId) },
        { label: 'activités', load: () => this.loadActivities(profileId) }
      ]
      const results = await Promise.allSettled(sections.map(section => section.load()))
      this.failedSections = sections
        .filter((section, index) => results[index].status === 'rejected')
        .map(section => section.label)
      results.forEach((result) => {
        if (result.status === 'rejected') console.error('Section non chargée:', result.reason)
      })
    },

    async loadBadges(profileId) {
      await this.badgeStore.loadProfileBadges(profileId)
      this.badgeStats = this.badgeStore.badgeStats
      const recent = await this.badgeStore.getRecentBadges(profileId, 5)
      this.recentBadges = Array.isArray(recent) ? recent : []
    },

    async loadActivities(profileId) {
      this.isLoadingActivities = true
      try {
        const activities = await activityService.getActivitiesByChild(profileId)
        this.recentActivities = (Array.isArray(activities) ? activities : []).slice(0, RECENT_ACTIVITIES_LIMIT)
      } finally {
        this.isLoadingActivities = false
      }
    },

    activityStatus(activity) {
      return ACTIVITY_STATUS[activity.status] || { label: activity.status || 'Activité', color: 'bg-purple-500', icon: ACTIVITY_STATUS.active.icon }
    },

    async loadCoursePages(profileId) {
      this.isLoadingCoursePages = true
      try {
        this.coursePages = await getCoursePages({
          targetProfileId: profileId,
          published: true
        })
      } finally {
        this.isLoadingCoursePages = false
      }
    },

    async loadUserLessons(profileId) {
      this.isLoadingLessons = true
      try {
        this.userLessons = await LessonService.getLessonsByProfile(profileId)
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

    openCoursePage(page) {
      this.$router.push({
        name: 'CoursePageViewer',
        params: { id: page.id },
        query: { profile: this.currentProfile.id }
      })
    },

    startLesson(lesson) {
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.currentProfile.id,
          lessonId: lesson.id
        }
      })
    },

    formatDate(value) {
      return formatDateFr(value, { month: 'short', time: false })
    },

    showSettings() {
      this.$router.push({
        name: 'ChildSettings',
        query: {
          profile: this.currentProfile.id
        }
      })
    },
    showHelp() {
      this.$router.push({
        name: 'ChildHelp',
        query: {
          profile: this.currentProfile.id
        }
      })
    },
    viewProgress() {
      this.$router.push({
        name: 'ProgressTracking',
        query: {
          childId: this.currentProfile.id
        }
      })
    },

    viewBadges() {
      this.$router.push({
        name: 'BadgeManager',
        query: {
          profile: this.currentProfile.id
        }
      })
    },

    openYouTubeViewer() {
      if (!this.currentProfile?.id) return
      this.$router.push({
        name: 'YouTubeKidsViewer',
        query: {
          profile: this.currentProfile.id
        }
      }).catch(error => {
        console.error('Erreur de navigation:', error)
        this.$toast.error('Impossible d\'ouvrir les vidéos. Réessaie dans un instant.')
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
  border-radius: calc(1.5rem * var(--td-radius-scale, 1));
  background: var(--lg-glass-light);
  backdrop-filter: blur(var(--lg-glass-blur, 20px));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-elevation, 0 8px 32px var(--lg-glass-shadow));
  transition: all 0.3s ease;
}

.glass-card-user:hover {
  background: var(--lg-glass-heavy);
  border-color: var(--lg-glass-border-hover, rgba(255, 255, 255, 0.25));
  box-shadow: var(--lg-glass-shadow-hover, 0 12px 48px rgba(0, 0, 0, 0.15));
  transform: translateY(-4px);
}

/* Glass Card Challenge */
.glass-card-challenge {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-radius: calc(1.5rem * var(--td-radius-scale, 1));
  background: var(--lg-glass-light);
  backdrop-filter: blur(var(--lg-glass-blur, 20px));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-elevation, 0 8px 32px var(--lg-glass-shadow));
  transition: all 0.3s ease;
}

.glass-card-challenge:hover {
  background: var(--lg-glass-heavy);
  border-color: var(--lg-glass-border-hover, rgba(255, 255, 255, 0.25));
  box-shadow: var(--lg-glass-shadow-hover, 0 12px 48px rgba(0, 0, 0, 0.15));
  transform: translateY(-4px);
}

/* Glass Card Activity */
.glass-card-activity {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: calc(1rem * var(--td-radius-scale, 1));
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
  border-radius: calc(1.25rem * var(--td-radius-scale, 1));
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
  border-radius: calc(1rem * var(--td-radius-scale, 1));
  background: var(--td-accent-gradient-faint, linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2)));
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
  background: var(--td-accent-gradient-faint-hover, linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3)));
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
    border-radius: calc(1rem * var(--td-radius-scale, 1));
  }

  .glass-card-activity {
    padding: 0.75rem;
    border-radius: calc(0.75rem * var(--td-radius-scale, 1));
  }

  h1 {
    font-size: 2rem;
  }

  h2 {
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
    border-radius: calc(1.25rem * var(--td-radius-scale, 1));
  }
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
