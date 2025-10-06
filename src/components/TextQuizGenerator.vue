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
              <h1 class="text-2xl font-bold text-gray-800">Générateur de Quiz Texte</h1>
              <p class="text-sm text-gray-600">Créez une interrogation à partir de texte</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <!-- Sélection du profil enfant -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Sélectionner l'enfant</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            v-for="child in childProfiles"
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
            </div>
          </button>
        </div>
      </div>

      <!-- Zone de saisie de texte -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Saisir le contenu</h2>
          <p class="text-gray-600">Tapez ou collez le texte à partir duquel générer l'interrogation</p>
        </div>

        <!-- Formulaire de saisie -->
        <div class="space-y-6">
          <!-- Titre de la leçon -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Titre de la leçon *
            </label>
            <input
              v-model="lessonTitle"
              type="text"
              placeholder="Ex: Les fractions, L'histoire de France..."
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-500': !lessonTitle && showValidation }"
            />
            <p v-if="!lessonTitle && showValidation" class="text-red-500 text-sm mt-1">
              Le titre est obligatoire
            </p>
          </div>

          <!-- Matière -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Matière
            </label>
            <select
              v-model="selectedSubject"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner une matière</option>
              <option value="mathématiques">Mathématiques</option>
              <option value="français">Français</option>
              <option value="histoire">Histoire</option>
              <option value="géographie">Géographie</option>
              <option value="sciences">Sciences</option>
              <option value="anglais">Anglais</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <!-- Niveau -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Niveau
            </label>
            <select
              v-model="selectedLevel"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un niveau</option>
              <option value="CP">CP (6 ans)</option>
              <option value="CE1">CE1 (7 ans)</option>
              <option value="CE2">CE2 (8 ans)</option>
              <option value="CM1">CM1 (9 ans)</option>
              <option value="CM2">CM2 (10 ans)</option>
              <option value="6ème">6ème (11 ans)</option>
              <option value="5ème">5ème (12 ans)</option>
              <option value="4ème">4ème (13 ans)</option>
              <option value="3ème">3ème (14 ans)</option>
            </select>
          </div>

          <!-- Zone de texte -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Contenu de la leçon *
            </label>
            <div class="relative">
              <textarea
                v-model="lessonText"
                rows="12"
                placeholder="Tapez ou collez ici le contenu de la leçon. Plus le texte est détaillé, meilleure sera l'interrogation générée..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                :class="{ 'border-red-500': !lessonText && showValidation }"
                @input="updateCharacterCount"
              ></textarea>
              <div class="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                {{ characterCount }} caractères
              </div>
            </div>
            <p v-if="!lessonText && showValidation" class="text-red-500 text-sm mt-1">
              Le contenu est obligatoire
            </p>
            <p class="text-gray-500 text-sm mt-1">
              Minimum recommandé : 200 caractères pour une bonne génération
            </p>
          </div>

          <!-- Options de génération -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-medium text-gray-800 mb-4">Options de génération</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de questions
                </label>
                <select
                  v-model="questionCount"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3">3 questions</option>
                  <option value="5">5 questions</option>
                  <option value="8">8 questions</option>
                  <option value="10">10 questions</option>
                  <option value="20">20 questions</option>
                  <option value="40">40 questions</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Difficulté
                </label>
                <select
                  v-model="difficulty"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="flex justify-center space-x-4">
            <button 
              @click="clearForm"
              class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Effacer
            </button>
            <button 
              @click="generateQuiz"
              :disabled="!canGenerate || isProcessing"
              :class="[
                'px-8 py-3 rounded-lg font-medium transition-colors',
                (!canGenerate || isProcessing)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              ]"
            >
              <span v-if="isProcessing" class="flex items-center space-x-2">
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Génération en cours...</span>
              </span>
              <span v-else>Générer l'interrogation</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Résultats -->
      <div v-if="generatedQuiz" class="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Interrogation générée</h3>
          <div class="flex space-x-2">
            <button 
              @click="previewQuiz"
              class="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Aperçu
            </button>
            <button 
              @click="startQuiz"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Commencer le quiz
            </button>
          </div>
        </div>
        
        <div class="space-y-4">
          <div v-for="(question, index) in generatedQuiz.questions" :key="index" class="border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium text-gray-800 mb-2">Question {{ index + 1 }}</h4>
            <p class="text-gray-700 mb-3">{{ question.question }}</p>
            <div class="space-y-2">
              <div v-for="(option, optionIndex) in question.options" :key="optionIndex" 
                   class="flex items-center space-x-2">
                <span class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                  {{ String.fromCharCode(65 + optionIndex) }}
                </span>
                <span class="text-gray-700">{{ option }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aperçu du quiz -->
      <div v-if="showPreview" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-semibold text-gray-800">Aperçu de l'interrogation</h3>
              <button 
                @click="showPreview = false"
                class="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                @click="showPreview = false"
                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              <button 
                @click="startQuiz"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Commencer le quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { AIService } from '../services/aiService.js'
import { rateLimitService } from '../services/rateLimitService.js'
import { auditLogService } from '../services/auditLogService.js'
import { LessonService } from '../services/lessonService.js'

export default {
  name: 'TextQuizGenerator',
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
      showPreview: false,
      isProcessing: false,
      showValidation: false,
      characterCount: 0
    }
  },
  computed: {
    childProfiles() {
      const store = useProfileStore()
      return store.nonAdminProfiles || []
    },
    canGenerate() {
      return this.selectedChild && this.lessonTitle.trim() && this.lessonText.trim()
    }
  },
  async created() {
    const store = useProfileStore()
    await store.loadProfiles()
  },
  methods: {
    goBack() {
      this.$router.push('/dashboard')
    },
    
    selectChild(child) {
      this.selectedChild = child
    },
    
    updateCharacterCount() {
      this.characterCount = this.lessonText.length
    },
    
    clearForm() {
      this.lessonTitle = ''
      this.selectedSubject = ''
      this.selectedLevel = ''
      this.lessonText = ''
      this.questionCount = '5'
      this.difficulty = 'moyen'
      this.generatedQuiz = null
      this.showPreview = false
      this.showValidation = false
      this.characterCount = 0
    },
    
    async generateQuiz() {
      if (!this.canGenerate) {
        this.showValidation = true
        return
      }
      
      this.isProcessing = true
      this.generatedQuiz = null
      this.showValidation = false
      
      try {
        // Vérifier le rate limiting
        const rateLimitCheck = rateLimitService.checkRateLimit(this.selectedChild.id, 'openai')
        if (!rateLimitCheck.allowed) {
          alert(`Limite de requêtes atteinte. Réessayez dans ${rateLimitCheck.retryAfter} secondes.`)
          return
        }
        
        // Enregistrer la requête dans le rate limiting
        rateLimitService.recordRequest(this.selectedChild.id, 'openai')
        
        // Enregistrer le début de la génération dans les logs d'audit
        auditLogService.logApiUsage(
          this.selectedChild.id,
          'openai',
          true,
          {
            action: 'TEXT_QUIZ_GENERATION_START',
            lessonTitle: this.lessonTitle,
            textLength: this.lessonText.length,
            questionCount: this.questionCount,
            difficulty: this.difficulty
          }
        )
        
        // Générer le quiz à partir du texte
        const aiService = new AIService()
        const quiz = await aiService.generateQuizFromText(
          this.lessonText,
          this.selectedChild,
          {
            title: this.lessonTitle,
            subject: this.selectedSubject,
            level: this.selectedLevel,
            questionCount: parseInt(this.questionCount),
            difficulty: this.difficulty
          }
        )
        
        this.generatedQuiz = quiz
        
        // Sauvegarder la leçon en base de données
        const savedLesson = await LessonService.saveLesson(
          {
            ...quiz,
            title: this.lessonTitle,
            description: `Quiz généré à partir de texte - ${this.selectedSubject || 'Matière non spécifiée'}`,
            subject: this.selectedSubject,
            level: this.selectedLevel
          },
          this.selectedChild.id
        )
        
        // Ajouter l'ID de la leçon sauvegardée au quiz
        this.generatedQuiz.lessonId = savedLesson.id
        
        // Enregistrer le succès de la génération
        auditLogService.logApiUsage(
          this.selectedChild.id,
          'openai',
          true,
          {
            action: 'TEXT_QUIZ_GENERATION_SUCCESS',
            quizQuestions: quiz.questions?.length || 0,
            lessonId: savedLesson.id
          }
        )
        
      } catch (error) {
        console.error('Erreur lors de la génération du quiz:', error)
        
        // Enregistrer l'échec de la génération
        auditLogService.logApiUsage(
          this.selectedChild.id,
          'openai',
          false,
          {
            action: 'TEXT_QUIZ_GENERATION_FAILED',
            error: error.message
          }
        )
        
        alert('Erreur lors de la génération du quiz. Veuillez réessayer.')
      } finally {
        this.isProcessing = false
      }
    },
    
    previewQuiz() {
      this.showPreview = true
    },
    
    startQuiz() {
      this.$router.push({
        name: 'QuizGenerator',
        query: {
          childId: this.selectedChild.id,
          lessonId: this.generatedQuiz.lessonId,
          quizData: JSON.stringify(this.generatedQuiz)
        }
      })
    }
  }
}
</script>
