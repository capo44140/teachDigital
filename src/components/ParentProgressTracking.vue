<template>
  <div class="parent-progress-tracking">
    <!-- Bouton de retour -->
    <div class="back-button-container">
      <button @click="goBack" class="back-button">
        <i class="fas fa-arrow-left"></i>
        Retour au dashboard
      </button>
    </div>

    <!-- En-tête -->
    <div class="header">
      <div class="header-content">
        <div class="header-info">
          <h1>Suivi des Progrès</h1>
          <p>Consultez les progrès d'apprentissage de vos enfants</p>
        </div>
        <div class="header-actions">
          <button @click="refreshData" :disabled="isLoading" class="refresh-btn">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
            Actualiser
          </button>
        </div>
      </div>
    </div>

    <!-- Statistiques globales -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <h3>{{ childrenStats.length }}</h3>
          <p>Enfants actifs</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-content">
          <h3>{{ totalQuizzesCompleted }}</h3>
          <p>Quiz terminés</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <h3>{{ averageScore }}%</h3>
          <p>Score moyen</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <h3>{{ totalLessonsCompleted }}</h3>
          <p>Leçons terminées</p>
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
      <!-- Onglet Vue d'ensemble -->
      <div v-if="activeTab === 'overview'" class="tab-panel">
        <div class="children-grid">
          <div v-for="child in childrenStats" :key="child.id" class="child-card">
            <div class="child-header">
              <div class="child-avatar">
                <img v-if="child.avatar" :src="child.avatar" :alt="child.name" />
                <div v-else class="default-avatar">
                  {{ child.name?.charAt(0)?.toUpperCase() }}
                </div>
              </div>
              <div class="child-info">
                <h3>{{ child.name }}</h3>
                <p class="child-type">{{ getChildTypeLabel(child.type) }}</p>
              </div>
              <div class="child-score">
                <div class="score-circle" :class="getScoreClass(child.averageScore)">
                  {{ child.averageScore }}%
                </div>
              </div>
            </div>
            
            <div class="child-stats">
              <div class="stat-item">
                <span class="stat-number">{{ child.totalQuizzes }}</span>
                <span class="stat-label">Quiz</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ child.completedLessons }}</span>
                <span class="stat-label">Leçons</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ child.totalTime }}</span>
                <span class="stat-label">Temps</span>
              </div>
            </div>

            <div class="child-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: child.averageScore + '%' }"
                ></div>
              </div>
              <span class="progress-text">Progrès: {{ child.averageScore }}%</span>
            </div>

            <div class="child-actions">
              <button @click="viewChildProgress(child)" class="view-progress-btn">
                Voir le détail
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Historique global -->
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
          <p>Vos enfants n'ont pas encore complété de quiz.</p>
        </div>

        <div v-else class="quiz-history">
          <div 
            v-for="quiz in filteredQuizHistory" 
            :key="quiz.id"
            class="quiz-item"
          >
            <div class="quiz-header">
              <div class="quiz-child">
                <div class="child-avatar-small">
                  {{ quiz.childName?.charAt(0)?.toUpperCase() }}
                </div>
                <span class="child-name">{{ quiz.childName }}</span>
              </div>
              <div class="quiz-score" :class="getScoreClass(quiz.percentage)">
                {{ quiz.percentage }}%
              </div>
            </div>
            <div class="quiz-content">
              <h4>{{ quiz.lessonTitle || 'Quiz' }}</h4>
              <p class="quiz-date">{{ formatDate(quiz.completedAt) }}</p>
              <div class="quiz-details">
                <span>{{ quiz.score }}/{{ quiz.totalQuestions }} questions</span>
                <span class="quiz-duration">{{ formatDuration(quiz.duration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Comparaison -->
      <div v-if="activeTab === 'comparison'" class="tab-panel">
        <div class="comparison-chart">
          <h3>Comparaison des Performances</h3>
          <div class="chart-container">
            <div v-for="child in childrenStats" :key="child.id" class="chart-item">
              <div class="chart-bar">
                <div 
                  class="bar-fill" 
                  :style="{ height: child.averageScore + '%' }"
                ></div>
              </div>
              <div class="chart-label">
                <span class="child-name">{{ child.name }}</span>
                <span class="child-score">{{ child.averageScore }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="comparison-table">
          <h3>Tableau de Comparaison</h3>
          <table>
            <thead>
              <tr>
                <th>Enfant</th>
                <th>Quiz terminés</th>
                <th>Score moyen</th>
                <th>Leçons terminées</th>
                <th>Temps d'apprentissage</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="child in childrenStats" :key="child.id">
                <td>
                  <div class="child-cell">
                    <div class="child-avatar-small">
                      {{ child.name?.charAt(0)?.toUpperCase() }}
                    </div>
                    {{ child.name }}
                  </div>
                </td>
                <td>{{ child.totalQuizzes }}</td>
                <td>
                  <span class="score-badge" :class="getScoreClass(child.averageScore)">
                    {{ child.averageScore }}%
                  </span>
                </td>
                <td>{{ child.completedLessons }}</td>
                <td>{{ child.totalTime }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Onglet Recommandations -->
      <div v-if="activeTab === 'recommendations'" class="tab-panel">
        <div class="recommendations">
          <h3>Recommandations pour vos enfants</h3>
          
          <div v-for="child in childrenStats" :key="child.id" class="child-recommendations">
            <div class="recommendation-header">
              <div class="child-info">
                <div class="child-avatar-small">
                  {{ child.name?.charAt(0)?.toUpperCase() }}
                </div>
                <h4>{{ child.name }}</h4>
              </div>
            </div>
            
            <div class="recommendation-content">
              <div v-if="child.averageScore < 70" class="recommendation-item warning">
                <div class="recommendation-icon">⚠️</div>
                <div class="recommendation-text">
                  <h5>Attention aux difficultés</h5>
                  <p>Le score moyen de {{ child.name }} est de {{ child.averageScore }}%. Il serait bénéfique de revoir certains concepts.</p>
                </div>
              </div>
              
              <div v-if="child.totalQuizzes < 5" class="recommendation-item info">
                <div class="recommendation-icon">💡</div>
                <div class="recommendation-text">
                  <h5>Encouragez la pratique</h5>
                  <p>{{ child.name }} a complété {{ child.totalQuizzes }} quiz. Encouragez-le à faire plus d'exercices.</p>
                </div>
              </div>
              
              <div v-if="child.averageScore >= 90" class="recommendation-item success">
                <div class="recommendation-icon">🎉</div>
                <div class="recommendation-text">
                  <h5>Excellent travail !</h5>
                  <p>{{ child.name }} obtient d'excellents résultats avec {{ child.averageScore }}% de moyenne. Continuez ainsi !</p>
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
  name: 'ParentProgressTracking',
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
        { id: 'comparison', label: 'Comparaison', icon: 'fas fa-chart-bar' },
        { id: 'recommendations', label: 'Recommandations', icon: 'fas fa-lightbulb' }
      ]
    }
  },
  computed: {
    totalQuizzesCompleted() {
      return this.childrenStats.reduce((sum, child) => sum + child.totalQuizzes, 0)
    },
    averageScore() {
      if (this.childrenStats.length === 0) return 0
      const total = this.childrenStats.reduce((sum, child) => sum + child.averageScore, 0)
      return Math.round(total / this.childrenStats.length)
    },
    totalLessonsCompleted() {
      return this.childrenStats.reduce((sum, child) => sum + child.completedLessons, 0)
    }
  },
  async created() {
    await this.loadData()
  },
  methods: {
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
    }
  }
}
</script>

<style scoped>
.parent-progress-tracking {
  max-width: 1400px;
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

.header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h1 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 28px;
}

.header-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 16px;
}

.refresh-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
}

.stat-content h3 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: bold;
}

.stat-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
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

.children-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.child-card {
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.child-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.child-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.child-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: bold;
}

.child-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.child-info h3 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 18px;
}

.child-type {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0;
}

.child-score {
  margin-left: auto;
}

.score-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  color: white;
}

.score-circle.excellent {
  background: #28a745;
}

.score-circle.good {
  background: #17a2b8;
}

.score-circle.average {
  background: #ffc107;
  color: #212529;
}

.score-circle.needs-improvement {
  background: #dc3545;
}

.child-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

.child-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #7f8c8d;
}

.child-actions {
  text-align: center;
}

.view-progress-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.view-progress-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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
  align-items: center;
  margin-bottom: 12px;
}

.quiz-child {
  display: flex;
  align-items: center;
  gap: 12px;
}

.child-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.child-name {
  font-weight: 500;
  color: #2c3e50;
}

.quiz-score {
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: bold;
  font-size: 14px;
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

.quiz-content h4 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 16px;
}

.quiz-date {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 8px;
}

.quiz-details {
  display: flex;
  gap: 16px;
  color: #7f8c8d;
  font-size: 14px;
}

.comparison-chart {
  margin-bottom: 32px;
}

.comparison-chart h3 {
  margin: 0 0 24px 0;
  color: #2c3e50;
}

.chart-container {
  display: flex;
  align-items: end;
  gap: 20px;
  height: 200px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.chart-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.chart-bar {
  width: 40px;
  height: 150px;
  background: #e9ecef;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: height 0.3s ease;
}

.chart-label {
  text-align: center;
}

.child-name {
  display: block;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.child-score {
  font-size: 14px;
  color: #7f8c8d;
}

.comparison-table {
  margin-top: 32px;
}

.comparison-table h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.child-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.score-badge.excellent {
  background: #d4edda;
  color: #155724;
}

.score-badge.good {
  background: #d1ecf1;
  color: #0c5460;
}

.score-badge.average {
  background: #fff3cd;
  color: #856404;
}

.score-badge.needs-improvement {
  background: #f8d7da;
  color: #721c24;
}

.recommendations h3 {
  margin: 0 0 24px 0;
  color: #2c3e50;
}

.child-recommendations {
  margin-bottom: 24px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.recommendation-header {
  background: #f8f9fa;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
}

.child-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.child-info h4 {
  margin: 0;
  color: #2c3e50;
}

.recommendation-content {
  padding: 16px;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.recommendation-item:last-child {
  margin-bottom: 0;
}

.recommendation-item.warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.recommendation-item.info {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
}

.recommendation-item.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.recommendation-icon {
  font-size: 20px;
}

.recommendation-text h5 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 14px;
}

.recommendation-text p {
  margin: 0;
  color: #6c757d;
  font-size: 13px;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .parent-progress-tracking {
    padding: 12px;
  }
  
  .back-button-container {
    margin-bottom: 16px;
  }
  
  .back-button {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .header {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-info h1 {
    font-size: 24px;
  }
  
  .header-info p {
    font-size: 14px;
  }
  
  .refresh-btn {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .stat-card {
    padding: 16px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .stat-icon {
    font-size: 24px;
  }
  
  .stat-content h3 {
    font-size: 20px;
  }
  
  .stat-content p {
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
  
  .children-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .child-card {
    padding: 16px;
  }
  
  .child-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }
  
  .child-avatar {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .child-info h3 {
    font-size: 16px;
  }
  
  .child-type {
    font-size: 12px;
  }
  
  .child-score {
    margin-left: 0;
  }
  
  .score-circle {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }
  
  .child-stats {
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }
  
  .stat-number {
    font-size: 16px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .child-progress {
    margin-bottom: 12px;
  }
  
  .progress-text {
    font-size: 11px;
  }
  
  .view-progress-btn {
    padding: 6px 12px;
    font-size: 14px;
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
  
  .quiz-child {
    gap: 8px;
  }
  
  .child-avatar-small {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .child-name {
    font-size: 14px;
  }
  
  .quiz-score {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .quiz-content h4 {
    font-size: 14px;
  }
  
  .quiz-date {
    font-size: 12px;
  }
  
  .quiz-details {
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
  
  .comparison-chart {
    margin-bottom: 24px;
  }
  
  .comparison-chart h3 {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .chart-container {
    flex-direction: column;
    height: auto;
    align-items: center;
    gap: 16px;
    padding: 16px;
  }
  
  .chart-item {
    width: 100%;
    max-width: 200px;
  }
  
  .chart-bar {
    width: 100%;
    height: 80px;
  }
  
  .chart-label {
    margin-top: 8px;
  }
  
  .child-name {
    font-size: 14px;
  }
  
  .child-score {
    font-size: 12px;
  }
  
  .comparison-table {
    margin-top: 24px;
  }
  
  .comparison-table h3 {
    font-size: 18px;
    margin-bottom: 12px;
  }
  
  .comparison-table table {
    font-size: 12px;
  }
  
  .comparison-table th,
  .comparison-table td {
    padding: 8px 6px;
  }
  
  .child-cell {
    gap: 6px;
  }
  
  .child-avatar-small {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
  
  .score-badge {
    padding: 2px 6px;
    font-size: 10px;
  }
  
  .recommendations h3 {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .child-recommendations {
    margin-bottom: 16px;
  }
  
  .recommendation-header {
    padding: 12px;
  }
  
  .child-info {
    gap: 8px;
  }
  
  .child-info h4 {
    font-size: 14px;
  }
  
  .recommendation-content {
    padding: 12px;
  }
  
  .recommendation-item {
    padding: 8px;
    margin-bottom: 8px;
  }
  
  .recommendation-icon {
    font-size: 16px;
  }
  
  .recommendation-text h5 {
    font-size: 13px;
  }
  
  .recommendation-text p {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .parent-progress-tracking {
    padding: 8px;
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .header {
    padding: 12px;
  }
  
  .header-info h1 {
    font-size: 20px;
  }
  
  .tab-content {
    padding: 12px;
  }
  
  .child-card {
    padding: 12px;
  }
  
  .quiz-item {
    padding: 12px;
  }
  
  .comparison-table {
    overflow-x: auto;
  }
  
  .comparison-table table {
    min-width: 400px;
  }
}
</style>
