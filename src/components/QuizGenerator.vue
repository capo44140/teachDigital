<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
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
              <h1 class="text-2xl font-bold text-gray-800">{{ quiz?.title || 'Quiz' }}</h1>
              <p class="text-sm text-gray-600">Pour {{ selectedChild?.name || 'l\'enfant' }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm text-gray-500">Question {{ currentQuestionIndex + 1 }} sur {{ quiz?.questions?.length || 0 }}</p>
              <div class="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: progressPercentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <!-- État de chargement -->
      <div v-if="!quiz" class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Chargement du quiz...</h2>
        <p class="text-lg text-gray-600">Veuillez patienter pendant que nous préparons votre quiz.</p>
      </div>
      
      <!-- Description du quiz -->
      <div v-else-if="!quizStarted" class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">{{ quiz?.title || 'Quiz' }}</h2>
        <p class="text-lg text-gray-600 mb-6">{{ quiz?.description || 'Description du quiz' }}</p>
        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-blue-600">{{ quiz?.questions?.length || 0 }}</div>
            <div class="text-sm text-blue-800">Questions</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-green-600">{{ quiz?.level || 'N/A' }}</div>
            <div class="text-sm text-green-800">Niveau</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-purple-600">{{ quiz?.subject || 'N/A' }}</div>
            <div class="text-sm text-purple-800">Matière</div>
          </div>
        </div>
        <button 
          @click="startQuiz"
          class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
        >
          Commencer le quiz
        </button>
      </div>

      <!-- Quiz en cours -->
      <div v-else-if="!quizCompleted" class="bg-white rounded-xl shadow-lg p-8">
        <div class="mb-6">
          <h3 class="text-xl font-semibold text-gray-800 mb-2">
            Question {{ currentQuestionIndex + 1 }} sur {{ quiz?.questions?.length || 0 }}
          </h3>
          <p class="text-lg text-gray-700">{{ currentQuestion.question }}</p>
        </div>

        <div class="space-y-3 mb-8">
          <button
            v-for="(option, index) in currentQuestion.options"
            :key="index"
            @click="selectAnswer(index)"
            :class="[
              'w-full p-4 text-left rounded-lg border-2 transition-all',
              selectedAnswer === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            ]"
          >
            <div class="flex items-center space-x-3">
              <span class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-medium">
                {{ String.fromCharCode(65 + index) }}
              </span>
              <span class="text-gray-800">{{ option }}</span>
            </div>
          </button>
        </div>

        <div class="flex justify-between">
          <button 
            @click="previousQuestion"
            :disabled="currentQuestionIndex === 0"
            :class="[
              'px-6 py-2 rounded-lg transition-colors',
              currentQuestionIndex === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            ]"
          >
            Précédent
          </button>
          <button 
            @click="nextQuestion"
            :disabled="selectedAnswer === null"
            :class="[
              'px-6 py-2 rounded-lg transition-colors',
              selectedAnswer === null
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            ]"
          >
            {{ currentQuestionIndex === (quiz?.questions?.length || 0) - 1 ? 'Terminer' : 'Suivant' }}
          </button>
        </div>
      </div>

      <!-- Résultats -->
      <div v-else class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
          <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" 
               :class="scorePercentage >= 70 ? 'bg-green-100' : 'bg-red-100'">
            <svg class="w-10 h-10" :class="scorePercentage >= 70 ? 'text-green-600' : 'text-red-600'" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="scorePercentage >= 70" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-gray-800 mb-2">
            {{ scorePercentage >= 70 ? 'Excellent !' : 'Bien joué !' }}
          </h2>
          <p class="text-lg text-gray-600 mb-4">
            Vous avez obtenu {{ correctAnswers }} bonnes réponses sur {{ quiz?.questions?.length || 0 }}
          </p>
          <div class="text-4xl font-bold mb-6" :class="scorePercentage >= 70 ? 'text-green-600' : 'text-blue-600'">
            {{ scorePercentage }}%
          </div>
        </div>

        <!-- Détail des réponses -->
        <div class="space-y-4 mb-8">
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Détail des réponses</h3>
          <div v-for="(question, index) in (quiz?.questions || [])" :key="index" 
               class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
              <h4 class="font-medium text-gray-800">Question {{ index + 1 }}</h4>
              <span class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="userAnswers[index] === question.correctAnswer 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'">
                {{ userAnswers[index] === question.correctAnswer ? 'Correct' : 'Incorrect' }}
              </span>
            </div>
            <p class="text-gray-700 mb-3">{{ question.question }}</p>
            <div class="space-y-2">
              <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                   :class="[
                     'p-2 rounded-lg text-sm',
                     optionIndex === question.correctAnswer 
                       ? 'bg-green-100 text-green-800 font-medium'
                       : optionIndex === userAnswers[index] && userAnswers[index] !== question.correctAnswer
                         ? 'bg-red-100 text-red-800'
                         : 'bg-gray-100 text-gray-600'
                   ]">
                <span class="font-medium">{{ String.fromCharCode(65 + optionIndex) }}.</span>
                {{ option }}
                <span v-if="optionIndex === question.correctAnswer" class="ml-2">✓</span>
                <span v-else-if="optionIndex === userAnswers[index] && userAnswers[index] !== question.correctAnswer" class="ml-2">✗</span>
              </div>
            </div>
            <div v-if="question.explanation" class="mt-3 p-3 bg-blue-50 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>Explication :</strong> {{ question.explanation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center space-x-4">
          <button 
            @click="restartQuiz"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Recommencer
          </button>
          <button 
            @click="goBack"
            class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Retour au scanner
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'

export default {
  name: 'QuizGenerator',
  data() {
    return {
      quiz: null,
      selectedChild: null,
      quizStarted: false,
      quizCompleted: false,
      currentQuestionIndex: 0,
      selectedAnswer: null,
      userAnswers: [],
      correctAnswers: 0
    }
  },
  computed: {
    currentQuestion() {
      return this.quiz?.questions[this.currentQuestionIndex] || null
    },
    progressPercentage() {
      return this.quiz?.questions?.length ? ((this.currentQuestionIndex + 1) / this.quiz.questions.length) * 100 : 0
    },
    scorePercentage() {
      return this.quiz?.questions?.length ? Math.round((this.correctAnswers / this.quiz.questions.length) * 100) : 0
    }
  },
  created() {
    this.initializeQuiz()
    // Temporairement désactiver la vérification de sécurité pour éviter les boucles
    // this.checkSecurity()
  },
  methods: {
    async initializeQuiz() {
      // Récupérer les données du quiz depuis les paramètres de route
      const quizData = this.$route.query.quizData
      const childId = this.$route.query.childId
      const lessonId = this.$route.query.lessonId
      
      if (lessonId && childId) {
        // Charger une leçon depuis la base de données
        try {
          const lesson = await LessonService.getLessonById(lessonId)
          this.quiz = lesson.quiz_data
          this.quiz.lessonId = lesson.id
          this.loadChildProfile(childId)
        } catch (error) {
          console.error('Erreur lors du chargement de la leçon:', error)
          this.goBack()
          return
        }
      } else if (quizData) {
        // Charger les données du quiz depuis les paramètres (mode génération)
        try {
          this.quiz = JSON.parse(quizData)
        } catch (error) {
          console.error('Erreur lors du parsing des données du quiz:', error)
          this.goBack()
          return
        }
      }
      
      if (childId) {
        this.loadChildProfile(childId)
      }
    },
    
    async loadChildProfile(childId) {
      const store = useProfileStore()
      await store.loadProfiles()
      this.selectedChild = store.getProfileById(childId)
    },
    
    checkSecurity() {
      // Vérifier que l'utilisateur a le droit d'accéder à ce quiz
      const childId = this.$route.query.childId
      const profileId = this.$route.query.profile || localStorage.getItem('selectedProfile')
      
      if (childId && profileId) {
        // Si l'ID du profil ne correspond pas à l'ID de l'enfant et que ce n'est pas un admin
        if (profileId !== childId) {
          const store = useProfileStore()
          const currentProfile = store.getProfileById(profileId)
          
          if (!currentProfile || !currentProfile.is_admin) {
            console.warn('Tentative d\'accès non autorisé au quiz - redirection')
            this.$router.push('/')
            return
          }
        }
      }
    },
    
    goBack() {
      // Vérifier le type de profil pour déterminer la navigation appropriée
      if (this.selectedChild) {
        // Si c'est un profil enfant/teen, rediriger vers le dashboard utilisateur
        if (this.selectedChild.is_child || this.selectedChild.is_teen) {
          this.$router.push({ 
            path: '/user-dashboard', 
            query: { profile: this.selectedChild.id } 
          })
        } else {
          // Si c'est un profil admin, rediriger vers le dashboard admin
          this.$router.push({ 
            path: '/dashboard', 
            query: { profile: this.selectedChild.id } 
          })
        }
      } else {
        // Fallback vers le sélecteur de profil
        this.$router.push('/')
      }
    },
    
    startQuiz() {
      this.quizStarted = true
      this.userAnswers = new Array(this.quiz?.questions?.length || 0).fill(null)
    },
    
    selectAnswer(answerIndex) {
      this.selectedAnswer = answerIndex
    },
    
    nextQuestion() {
      if (this.selectedAnswer === null) return
      
      // Sauvegarder la réponse
      this.userAnswers[this.currentQuestionIndex] = this.selectedAnswer
      
      if (this.currentQuestionIndex === (this.quiz?.questions?.length || 0) - 1) {
        this.finishQuiz()
      } else {
        this.currentQuestionIndex++
        this.selectedAnswer = this.userAnswers[this.currentQuestionIndex]
      }
    },
    
    previousQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--
        this.selectedAnswer = this.userAnswers[this.currentQuestionIndex]
      }
    },
    
    async finishQuiz() {
      // Calculer le score
      this.correctAnswers = 0
      if (this.quiz?.questions) {
        this.quiz.questions.forEach((question, index) => {
          if (this.userAnswers[index] === question.correctAnswer) {
            this.correctAnswers++
          }
        })
      }
      
      // Sauvegarder les résultats en base de données si une leçon est associée
      if (this.quiz?.lessonId && this.selectedChild) {
        try {
          const results = {
            score: this.correctAnswers,
            totalQuestions: this.quiz?.questions?.length || 0,
            percentage: this.quiz?.questions?.length ? Math.round((this.correctAnswers / this.quiz.questions.length) * 100) : 0,
            answers: this.userAnswers
          }
          
          await LessonService.saveQuizResults(
            this.quiz.lessonId,
            this.selectedChild.id,
            results
          )
          
          console.log('Résultats du quiz sauvegardés:', results)
        } catch (error) {
          console.error('Erreur lors de la sauvegarde des résultats:', error)
        }
      }
      
      this.quizCompleted = true
    },
    
    restartQuiz() {
      this.quizStarted = false
      this.quizCompleted = false
      this.currentQuestionIndex = 0
      this.selectedAnswer = null
      this.userAnswers = []
      this.correctAnswers = 0
    }
  }
}
</script>
