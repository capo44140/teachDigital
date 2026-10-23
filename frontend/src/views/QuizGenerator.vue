<template>
  <!--
    LIQUID GLASS DESIGN - Quiz d'une leçon

    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan (fond partagé, teinte verte)
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen overflow-hidden">
    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-3 text-white/80 hover:text-white backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 relative group"
              aria-label="Retour"
              title="Retour"
              @click="goBack"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">{{ quiz?.title || 'Quiz' }}</h1>
              <p class="text-sm text-white/70">Pour {{ selectedChild?.name || 'l\'enfant' }}</p>
            </div>
          </div>
          <div v-if="quiz" class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm text-white/70">Question {{ currentQuestionIndex + 1 }} sur {{ questionCount }}</p>
              <div
                class="w-32 bg-white/10 backdrop-blur-xl rounded-full h-2 mt-1"
                role="progressbar"
                :aria-valuenow="progressPercentage"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Progression du quiz"
              >
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
    <div class="relative z-10 container mx-auto px-6 py-8">
      <!-- Aperçu parent : rien n'est enregistré -->
      <div
        v-if="isPreview"
        class="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 text-amber-100"
        role="note"
      >
        <span aria-hidden="true">👀</span>
        <p>
          <strong class="font-semibold">Aperçu parent</strong> — vous testez ce quiz depuis l'espace parent :
          vos réponses ne sont pas enregistrées dans les résultats de {{ selectedChild?.name || 'l\'enfant' }}.
        </p>
      </div>

      <!-- Erreur de chargement -->
      <div v-if="loadError" class="glass-card-dashboard text-center py-16" role="alert">
        <h2 class="text-2xl font-bold text-white mb-4">Quiz indisponible</h2>
        <p class="text-white/70 mb-6">{{ loadError }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            class="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl border border-white/20"
            @click="initializeQuiz"
          >
            Réessayer
          </button>
          <button
            type="button"
            class="px-6 py-3 bg-white/10 text-white rounded-xl border border-white/20"
            @click="goBack"
          >
            Retour
          </button>
        </div>
      </div>

      <!-- État de chargement -->
      <div v-else-if="!quiz" class="glass-card-dashboard text-center py-16" role="status">
        <div class="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-4">Chargement du quiz...</h2>
        <p class="text-lg text-white/70">Veuillez patienter pendant que nous préparons votre quiz.</p>
      </div>

      <!-- Description du quiz -->
      <div v-else-if="!quizStarted" class="glass-card-dashboard text-center py-16">
        <div class="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-4">{{ quiz.title || 'Quiz' }}</h2>
        <p class="text-lg text-white/70 mb-6">{{ quiz.description || 'Description du quiz' }}</p>
        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <div class="glass-stat-card">
            <div class="text-2xl font-bold text-green-400">{{ questionCount }}</div>
            <div class="text-sm text-white/70">Questions</div>
          </div>
          <div class="glass-stat-card">
            <div class="text-2xl font-bold text-blue-400">{{ quiz.level || 'N/A' }}</div>
            <div class="text-sm text-white/70">Niveau</div>
          </div>
          <div class="glass-stat-card">
            <div class="text-2xl font-bold text-purple-400">{{ quiz.subject || 'N/A' }}</div>
            <div class="text-sm text-white/70">Matière</div>
          </div>
        </div>
        <button
          type="button"
          class="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300 text-lg font-medium backdrop-blur-xl border border-white/20"
          @click="startQuiz"
        >
          {{ isPreview ? 'Commencer l\'aperçu' : 'Commencer le quiz' }}
        </button>
      </div>

      <!-- Quiz en cours -->
      <div v-else-if="!quizCompleted" class="glass-card-dashboard py-8">
        <!-- Nouvelle question annoncée aux lecteurs d'écran -->
        <div class="mb-6" aria-live="polite">
          <h2 id="quiz-question-title" ref="questionTitle" tabindex="-1" class="text-xl font-semibold text-white mb-2 focus:outline-none">
            Question {{ currentQuestionIndex + 1 }} sur {{ questionCount }}
          </h2>
          <p id="quiz-question-text" class="text-lg text-white/80">{{ currentQuestion.question }}</p>
        </div>

        <div class="space-y-3 mb-8" role="group" aria-labelledby="quiz-question-text">
          <button
            v-for="(option, index) in currentQuestion.options"
            :key="index"
            type="button"
            :aria-pressed="selectedAnswer === index ? 'true' : 'false'"
            :class="[
              'w-full p-4 text-left rounded-xl border-2 transition-all duration-300 backdrop-blur-xl',
              selectedAnswer === index
                ? 'border-green-400 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-100'
                : 'border-white/20 bg-white/5 hover:border-green-300 hover:bg-white/10 text-white'
            ]"
            @click="selectAnswer(index)"
          >
            <span class="flex items-center space-x-3">
              <span class="w-8 h-8 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center font-medium text-white" aria-hidden="true">
                {{ String.fromCharCode(65 + index) }}
              </span>
              <span>{{ option }}</span>
            </span>
          </button>
        </div>

        <div class="flex justify-between">
          <button
            type="button"
            :disabled="currentQuestionIndex === 0"
            :class="[
              'px-6 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl',
              currentQuestionIndex === 0
                ? 'bg-white/5 text-white/70 cursor-not-allowed border border-white/10'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:shadow-lg hover:shadow-gray-500/50 border border-white/20'
            ]"
            @click="previousQuestion"
          >
            Précédent
          </button>
          <button
            type="button"
            :disabled="selectedAnswer === null"
            :class="[
              'px-6 py-2 rounded-xl transition-all duration-300 backdrop-blur-xl',
              selectedAnswer === null
                ? 'bg-white/5 text-white/70 cursor-not-allowed border border-white/10'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/50 border border-white/20'
            ]"
            @click="nextQuestion"
          >
            {{ currentQuestionIndex === questionCount - 1 ? 'Terminer' : 'Suivant' }}
          </button>
        </div>
      </div>

      <!-- Résultats -->
      <!--
        Enfant : les réponses ne sont pas envoyées par le serveur avant l'enregistrement
        (GET /api/lessons/:id sans correctAnswer ni explanation). Score et correction viennent
        de la réponse du POST /quiz-results ; tant qu'il n'a pas abouti, ils sont indisponibles.
        Aperçu parent : quiz complet (jeton parent), score et correction calculés localement.
      -->
      <div v-else class="glass-card-dashboard py-8">
        <div class="text-center mb-8">
          <div class="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4"
               :class="!hasScore ? 'bg-white/10' : scorePercentage >= 70 ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'">
            <svg class="w-10 h-10" :class="!hasScore ? 'text-white/70' : scorePercentage >= 70 ? 'text-green-400' : 'text-red-400'"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path v-if="!hasScore || scorePercentage >= 70" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 ref="resultTitle" tabindex="-1" class="text-3xl font-bold text-white mb-2 focus:outline-none">
            {{ !hasScore ? 'Quiz terminé !' : scorePercentage >= 70 ? 'Excellent !' : 'Bien joué !' }}
          </h2>
          <template v-if="hasScore">
            <p class="text-lg text-white/70 mb-4">
              Vous avez obtenu {{ displayedScore }} bonnes réponses sur {{ displayedTotal }}
            </p>
            <div class="text-4xl font-bold mb-6" :class="scorePercentage >= 70 ? 'text-green-400' : 'text-blue-400'">
              {{ formatPercentage(scorePercentage) }}%
            </div>
          </template>
          <p v-else-if="saveStatus === 'error'" class="text-lg text-white/70 mb-4">
            Score indisponible : il est calculé par le serveur lors de l'enregistrement.
          </p>

          <!-- Enregistrement du résultat (profil enfant uniquement) -->
          <p v-if="isPreview" class="text-sm text-amber-200">Aperçu : ce résultat n'est pas enregistré.</p>
          <p v-else-if="saveStatus === 'saving'" class="text-sm text-white/70" role="status">Enregistrement du résultat et correction…</p>
          <p v-else-if="saveStatus === 'saved'" class="text-sm text-green-300" role="status">Résultat enregistré <span aria-hidden="true">✔</span></p>
          <div v-else-if="saveStatus === 'error'" class="text-sm text-red-300" role="alert">
            <p>{{ saveError }}</p>
            <p v-if="saveErrorRef" class="text-xs text-white/70 mt-1">{{ saveErrorRef }}</p>
            <button
              type="button"
              class="mt-3 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
              @click="saveResults"
            >
              Réessayer l'enregistrement
            </button>
          </div>
        </div>

        <!-- Détail des réponses (avec correction dès qu'elle est disponible) -->
        <div class="space-y-4 mb-8">
          <h3 class="text-xl font-semibold text-white mb-4">{{ corrections ? 'Correction' : 'Tes réponses' }}</h3>
          <p v-if="!corrections" class="text-sm text-white/70">
            La correction s'affichera une fois le résultat enregistré.
          </p>
          <div v-for="(question, index) in quiz.questions" :key="index"
               class="glass-quiz-item">
            <div class="flex items-start justify-between mb-2">
              <h4 class="font-medium text-white">Question {{ index + 1 }}</h4>
              <span v-if="corrections"
                    class="px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-xl"
                    :class="isCorrect(index)
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30'
                      : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'">
                {{ isCorrect(index) ? 'Correct' : 'Incorrect' }}
              </span>
            </div>
            <p class="text-white/80 mb-3">{{ question.question }}</p>
            <div class="space-y-2">
              <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                   :class="['p-2 rounded-lg text-sm backdrop-blur-xl', optionClass(index, optionIndex)]">
                <span class="font-medium">{{ String.fromCharCode(65 + optionIndex) }}.</span>
                {{ option }}
                <span v-if="corrections && optionIndex === correctAnswerOf(index)" class="ml-2"><span aria-hidden="true">✓</span> <span class="sr-only">(bonne réponse)</span></span>
                <span v-else-if="corrections && optionIndex === userAnswers[index]" class="ml-2"><span aria-hidden="true">✗</span> <span class="sr-only">(votre réponse)</span></span>
                <span v-else-if="!corrections && optionIndex === userAnswers[index]" class="ml-2 sr-only">(votre réponse)</span>
              </div>
            </div>
            <div v-if="corrections && corrections[index]?.explanation" class="mt-3 p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg backdrop-blur-xl border border-blue-400/30">
              <p class="text-sm text-blue-300">
                <strong>Explication :</strong> {{ corrections[index].explanation }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center space-x-4">
          <button
            type="button"
            class="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-xl border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="saveStatus === 'saving'"
            @click="restartQuiz"
          >
            Recommencer
          </button>
          <button
            type="button"
            class="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300 backdrop-blur-xl border border-white/20"
            @click="goBack"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { LessonService } from '../services/lessonService.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { formatPercentage } from '../utils/progressFormatters.js'
import { requestRef } from '../utils/apiErrors.js'

// quiz_data peut arriver sérialisé (JSON) selon la version du serveur
function parseQuizData (raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default {
  name: 'QuizGenerator',
  setup() {
    const profileStore = useProfileStore()
    const parentNav = useParentNavigation()
    return { profileStore, parentNav }
  },
  data() {
    return {
      quiz: null,
      selectedChild: null,
      loadError: '',
      // Quiz ouvert depuis l'espace parent : aperçu, aucun résultat enregistré
      isPreview: false,
      quizStarted: false,
      quizCompleted: false,
      currentQuestionIndex: 0,
      selectedAnswer: null,
      userAnswers: [],
      correctAnswers: 0,
      // Résultat recalculé par le serveur ({ score, totalQuestions, percentage })
      serverResult: null,
      // Correction renvoyée par le serveur après enregistrement : [{ correctAnswer, explanation }]
      serverCorrection: null,
      saveStatus: 'idle',
      saveError: '',
      saveErrorRef: null,
      // Tentative en cours : une réponse d'enregistrement d'une tentative précédente est ignorée
      attemptId: 0
    }
  },
  computed: {
    questionCount() {
      return this.quiz?.questions?.length || 0
    },
    currentQuestion() {
      return this.quiz?.questions?.[this.currentQuestionIndex] || null
    },
    progressPercentage() {
      if (!this.questionCount) return 0
      return Math.round(((this.currentQuestionIndex + 1) / this.questionCount) * 100) || 0
    },
    // Correction affichée : quiz complet en aperçu parent, réponse du serveur côté enfant
    corrections() {
      if (this.isPreview) {
        return (this.quiz?.questions || []).map(question => ({
          correctAnswer: Number.isInteger(question.correctAnswer) ? question.correctAnswer : null,
          explanation: question.explanation || null
        }))
      }
      return this.serverCorrection
    },
    // Score connu : calculé localement en aperçu, sinon uniquement celui du serveur
    hasScore() {
      return this.isPreview || !!this.serverResult
    },
    displayedScore() {
      return this.serverResult ? this.serverResult.score : this.correctAnswers
    },
    displayedTotal() {
      return this.serverResult ? this.serverResult.totalQuestions : this.questionCount
    },
    scorePercentage() {
      if (this.serverResult) return this.serverResult.percentage
      if (!this.isPreview || !this.questionCount) return 0
      return Math.round((this.correctAnswers / this.questionCount) * 100) || 0
    }
  },
  created() {
    // Le guard du router a vérifié que ?childId= désigne un profil enfant/ado
    this.isPreview = this.parentNav.isParentSession()
    this.initializeQuiz()
  },
  methods: {
    formatPercentage,

    async initializeQuiz() {
      this.loadError = ''
      this.quiz = null
      const { childId, lessonId } = this.$route.query
      if (!lessonId || !childId) {
        this.loadError = 'Lien de quiz incomplet : la leçon ou l\'enfant n\'est pas indiqué.'
        return
      }

      try {
        const [lesson] = await Promise.all([
          LessonService.getLessonById(lessonId),
          this.loadChildProfile(childId)
        ])
        const quizData = parseQuizData(lesson?.quiz_data)
        if (!Array.isArray(quizData?.questions) || quizData.questions.length === 0) {
          this.loadError = 'Cette leçon ne contient pas de questions.'
          return
        }
        this.quiz = {
          ...quizData,
          title: quizData.title || lesson.title,
          lessonId: lesson.id
        }
      } catch (error) {
        console.error('Erreur lors du chargement du quiz:', error)
        this.loadError = error?.message || 'Impossible de charger le quiz.'
      }
    },

    async loadChildProfile(childId) {
      await this.profileStore.loadProfiles()
      this.selectedChild = this.profileStore.getProfileById(childId)
    },

    goBack() {
      if (this.isPreview) {
        // Aperçu parent : revenir à la page d'origine (scanner, gestion des quiz…)
        if (window.history.state?.back) {
          this.$router.back()
        } else {
          this.parentNav.goToParent('/parent-quiz-management')
        }
        return
      }
      const childId = this.selectedChild?.id ?? this.$route.query.childId
      if (childId) {
        this.$router.push({ path: '/user-dashboard', query: { profile: childId } })
      } else {
        this.$router.push('/')
      }
    },

    startQuiz() {
      this.quizStarted = true
      this.userAnswers = new Array(this.questionCount).fill(null)
      // Le bouton « Commencer » disparaît : le focus passe à la première question
      this.$nextTick(() => this.$refs.questionTitle?.focus())
    },

    selectAnswer(answerIndex) {
      this.selectedAnswer = answerIndex
    },

    nextQuestion() {
      if (this.selectedAnswer === null) return

      // Sauvegarder la réponse
      this.userAnswers[this.currentQuestionIndex] = this.selectedAnswer

      if (this.currentQuestionIndex === this.questionCount - 1) {
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

    finishQuiz() {
      // Aperçu parent : score calculé localement (quiz complet). Enfant : les bonnes réponses
      // ne sont pas connues du client, le score et la correction viennent du serveur.
      this.correctAnswers = this.isPreview
        ? this.quiz.questions.reduce(
          (count, question, index) => count + (this.userAnswers[index] === question.correctAnswer ? 1 : 0),
          0
        )
        : 0
      this.quizCompleted = true
      // Le bouton « Terminer » disparaît : le focus passe au résultat
      this.$nextTick(() => this.$refs.resultTitle?.focus())

      if (!this.isPreview) {
        this.saveResults()
      }
    },

    correctAnswerOf(index) {
      return this.corrections?.[index]?.correctAnswer ?? null
    },

    isCorrect(index) {
      const correct = this.correctAnswerOf(index)
      return correct !== null && this.userAnswers[index] === correct
    },

    // Style d'une option : bonne réponse / mauvaise réponse choisie, ou simple choix sans correction
    optionClass(index, optionIndex) {
      const chosen = optionIndex === this.userAnswers[index]
      if (!this.corrections) {
        return chosen
          ? 'bg-white/15 text-white font-medium border border-white/40'
          : 'bg-white/5 text-white/70 border border-white/10'
      }
      if (optionIndex === this.correctAnswerOf(index)) {
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 font-medium border border-green-400/30'
      }
      if (chosen) {
        return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
      }
      return 'bg-white/5 text-white/70 border border-white/10'
    },

    async saveResults() {
      if (this.isPreview || !this.quiz?.lessonId) return
      const childId = this.selectedChild?.id ?? this.$route.query.childId
      if (!childId) return

      const attemptId = this.attemptId
      this.saveStatus = 'saving'
      this.saveError = ''
      this.saveErrorRef = null
      this.serverResult = null
      this.serverCorrection = null
      try {
        // Seules les réponses sont envoyées : score, notification parent et audit côté serveur
        const { result, correction, unlockedBadges } = await LessonService.saveQuizResults(
          this.quiz.lessonId,
          childId,
          this.userAnswers
        )
        if (attemptId !== this.attemptId) return
        if (result) this.serverResult = result
        if (correction) this.serverCorrection = correction
        this.saveStatus = 'saved'
        unlockedBadges.forEach((badge) => {
          this.$toast?.success(`Nouveau badge débloqué : ${badge.icon || '🏅'} ${badge.name || ''}`.trim())
        })
      } catch (error) {
        if (attemptId !== this.attemptId) return
        console.error('Erreur lors de la sauvegarde des résultats:', error)
        this.saveStatus = 'error'
        this.saveError = error?.message || 'Le résultat n\'a pas pu être enregistré.'
        this.saveErrorRef = requestRef(error)
      }
    },

    restartQuiz() {
      this.attemptId++
      this.quizStarted = false
      this.quizCompleted = false
      this.currentQuestionIndex = 0
      this.selectedAnswer = null
      this.userAnswers = []
      this.correctAnswers = 0
      this.serverResult = null
      this.serverCorrection = null
      this.saveStatus = 'idle'
      this.saveError = ''
      this.saveErrorRef = null
    }
  }
}
</script>

<style scoped>
/* NOTE: .glass-card-dashboard est centralisé (src/styles/liquid-glass.css) ; fond animé : AppBackground.vue */

/* .glass-stat-card : base partagée (src/styles/liquid-glass.css) */
.glass-stat-card {
  text-align: center;
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
