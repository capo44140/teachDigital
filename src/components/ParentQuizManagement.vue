<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">Gestion des Interrogations</h1>
              <p class="text-sm text-gray-600">Suivez les progrès de vos enfants</p>
            </div>
          </div>
          <button 
            @click="refreshData"
            class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            :disabled="isLoading"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>{{ isLoading ? 'Actualisation...' : 'Actualiser' }}</span>
          </button>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <!-- Statistiques globales -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total des leçons</p>
              <p class="text-2xl font-bold text-blue-600">{{ globalStats.totalLessons || 0 }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Quiz complétés</p>
              <p class="text-2xl font-bold text-green-600">{{ globalStats.totalQuizzes || 0 }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Score moyen</p>
              <p class="text-2xl font-bold text-purple-600">{{ formatPercentage(globalStats.averageScore) }}%</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Enfants actifs</p>
              <p class="text-2xl font-bold text-orange-600">{{ childrenStats.length }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Sélection de l'enfant -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Sélectionner un enfant</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            v-for="child in childrenStats"
            :key="child.id"
            @click="selectChild(child)"
            :class="[
              'p-4 rounded-lg border-2 transition-all',
              selectedChild?.id === child.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            ]"
          >
            <div class="text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" :class="child.bgColor">
                <span class="text-white font-bold text-lg">{{ child.initial }}</span>
              </div>
              <p class="font-medium text-gray-800">{{ child.name }}</p>
              <p class="text-sm text-gray-500">{{ child.totalQuizzes || 0 }} quiz</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Détails de l'enfant sélectionné -->
      <div v-if="selectedChild" class="space-y-8">
        <!-- Statistiques de l'enfant -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-gray-800">
              Progrès de {{ selectedChild.name }}
            </h3>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">Score moyen:</span>
              <span class="text-lg font-bold text-blue-600">{{ formatPercentage(selectedChild.averageScore) }}%</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-800">{{ selectedChild.totalLessons || 0 }}</p>
              <p class="text-sm text-gray-600">Leçons créées</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-800">{{ selectedChild.totalQuizzes || 0 }}</p>
              <p class="text-sm text-gray-600">Quiz complétés</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <p class="text-2xl font-bold text-gray-800">{{ formatPercentage(selectedChild.averageScore) }}%</p>
              <p class="text-sm text-gray-600">Score moyen</p>
            </div>
          </div>
        </div>

        <!-- Résumé des quiz complétés -->
        <div v-if="selectedChild.quizHistory && selectedChild.quizHistory.length > 0" class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Résumé des quiz complétés</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-green-600">Quiz complétés</p>
                  <p class="text-2xl font-bold text-green-700">{{ selectedChild.quizHistory.length }}</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-blue-600">Score moyen</p>
                  <p class="text-2xl font-bold text-blue-700">{{ formatPercentage(selectedChild.averageScore) }}%</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-purple-50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-purple-600">Dernier quiz</p>
                  <p class="text-sm font-bold text-purple-700">{{ selectedChild.quizHistory[0] ? formatDate(selectedChild.quizHistory[0].completedAt) : 'Aucun' }}</p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste des leçons -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-gray-800">Leçons de {{ selectedChild.name }}</h3>
            <div class="flex items-center space-x-2">
              <select 
                v-model="filterStatus" 
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Toutes les leçons</option>
                <option value="completed">Quiz complétés</option>
                <option value="pending">Quiz en attente</option>
              </select>
            </div>
          </div>

          <div v-if="filteredLessons.length === 0" class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <p class="text-gray-500">Aucune leçon trouvée</p>
            <p class="text-sm text-gray-400 mt-1">Créez des leçons avec le scanner</p>
          </div>
          
          <!-- Message d'encouragement si aucun quiz complété -->
          <div v-else-if="filterStatus === 'completed' && filteredLessons.length === 0" class="text-center py-12">
            <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-gray-500">Aucun quiz complété pour le moment</p>
            <p class="text-sm text-gray-400 mt-1">Encouragez {{ selectedChild.name }} à faire ses premiers quiz !</p>
          </div>

          <div v-else class="space-y-4">
            <div 
              v-for="lesson in filteredLessons" 
              :key="lesson.id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <h4 class="font-medium text-gray-800">{{ lesson.title }}</h4>
                    <span 
                      :class="[
                        'px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1',
                        lesson.quizCompleted 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      ]"
                    >
                      <svg v-if="lesson.quizCompleted" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                      </svg>
                      <span>{{ lesson.quizCompleted ? 'Complété' : 'En attente' }}</span>
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-2">{{ lesson.description || 'Aucune description' }}</p>
                  <div class="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{{ lesson.subject || 'Matière non définie' }}</span>
                    <span>•</span>
                    <span>{{ lesson.level || 'Niveau non défini' }}</span>
                    <span>•</span>
                    <span>{{ formatDate(lesson.created_at) }}</span>
                  </div>
                </div>
                
                <div class="flex items-center space-x-3">
                  <div v-if="lesson.quizCompleted" class="text-right">
                    <div class="flex items-center space-x-2">
                      <div class="w-12 h-12 rounded-full flex items-center justify-center" 
                           :class="lesson.bestScore >= 80 ? 'bg-green-100' : lesson.bestScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'">
                        <span class="text-lg font-bold" 
                              :class="lesson.bestScore >= 80 ? 'text-green-600' : lesson.bestScore >= 60 ? 'text-yellow-600' : 'text-red-600'">
                          {{ formatPercentage(lesson.bestScore) }}%
                        </span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-800">Meilleur score</p>
                        <p class="text-xs text-gray-500">{{ lesson.totalAttempts }} tentative{{ lesson.totalAttempts > 1 ? 's' : '' }}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex space-x-2">
                    <button 
                      @click="viewLesson(lesson)"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir les détails"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                    
                    <button 
                      v-if="!lesson.quizCompleted"
                      @click="startQuiz(lesson)"
                      class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Commencer le quiz"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z"/>
                      </svg>
                    </button>
                    
                    <button 
                      @click="deleteLesson(lesson)"
                      class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer la leçon"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quiz récents -->
        <div v-if="selectedChild.quizHistory && selectedChild.quizHistory.length > 0" class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-gray-800">Quiz récents de {{ selectedChild.name }}</h3>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">Dernière mise à jour:</span>
              <span class="text-sm font-medium text-blue-600">{{ formatDate(new Date()) }}</span>
            </div>
          </div>
          <div class="space-y-4">
            <div 
              v-for="quiz in selectedChild.quizHistory" 
              :key="quiz.id"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-4">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ quiz.lessonTitle }}</p>
                  <p class="text-sm text-gray-600">{{ formatDate(quiz.completedAt) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold" :class="quiz.score >= 80 ? 'text-green-600' : quiz.score >= 60 ? 'text-yellow-600' : 'text-red-600'">
                  {{ quiz.score }}%
                </p>
                <p class="text-sm text-gray-500">{{ quiz.correctAnswers }}/{{ quiz.totalQuestions }} bonnes réponses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'
import VersionInfo from './VersionInfo.vue'

export default {
  name: 'ParentQuizManagement',
  components: {
    VersionInfo
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
    filteredLessons() {
      if (!this.selectedChild || !this.selectedChild.lessons) return []
      
      switch (this.filterStatus) {
        case 'completed':
          return this.selectedChild.lessons.filter(lesson => lesson.quizCompleted)
        case 'pending':
          return this.selectedChild.lessons.filter(lesson => !lesson.quizCompleted)
        default:
          return this.selectedChild.lessons
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
  
  // Rafraîchir les données quand la route change
  async beforeRouteUpdate(to, from, next) {
    await this.loadData()
    next()
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
          // Utiliser la nouvelle méthode pour récupérer les statistiques détaillées
          const detailedStats = await LessonService.getDetailedChildStats(child.id)
          
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
    
    selectChild(child) {
      this.selectedChild = child
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
      // Rediriger vers la page de détails de la leçon
      this.$router.push({
        name: 'LessonDetails',
        params: { lessonId: lesson.id },
        query: { childId: this.selectedChild.id }
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
          await LessonService.deleteLesson(lesson.id, this.selectedChild.id)
          await this.loadData() // Recharger les données
        } catch (error) {
          console.error('Erreur lors de la suppression:', error)
          alert('Erreur lors de la suppression de la leçon')
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
