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
              <h1 class="text-2xl font-bold text-gray-800">Scanner de Leçons</h1>
              <p class="text-sm text-gray-600">Scannez une leçon pour générer une interrogation</p>
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

      <!-- Zone de scan -->
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Scanner une Leçon</h2>
          <p class="text-gray-600">Prenez une photo ou téléchargez une image de la leçon</p>
        </div>

        <!-- Zone de téléchargement -->
        <div 
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent
          :class="[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          ]"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="hidden"
          />
          
          <div v-if="!selectedFile" class="space-y-4">
            <svg class="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <div>
              <p class="text-lg font-medium text-gray-700">Glissez-déposez votre image ici</p>
              <p class="text-gray-500">ou</p>
              <button 
                @click="$refs.fileInput.click()"
                class="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Parcourir les fichiers
              </button>
            </div>
            <p class="text-sm text-gray-500">Formats supportés: JPG, PNG, PDF</p>
          </div>

          <!-- Aperçu du fichier sélectionné -->
          <div v-else class="space-y-4">
            <div class="relative inline-block">
              <img 
                v-if="filePreview" 
                :src="filePreview" 
                alt="Aperçu" 
                class="max-w-xs max-h-48 rounded-lg shadow-md"
              />
              <button 
                @click="removeFile"
                class="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div>
              <p class="font-medium text-gray-800">{{ selectedFile.name }}</p>
              <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
          </div>
        </div>

        <!-- Avertissements de validation -->
        <div v-if="validationWarnings.length > 0" class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-center mb-2">
            <svg class="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <h4 class="text-sm font-medium text-yellow-800">Avertissements de validation</h4>
          </div>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li v-for="warning in validationWarnings" :key="warning">• {{ warning }}</li>
          </ul>
        </div>

        <!-- Boutons d'action -->
        <div class="flex justify-center space-x-4 mt-8">
          <button 
            @click="scanLesson"
            :disabled="!selectedFile || !selectedChild || isProcessing"
            :class="[
              'px-8 py-3 rounded-lg font-medium transition-colors',
              (!selectedFile || !selectedChild || isProcessing)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            ]"
          >
            <span v-if="isProcessing" class="flex items-center space-x-2">
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyse en cours...</span>
            </span>
            <span v-else>Générer l'interrogation</span>
          </button>
        </div>
      </div>

      <!-- Résultats -->
      <div v-if="generatedQuiz" class="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Interrogation générée</h3>
          <button 
            @click="startQuiz"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Commencer le quiz
          </button>
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
    </main>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { AIService } from '../services/aiService.js'
import { rateLimitService } from '../services/rateLimitService.js'
import { ImageValidationService } from '../services/imageValidationService.js'
import { auditLogService } from '../services/auditLogService.js'
import { LessonService } from '../services/lessonService.js'

export default {
  name: 'LessonScanner',
  data() {
    return {
      selectedFile: null,
      filePreview: null,
      isDragOver: false,
      isProcessing: false,
      selectedChild: null,
      generatedQuiz: null,
      imageValidator: new ImageValidationService(),
      validationErrors: [],
      validationWarnings: []
    }
  },
  computed: {
    childProfiles() {
      const store = useProfileStore()
      // Utiliser le nouveau getter pour tous les profils non-administrateurs
      return store.nonAdminProfiles || []
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
    
    handleDrop(e) {
      e.preventDefault()
      this.isDragOver = false
      const files = e.dataTransfer.files
      if (files.length > 0) {
        this.handleFile(files[0])
      }
    },
    
    handleFileSelect(e) {
      const file = e.target.files[0]
      if (file) {
        this.handleFile(file)
      }
    },
    
    async handleFile(file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image')
        return
      }
      
      // Valider l'image côté serveur
      try {
        const validation = await this.imageValidator.validateImage(file)
        
        if (!validation.valid) {
          this.validationErrors = validation.errors
          this.validationWarnings = validation.warnings
          alert(`Erreur de validation: ${validation.errors.join(', ')}`)
          return
        }
        
        this.validationErrors = []
        this.validationWarnings = validation.warnings
        
        // Enregistrer l'upload d'image dans les logs d'audit
        auditLogService.logDataAccess(
          this.selectedChild?.id || 'unknown',
          'image_upload',
          'IMAGE_UPLOADED',
          {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            validation: validation.metadata
          }
        )
        
        this.selectedFile = file
        
        // Créer un aperçu
        const reader = new FileReader()
        reader.onload = (e) => {
          this.filePreview = e.target.result
        }
        reader.readAsDataURL(file)
        
      } catch (error) {
        console.error('Erreur lors de la validation de l\'image:', error)
        auditLogService.logSystemError(
          'Image validation failed',
          'LessonScanner',
          { error: error.message, fileName: file.name }
        )
        alert('Erreur lors de la validation de l\'image')
      }
    },
    
    removeFile() {
      this.selectedFile = null
      this.filePreview = null
      this.generatedQuiz = null
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    async scanLesson() {
      if (!this.selectedFile || !this.selectedChild) return
      
      this.isProcessing = true
      this.generatedQuiz = null
      
      try {
        // Vérifier le rate limiting
        const rateLimitCheck = rateLimitService.checkRateLimit(this.selectedChild.id, 'openai')
        if (!rateLimitCheck.allowed) {
          alert(`Limite de requêtes atteinte. Réessayez dans ${rateLimitCheck.retryAfter} secondes.`)
          return
        }
        
        // Enregistrer la requête dans le rate limiting
        rateLimitService.recordRequest(this.selectedChild.id, 'openai')
        
        // Enregistrer le début de l'analyse dans les logs d'audit
        auditLogService.logApiUsage(
          this.selectedChild.id,
          'openai',
          true,
          {
            action: 'QUIZ_GENERATION_START',
            fileName: this.selectedFile.name,
            fileSize: this.selectedFile.size
          }
        )
        
        // Simuler l'analyse de l'image et la génération du quiz
        const aiService = new AIService()
        const quiz = await aiService.generateQuizFromImage(this.selectedFile, this.selectedChild)
        this.generatedQuiz = quiz
        
        // Sauvegarder la leçon en base de données
        const savedLesson = await LessonService.saveLesson(
          quiz, 
          this.selectedChild.id, 
          this.selectedFile
        )
        
        // Ajouter l'ID de la leçon sauvegardée au quiz
        this.generatedQuiz.lessonId = savedLesson.id
        
        // Enregistrer le succès de l'analyse
        auditLogService.logApiUsage(
          this.selectedChild.id,
          'openai',
          true,
          {
            action: 'QUIZ_GENERATION_SUCCESS',
            quizQuestions: quiz.questions?.length || 0,
            lessonId: savedLesson.id
          }
        )
        
        // Rediriger vers le quiz
        this.$router.push({
          name: 'QuizGenerator',
          query: {
            childId: this.selectedChild.id,
            lessonId: savedLesson.id,
            quizData: JSON.stringify(quiz)
          }
        })
      } catch (error) {
        console.error('Erreur lors de la génération du quiz:', error)
        
        // Enregistrer l'échec de l'analyse
        auditLogService.logApiUsage(
          this.selectedChild.id,
          'openai',
          false,
          {
            action: 'QUIZ_GENERATION_FAILED',
            error: error.message
          }
        )
        
        alert('Erreur lors de la génération du quiz. Veuillez réessayer.')
      } finally {
        this.isProcessing = false
      }
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
