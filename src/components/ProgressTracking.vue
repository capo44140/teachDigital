<template>
  <div class="progress-tracking">
    <!-- Bouton de retour -->
    <div class="back-button-container">
      <button @click="goBack" class="back-button">
        <i class="fas fa-arrow-left"></i>
        Retour
      </button>
    </div>

    <!-- En-tête avec informations de l'enfant -->
    <div class="child-header">
      <div class="child-info">
        <div class="child-avatar">
          <img v-if="selectedChild?.avatar" :src="selectedChild.avatar" :alt="selectedChild.name" />
          <div v-else class="default-avatar">
            {{ selectedChild?.name?.charAt(0)?.toUpperCase() }}
          </div>
        </div>
        <div class="child-details">
          <h2>{{ selectedChild?.name }}</h2>
          <p class="child-type">{{ getChildTypeLabel(selectedChild?.type) }}</p>
          <div class="progress-summary">
            <div class="stat-item">
              <span class="stat-number">{{ totalQuizzesCompleted }}</span>
              <span class="stat-label">Quiz terminés</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ averageScore }}%</span>
              <span class="stat-label">Score moyen</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ totalLessonsCompleted }}</span>
              <span class="stat-label">Leçons terminées</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation des onglets -->
    <div class="tabs-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <i :class="tab.icon"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- Contenu des onglets -->
    <div class="tab-content">
      <!-- Onglet Historique des Quiz -->
      <div v-if="activeTab === 'history'" class="tab-panel">
        <div class="section-header">
          <h3>Historique des Quiz</h3>
          <div class="filters">
            <select v-model="selectedPeriod" @change="filterQuizHistory">
              <option value="all">Tous les quiz</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
          </div>
        </div>

        <div v-if="filteredQuizHistory.length === 0" class="empty-state">
          <div class="empty-icon">📚</div>
          <h4>Aucun quiz trouvé</h4>
          <p>Commencez par faire des quiz pour voir votre historique ici.</p>
        </div>

        <div v-else class="quiz-history">
          <div 
            v-for="quiz in filteredQuizHistory" 
            :key="quiz.id"
            class="quiz-item"
          >
            <div class="quiz-header">
              <div class="quiz-title">
                <h4>{{ quiz.lessonTitle || 'Quiz' }}</h4>
                <span class="quiz-date">{{ formatDate(quiz.completedAt) }}</span>
              </div>
              <div class="quiz-score" :class="getScoreClass(quiz.percentage)">
                {{ quiz.percentage }}%
              </div>
            </div>
            <div class="quiz-details">
              <div class="quiz-stats">
                <span>{{ quiz.score }}/{{ quiz.totalQuestions }} questions</span>
                <span class="quiz-duration">{{ formatDuration(quiz.duration) }}</span>
              </div>
              <div class="quiz-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: quiz.percentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Statistiques -->
      <div v-if="activeTab === 'stats'" class="tab-panel">
        <div class="stats-grid">
          <!-- Score moyen par type de quiz -->
          <div class="stat-card">
            <h4>Score moyen par type</h4>
            <div class="score-breakdown">
              <div v-for="type in scoreByType" :key="type.type" class="score-item">
                <span class="score-type">{{ type.type }}</span>
                <div class="score-bar">
                  <div 
                    class="score-fill" 
                    :style="{ width: type.averageScore + '%' }"
                  ></div>
                  <span class="score-value">{{ type.averageScore }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Progrès mensuel -->
          <div class="stat-card">
            <h4>Progrès mensuel</h4>
            <div class="monthly-progress">
              <div v-for="month in monthlyProgress" :key="month.month" class="month-item">
                <span class="month-name">{{ month.month }}</span>
                <div class="month-stats">
                  <span class="month-quizzes">{{ month.quizCount }} quiz</span>
                  <span class="month-score">{{ month.averageScore }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Temps d'apprentissage -->
          <div class="stat-card">
            <h4>Temps d'apprentissage</h4>
            <div class="learning-time">
              <div class="time-stat">
                <span class="time-value">{{ totalLearningTime }}</span>
                <span class="time-label">Total</span>
              </div>
              <div class="time-stat">
                <span class="time-value">{{ averageSessionTime }}</span>
                <span class="time-label">Par session</span>
              </div>
            </div>
          </div>

          <!-- Objectifs et récompenses -->
          <div class="stat-card">
            <h4>Objectifs et récompenses</h4>
            <div class="achievements">
              <div v-for="achievement in achievements" :key="achievement.id" class="achievement-item">
                <div class="achievement-icon" :class="{ unlocked: achievement.unlocked }">
                  {{ achievement.icon }}
                </div>
                <div class="achievement-details">
                  <h5>{{ achievement.title }}</h5>
                  <p>{{ achievement.description }}</p>
                  <div v-if="!achievement.unlocked" class="achievement-progress">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: achievement.progress + '%' }"
                      ></div>
                    </div>
                    <span class="progress-text">{{ achievement.progress }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Recommandations -->
      <div v-if="activeTab === 'recommendations'" class="tab-panel">
        <div class="recommendations">
          <h3>Recommandations d'apprentissage</h3>
          
          <div class="recommendation-section">
            <h4>Quiz recommandés</h4>
            <div class="recommended-quizzes">
              <div v-for="quiz in recommendedQuizzes" :key="quiz.id" class="recommended-quiz">
                <div class="quiz-info">
                  <h5>{{ quiz.title }}</h5>
                  <p>{{ quiz.description }}</p>
                  <div class="quiz-meta">
                    <span class="quiz-difficulty">{{ quiz.difficulty }}</span>
                    <span class="quiz-duration">{{ quiz.estimatedTime }} min</span>
                  </div>
                </div>
                <button class="start-quiz-btn" @click="startRecommendedQuiz(quiz)">
                  Commencer
                </button>
              </div>
            </div>
          </div>

          <div class="recommendation-section">
            <h4>Points d'amélioration</h4>
            <div class="improvement-areas">
              <div v-for="area in improvementAreas" :key="area.id" class="improvement-item">
                <div class="improvement-icon">{{ area.icon }}</div>
                <div class="improvement-details">
                  <h5>{{ area.title }}</h5>
                  <p>{{ area.description }}</p>
                  <div class="improvement-suggestions">
                    <span v-for="suggestion in area.suggestions" :key="suggestion" class="suggestion">
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
      const total = this.quizHistory.reduce((sum, quiz) => sum + quiz.percentage, 0)
      return Math.round(total / this.quizHistory.length)
    },
    totalLessonsCompleted() {
      return new Set(this.quizHistory.map(quiz => quiz.lessonId)).size
    },
    totalLearningTime() {
      const totalMinutes = this.quizHistory.reduce((sum, quiz) => sum + (quiz.duration || 0), 0)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
    },
    averageSessionTime() {
      if (this.quizHistory.length === 0) return '0min'
      const totalMinutes = this.quizHistory.reduce((sum, quiz) => sum + (quiz.duration || 0), 0)
      const average = Math.round(totalMinutes / this.quizHistory.length)
      return `${average}min`
    }
  },
  async created() {
    await this.loadChildProfile()
    await this.loadProgressData()
  },
  methods: {
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
.progress-tracking {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

.back-button-container {
  margin-bottom: 20px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  color: #6c757d;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-button:hover {
  background: #f8f9fa;
  border-color: #667eea;
  color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.back-button i {
  font-size: 14px;
}

.child-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.child-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.child-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  font-weight: bold;
}

.child-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.child-details h2 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 28px;
}

.child-type {
  color: #7f8c8d;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.progress-summary {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
}

.tabs-navigation {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  color: #7f8c8d;
}

.tab-button:hover {
  background: #f8f9fa;
  color: #2c3e50;
}

.tab-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tab-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
}

.filters select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.quiz-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.quiz-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.quiz-title h4 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 18px;
}

.quiz-date {
  color: #7f8c8d;
  font-size: 14px;
}

.quiz-score {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 16px;
}

.quiz-score.excellent {
  background: #d4edda;
  color: #155724;
}

.quiz-score.good {
  background: #d1ecf1;
  color: #0c5460;
}

.quiz-score.average {
  background: #fff3cd;
  color: #856404;
}

.quiz-score.needs-improvement {
  background: #f8d7da;
  color: #721c24;
}

.quiz-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quiz-stats {
  display: flex;
  gap: 16px;
  color: #7f8c8d;
  font-size: 14px;
}

.quiz-progress {
  flex: 1;
  max-width: 200px;
}

.progress-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.stat-card h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-type {
  min-width: 120px;
  font-weight: 500;
  color: #2c3e50;
}

.score-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-fill {
  height: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.score-value {
  font-weight: bold;
  color: #2c3e50;
  min-width: 40px;
}

.monthly-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.month-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.month-item:last-child {
  border-bottom: none;
}

.month-name {
  font-weight: 500;
  color: #2c3e50;
}

.month-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #7f8c8d;
}

.learning-time {
  display: flex;
  gap: 24px;
}

.time-stat {
  text-align: center;
}

.time-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.time-label {
  font-size: 14px;
  color: #7f8c8d;
}

.achievements {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.achievement-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  opacity: 0.5;
}

.achievement-icon.unlocked {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 1;
}

.achievement-details h5 {
  margin: 0 0 4px 0;
  color: #2c3e50;
}

.achievement-details p {
  margin: 0 0 8px 0;
  color: #7f8c8d;
  font-size: 14px;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: #7f8c8d;
  min-width: 30px;
}

.recommendations h3 {
  margin: 0 0 24px 0;
  color: #2c3e50;
}

.recommendation-section {
  margin-bottom: 32px;
}

.recommendation-section h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.recommended-quizzes {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recommended-quiz {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.quiz-info h5 {
  margin: 0 0 4px 0;
  color: #2c3e50;
}

.quiz-info p {
  margin: 0 0 8px 0;
  color: #7f8c8d;
  font-size: 14px;
}

.quiz-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #7f8c8d;
}

.start-quiz-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.start-quiz-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.improvement-areas {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.improvement-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.improvement-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.improvement-details h5 {
  margin: 0 0 4px 0;
  color: #2c3e50;
}

.improvement-details p {
  margin: 0 0 8px 0;
  color: #7f8c8d;
  font-size: 14px;
}

.improvement-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #2c3e50;
  border: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .progress-tracking {
    padding: 12px;
  }
  
  .back-button-container {
    margin-bottom: 16px;
  }
  
  .back-button {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .child-header {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .child-info {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .child-avatar {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
  
  .child-details h2 {
    font-size: 24px;
  }
  
  .child-type {
    font-size: 14px;
  }
  
  .progress-summary {
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }
  
  .stat-item {
    min-width: 120px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .tabs-navigation {
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    margin-bottom: 16px;
  }
  
  .tab-button {
    padding: 10px 12px;
    font-size: 14px;
  }
  
  .tab-content {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .section-header h3 {
    font-size: 18px;
  }
  
  .filters select {
    padding: 6px 10px;
    font-size: 14px;
  }
  
  .empty-state {
    padding: 32px 16px;
  }
  
  .empty-icon {
    font-size: 36px;
  }
  
  .empty-state h4 {
    font-size: 18px;
  }
  
  .empty-state p {
    font-size: 14px;
  }
  
  .quiz-history {
    gap: 12px;
  }
  
  .quiz-item {
    padding: 16px;
  }
  
  .quiz-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .quiz-title h4 {
    font-size: 16px;
  }
  
  .quiz-date {
    font-size: 12px;
  }
  
  .quiz-score {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .quiz-details {
    flex-direction: column;
    gap: 8px;
  }
  
  .quiz-stats {
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  
  .quiz-progress {
    max-width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .stat-card h4 {
    font-size: 16px;
    margin-bottom: 12px;
  }
  
  .score-breakdown {
    gap: 8px;
  }
  
  .score-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .score-type {
    min-width: auto;
    font-size: 14px;
  }
  
  .score-bar {
    width: 100%;
  }
  
  .score-fill {
    height: 6px;
  }
  
  .score-value {
    font-size: 12px;
  }
  
  .monthly-progress {
    gap: 8px;
  }
  
  .month-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 0;
  }
  
  .month-name {
    font-size: 14px;
  }
  
  .month-stats {
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  
  .learning-time {
    flex-direction: column;
    gap: 16px;
  }
  
  .time-value {
    font-size: 18px;
  }
  
  .time-label {
    font-size: 12px;
  }
  
  .achievements {
    gap: 12px;
  }
  
  .achievement-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
  }
  
  .achievement-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .achievement-details h5 {
    font-size: 14px;
  }
  
  .achievement-details p {
    font-size: 12px;
  }
  
  .achievement-progress {
    width: 100%;
  }
  
  .progress-text {
    font-size: 11px;
  }
  
  .recommendations h3 {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .recommendation-section {
    margin-bottom: 24px;
  }
  
  .recommendation-section h4 {
    font-size: 16px;
    margin-bottom: 12px;
  }
  
  .recommended-quizzes {
    gap: 12px;
  }
  
  .recommended-quiz {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .quiz-info h5 {
    font-size: 14px;
  }
  
  .quiz-info p {
    font-size: 12px;
  }
  
  .quiz-meta {
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
  }
  
  .start-quiz-btn {
    padding: 6px 12px;
    font-size: 14px;
    width: 100%;
  }
  
  .improvement-areas {
    gap: 12px;
  }
  
  .improvement-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .improvement-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .improvement-details h5 {
    font-size: 14px;
  }
  
  .improvement-details p {
    font-size: 12px;
  }
  
  .improvement-suggestions {
    gap: 6px;
  }
  
  .suggestion {
    padding: 3px 6px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .progress-tracking {
    padding: 8px;
  }
  
  .child-header {
    padding: 12px;
  }
  
  .child-avatar {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .child-details h2 {
    font-size: 20px;
  }
  
  .progress-summary {
    gap: 12px;
  }
  
  .stat-item {
    min-width: 100px;
  }
  
  .stat-number {
    font-size: 18px;
  }
  
  .tab-content {
    padding: 12px;
  }
  
  .quiz-item {
    padding: 12px;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .achievement-item {
    padding: 8px;
  }
  
  .recommended-quiz {
    padding: 12px;
  }
  
  .improvement-item {
    padding: 12px;
  }
}
</style>
