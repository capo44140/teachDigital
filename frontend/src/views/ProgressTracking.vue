<template>
  <!--
    LIQUID GLASS DESIGN - Suivi des Progrès (orchestrateur)
    Sous-composants : ProgressHistoryTab, ProgressStatsTab, ProgressRecommendationsTab
    Helpers : src/utils/progressFormatters.js
  -->
  <div class="min-h-screen overflow-hidden">
    <!-- Header avec navigation -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-3 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
              aria-label="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white flex items-center">
                <span class="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl mr-3 flex items-center justify-center" aria-hidden="true">
                  <span class="text-lg">📊</span>
                </span>
                Suivi des Progrès
              </h1>
              <p class="text-sm text-white/70 hidden sm:block">Progrès d'apprentissage détaillés</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-6xl mx-auto space-y-8">

        <!-- En-tête avec informations de l'enfant -->
        <div class="glass-card-dashboard">
          <div class="flex items-center space-x-6">
            <div class="child-avatar">
              <img v-if="selectedChild?.avatar" :src="selectedChild.avatar" :alt="selectedChild.name" class="w-full h-full object-cover rounded-xl" />
              <div v-else class="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center">
                <span class="text-white font-bold text-2xl">{{ selectedChild?.name?.charAt(0)?.toUpperCase() }}</span>
              </div>
            </div>
            <div class="flex-1">
              <h2 class="text-3xl font-bold text-white mb-2">{{ selectedChild?.name }}</h2>
              <p class="text-white/70 text-lg mb-6">{{ getChildTypeLabel(selectedChild?.type) }}</p>
              <div class="grid grid-cols-3 gap-6">
                <div class="text-center">
                  <div class="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-2xl font-bold text-blue-300">{{ totalQuizzesCompleted }}</span>
                  </div>
                  <p class="text-white/70 text-sm">Quiz terminés</p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-2xl font-bold text-green-300">{{ formatPercentage(averageScore) }}%</span>
                  </div>
                  <p class="text-white/70 text-sm">Score moyen</p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-2xl font-bold text-purple-300">{{ totalLessonsCompleted }}</span>
                  </div>
                  <p class="text-white/70 text-sm">Leçons terminées</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation des onglets -->
        <div class="glass-card-dashboard">
          <div class="flex flex-wrap gap-3 border-b border-white/10 pb-6 mb-8" role="tablist" aria-label="Suivi des progrès">
            <button
              v-for="tab in tabs"
              :id="`progress-tab-${tab.id}`"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id ? 'true' : 'false'"
              :aria-controls="`progress-panel-${tab.id}`"
              :class="[
                'px-6 py-3 rounded-xl transition-all font-medium flex items-center space-x-3',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                  : 'text-white/80 hover:text-white border border-white/20 hover:bg-white/10 backdrop-blur-xl'
              ]"
              @click="activeTab = tab.id"
            >
              <i :class="tab.icon" aria-hidden="true"></i>
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <!-- Délégation aux sous-composants -->
          <ProgressHistoryTab
            v-if="activeTab === 'history'"
            id="progress-panel-history"
            role="tabpanel"
            aria-labelledby="progress-tab-history"
            :history="quizHistory"
            :period="selectedPeriod"
            @update:period="selectedPeriod = $event"
          />

          <ProgressStatsTab
            v-else-if="activeTab === 'stats'"
            id="progress-panel-stats"
            role="tabpanel"
            aria-labelledby="progress-tab-stats"
            :score-by-type="scoreByType"
            :monthly-progress="monthlyProgress"
            :achievements="achievements"
            :summary="progressSummary"
          />

          <ProgressRecommendationsTab
            v-else-if="activeTab === 'recommendations'"
            id="progress-panel-recommendations"
            role="tabpanel"
            aria-labelledby="progress-tab-recommendations"
            :recommended-quizzes="recommendedQuizzes"
            :improvement-areas="improvementAreas"
            @start-quiz="startRecommendedQuiz"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { ProgressService, MAX_HISTORY_LIMIT } from '../services/progressService.js'
import { LessonService } from '../services/lessonService.js'
import { isParentSession, parentLocation } from '../composables/useParentNavigation.js'

// En dessous de ce score moyen (%), une matière ou une leçon est à retravailler
const IMPROVEMENT_THRESHOLD = 70
// Nombre maximal de recommandations par rubrique
const MAX_RECOMMENDATIONS = 3
import { formatPercentage, getChildTypeLabel } from '../utils/progressFormatters.js'
import ProgressHistoryTab from '../components/progress/ProgressHistoryTab.vue'
import ProgressStatsTab from '../components/progress/ProgressStatsTab.vue'
import ProgressRecommendationsTab from '../components/progress/ProgressRecommendationsTab.vue'

export default {
  name: 'ProgressTracking',
  components: {
    ProgressHistoryTab,
    ProgressStatsTab,
    ProgressRecommendationsTab
  },
  data() {
    return {
      selectedChild: null,
      activeTab: 'history',
      selectedPeriod: 'all',
      quizHistory: [],
      tabs: [
        { id: 'history', label: 'Historique', icon: 'fas fa-history' },
        { id: 'stats', label: 'Statistiques', icon: 'fas fa-chart-bar' },
        { id: 'recommendations', label: 'Recommandations', icon: 'fas fa-lightbulb' }
      ],
      scoreByType: [],
      monthlyProgress: [],
      achievements: [],
      recommendedQuizzes: [],
      improvementAreas: [],
      progressSummary: null
    }
  },
  computed: {
    totalQuizzesCompleted() {
      return this.quizHistory.length
    },
    averageScore() {
      if (this.quizHistory.length === 0) return 0
      const total = this.quizHistory.reduce((sum, quiz) => sum + (Number(quiz.percentage) || 0), 0)
      return Math.round(total / this.quizHistory.length) || 0
    },
    totalLessonsCompleted() {
      // Une page de cours compte comme une leçon distincte
      return new Set(this.quizHistory.map(quiz => quiz.lessonId ?? `page-${quiz.coursePageId}`)).size
    }
  },
  async created() {
    await this.loadChildProfile()
    await this.loadProgressData()
  },
  methods: {
    formatPercentage,
    getChildTypeLabel,

    async loadChildProfile() {
      const childId = this.$route.query.childId
      if (!childId) {
        this.$router.push({ name: 'ProfileSelector' })
        return
      }

      const store = useProfileStore()
      await store.loadProfiles()
      this.selectedChild = store.getProfileById(childId)

      if (!this.selectedChild) {
        console.error('Profil enfant non trouvé:', childId)
        this.$router.push({ name: 'ProfileSelector' })
      }
    },

    async loadProgressData() {
      if (!this.selectedChild) return

      try {
        // Historique complet (vues « année » / « tout ») : 500 entrées maximum côté serveur
        this.progressSummary = await ProgressService.getProfileProgressSummary(this.selectedChild.id, {
          historyLimit: MAX_HISTORY_LIMIT
        })

        this.quizHistory = (this.progressSummary?.recentHistory || []).map(q => ({
          id: q.id,
          lessonId: q.lessonId,
          lessonTitle: q.lessonTitle,
          lessonSubject: q.lessonSubject,
          source: q.source,
          coursePageId: q.coursePageId,
          score: q.score,
          totalQuestions: q.totalQuestions,
          percentage: q.percentage,
          completedAt: q.completedAt,
          duration: q.duration || 0,
          answers: q.answers
        }))

        this.loadStatistics()
        await this.loadRecommendations()
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      }
    },

    loadStatistics() {
      this.scoreByType = (this.progressSummary?.skills || []).map(s => ({
        type: s.subject,
        averageScore: Math.round(Number(s.averageScore) || 0)
      }))

      this.monthlyProgress = (this.progressSummary?.monthlyProgress || []).map(m => ({
        month: m.monthKey,
        quizCount: Number(m.quizCount) || 0,
        averageScore: Math.round(Number(m.averageScore) || 0)
      }))

      this.achievements = this.progressSummary?.achievements || []
    },

    /**
     * Recommandations calculées à partir des données réelles :
     * - points d'amélioration : matières dont la moyenne est inférieure au seuil (résumé de progression) ;
     * - quiz recommandés : leçons de l'enfant jamais faites, puis celles dont le meilleur score est sous le seuil.
     */
    async loadRecommendations() {
      this.improvementAreas = (this.progressSummary?.skills || [])
        .map(skill => ({ subject: skill.subject, averageScore: Math.round(Number(skill.averageScore) || 0) }))
        .filter(skill => skill.subject && skill.averageScore < IMPROVEMENT_THRESHOLD)
        .sort((a, b) => a.averageScore - b.averageScore)
        .slice(0, MAX_RECOMMENDATIONS)
        .map(skill => ({
          id: skill.subject,
          title: skill.subject,
          description: `Score moyen : ${skill.averageScore} %`,
          icon: '🎯',
          suggestions: ['Relis la leçon avant de recommencer', 'Refais les quiz de cette matière']
        }))

      let lessons = []
      try {
        lessons = await LessonService.getLessonsByProfile(this.selectedChild.id)
      } catch (error) {
        console.error('Leçons indisponibles pour les recommandations:', error)
      }

      const bestScores = new Map()
      for (const quiz of this.quizHistory) {
        if (quiz.lessonId == null) continue
        const key = String(quiz.lessonId)
        bestScores.set(key, Math.max(bestScores.get(key) ?? 0, Number(quiz.percentage) || 0))
      }
      const notDone = lessons.filter(lesson => !bestScores.has(String(lesson.id)))
      const toRetry = lessons
        .filter(lesson => bestScores.has(String(lesson.id)) && bestScores.get(String(lesson.id)) < IMPROVEMENT_THRESHOLD)
        .sort((a, b) => bestScores.get(String(a.id)) - bestScores.get(String(b.id)))

      this.recommendedQuizzes = [...notDone, ...toRetry].slice(0, MAX_RECOMMENDATIONS).map(lesson => {
        const best = bestScores.get(String(lesson.id))
        return {
          id: lesson.id,
          lessonId: lesson.id,
          title: lesson.title,
          description: best === undefined ? 'Pas encore fait' : `Meilleur score : ${Math.round(best)} %`,
          subject: lesson.subject || 'Leçon'
        }
      })
    },

    startRecommendedQuiz(quiz) {
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.selectedChild.id,
          lessonId: quiz.lessonId
        }
      })
    },

    goBack() {
      // Ouvert depuis l'espace parent : y revenir (ne pas promener la session parent
      // dans l'espace de l'enfant)
      if (isParentSession()) {
        this.$router.push(parentLocation('/parent-progress-tracking'))
        return
      }
      this.$router.push({
        name: 'UserDashboard',
        query: { profile: this.selectedChild.id }
      })
    }
  }
}
</script>

<style scoped>
/* NOTE: .glass-card-dashboard est centralisé (src/styles/liquid-glass.css) ; fond animé : AppBackground.vue */

button {
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

.child-avatar {
  width: 5rem;
  height: 5rem;
  border-radius: 1rem;
  overflow: hidden;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  font-weight: bold;
  flex-shrink: 0;
}

.child-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.glass-card-dashboard > div:last-child > div {
  animation: fadeInUp 0.3s ease-out;
  animation-fill-mode: both;
}

.glass-card-dashboard > div:last-child > div:nth-child(1) { animation-delay: 0.1s; }
.glass-card-dashboard > div:last-child > div:nth-child(2) { animation-delay: 0.2s; }
.glass-card-dashboard > div:last-child > div:nth-child(3) { animation-delay: 0.3s; }
.glass-card-dashboard > div:last-child > div:nth-child(4) { animation-delay: 0.4s; }
.glass-card-dashboard > div:last-child > div:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .glass-card-dashboard { padding: 1.5rem; border-radius: 1.5rem; }
  .max-w-6xl { max-width: 100%; padding: 0 1rem; }
  .child-avatar { width: 4rem; height: 4rem; font-size: 1.5rem; }
  .grid-cols-3 { grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 1rem; }
}

@media (max-width: 480px) {
  .glass-card-dashboard { padding: 1rem; border-radius: 1rem; }
  .child-avatar { width: 3rem; height: 3rem; font-size: 1.25rem; }
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }

/* Inputs */
select {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  color: white;
  transition: all 0.3s ease;
}

select:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

select option {
  background: #1e293b;
  color: white;
}
</style>
