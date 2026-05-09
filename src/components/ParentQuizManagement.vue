<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Gestion des Interrogations</h1>
              <p class="text-sm text-white/60 hidden sm:block">Suivez les progrès de vos enfants</p>
            </div>
          </div>
          <button
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
            :disabled="isLoading"
            title="Actualiser les données"
            @click="refreshData"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
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
            <span class="text-white/60 text-sm">Score moyen: <span class="text-white font-bold">{{ formatPercentage(selectedChild.averageScore) }}%</span></span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ selectedChild.totalLessons || 0 }}</p>
              <p class="text-white/60 text-sm mt-1">Leçons créées</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ selectedChild.totalQuizzes || 0 }}</p>
              <p class="text-white/60 text-sm mt-1">Quiz complétés</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <p class="text-3xl font-bold text-white">{{ formatPercentage(selectedChild.averageScore) }}%</p>
              <p class="text-white/60 text-sm mt-1">Score moyen</p>
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
                  <p class="text-sm font-medium text-white/60 mb-1">Quiz complétés</p>
                  <p class="text-2xl font-bold text-white">{{ selectedChild.quizHistory.length }}</p>
                </div>
                <div class="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/60 mb-1">Score moyen</p>
                  <p class="text-2xl font-bold text-white">{{ formatPercentage(selectedChild.averageScore) }}%</p>
                </div>
                <div class="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white/60 mb-1">Dernier quiz</p>
                  <p class="text-sm font-bold text-white">{{ selectedChild.quizHistory[0] ? formatDate(selectedChild.quizHistory[0].completedAt) : 'Aucun' }}</p>
                </div>
                <div class="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </main>

    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'
import { migrationService } from '../services/migrationService.js'
import VersionInfo from './VersionInfo.vue'
import { Icon } from '@iconify/vue'
import QuizGlobalStats from './QuizGlobalStats.vue'
import QuizChildSelector from './QuizChildSelector.vue'
import QuizLessonsList from './QuizLessonsList.vue'
import QuizRecentList from './QuizRecentList.vue'

export default {
  name: 'ParentQuizManagement',
  components: {
    VersionInfo,
    Icon,
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
      isLoading: false
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
    // Fonction utilitaire pour formater les pourcentages
    formatPercentage(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    },

    // Fonction utilitaire pour formater les nombres
    formatNumber(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    },

    goBack() {
      this.$router.push('/dashboard')
    },

    async loadData() {
      this.isLoading = true
      try {
        const store = useProfileStore()
        await store.loadProfiles()

        // Charger les statistiques pour tous les enfants
        await this.loadChildrenStats()
        await this.loadGlobalStats()
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        this.isLoading = false
      }
    },

    async loadChildrenStats() {
      const store = useProfileStore()
      const children = store.nonAdminProfiles || []

      this.childrenStats = await Promise.all(
        children.map(async (child) => {
          // Utiliser le service de migration pour récupérer les statistiques détaillées
          const detailedStats = await migrationService.getChildStats(child.id)

          return {
            ...child,
            ...detailedStats
          }
        })
      )
    },

    async loadGlobalStats() {
      try {
        // Utiliser la nouvelle méthode pour récupérer les statistiques globales
        const globalStats = await LessonService.getGlobalStats()
        this.globalStats = {
          totalLessons: globalStats.total_lessons || 0,
          totalQuizzes: globalStats.total_quizzes_completed || 0,
          averageScore: globalStats.average_score || 0
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques globales:', error)
        // Fallback sur les statistiques calculées localement
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
      this.isLoading = true
      try {
        await this.loadData()
        // Afficher une notification de succès
        this.$toast?.success('Données actualisées avec succès!')
      } catch (error) {
        console.error('Erreur lors de l\'actualisation:', error)
        this.$toast?.error('Erreur lors de l\'actualisation des données')
      } finally {
        this.isLoading = false
      }
    },

    viewLesson(lesson) {
      // Rediriger vers la page de détails de la leçon (aperçu interrogation)
      // IMPORTANT: conserver les query params (profile/unlocked) pour passer le guard admin
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
      // Rediriger vers le quiz
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.selectedChild.id,
          lessonId: lesson.id
        }
      })
    },

    async deleteLesson(lesson) {
      if (confirm(`Êtes-vous sûr de vouloir supprimer la leçon "${lesson.title}" ?`)) {
        try {
          // Sauvegarder l'ID de l'enfant sélectionné
          const selectedChildId = this.selectedChild.id

          // Supprimer la leçon
          await LessonService.deleteLesson(lesson.id, this.selectedChild.id)

          // Recharger toutes les données
          await this.loadData()

          // Resélectionner l'enfant pour actualiser la vue
          const updatedChild = this.childrenStats.find(child => child.id === selectedChildId)
          if (updatedChild) {
            this.selectedChild = updatedChild
          }

          // Afficher une notification de succès
          this.$toast?.success('Leçon supprimée avec succès!')
        } catch (error) {
          console.error('Erreur lors de la suppression:', error)
          this.$toast?.error('Erreur lors de la suppression de la leçon')
        }
      }
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>
