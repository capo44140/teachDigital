<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
              aria-label="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Gestion des Interrogations</h1>
              <p class="text-sm text-white/70 hidden sm:block">Suivez les progrès de vos enfants</p>
            </div>
          </div>
          <button
            type="button"
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            :disabled="isLoading"
            title="Actualiser les données"
            aria-label="Actualiser les données"
            @click="refreshData"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <p v-if="isLoading" class="sr-only" role="status">Chargement des données…</p>

      <!-- Statistiques indisponibles pour certains enfants -->
      <div v-if="loadErrors.length" class="mb-8 bg-red-500/20 border border-red-500/30 text-red-200 px-6 py-4 rounded-xl" role="alert">
        <p>Certaines statistiques n'ont pas pu être chargées : {{ loadErrors.join(', ') }}.</p>
        <button
          type="button"
          class="mt-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
          @click="refreshData"
        >
          Réessayer
        </button>
      </div>

      <!-- Statistiques globales -->
      <QuizGlobalStats :stats="computedGlobalStats" />

      <!-- Sélection de l'enfant -->
      <QuizChildSelector
        v-model="selectedChild"
        :children="childrenStats"
      />

      <!-- Détails de l'enfant sélectionné -->
      <div v-if="selectedChild" class="space-y-8">
        <!-- Statistiques de l'enfant -->
        <div class="glass-card-dashboard">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-white">
              Progrès de {{ selectedChild.name }}
            </h3>
            <span class="text-white/70 text-sm">Score moyen: <span class="text-white font-bold">{{ formatPercentage(selectedChild.averageScore) }}%</span></span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg aria-hidden="true" class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ selectedChild.totalLessons || 0 }}</p>
              <p class="text-white/70 text-sm mt-1">Leçons créées</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg aria-hidden="true" class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ selectedChild.totalQuizzes || 0 }}</p>
              <p class="text-white/70 text-sm mt-1">Quiz complétés</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg aria-hidden="true" class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ formatPercentage(selectedChild.averageScore) }}%</p>
              <p class="text-white/70 text-sm mt-1">Score moyen</p>
            </div>
          </div>
        </div>

        <!-- Résumé des quiz complétés -->
        <div v-if="selectedChild.quizHistory && selectedChild.quizHistory.length > 0" class="glass-card-dashboard">
          <h3 class="text-xl font-bold text-white mb-6">Résumé des quiz complétés</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/70 mb-1">Quiz complétés</p>
                  <p class="text-2xl font-bold text-white">{{ selectedChild.quizHistory.length }}</p>
                </div>
                <div class="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/70 mb-1">Score moyen</p>
                  <p class="text-2xl font-bold text-white">{{ formatPercentage(selectedChild.averageScore) }}%</p>
                </div>
                <div class="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/70 mb-1">Dernier quiz</p>
                  <p class="text-sm font-bold text-white">{{ selectedChild.quizHistory[0] ? formatDate(selectedChild.quizHistory[0].completedAt) : 'Aucun' }}</p>
                </div>
                <div class="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <svg aria-hidden="true" class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste des leçons -->
        <QuizLessonsList
          :lessons="selectedChild.lessons || []"
          :filter-status="filterStatus"
          :selected-child-id="selectedChild.id"
          @update:filter-status="filterStatus = $event"
          @view-lesson="viewLesson"
          @start-quiz="startQuiz"
          @delete-lesson="deleteLesson"
        />

        <!-- Quiz récents -->
        <QuizRecentList
          v-if="selectedChild.quizHistory && selectedChild.quizHistory.length > 0"
          :quizzes="selectedChild.quizHistory"
        />
      </div>
    </div>

    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { formatDate, formatPercentage } from '../utils/progressFormatters.js'
import VersionInfo from '../components/VersionInfo.vue'
import QuizGlobalStats from '../components/quiz/QuizGlobalStats.vue'
import QuizChildSelector from '../components/quiz/QuizChildSelector.vue'
import QuizLessonsList from '../components/quiz/QuizLessonsList.vue'
import QuizRecentList from '../components/quiz/QuizRecentList.vue'

export default {
  name: 'ParentQuizManagement',
  components: {
    VersionInfo,
    QuizGlobalStats,
    QuizChildSelector,
    QuizLessonsList,
    QuizRecentList
  },

  // Rafraîchir les données quand la route change
  async beforeRouteUpdate(to, from, next) {
    await this.loadData()
    next()
  },
  setup() {
    const profileStore = useProfileStore()
    const parentNav = useParentNavigation()
    return { profileStore, parentNav }
  },
  data() {
    return {
      selectedChild: null,
      childrenStats: [],
      globalStats: {
        totalLessons: 0,
        totalQuizzes: 0,
        averageScore: 0
      },
      filterStatus: 'all',
      isLoading: false,
      // Enfants dont les statistiques n'ont pas pu être chargées
      loadErrors: []
    }
  },
  computed: {
    computedGlobalStats() {
      return {
        ...this.globalStats,
        activeChildren: this.childrenStats.length
      }
    }
  },
  async created() {
    await this.loadData()
  },

  // Rafraîchir les données quand on revient sur la page
  async activated() {
    await this.loadData()
  },
  methods: {
    formatPercentage,

    formatDate(value) {
      return formatDate(value, { month: 'short' })
    },

    goBack() {
      this.parentNav.goToDashboard()
    },

    async loadData() {
      this.isLoading = true
      try {
        await this.profileStore.loadProfiles()

        // Charger les statistiques pour tous les enfants
        await this.loadChildrenStats()
        await this.loadGlobalStats()
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
        this.$toast.errorFrom(error, 'Impossible de charger les interrogations.')
      } finally {
        this.isLoading = false
      }
    },

    async loadChildrenStats() {
      const children = this.profileStore.nonAdminProfiles || []
      const results = await Promise.allSettled(
        children.map(child => LessonService.getLearningStats(child.id))
      )

      const failed = []
      this.childrenStats = children.map((child, index) => {
        const result = results[index]
        if (result.status === 'rejected') {
          console.error('Statistiques indisponibles pour', child.name, result.reason)
          failed.push(child.name)
          return { ...child }
        }
        return { ...child, ...(result.value || {}) }
      })
      this.loadErrors = failed

      // Garder l'enfant sélectionné à jour
      if (this.selectedChild) {
        this.selectedChild = this.childrenStats.find(child => String(child.id) === String(this.selectedChild.id)) || null
      }
    },

    async loadGlobalStats() {
      try {
        const globalStats = await LessonService.getGlobalStats()
        this.globalStats = {
          totalLessons: globalStats?.total_lessons || 0,
          totalQuizzes: globalStats?.total_quizzes_completed || 0,
          averageScore: globalStats?.average_score || 0
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques globales:', error)
        // Repli sur les statistiques calculées à partir des enfants
        this.globalStats = {
          totalLessons: this.childrenStats.reduce((sum, child) => sum + (child.totalLessons || 0), 0),
          totalQuizzes: this.childrenStats.reduce((sum, child) => sum + (child.totalQuizzes || 0), 0),
          averageScore: this.childrenStats.length > 0
            ? this.childrenStats.reduce((sum, child) => sum + (child.averageScore || 0), 0) / this.childrenStats.length
            : 0
        }
      }
    },

    async refreshData() {
      await this.loadData()
      if (!this.loadErrors.length) {
        this.$toast.success('Données actualisées')
      }
    },

    viewLesson(lesson) {
      // Page de détails de la leçon (aperçu de l'interrogation)
      this.$router.push({
        name: 'LessonDetails',
        params: { lessonId: lesson.id },
        query: {
          ...this.$route.query,
          childId: this.selectedChild.id
        }
      })
    },

    startQuiz(lesson) {
      // Aperçu parent du quiz : les réponses ne sont pas enregistrées
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.selectedChild.id,
          lessonId: lesson.id
        }
      })
    },

    async deleteLesson(lesson) {
      const confirmed = await this.$confirm({
        title: 'Supprimer la leçon ?',
        message: 'La leçon « ' + lesson.title + ' » et ses résultats seront supprimés définitivement.',
        confirmLabel: 'Supprimer',
        danger: true
      })
      if (!confirmed) return

      try {
        await LessonService.deleteLesson(lesson.id, this.selectedChild.id)
        await this.loadData()
        this.$toast.success('Leçon supprimée')
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        this.$toast.errorFrom(error, 'Erreur lors de la suppression de la leçon')
      }
    }
  }
}
</script>
