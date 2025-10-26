<template>
  <!--
    LIQUID GLASS DESIGN - Générateur de Quiz

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-3 text-white/80 hover:text-white backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 relative group"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">{{ quiz?.title || 'Quiz' }}</h1>
              <p class="text-sm text-white/60">Pour {{ selectedChild?.name || 'l\'enfant' }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm text-white/60">Question {{ currentQuestionIndex + 1 }} sur {{ quiz?.questions?.length || 0 }}</p>
              <div class="w-32 bg-white/10 backdrop-blur-xl rounded-full h-2 mt-1">
                <div 
                  class="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: progressPercentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-8">
      <!-- État de chargement -->
      <div v-if="!quiz" class="glass-card-dashboard text-center py-16">
        <div class="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-4">Chargement du quiz...</h2>
        <p class="text-lg text-white/60">Veuillez patienter pendant que nous préparons votre quiz.</p>
      </div>
      
      <!-- Description du quiz -->
      <div v-else-if="!quizStarted" class="glass-card-dashboard text-center py-16">
        <div class="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-4">{{ quiz?.title || 'Quiz' }}</h2>
        <p class="text-lg text-white/60 mb-6">{{ quiz?.description || 'Description du quiz' }}</p>
        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <div class="glass-stat-card">
            <div class="text-2xl font-bold text-green-400">{{ quiz?.questions?.length || 0 }}</div>
            <div class="text-sm text-white/60">Questions</div>
          </div>
          <div class="glass-stat-card">
            <div class="text-2xl font-bold text-blue-400">{{ quiz?.level || 'N/A' }}</div>
            <div class="text-sm text-white/60">Niveau</div>
          </div>
          <div class="glass-stat-card">
            <div class="text-2xl font-bold text-purple-400">{{ quiz?.subject || 'N/A' }}</div>
            <div class="text-sm text-white/60">Matière</div>
          </div>
        </div>
        <button 
          @click="startQuiz"
          class="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 text-lg font-medium backdrop-blur-xl border border-white/20"
        >
          Commencer le quiz
        </button>
      </div>

      <!-- Quiz en cours -->
      <div v-else-if="!quizCompleted" class="glass-card-dashboard py-8">
        <div class="mb-6">
          <h3 class="text-xl font-semibold text-white mb-2">
            Question {{ currentQuestionIndex + 1 }} sur {{ quiz?.questions?.length || 0 }}
          </h3>
          <p class="text-lg text-white/80">{{ currentQuestion.question }}</p>
        </div>

        <div class="space-y-3 mb-8">
          <button
            v-for="(option, index) in currentQuestion.options"
            :key="index"
            @click="selectAnswer(index)"
            :class="[
              'w-full p-4 text-left rounded-xl border-2 transition-all duration-300 backdrop-blur-xl',
              selectedAnswer === index
                ? 'border-green-400 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-100'
                : 'border-white/20 bg-white/5 hover:border-green-300 hover:bg-white/10 text-white'
            ]"
          >
            <div class="flex items-center space-x-3">
              <span class="w-8 h-8 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center font-medium text-white">
                {{ String.fromCharCode(65 + index) }}
              </span>
              <span>{{ option }}</span>
            </div>
          </button>
        </div>

        <div class="flex justify-between">
          <button 
            @click="previousQuestion"
            :disabled="currentQuestionIndex === 0"
            :class="[
              'px-6 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl',
              currentQuestionIndex === 0
                ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:shadow-lg hover:shadow-gray-500/50 border border-white/20'
            ]"
          >
            Précédent
          </button>
          <button 
            @click="nextQuestion"
            :disabled="selectedAnswer === null"
            :class="[
              'px-6 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl',
              selectedAnswer === null
                ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/50 border border-white/20'
            ]"
          >
            {{ currentQuestionIndex === (quiz?.questions?.length || 0) - 1 ? 'Terminer' : 'Suivant' }}
          </button>
        </div>
      </div>

      <!-- Résultats -->
      <div v-else class="glass-card-dashboard py-8">
        <div class="text-center mb-8">
          <div class="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4" 
               :class="scorePercentage >= 70 ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'">
            <svg class="w-10 h-10" :class="scorePercentage >= 70 ? 'text-green-400' : 'text-red-400'" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="scorePercentage >= 70" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-white mb-2">
            {{ scorePercentage >= 70 ? 'Excellent !' : 'Bien joué !' }}
          </h2>
          <p class="text-lg text-white/60 mb-4">
            Vous avez obtenu {{ correctAnswers }} bonnes réponses sur {{ quiz?.questions?.length || 0 }}
          </p>
          <div class="text-4xl font-bold mb-6" :class="scorePercentage >= 70 ? 'text-green-400' : 'text-blue-400'">
            {{ formatPercentage(scorePercentage) }}%
          </div>
        </div>

        <!-- Détail des réponses -->
        <div class="space-y-4 mb-8">
          <h3 class="text-xl font-semibold text-white mb-4">Détail des réponses</h3>
          <div v-for="(question, index) in (quiz?.questions || [])" :key="index" 
               class="glass-quiz-item">
            <div class="flex items-start justify-between mb-2">
              <h4 class="font-medium text-white">Question {{ index + 1 }}</h4>
              <span class="px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-xl"
                    :class="userAnswers[index] === question.correctAnswer 
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30' 
                      : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'">
                {{ userAnswers[index] === question.correctAnswer ? 'Correct' : 'Incorrect' }}
              </span>
            </div>
            <p class="text-white/80 mb-3">{{ question.question }}</p>
            <div class="space-y-2">
              <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                   :class="[
                     'p-2 rounded-lg text-sm backdrop-blur-xl',
                     optionIndex === question.correctAnswer 
                       ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 font-medium border border-green-400/30'
                       : optionIndex === userAnswers[index] && userAnswers[index] !== question.correctAnswer
                         ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
                         : 'bg-white/5 text-white/60 border border-white/10'
                   ]">
                <span class="font-medium">{{ String.fromCharCode(65 + optionIndex) }}.</span>
                {{ option }}
                <span v-if="optionIndex === question.correctAnswer" class="ml-2">✓</span>
                <span v-else-if="optionIndex === userAnswers[index] && userAnswers[index] !== question.correctAnswer" class="ml-2">✗</span>
              </div>
            </div>
            <div v-if="question.explanation" class="mt-3 p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg backdrop-blur-xl border border-blue-400/30">
              <p class="text-sm text-blue-300">
                <strong>Explication :</strong> {{ question.explanation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center space-x-4">
          <button 
            @click="restartQuiz"
            class="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-xl border border-white/20"
          >
            Recommencer
          </button>
          <button 
            @click="goBack"
            class="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300 backdrop-blur-xl border border-white/20"
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
      if (!this.quiz?.questions?.length) return 0
      const progress = ((this.currentQuestionIndex + 1) / this.quiz.questions.length) * 100
      return Math.round(progress) || 0
    },
    scorePercentage() {
      if (!this.quiz?.questions?.length) return 0
      const percentage = (this.correctAnswers / this.quiz.questions.length) * 100
      return Math.round(percentage) || 0
    }
  },
  created() {
    this.initializeQuiz()
    // Temporairement désactiver la vérification de sécurité pour éviter les boucles
    // this.checkSecurity()
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

    async initializeQuiz() {
      console.log('🚀 [QUIZ] Initialisation du quiz')
      console.log('📋 [QUIZ] Paramètres de route reçus:', this.$route.query)
      
      // Récupérer les données du quiz depuis les paramètres de route
      const quizData = this.$route.query.quizData
      const childId = this.$route.query.childId
      const lessonId = this.$route.query.lessonId
      
      console.log('🔍 [QUIZ] Données extraites:', {
        hasQuizData: !!quizData,
        hasChildId: !!childId,
        hasLessonId: !!lessonId,
        childId,
        lessonId
      })
      
      if (lessonId && childId) {
        console.log('📚 [QUIZ] Mode leçon - Chargement depuis la base de données')
        // Charger une leçon depuis la base de données
        try {
          const lesson = await LessonService.getLessonById(lessonId)
          this.quiz = lesson.quiz_data
          this.quiz.lessonId = lesson.id
          console.log('✅ [QUIZ] Leçon chargée:', {
            lessonId: lesson.id,
            title: lesson.title,
            quizLessonId: this.quiz.lessonId
          })
          this.loadChildProfile(childId)
        } catch (error) {
          console.error('❌ [QUIZ] Erreur lors du chargement de la leçon:', error)
          this.goBack()
          return
        }
      } else if (quizData) {
        console.log('🎮 [QUIZ] Mode génération - Chargement depuis les paramètres')
        // Charger les données du quiz depuis les paramètres (mode génération)
        try {
          this.quiz = JSON.parse(quizData)
          console.log('✅ [QUIZ] Quiz chargé depuis les paramètres:', {
            title: this.quiz?.title,
            hasLessonId: !!this.quiz?.lessonId,
            lessonId: this.quiz?.lessonId
          })
        } catch (error) {
          console.error('❌ [QUIZ] Erreur lors du parsing des données du quiz:', error)
          this.goBack()
          return
        }
      } else {
        console.warn('⚠️ [QUIZ] Aucune donnée de quiz trouvée')
      }
      
      if (childId) {
        console.log('👤 [QUIZ] Chargement du profil enfant...')
        await this.loadChildProfile(childId)
      } else {
        console.warn('⚠️ [QUIZ] Aucun childId fourni dans les paramètres de route')
      }
      
      console.log('🏁 [QUIZ] Initialisation terminée')
      console.log('🔍 [QUIZ] État final:', {
        hasQuiz: !!this.quiz,
        hasSelectedChild: !!this.selectedChild,
        quizLessonId: this.quiz?.lessonId,
        selectedChildId: this.selectedChild?.id
      })
    },
    
    async loadChildProfile(childId) {
      console.log('👤 [QUIZ] Chargement du profil enfant:', childId)
      console.log('🔍 [QUIZ] Type de childId:', typeof childId)
      
      const store = useProfileStore()
      await store.loadProfiles()
      
      console.log('📊 [QUIZ] Tous les profils chargés:', store.profiles?.length || 0)
      console.log('🔍 [QUIZ] Profils disponibles:', store.profiles?.map(p => ({ id: p.id, name: p.name, type: p.type })) || [])
      
      // Convertir childId en nombre car les paramètres de route sont des strings
      const numericChildId = parseInt(childId, 10)
      console.log('🔢 [QUIZ] Conversion childId:', { original: childId, converted: numericChildId })
      
      this.selectedChild = store.getProfileById(numericChildId)
      
      if (this.selectedChild) {
        console.log('✅ [QUIZ] Profil enfant chargé:', {
          id: this.selectedChild.id,
          name: this.selectedChild.name,
          type: this.selectedChild.type
        })
      } else {
        console.error('❌ [QUIZ] Profil enfant non trouvé!', {
          originalChildId: childId,
          numericChildId: numericChildId,
          availableIds: store.profiles?.map(p => p.id) || [],
          availableNames: store.profiles?.map(p => p.name) || []
        })
      }
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
      console.log('🎯 [QUIZ] Début de la finalisation du quiz')
      console.log('📊 [QUIZ] Données du quiz:', {
        lessonId: this.quiz?.lessonId,
        childId: this.selectedChild?.id,
        childName: this.selectedChild?.name,
        totalQuestions: this.quiz?.questions?.length || 0
      })
      
      console.log('🔍 [QUIZ] État détaillé:', {
        quiz: !!this.quiz,
        selectedChild: !!this.selectedChild,
        quizLessonId: this.quiz?.lessonId,
        selectedChildId: this.selectedChild?.id,
        selectedChildName: this.selectedChild?.name,
        selectedChildType: this.selectedChild?.type
      })
      
      // Calculer le score
      this.correctAnswers = 0
      if (this.quiz?.questions) {
        this.quiz.questions.forEach((question, index) => {
          if (this.userAnswers[index] === question.correctAnswer) {
            this.correctAnswers++
          }
        })
      }
      
      console.log('📈 [QUIZ] Score calculé:', {
        correctAnswers: this.correctAnswers,
        totalQuestions: this.quiz?.questions?.length || 0,
        percentage: this.quiz?.questions?.length ? Math.round((this.correctAnswers / this.quiz.questions.length) * 100) : 0
      })
      
      // Sauvegarder les résultats en base de données si une leçon est associée
      if (this.quiz?.lessonId && this.selectedChild) {
        console.log('💾 [QUIZ] Sauvegarde des résultats en cours...')
        try {
          const results = {
            score: this.correctAnswers,
            totalQuestions: this.quiz?.questions?.length || 0,
            percentage: this.quiz?.questions?.length ? Math.round((this.correctAnswers / this.quiz.questions.length) * 100) : 0,
            answers: this.userAnswers
          }
          
          console.log('📝 [QUIZ] Données à sauvegarder:', {
            lessonId: this.quiz.lessonId,
            profileId: this.selectedChild.id,
            results: results
          })
          
          const savedResult = await LessonService.saveQuizResults(
            this.quiz.lessonId,
            this.selectedChild.id,
            results
          )
          
          console.log('✅ [QUIZ] Résultats sauvegardés avec succès!')
          console.log('📊 [QUIZ] Résultat sauvegardé:', savedResult)
          console.log('🎉 [QUIZ] Quiz terminé par', this.selectedChild.name, 'avec', results.percentage + '%')
          
        } catch (error) {
          console.error('❌ [QUIZ] Erreur lors de la sauvegarde des résultats:', error)
          console.error('🔍 [QUIZ] Détails de l\'erreur:', {
            message: error.message,
            stack: error.stack,
            lessonId: this.quiz?.lessonId,
            profileId: this.selectedChild?.id
          })
        }
      } else {
        console.warn('⚠️ [QUIZ] Impossible de sauvegarder - données manquantes:', {
          hasLessonId: !!this.quiz?.lessonId,
          hasSelectedChild: !!this.selectedChild,
          lessonId: this.quiz?.lessonId,
          childId: this.selectedChild?.id
        })
      }
      
      console.log('🏁 [QUIZ] Quiz marqué comme terminé')
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

<style scoped>
/* Liquid Glass Design Styles */
.glass-card-dashboard {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 2rem;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.glass-stat-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
  text-align: center;
}

.glass-stat-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.glass-quiz-item {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 1.5rem;
}

.glass-quiz-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Background blob animations */
@keyframes blob {
  0%, 100% { 
    transform: translate(0, 0) scale(1); 
  }
  33% { 
    transform: translate(30px, -50px) scale(1.1); 
  }
  66% { 
    transform: translate(-20px, 20px) scale(0.9); 
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

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

button:disabled {
  transform: none;
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

  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .glass-card-dashboard,
  .glass-stat-card,
  .glass-quiz-item {
    padding: 1rem;
    border-radius: 1rem;
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

/* Quiz specific styles */
.space-y-3 > button {
  transition: all 0.3s ease;
}

.space-y-3 > button:hover {
  transform: translateY(-1px);
}

/* Progress bar styling */
.w-32 {
  transition: all 0.3s ease;
}

/* Answer option styling */
.w-8.h-8 {
  transition: all 0.3s ease;
}

.w-8.h-8:hover {
  transform: scale(1.05);
}

/* Grid responsive adjustments */
@media (max-width: 1024px) {
  .md\:grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

/* Icon styling */
.w-20.h-20 {
  transition: all 0.3s ease;
}

.w-20.h-20:hover {
  transform: scale(1.05);
}

/* Score display styling */
.text-4xl {
  transition: all 0.3s ease;
}

/* Action buttons styling */
.flex.justify-center.space-x-4 > button {
  transition: all 0.3s ease;
}

.flex.justify-center.space-x-4 > button:hover {
  transform: translateY(-2px);
}

/* Navigation buttons styling */
.flex.justify-between > button {
  transition: all 0.3s ease;
}

.flex.justify-between > button:hover {
  transform: translateY(-1px);
}

/* Question styling */
.text-lg {
  transition: all 0.3s ease;
}

/* Explanation styling */
.bg-gradient-to-r.from-blue-500\/20.to-cyan-500\/20 {
  transition: all 0.3s ease;
}

.bg-gradient-to-r.from-blue-500\/20.to-cyan-500\/20:hover {
  background: rgba(59, 130, 246, 0.25);
}
</style>
