<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Scanner de Leçons</h1>
              <p class="text-sm text-white/60 hidden sm:block">Générez des quiz à partir de vos leçons</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Sélection du profil enfant -->
      <div class="glass-card-dashboard mb-8">
        <h2 class="text-xl font-bold text-white mb-4">Sélectionner l'enfant</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            v-for="child in childProfiles"
            :key="child.id"
            @click="selectChild(child)"
            :class="[
              'p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-2',
              selectedChild?.id === child.id 
                ? 'border-purple-400 bg-white/20' 
                : 'border-white/20 hover:border-white/40 hover:bg-white/10'
            ]"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="child.bgColor">
              <span class="text-white font-bold text-lg">{{ child.initial }}</span>
            </div>
            <p class="font-medium text-white text-sm text-center truncate">{{ child.name }}</p>
          </button>
        </div>
      </div>

      <!-- Zone de scan -->
      <div class="glass-card-dashboard">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Scanner une Leçon</h2>
          <p class="text-white/60">Prenez une photo ou téléchargez une image de la leçon</p>
        </div>

        <!-- Sélecteur du nombre de questions -->
        <div class="mb-8">
          <label class="block text-sm font-medium text-white/80 mb-3">Nombre de questions à générer</label>
          <select 
            v-model="questionCount"
            class="w-full max-w-xs px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          >
            <option value="3" class="bg-slate-900">3 questions</option>
            <option value="5" class="bg-slate-900">5 questions</option>
            <option value="8" class="bg-slate-900">8 questions</option>
            <option value="10" class="bg-slate-900">10 questions</option>
            <option value="15" class="bg-slate-900">15 questions</option>
            <option value="20" class="bg-slate-900">20 questions</option>
            <option value="40" class="bg-slate-900">40 questions</option>
          </select>
        </div>

        <!-- Zone de téléchargement -->
        <div 
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent
          :class="[
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all',
            isDragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/20'
          ]"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*,.pdf"
            @change="handleFileSelect"
            multiple
            class="hidden"
          />
          
          <div v-if="selectedFiles.length === 0" class="space-y-4">
            <svg class="w-16 h-16 text-white/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <div>
              <p class="text-lg font-medium text-white">Glissez-déposez vos documents ici</p>
              <p class="text-white/60 text-sm mt-1">ou</p>
              <button 
                @click="$refs.fileInput.click()"
                class="mt-3 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Parcourir les fichiers
              </button>
            </div>
            <p class="text-xs text-white/50">Formats supportés: JPG, PNG, PDF (plusieurs fichiers autorisés)</p>
          </div>

          <!-- Liste des fichiers sélectionnés -->
          <div v-else class="space-y-4 text-left">
            <h3 class="text-lg font-bold text-white">
              Documents sélectionnés ({{ selectedFiles.length }})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="(file, index) in selectedFiles" 
                :key="index"
                class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all"
              >
                <button 
                  @click="removeFile(index)"
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <img 
                      v-if="filePreviews[index]" 
                      :src="filePreviews[index]" 
                      alt="Aperçu" 
                      class="w-16 h-16 object-cover rounded-lg"
                    />
                    <div v-else class="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                      <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ file.name }}</p>
                    <p class="text-xs text-white/60">{{ formatFileSize(file.size) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Avertissements de validation -->
        <div v-if="validationWarnings.length > 0" class="mt-6 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-xl rounded-xl p-4">
          <div class="flex items-center mb-2">
            <svg class="w-5 h-5 text-yellow-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <h4 class="text-sm font-medium text-yellow-200">Avertissements de validation</h4>
          </div>
          <ul class="text-sm text-yellow-100 space-y-1">
            <li v-for="warning in validationWarnings" :key="warning">• {{ warning }}</li>
          </ul>
        </div>

        <!-- Boutons d'action -->
        <div class="flex flex-col sm:flex-row justify-center gap-3 mt-8">
          <button 
            v-if="selectedFiles.length > 0"
            @click="removeAllFiles"
            class="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all"
          >
            Supprimer tous les fichiers
          </button>
          <button 
            @click="scanLesson"
            :disabled="selectedFiles.length === 0 || !selectedChild || isProcessing"
            :class="[
              'px-8 py-3 rounded-xl font-medium transition-all',
              (selectedFiles.length === 0 || !selectedChild || isProcessing)
                ? 'bg-white/5 text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
            ]"
          >
            <span v-if="isProcessing" class="flex items-center justify-center space-x-2">
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Traitement en cours...</span>
            </span>
            <span v-else>Générer le quiz</span>
          </button>
        </div>

        <!-- Indicateur de progression -->
        <div v-if="isProcessing" class="mt-6 bg-white/10 backdrop-blur-xl rounded-xl p-4">
          <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full animate-pulse" style="width: 65%"></div>
          </div>
          <p class="text-white/60 text-sm mt-2 text-center">{{ processStatus }}</p>
        </div>

        <!-- Message de succès -->
        <div v-if="successMessage" class="mt-6 bg-green-500/20 border border-green-500/30 backdrop-blur-xl text-green-200 px-6 py-4 rounded-xl flex items-center space-x-3">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span>{{ successMessage }}</span>
        </div>

        <!-- Message d'erreur -->
        <div v-if="errorMessage" class="mt-6 bg-red-500/20 border border-red-500/30 backdrop-blur-xl text-red-200 px-6 py-4 rounded-xl flex items-center space-x-3">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>{{ errorMessage }}</span>
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
// Import dynamique pour éviter les problèmes d'initialisation
import { LessonService } from '../services/lessonService.js'
import { migrationService } from '../services/migrationService.js'

export default {
  name: 'LessonScanner',
  data() {
    return {
      selectedFiles: [],
      filePreviews: [],
      isDragOver: false,
      isProcessing: false,
      selectedChild: null,
      generatedQuiz: null,
      imageValidator: new ImageValidationService(),
      validationErrors: [],
      validationWarnings: [],
      questionCount: 5,
      auditLogService: null,
      successMessage: null,
      errorMessage: null,
      processStatus: 'Analyse en cours...'
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
    // Import dynamique pour éviter les problèmes d'initialisation
    const { auditLogService } = await import('../services/auditLogService.js')
    this.auditLogService = auditLogService
    
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
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        this.handleFiles(files)
      }
    },
    
    handleFileSelect(e) {
      const files = Array.from(e.target.files)
      if (files.length > 0) {
        this.handleFiles(files)
      }
    },
    
    async handleFiles(files) {
      const validFiles = []
      const validPreviews = []
      
      for (const file of files) {
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          alert(`Le fichier ${file.name} n'est pas supporté. Formats acceptés: JPG, PNG, PDF`)
          continue
        }
        
        // Valider l'image côté serveur (pour les images uniquement)
        if (file.type.startsWith('image/')) {
          try {
            const validation = await this.imageValidator.validateImage(file)
            
            if (!validation.valid) {
              this.validationErrors = validation.errors
              this.validationWarnings = validation.warnings
              alert(`Erreur de validation pour ${file.name}: ${validation.errors.join(', ')}`)
              continue
            }
            
            this.validationErrors = []
            this.validationWarnings = validation.warnings
            
            // Enregistrer l'upload d'image dans les logs d'audit
            if (this.auditLogService) {
              this.auditLogService.logDataAccess(
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
            }
          } catch (error) {
            console.error('Erreur lors de la validation de l\'image:', error)
            if (this.auditLogService) {
              this.auditLogService.logSystemError(
                'Image validation failed',
                'LessonScanner',
                { error: error.message, fileName: file.name }
              )
            }
            alert(`Erreur lors de la validation de ${file.name}`)
            continue
          }
        }
        
        validFiles.push(file)
        
        // Créer un aperçu pour les images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            validPreviews.push(e.target.result)
            this.filePreviews = [...validPreviews]
          }
          reader.readAsDataURL(file)
        } else {
          // Pour les PDF, on n'affiche pas d'aperçu
          validPreviews.push(null)
        }
      }
      
      // Ajouter les fichiers valides à la liste
      this.selectedFiles = [...this.selectedFiles, ...validFiles]
      this.filePreviews = [...this.filePreviews, ...validPreviews]
    },
    
    removeFile(index) {
      this.selectedFiles.splice(index, 1)
      this.filePreviews.splice(index, 1)
      this.generatedQuiz = null
    },
    
    removeAllFiles() {
      this.selectedFiles = []
      this.filePreviews = []
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
      if (this.selectedFiles.length === 0 || !this.selectedChild) return
      
      // Vérifier que l'utilisateur est connecté
      const token = localStorage.getItem('auth_token')
      if (!token) {
        this.errorMessage = 'Vous devez être connecté pour générer un quiz. Veuillez vous connecter avec votre code PIN.'
        alert('Vous devez être connecté pour générer un quiz. Veuillez vous connecter avec votre code PIN.')
        return
      }
      
      this.isProcessing = true
      this.generatedQuiz = null
      this.successMessage = null
      this.errorMessage = null
      this.processStatus = 'Analyse en cours...'

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
        if (this.auditLogService) {
          this.auditLogService.logApiUsage(
            this.selectedChild.id,
            'openai',
            true,
            {
              action: 'QUIZ_GENERATION_START',
              fileCount: this.selectedFiles.length,
              questionCount: parseInt(this.questionCount),
              fileNames: this.selectedFiles.map(f => f.name)
            }
          )
        }
        
        // Simuler l'analyse des documents et la génération du quiz
        const aiService = new AIService()
        const quiz = await aiService.generateQuizFromDocuments(
          this.selectedFiles, 
          this.selectedChild, 
          parseInt(this.questionCount)
        )
        this.generatedQuiz = quiz
        
        // Sauvegarder la leçon via le service de migration
        const savedLesson = await migrationService.saveLesson(
          quiz, 
          this.selectedChild.id, 
          this.selectedFiles
        )
        
        // Ajouter l'ID de la leçon sauvegardée au quiz
        this.generatedQuiz.lessonId = savedLesson.id
        
        // Enregistrer le succès de l'analyse
        if (this.auditLogService) {
          this.auditLogService.logApiUsage(
            this.selectedChild.id,
            'openai',
            true,
            {
              action: 'QUIZ_GENERATION_SUCCESS',
              quizQuestions: quiz.questions?.length || 0,
              lessonId: savedLesson.id,
              fileCount: this.selectedFiles.length
            }
          )
        }
        
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
        if (this.auditLogService) {
          this.auditLogService.logApiUsage(
            this.selectedChild.id,
            'openai',
            false,
            {
              action: 'QUIZ_GENERATION_FAILED',
              error: error.message,
              fileCount: this.selectedFiles.length
            }
          )
        }
        
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

<style scoped>
/* Animations */
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

/* Glass Card Dashboard */
.glass-card-dashboard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  width: 100%;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

/* Responsive */
@media (max-width: 640px) {
  .glass-card-dashboard {
    padding: 1rem;
    border-radius: 1rem;
  }
}
</style>
