<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec navigation -->
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
              <h1 class="text-2xl font-bold text-white">Suivi des Progrès</h1>
              <p class="text-sm text-white/60 hidden sm:block">Consultez les progrès d'apprentissage de vos enfants</p>
            </div>
          </div>
          <button 
            :disabled="isLoading"
            class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
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
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Enfants actifs</p>
            <p class="text-3xl font-bold text-white">{{ childrenStats.length }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Quiz terminés</p>
            <p class="text-3xl font-bold text-white">{{ totalQuizzesCompleted }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Score moyen</p>
            <p class="text-3xl font-bold text-white">{{ formatPercentage(averageScore) }}%</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Leçons terminées</p>
            <p class="text-3xl font-bold text-white">{{ totalLessonsCompleted }}</p>
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="glass-card-dashboard mb-8">
        <div class="flex flex-wrap gap-2 border-b border-white/10 pb-4 mb-8">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="[
              'px-4 py-2 rounded-xl transition-all font-medium text-sm flex items-center space-x-2',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                : 'text-white/80 hover:text-white border border-white/20 hover:bg-white/10'
            ]"
            @click="activeTab = tab.id"
          >
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Contenu des onglets -->
        <!-- Onglet Vue d'ensemble -->
        <div v-if="activeTab === 'overview'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="child in childrenStats" 
            :key="child.id" 
            class="border border-white/20 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div v-if="child.avatar" class="w-12 h-12 rounded-lg overflow-hidden">
                  <img :src="child.avatar" :alt="child.name" class="w-full h-full object-cover">
                </div>
                <div v-else class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <span class="text-white font-bold text-lg">{{ child.name?.charAt(0)?.toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="font-bold text-white">{{ child.name }}</h3>
                  <p class="text-white/60 text-sm">{{ getChildTypeLabel(child.type) }}</p>
                </div>
              </div>
              <div :class="[
                'w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm',
                getScoreClass(child.averageScore)
              ]">
                {{ formatPercentage(child.averageScore) }}%
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-white">{{ child.totalQuizzes }}</p>
                <p class="text-white/60 text-xs">Quiz</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-white">{{ child.completedLessons }}</p>
                <p class="text-white/60 text-xs">Leçons</p>
              </div>
              <div class="bg-white/10 rounded-lg p-3 text-center">
                <p class="text-2xl font-bold text-white">{{ child.totalTime }}</p>
                <p class="text-white/60 text-xs">Temps</p>
              </div>
            </div>

            <div class="mb-4">
              <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  class="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                  :style="{ width: formatPercentage(child.averageScore) + '%' }"
                ></div>
              </div>
              <p class="text-white/60 text-xs mt-2">Progrès: {{ formatPercentage(child.averageScore) }}%</p>
            </div>

            <button 
              class="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm"
              @click="viewChildProgress(child)"
            >
              Voir le détail
            </button>
          </div>
        </div>

        <!-- Onglet Historique -->
        <div v-if="activeTab === 'history'" class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 class="text-lg font-bold text-white mb-3 sm:mb-0">Historique des Quiz</h3>
            <select
              v-model="selectedPeriod"
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all w-full sm:w-auto"
              @change="filterQuizHistory"
            >
              <option value="all" class="bg-slate-900">Tous les quiz</option>
              <option value="week" class="bg-slate-900">Cette semaine</option>
              <option value="month" class="bg-slate-900">Ce mois</option>
              <option value="year" class="bg-slate-900">Cette année</option>
            </select>
          </div>

          <div v-if="filteredQuizHistory.length === 0" class="text-center py-12">
            <p class="text-white/60 text-lg">Aucun quiz trouvé</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="quiz in filteredQuizHistory"
              :key="quiz.id"
              class="border border-white/20 rounded-xl p-4 hover:bg-white/10 transition-all"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="font-bold text-white">{{ quiz.title }}</h4>
                  <p class="text-white/60 text-sm">{{ quiz.childName }} • {{ formatDate(quiz.completedAt) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold text-white">{{ quiz.score }}%</p>
                  <p class="text-white/60 text-xs">{{ quiz.questionsCorrect }}/{{ quiz.questionsTotal }} réponses</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Onglet Statistiques -->
        <div v-if="activeTab === 'statistics'" class="space-y-6">
          <h3 class="text-lg font-bold text-white">Statistiques Détaillées</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="border border-white/20 rounded-xl p-6">
              <h4 class="font-bold text-white mb-4">Meilleurs scores</h4>
              <div class="space-y-3">
                <div 
                  v-for="(item, index) in getTopScores()"
                  :key="index"
                  class="flex items-center justify-between"
                >
                  <span class="text-white/80">{{ item.name }}</span>
                  <span class="font-bold text-white">{{ item.score }}%</span>
                </div>
              </div>
            </div>

            <div class="border border-white/20 rounded-xl p-6">
              <h4 class="font-bold text-white mb-4">Activité récente</h4>
              <div class="space-y-3">
                <div 
                  v-for="(item, index) in getRecentActivity()"
                  :key="index"
                  class="flex items-center justify-between"
                >
                  <span class="text-white/80">{{ item.name }}</span>
                  <span class="text-white/60 text-sm">{{ item.date }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'
import VersionInfo from './VersionInfo.vue'

export default {
  name: 'ParentProgressTracking',
  components: {
    VersionInfo
  },
  data() {
    return {
      activeTab: 'overview',
      selectedPeriod: 'all',
      isLoading: false,
      childrenStats: [],
      quizHistory: [],
      filteredQuizHistory: [],
      tabs: [
        { id: 'overview', label: 'Vue d\'ensemble', icon: 'fas fa-th-large' },
        { id: 'history', label: 'Historique', icon: 'fas fa-history' },
        { id: 'statistics', label: 'Statistiques', icon: 'fas fa-chart-bar' }
      ]
    }
  },
  computed: {
    totalQuizzesCompleted() {
      return this.childrenStats.reduce((sum, child) => {
        const quizzes = Number(child.totalQuizzes) || 0
        return sum + quizzes
      }, 0)
    },
    averageScore() {
      if (this.childrenStats.length === 0) return 0
      const total = this.childrenStats.reduce((sum, child) => {
        const score = Number(child.averageScore) || 0
        return sum + score
      }, 0)
      const average = total / this.childrenStats.length
      return Math.round(average) || 0
    },
    totalLessonsCompleted() {
      return this.childrenStats.reduce((sum, child) => {
        const lessons = Number(child.completedLessons) || 0
        return sum + lessons
      }, 0)
    }
  },
  async created() {
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

    async loadData() {
      this.isLoading = true
      try {
        await this.loadChildrenStats()
        await this.loadQuizHistory()
        console.log('📊 [PARENT-PROGRESS] Données chargées:', {
          childrenCount: this.childrenStats.length,
          totalQuizzes: this.totalQuizzesCompleted
        })
      } catch (error) {
        console.error('❌ [PARENT-PROGRESS] Erreur lors du chargement:', error)
      } finally {
        this.isLoading = false
      }
    },

    async loadChildrenStats() {
      const store = useProfileStore()
      await store.loadProfiles()
      
      // Récupérer tous les profils enfants
      const children = store.profiles.filter(profile => 
        profile.type === 'child' || profile.type === 'teen'
      )
      
      this.childrenStats = await Promise.all(
        children.map(async (child) => {
          try {
            const stats = await LessonService.getDetailedChildStats(child.id)
            return {
              id: child.id,
              name: child.name,
              type: child.type,
              avatar: child.avatar,
              totalQuizzes: stats.totalQuizzes || 0,
              averageScore: stats.averageScore || 0,
              completedLessons: stats.completedLessons || 0,
              totalTime: this.formatTime(stats.totalTime || 0)
            }
          } catch (error) {
            console.error(`Erreur pour l'enfant ${child.name}:`, error)
            return {
              id: child.id,
              name: child.name,
              type: child.type,
              avatar: child.avatar,
              totalQuizzes: 0,
              averageScore: 0,
              completedLessons: 0,
              totalTime: '0min'
            }
          }
        })
      )
    },

    async loadQuizHistory() {
      const store = useProfileStore()
      const children = store.profiles.filter(profile => 
        profile.type === 'child' || profile.type === 'teen'
      )
      
      const allQuizHistory = []
      
      for (const child of children) {
        try {
          const childHistory = await LessonService.getChildQuizHistory(child.id)
          const historyWithChild = childHistory.map(quiz => ({
            ...quiz,
            childName: child.name
          }))
          allQuizHistory.push(...historyWithChild)
        } catch (error) {
          console.error(`Erreur historique pour ${child.name}:`, error)
        }
      }
      
      // Trier par date de completion
      this.quizHistory = allQuizHistory.sort((a, b) => 
        new Date(b.completedAt) - new Date(a.completedAt)
      )
      this.filteredQuizHistory = [...this.quizHistory]
    },

    filterQuizHistory() {
      if (this.selectedPeriod === 'all') {
        this.filteredQuizHistory = [...this.quizHistory]
        return
      }

      const now = new Date()
      const filterDate = new Date()

      switch (this.selectedPeriod) {
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }

      this.filteredQuizHistory = this.quizHistory.filter(quiz => {
        const quizDate = new Date(quiz.completedAt)
        return quizDate >= filterDate
      })
    },

    refreshData() {
      this.loadData()
    },

    viewChildProgress(child) {
      this.$router.push({
        name: 'ProgressTracking',
        query: {
          childId: child.id
        }
      })
    },

    getChildTypeLabel(type) {
      const types = {
        'child': 'Enfant',
        'teen': 'Adolescent',
        'adult': 'Adulte'
      }
      return types[type] || 'Enfant'
    },

    getScoreClass(percentage) {
      if (percentage >= 90) return 'excellent'
      if (percentage >= 80) return 'good'
      if (percentage >= 70) return 'average'
      return 'needs-improvement'
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    formatDuration(minutes) {
      if (!minutes) return 'N/A'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
    },

    formatTime(minutes) {
      if (!minutes) return '0min'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
    },

    goBack() {
      // Retourner au dashboard parent
      this.$router.push({
        name: 'Dashboard',
        query: {
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    },

    getTopScores() {
      const topScores = this.childrenStats
        .filter(child => child.averageScore > 0)
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5);

      return topScores.map(child => ({
        name: child.name,
        score: this.formatPercentage(child.averageScore)
      }));
    },

    getRecentActivity() {
      const recentActivity = this.quizHistory
        .slice(0, 5)
        .map(quiz => ({
          name: quiz.childName,
          date: this.formatDate(quiz.completedAt)
        }));

      return recentActivity;
    }
  }
}
</script>
