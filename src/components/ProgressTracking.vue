<template>
  <!--
    LIQUID GLASS DESIGN - Suivi des Progrès

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec navigation -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white flex items-center">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl mr-3 flex items-center justify-center">
                  <span class="text-lg">📊</span>
                </div>
                Suivi des Progrès
              </h1>
              <p class="text-sm text-white/60 hidden sm:block">Progrès d'apprentissage détaillés</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
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
              <p class="text-white/60 text-lg mb-6">{{ getChildTypeLabel(selectedChild?.type) }}</p>
              <div class="grid grid-cols-3 gap-6">
                <div class="text-center">
                  <div class="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-2xl font-bold text-blue-300">{{ totalQuizzesCompleted }}</span>
                  </div>
                  <p class="text-white/60 text-sm">Quiz terminés</p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-2xl font-bold text-green-300">{{ formatPercentage(averageScore) }}%</span>
                  </div>
                  <p class="text-white/60 text-sm">Score moyen</p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span class="text-2xl font-bold text-purple-300">{{ totalLessonsCompleted }}</span>
                  </div>
                  <p class="text-white/60 text-sm">Leçons terminées</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation des onglets -->
        <div class="glass-card-dashboard">
          <div class="flex flex-wrap gap-3 border-b border-white/10 pb-6 mb-8">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              :class="[
                'px-6 py-3 rounded-xl transition-all font-medium flex items-center space-x-3',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                  : 'text-white/80 hover:text-white border border-white/20 hover:bg-white/10 backdrop-blur-xl'
              ]"
              @click="activeTab = tab.id"
            >
              <i :class="tab.icon"></i>
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <!-- Contenu des onglets -->
          <!-- Onglet Historique des Quiz -->
          <div v-if="activeTab === 'history'" class="space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 class="text-xl font-bold text-white mb-3 sm:mb-0">Historique des Quiz</h3>
              <select 
                v-model="selectedPeriod" 
                class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full sm:w-auto"
                @change="filterQuizHistory"
              >
                <option value="all" class="bg-slate-900">Tous les quiz</option>
                <option value="week" class="bg-slate-900">Cette semaine</option>
                <option value="month" class="bg-slate-900">Ce mois</option>
                <option value="year" class="bg-slate-900">Cette année</option>
              </select>
            </div>

            <div v-if="filteredQuizHistory.length === 0" class="text-center py-12">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span class="text-4xl">📚</span>
              </div>
              <h4 class="text-xl font-bold text-white mb-2">Aucun quiz trouvé</h4>
              <p class="text-white/60">Commencez par faire des quiz pour voir votre historique ici.</p>
            </div>

            <div v-else class="space-y-4">
              <div 
                v-for="quiz in filteredQuizHistory" 
                :key="quiz.id"
                class="glass-quiz-item"
              >
                <div class="flex items-center justify-between mb-4">
                  <div class="flex-1">
                    <h4 class="text-lg font-bold text-white mb-1">{{ quiz.lessonTitle || 'Quiz' }}</h4>
                    <p class="text-white/60 text-sm">{{ formatDate(quiz.completedAt) }}</p>
                  </div>
                  <div class="text-right">
                    <div :class="[
                      'px-4 py-2 rounded-xl font-bold text-lg',
                      getScoreClass(quiz.percentage)
                    ]">
                      {{ formatPercentage(quiz.percentage) }}%
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex space-x-4 text-white/60 text-sm">
                    <span>{{ quiz.score }}/{{ quiz.totalQuestions }} questions</span>
                    <span>{{ formatDuration(quiz.duration) }}</span>
                  </div>
                </div>
                <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    class="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                    :style="{ width: formatPercentage(quiz.percentage) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Onglet Statistiques -->
          <div v-if="activeTab === 'stats'" class="space-y-6">
            <h3 class="text-xl font-bold text-white mb-6">Statistiques Détaillées</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Score moyen par type de quiz -->
              <div class="glass-stat-card">
                <h4 class="text-lg font-bold text-white mb-4 flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-lg flex items-center justify-center mr-3">
                    <span class="text-blue-300">📊</span>
                  </div>
                  Score moyen par type
                </h4>
                <div class="space-y-4">
                  <div v-for="type in scoreByType" :key="type.type" class="space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="text-white/80 font-medium">{{ type.type }}</span>
                      <span class="text-white font-bold">{{ type.averageScore }}%</span>
                    </div>
                    <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        class="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                        :style="{ width: type.averageScore + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Progrès mensuel -->
              <div class="glass-stat-card">
                <h4 class="text-lg font-bold text-white mb-4 flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-lg flex items-center justify-center mr-3">
                    <span class="text-green-300">📅</span>
                  </div>
                  Progrès mensuel
                </h4>
                <div class="space-y-3">
                  <div v-for="month in monthlyProgress" :key="month.month" class="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                    <div>
                      <span class="text-white font-medium">{{ month.month }}</span>
                      <p class="text-white/60 text-sm">{{ month.quizCount }} quiz</p>
                    </div>
                    <div class="text-right">
                      <span class="text-white font-bold">{{ month.averageScore }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Temps d'apprentissage -->
              <div class="glass-stat-card">
                <h4 class="text-lg font-bold text-white mb-4 flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center mr-3">
                    <span class="text-purple-300">⏱️</span>
                  </div>
                  Temps d'apprentissage
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center p-4 bg-white/5 rounded-xl">
                    <div class="text-2xl font-bold text-white mb-1">{{ totalLearningTime }}</div>
                    <div class="text-white/60 text-sm">Total</div>
                  </div>
                  <div class="text-center p-4 bg-white/5 rounded-xl">
                    <div class="text-2xl font-bold text-white mb-1">{{ averageSessionTime }}</div>
                    <div class="text-white/60 text-sm">Par session</div>
                  </div>
                </div>
              </div>

              <!-- Objectifs et récompenses -->
              <div class="glass-stat-card">
                <h4 class="text-lg font-bold text-white mb-4 flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-lg flex items-center justify-center mr-3">
                    <span class="text-yellow-300">🏆</span>
                  </div>
                  Objectifs et récompenses
                </h4>
                <div class="space-y-4">
                  <div v-for="achievement in achievements" :key="achievement.id" class="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                    <div :class="[
                      'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                      achievement.unlocked 
                        ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30' 
                        : 'bg-white/10'
                    ]">
                      {{ achievement.icon }}
                    </div>
                    <div class="flex-1">
                      <h5 class="text-white font-bold">{{ achievement.title }}</h5>
                      <p class="text-white/60 text-sm">{{ achievement.description }}</p>
                      <div v-if="!achievement.unlocked" class="mt-2">
                        <div class="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                          <div 
                            class="bg-gradient-to-r from-yellow-500 to-orange-500 h-full rounded-full transition-all duration-500"
                            :style="{ width: achievement.progress + '%' }"
                          ></div>
                        </div>
                        <span class="text-white/60 text-xs mt-1">{{ achievement.progress }}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Onglet Recommandations -->
          <div v-if="activeTab === 'recommendations'" class="space-y-6">
            <h3 class="text-xl font-bold text-white mb-6">Recommandations d'apprentissage</h3>
            
            <div class="space-y-8">
              <!-- Quiz recommandés -->
              <div class="glass-stat-card">
                <h4 class="text-lg font-bold text-white mb-4 flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-lg flex items-center justify-center mr-3">
                    <span class="text-green-300">💡</span>
                  </div>
                  Quiz recommandés
                </h4>
                <div class="space-y-4">
                  <div v-for="quiz in recommendedQuizzes" :key="quiz.id" class="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <div class="flex-1">
                      <h5 class="text-white font-bold mb-1">{{ quiz.title }}</h5>
                      <p class="text-white/60 text-sm mb-2">{{ quiz.description }}</p>
                      <div class="flex space-x-4 text-white/60 text-xs">
                        <span class="px-2 py-1 bg-white/10 rounded-lg">{{ quiz.difficulty }}</span>
                        <span class="px-2 py-1 bg-white/10 rounded-lg">{{ quiz.estimatedTime }} min</span>
                      </div>
                    </div>
                    <button 
                      class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all font-medium"
                      @click="startRecommendedQuiz(quiz)"
                    >
                      Commencer
                    </button>
                  </div>
                </div>
              </div>

              <!-- Points d'amélioration -->
              <div class="glass-stat-card">
                <h4 class="text-lg font-bold text-white mb-4 flex items-center">
                  <div class="w-8 h-8 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-lg flex items-center justify-center mr-3">
                    <span class="text-orange-300">🎯</span>
                  </div>
                  Points d'amélioration
                </h4>
                <div class="space-y-4">
                  <div v-for="area in improvementAreas" :key="area.id" class="flex items-start space-x-4 p-4 bg-white/5 rounded-xl">
                    <div class="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {{ area.icon }}
                    </div>
                    <div class="flex-1">
                      <h5 class="text-white font-bold mb-1">{{ area.title }}</h5>
                      <p class="text-white/60 text-sm mb-3">{{ area.description }}</p>
                      <div class="flex flex-wrap gap-2">
                        <span v-for="suggestion in area.suggestions" :key="suggestion" class="px-3 py-1 bg-white/10 text-white/80 text-xs rounded-lg">
                          {{ suggestion }}
                        </span>
                      </div>
                    </div>
                  </div>
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

export default {
  name: 'ProgressTracking',
  data() {
    return {
      selectedChild: null,
      activeTab: 'history',
      selectedPeriod: 'all',
      quizHistory: [],
      filteredQuizHistory: [],
      tabs: [
        { id: 'history', label: 'Historique', icon: 'fas fa-history' },
        { id: 'stats', label: 'Statistiques', icon: 'fas fa-chart-bar' },
        { id: 'recommendations', label: 'Recommandations', icon: 'fas fa-lightbulb' }
      ],
      scoreByType: [],
      monthlyProgress: [],
      achievements: [],
      recommendedQuizzes: [],
      improvementAreas: []
    }
  },
  computed: {
    totalQuizzesCompleted() {
      return this.quizHistory.length
    },
    averageScore() {
      if (this.quizHistory.length === 0) return 0
      const total = this.quizHistory.reduce((sum, quiz) => {
        const percentage = Number(quiz.percentage) || 0
        return sum + percentage
      }, 0)
      const average = total / this.quizHistory.length
      return Math.round(average) || 0
    },
    totalLessonsCompleted() {
      return new Set(this.quizHistory.map(quiz => quiz.lessonId)).size
    },
    totalLearningTime() {
      const totalMinutes = this.quizHistory.reduce((sum, quiz) => {
        const duration = Number(quiz.duration) || 0
        return sum + duration
      }, 0)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = Math.round(totalMinutes % 60)
      return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
    },
    averageSessionTime() {
      if (this.quizHistory.length === 0) return '0min'
      const totalMinutes = this.quizHistory.reduce((sum, quiz) => {
        const duration = Number(quiz.duration) || 0
        return sum + duration
      }, 0)
      const average = Math.round(totalMinutes / this.quizHistory.length) || 0
      return `${average}min`
    }
  },
  async created() {
    await this.loadChildProfile()
    await this.loadProgressData()
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

    async loadChildProfile() {
      const childId = this.$route.query.childId
      if (!childId) {
        this.$router.push({ name: 'ProfileSelector' })
        return
      }

      const store = useProfileStore()
      await store.loadProfiles()
      this.selectedChild = store.getProfileById(parseInt(childId, 10))

      if (!this.selectedChild) {
        console.error('Profil enfant non trouvé:', childId)
        this.$router.push({ name: 'ProfileSelector' })
        return
      }
    },

    async loadProgressData() {
      if (!this.selectedChild) return

      try {
        // Charger l'historique des quiz
        this.quizHistory = await LessonService.getChildQuizHistory(this.selectedChild.id)
        this.filteredQuizHistory = [...this.quizHistory]

        // Charger les statistiques
        await this.loadStatistics()
        
        // Charger les recommandations
        await this.loadRecommendations()

        console.log('📊 [PROGRESS] Données de progrès chargées:', {
          childId: this.selectedChild.id,
          quizCount: this.quizHistory.length,
          averageScore: this.averageScore
        })
      } catch (error) {
        console.error('❌ [PROGRESS] Erreur lors du chargement des données:', error)
      }
    },

    async loadStatistics() {
      // Score par type de quiz
      this.scoreByType = [
        { type: 'Mathématiques', averageScore: 85 },
        { type: 'Français', averageScore: 78 },
        { type: 'Sciences', averageScore: 92 },
        { type: 'Histoire', averageScore: 88 }
      ]

      // Progrès mensuel
      this.monthlyProgress = [
        { month: 'Janvier', quizCount: 12, averageScore: 82 },
        { month: 'Février', quizCount: 15, averageScore: 85 },
        { month: 'Mars', quizCount: 18, averageScore: 88 },
        { month: 'Avril', quizCount: 14, averageScore: 90 }
      ]

      // Récompenses
      this.achievements = [
        {
          id: 1,
          title: 'Premier quiz',
          description: 'Complétez votre premier quiz',
          icon: '🎯',
          unlocked: this.totalQuizzesCompleted > 0,
          progress: Math.min(100, (this.totalQuizzesCompleted / 1) * 100)
        },
        {
          id: 2,
          title: 'Quiz master',
          description: 'Complétez 10 quiz',
          icon: '🏆',
          unlocked: this.totalQuizzesCompleted >= 10,
          progress: Math.min(100, (this.totalQuizzesCompleted / 10) * 100)
        },
        {
          id: 3,
          title: 'Score parfait',
          description: 'Obtenez 100% à un quiz',
          icon: '⭐',
          unlocked: this.quizHistory.some(quiz => quiz.percentage === 100),
          progress: this.quizHistory.some(quiz => quiz.percentage === 100) ? 100 : 0
        }
      ]
    },

    async loadRecommendations() {
      // Quiz recommandés
      this.recommendedQuizzes = [
        {
          id: 1,
          title: 'Quiz de multiplication',
          description: 'Améliorez vos compétences en multiplication',
          difficulty: 'Facile',
          estimatedTime: 15
        },
        {
          id: 2,
          title: 'Quiz de grammaire',
          description: 'Révisez les règles de grammaire',
          difficulty: 'Moyen',
          estimatedTime: 20
        }
      ]

      // Points d'amélioration
      this.improvementAreas = [
        {
          id: 1,
          title: 'Multiplication',
          description: 'Votre score moyen est de 75%',
          icon: '🔢',
          suggestions: ['Pratiquez les tables de multiplication', 'Faites des exercices réguliers']
        },
        {
          id: 2,
          title: 'Orthographe',
          description: 'Votre score moyen est de 70%',
          icon: '📝',
          suggestions: ['Lisez plus de livres', 'Pratiquez l\'écriture']
        }
      ]
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

    getChildTypeLabel(type) {
      const types = {
        'child': 'Enfant',
        'teen': 'Adolescent',
        'adult': 'Adulte'
      }
      return types[type] || 'Enfant'
    },

    getScoreClass(percentage) {
      if (percentage >= 90) return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30'
      if (percentage >= 80) return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-400/30'
      if (percentage >= 70) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-400/30'
      return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
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

    startRecommendedQuiz(quiz) {
      // Rediriger vers le générateur de quiz avec les paramètres recommandés
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.selectedChild.id,
          recommendedQuiz: JSON.stringify(quiz)
        }
      })
    },

    goBack() {
      // Retourner au dashboard utilisateur
      this.$router.push({
        name: 'UserDashboard',
        query: {
          profile: this.selectedChild.id
        }
      })
    }
  }
}
</script>

<style scoped>
/* NOTE: .glass-card-dashboard / .animate-blob sont centralisés (src/styles/liquid-glass.css) */

.glass-stat-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
}

.glass-stat-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.glass-quiz-item {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
}

.glass-quiz-item:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* Background blob animations centralisées */

/* Button styles */
button {
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

/* Child avatar styling */
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

/* Animation pour les éléments */
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
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .glass-card-dashboard,
  .glass-stat-card,
  .glass-quiz-item {
    padding: 1.5rem;
    border-radius: 1.5rem;
  }
  
  .max-w-6xl {
    max-width: 100%;
    padding: 0 1rem;
  }

  .child-avatar {
    width: 4rem;
    height: 4rem;
    font-size: 1.5rem;
  }

  .grid-cols-3 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .glass-card-dashboard,
  .glass-stat-card,
  .glass-quiz-item {
    padding: 1rem;
    border-radius: 1rem;
  }

  .child-avatar {
    width: 3rem;
    height: 3rem;
    font-size: 1.25rem;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Focus styles */
select:focus {
  outline: none;
  ring: 2px;
  ring-color: rgba(59, 130, 246, 0.5);
  border-color: rgba(59, 130, 246, 0.5);
}

/* Input styles */
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
