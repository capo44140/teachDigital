<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header -->
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              type="button"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
              aria-label="Retour au tableau de bord"
              @click="goBack"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Générateur de Quiz Texte</h1>
              <p class="text-sm text-white/70 hidden sm:block">Créez une interrogation à partir de texte</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <div class="relative z-10 container mx-auto px-6 py-12">
      <!-- Sélection du profil enfant -->
      <LessonScannerChildSelector
        v-model="selectedChild"
        :children="childProfiles"
      />

      <!-- Zone de saisie de texte -->
      <div class="glass-card-dashboard">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg aria-hidden="true" class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Saisir le contenu</h2>
          <p class="text-white/70">Tapez ou collez le texte à partir duquel générer l'interrogation</p>
        </div>

        <!-- Formulaire de saisie -->
        <div class="space-y-6">
          <!-- Titre de la leçon -->
          <div>
            <label for="text-quiz-title" class="block text-sm font-medium text-white/80 mb-2">
              Titre de la leçon *
            </label>
            <input
              id="text-quiz-title"
              v-model="lessonTitle"
              type="text"
              placeholder="Ex: Les fractions, L'histoire de France..."
              class="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              :class="{ 'border-red-500/50': !lessonTitle && showValidation }"
              :aria-invalid="!lessonTitle && showValidation ? 'true' : undefined"
              :aria-describedby="!lessonTitle && showValidation ? 'text-quiz-title-error' : undefined"
            />
            <p v-if="!lessonTitle && showValidation" id="text-quiz-title-error" role="alert" class="text-red-400 text-sm mt-1">
              Le titre est obligatoire
            </p>
          </div>

          <!-- Matière -->
          <div>
            <label for="text-quiz-subject" class="block text-sm font-medium text-white/80 mb-2">
              Matière
            </label>
            <select
              id="text-quiz-subject"
              v-model="selectedSubject"
              class="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="" class="bg-slate-900">Sélectionner une matière</option>
              <option value="mathématiques" class="bg-slate-900">Mathématiques</option>
              <option value="français" class="bg-slate-900">Français</option>
              <option value="histoire" class="bg-slate-900">Histoire</option>
              <option value="géographie" class="bg-slate-900">Géographie</option>
              <option value="physique" class="bg-slate-900">Physique</option>
              <option value="sciences" class="bg-slate-900">Sciences</option>
              <option value="anglais" class="bg-slate-900">Anglais</option>
              <option value="espagnol" class="bg-slate-900">Espagnol</option>
              <option value="musique" class="bg-slate-900">Musique</option>
              <option value="art" class="bg-slate-900">Art</option>
              <option value="eps" class="bg-slate-900">Éducation physique et sportive</option>
              <option value="informatique" class="bg-slate-900">Informatique</option>
              <option value="technologie" class="bg-slate-900">Technologie</option>
              <option value="autre" class="bg-slate-900">Autre</option>
            </select>
          </div>

          <!-- Niveau -->
          <div>
            <label for="text-quiz-level" class="block text-sm font-medium text-white/80 mb-2">
              Niveau
            </label>
            <select
              id="text-quiz-level"
              v-model="selectedLevel"
              class="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="" class="bg-slate-900">Sélectionner un niveau</option>
              <option v-for="level in schoolLevels" :key="level.value" :value="level.value" class="bg-slate-900">{{ level.label }}</option>
            </select>
          </div>

          <!-- Zone de texte -->
          <div>
            <label for="text-quiz-content" class="block text-sm font-medium text-white/80 mb-2">
              Contenu de la leçon *
            </label>
            <div class="relative">
              <textarea
                id="text-quiz-content"
                v-model="lessonText"
                rows="12"
                :maxlength="maxTextLength"
                placeholder="Tapez ou collez ici le contenu de la leçon. Plus le texte est détaillé, meilleure sera l'interrogation générée..."
                class="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                :class="{ 'border-red-500/50': (!lessonText && showValidation) || isTextTooLong }"
                :aria-invalid="(!lessonText && showValidation) || isTextTooLong ? 'true' : undefined"
                aria-describedby="text-quiz-content-help"
              ></textarea>
              <div class="absolute bottom-3 right-3 text-xs text-white/70 bg-white/10 px-2 py-1 rounded-lg" aria-hidden="true">
                {{ characterCount.toLocaleString('fr-FR') }} / {{ maxTextLength.toLocaleString('fr-FR') }} caractères
              </div>
            </div>
            <p v-if="!lessonText && showValidation" role="alert" class="text-red-400 text-sm mt-1">
              Le contenu est obligatoire
            </p>
            <p v-else-if="isTextTooLong" role="alert" class="text-red-400 text-sm mt-1">
              Texte trop long : {{ maxTextLength.toLocaleString('fr-FR') }} caractères maximum.
            </p>
            <p id="text-quiz-content-help" class="text-white/70 text-sm mt-1">
              Minimum recommandé : 200 caractères pour une bonne génération (maximum {{ maxTextLength.toLocaleString('fr-FR') }})
              <span class="sr-only">({{ characterCount }} caractères saisis)</span>
            </p>
          </div>

          <!-- Options de génération -->
          <div class="bg-white/10 backdrop-blur-xl rounded-xl p-4">
            <h3 class="text-lg font-medium text-white mb-4">Options de génération</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="text-quiz-count" class="block text-sm font-medium text-white/80 mb-2">
                  Nombre de questions
                </label>
                <select
                  id="text-quiz-count"
                  v-model="questionCount"
                  class="w-full px-3 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="3" class="bg-slate-900">3 questions</option>
                  <option value="5" class="bg-slate-900">5 questions</option>
                  <option value="8" class="bg-slate-900">8 questions</option>
                  <option value="10" class="bg-slate-900">10 questions</option>
                  <option value="20" class="bg-slate-900">20 questions</option>
                  <option value="40" class="bg-slate-900">40 questions</option>
                </select>
              </div>
              <div>
                <label for="text-quiz-difficulty" class="block text-sm font-medium text-white/80 mb-2">
                  Difficulté
                </label>
                <select
                  id="text-quiz-difficulty"
                  v-model="difficulty"
                  class="w-full px-3 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="facile" class="bg-slate-900">Facile</option>
                  <option value="moyen" class="bg-slate-900">Moyen</option>
                  <option value="difficile" class="bg-slate-900">Difficile</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="flex justify-center space-x-4">
            <button
              type="button"
              class="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
              @click="clearForm"
            >
              Effacer
            </button>
            <button
              type="button"
              :disabled="!canGenerate || isProcessing"
              :class="[
                'px-8 py-3 rounded-xl font-medium transition-colors',
                (!canGenerate || isProcessing)
                  ? 'bg-white/10 text-white/70 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              ]"
              @click="generateQuiz"
            >
              <span v-if="isProcessing" class="flex items-center space-x-2">
                <svg aria-hidden="true" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Génération en cours...</span>
              </span>
              <span v-else>Générer l'interrogation</span>
            </button>
          </div>

          <!-- Erreur de génération (limite atteinte, service IA indisponible…) -->
          <div v-if="errorMessage" class="bg-red-500/20 border border-red-500/30 text-red-200 px-6 py-4 rounded-xl" role="alert">
            {{ errorMessage }}
            <span v-if="errorReference" class="block text-xs text-red-200 mt-1">Réf. {{ errorReference }}</span>
          </div>
        </div>
      </div>

      <!-- Résultats -->
      <div v-if="generatedQuiz" class="mt-8 bg-white/10 backdrop-blur-xl rounded-xl p-6" role="region" aria-labelledby="text-quiz-result-title">
        <div class="flex items-center justify-between mb-4">
          <h3 id="text-quiz-result-title" class="text-xl font-semibold text-white">Interrogation générée</h3>
          <div class="flex space-x-2">
            <button
              type="button"
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
              aria-haspopup="dialog"
              @click="previewQuiz"
            >
              Aperçu
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              @click="startQuiz"
            >
              Tester le quiz
            </button>
          </div>
        </div>

        <div class="space-y-4">
          <div v-for="(question, index) in generatedQuiz.questions" :key="index" class="border border-white/20 rounded-lg p-4">
            <h4 class="font-medium text-white mb-2">Question {{ index + 1 }}</h4>
            <p class="text-white/70 mb-3">{{ question.question }}</p>
            <div class="space-y-2">
              <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                   class="flex items-center space-x-2">
                <span class="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-sm font-medium text-white">
                  {{ String.fromCharCode(65 + optionIndex) }}
                </span>
                <span class="text-white/70">{{ option }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aperçu du quiz -->
      <BaseModal
        :open="showPreview && !!generatedQuiz"
        labelledby="text-quiz-preview-title"
        initial-focus=".text-quiz-preview-close"
        overlay-class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        panel-class="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        @close="closePreview"
      >
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 id="text-quiz-preview-title" class="text-xl font-semibold text-gray-800">Aperçu de l'interrogation</h3>
            <button
              type="button"
              class="text-quiz-preview-close p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              aria-label="Fermer l'aperçu"
              @click="closePreview"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6">
          <div class="space-y-6">
            <div v-for="(question, index) in generatedQuiz.questions" :key="index" class="border border-gray-200 rounded-lg p-4">
              <h4 class="font-medium text-gray-800 mb-3">Question {{ index + 1 }}</h4>
              <p class="text-gray-700 mb-4">{{ question.question }}</p>
              <div class="space-y-2">
                <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                     class="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                  <span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {{ String.fromCharCode(65 + optionIndex) }}
                  </span>
                  <span class="text-gray-700">{{ option }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              @click="closePreview"
            >
              Fermer
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              @click="startQuiz"
            >
              Tester le quiz
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { AIService } from '../services/aiService.js'
import { useQuizGeneration } from '../composables/useQuizGeneration.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { SCHOOL_LEVELS } from '../constants/schoolLevels.js'
import { AI_MAX_TEXT_LENGTH, boundQuestionCount } from '../constants/aiLimits.js'
import LessonScannerChildSelector from '../components/lesson-scanner/LessonScannerChildSelector.vue'
import BaseModal from '../components/BaseModal.vue'

export default {
  name: 'TextQuizGenerator',
  components: {
    LessonScannerChildSelector,
    BaseModal
  },
  setup() {
    const profileStore = useProfileStore()
    const parentNav = useParentNavigation()
    const {
      isProcessing,
      errorMessage,
      errorReference,
      runGeneration,
      saveGeneratedLesson,
      openQuizPreview,
      assertValidQuiz
    } = useQuizGeneration({ source: 'text' })

    return {
      profileStore,
      parentNav,
      isProcessing,
      errorMessage,
      errorReference,
      runGeneration,
      saveGeneratedLesson,
      openQuizPreview,
      assertValidQuiz,
      schoolLevels: SCHOOL_LEVELS
    }
  },
  data() {
    return {
      selectedChild: null,
      lessonTitle: '',
      selectedSubject: '',
      selectedLevel: '',
      lessonText: '',
      questionCount: '5',
      difficulty: 'moyen',
      generatedQuiz: null,
      savedLessonId: null,
      showPreview: false,
      showValidation: false
    }
  },
  computed: {
    childProfiles() {
      return this.profileStore.nonAdminProfiles || []
    },
    characterCount() {
      return this.lessonText.length
    },
    maxTextLength() {
      return AI_MAX_TEXT_LENGTH
    },
    // Le serveur refuse au-delà de 50 000 caractères (texte collé malgré maxlength…)
    isTextTooLong() {
      return this.lessonText.length > AI_MAX_TEXT_LENGTH
    },
    canGenerate() {
      return this.selectedChild && this.lessonTitle.trim() && this.lessonText.trim() && !this.isTextTooLong
    }
  },
  async created() {
    await this.profileStore.loadProfiles()
  },
  methods: {
    goBack() {
      this.parentNav.goToDashboard()
    },

    clearForm() {
      this.lessonTitle = ''
      this.selectedSubject = ''
      this.selectedLevel = ''
      this.lessonText = ''
      this.questionCount = '5'
      this.difficulty = 'moyen'
      this.generatedQuiz = null
      this.savedLessonId = null
      this.showPreview = false
      this.showValidation = false
      this.errorMessage = ''
    },

    async generateQuiz() {
      if (!this.canGenerate) {
        this.showValidation = true
        return
      }

      this.generatedQuiz = null
      this.savedLessonId = null
      this.showValidation = false

      const child = this.selectedChild
      const outcome = await this.runGeneration({
        child,
        details: {
          textLength: this.lessonText.length,
          questionCount: this.questionCount,
          difficulty: this.difficulty
        },
        task: async () => {
          const quiz = this.assertValidQuiz(await new AIService().generateQuizFromText(
            this.lessonText,
            child,
            {
              title: this.lessonTitle,
              subject: this.selectedSubject,
              level: this.selectedLevel,
              questionCount: boundQuestionCount(this.questionCount),
              difficulty: this.difficulty
            }
          ))
          // Une seule requête d'enregistrement (pas de doublon en cas de lenteur)
          const lesson = await this.saveGeneratedLesson(quiz, child, {
            lesson: {
              title: this.lessonTitle,
              description: `Quiz généré à partir de texte - ${this.selectedSubject || 'Matière non spécifiée'}`,
              subject: this.selectedSubject,
              level: this.selectedLevel
            }
          })
          return { quiz, lesson }
        }
      })

      if (outcome) {
        this.generatedQuiz = outcome.quiz
        this.savedLessonId = outcome.lesson.id
        this.$toast.success('Interrogation générée et enregistrée.')
      }
    },

    previewQuiz() {
      this.showPreview = true
    },

    closePreview() {
      this.showPreview = false
    },

    startQuiz() {
      if (!this.selectedChild || !this.savedLessonId) return
      // Seul l'identifiant de la leçon passe dans l'URL (aperçu parent, rien n'est enregistré)
      this.openQuizPreview(this.selectedChild, this.savedLessonId)
    }
  }
}
</script>
