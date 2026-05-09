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
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
              @click="goBack"
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
      <LessonScannerChildSelector
        v-model="selectedChild"
        :children="childProfiles"
      />

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

        <!-- OCR: géré côté backend -->

        <!-- Zone de téléchargement -->
        <LessonScannerFileUpload
          v-model="selectedFiles"
          :file-previews="filePreviews"
          :disabled="isProcessing"
          @files-dropped="handleFiles"
          @files-selected="handleFiles"
          @remove-file="removeFile"
        />

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
            class="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all"
            @click="removeAllFiles"
          >
            Supprimer tous les fichiers
          </button>
          <button
            :disabled="selectedFiles.length === 0 || !selectedChild || isProcessing"
            :class="[
              'px-8 py-3 rounded-xl font-medium transition-all',
              (selectedFiles.length === 0 || !selectedChild || isProcessing)
                ? 'bg-white/5 text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
            ]"
            @click="scanLesson"
          >
            <span v-if="isProcessing" class="flex items-center justify-center space-x-2">
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Traitement en cours...</span>
            </span>
            <span v-else class="flex items-center space-x-2">
              <span>Générer le quiz</span>
            </span>
          </button>
        </div>

        <!-- Indicateur de progression multi-étapes -->
        <LessonScannerProgressStepper
          :steps="steps"
          :visible="isProcessing || stepperVisible"
          :progress-percent="progressPercent"
        />

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
import imageOptimizationService from '../services/imageOptimizationService.js'
// Import dynamique pour éviter les problèmes d'initialisation
import { LessonService } from '../services/lessonService.js'
import { migrationService } from '../services/migrationService.js'
import LessonScannerChildSelector from './LessonScannerChildSelector.vue'
import LessonScannerFileUpload from './LessonScannerFileUpload.vue'
import LessonScannerProgressStepper from './LessonScannerProgressStepper.vue'

export default {
  name: 'LessonScanner',
  components: {
    LessonScannerChildSelector,
    LessonScannerFileUpload,
    LessonScannerProgressStepper
  },
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
      // Stepper de progression
      steps: [],
      progressPercent: 0,
      stepperVisible: false
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
    try {
      const { auditLogService } = await import('../services/auditLogService.js')
      this.auditLogService = auditLogService
    } catch (error) {
      console.error('[LessonScanner] created() - Erreur lors du chargement d\'AuditLogService:', error)
    }

    const store = useProfileStore()
    await store.loadProfiles()
  },
  methods: {
    isCompressibleImage(file) {
      return file?.type === 'image/jpeg' || file?.type === 'image/png'
    },

    revokePreviewUrl(previewUrl) {
      if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(previewUrl)
        } catch (_e) {
          // no-op
        }
      }
    },

    async maybeCompressImage(file) {
      if (!this.isCompressibleImage(file)) return { file, didCompress: false }

      const originalSize = file.size
      const preferredFormat = file.type === 'image/png' ? 'png' : 'jpeg'

      const result = await imageOptimizationService.optimizeImage(file, {
        quality: 'medium',
        maxWidth: 1920,
        maxHeight: 1920,
        format: preferredFormat,
        progressive: true
      })

      if (!result?.success || !result.blob) {
        return { file, didCompress: false }
      }

      // Garder le fichier original si pas de gain
      if (result.blob.size >= originalSize) {
        return { file, didCompress: false }
      }

      const optimizedFile = new File([result.blob], file.name, {
        type: result.format || file.type,
        lastModified: Date.now()
      })

      return {
        file: optimizedFile,
        didCompress: true,
        originalSize,
        optimizedSize: optimizedFile.size,
        compressionRatio: result.compressionRatio
      }
    },

    goBack() {
      this.$router.push('/dashboard')
    },

    async handleFiles(files) {
      const validFiles = []
      const validPreviews = []

      for (const file of files) {
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          console.warn('[LessonScanner] handleFiles() - Type de fichier non supporté:', {
            fileName: file.name,
            fileType: file.type
          })
          alert(`Le fichier ${file.name} n'est pas supporté. Formats acceptés: JPG, PNG, PDF`)
          continue
        }

        let finalFile = file

        // Valider l'image côté serveur (pour les images uniquement)
        if (file.type.startsWith('image/')) {
          try {
            const validation = await this.imageValidator.validateImage(file)

            if (!validation.valid) {
              this.validationErrors = validation.errors
              this.validationWarnings = validation.warnings
              console.error('[LessonScanner] handleFiles() - Validation échouée:', {
                fileName: file.name,
                errors: validation.errors
              })
              alert(`Erreur de validation pour ${file.name}: ${validation.errors.join(', ')}`)
              continue
            }

            this.validationErrors = []
            this.validationWarnings = validation.warnings

            // Compression côté client (PNG/JPG) avant upload
            try {
              const compression = await this.maybeCompressImage(file)
              finalFile = compression.file
            } catch (compressError) {
              // On ne bloque pas l'upload si la compression échoue
              console.warn('[LessonScanner] handleFiles() - Compression impossible, utilisation du fichier original:', {
                fileName: file.name,
                message: compressError?.message
              })
              finalFile = file
            }

            // Enregistrer l'upload d'image dans les logs d'audit (sans métadonnées volumineuses)
            if (this.auditLogService) {
              this.auditLogService.logDataAccess(
                this.selectedChild?.id || 'unknown',
                'image_upload',
                'IMAGE_UPLOADED',
                {
                  fileName: file.name,
                  fileSize: finalFile.size,
                  fileType: file.type
                  // Ne pas stocker validation.metadata (contient dimensions, etc. - trop volumineux)
                }
              )
            }
          } catch (error) {
            console.error('[LessonScanner] handleFiles() - Erreur lors de la validation de l\'image:', {
              fileName: file.name,
              error: error,
              message: error.message,
              stack: error.stack
            })
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

        validFiles.push(finalFile)

        // Créer un aperçu pour les images
        if (finalFile.type.startsWith('image/')) {
          const previewUrl = URL.createObjectURL(finalFile)
          validPreviews.push(previewUrl)
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
      this.revokePreviewUrl(this.filePreviews[index])
      this.selectedFiles.splice(index, 1)
      this.filePreviews.splice(index, 1)
      this.generatedQuiz = null
    },

    removeAllFiles() {
      this.filePreviews.forEach((url) => this.revokePreviewUrl(url))
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

    // --- Gestion du stepper de progression ---
    initSteps() {
      const totalFiles = this.selectedFiles.length
      const steps = [
        { id: 'preparation', label: 'Préparation des fichiers', status: 'pending', detail: null, duration: null }
      ]
      for (let i = 0; i < totalFiles; i++) {
        steps.push({
          id: `ocr_${i}`,
          label: `Extraction OCR et analyse - Document ${i + 1}/${totalFiles}`,
          status: 'pending',
          detail: this.selectedFiles[i].name,
          duration: null
        })
      }
      steps.push(
        { id: 'generation', label: 'Génération du quiz par l\'IA', status: 'pending', detail: null, duration: null },
        { id: 'validation', label: 'Validation du quiz', status: 'pending', detail: null, duration: null },
        { id: 'save', label: 'Sauvegarde de la leçon', status: 'pending', detail: null, duration: null },
        { id: 'done', label: 'Terminé', status: 'pending', detail: null, duration: null }
      )
      this.steps = steps
      this.progressPercent = 0
      this.stepperVisible = true
    },

    setStepActive(stepId) {
      const step = this.steps.find(s => s.id === stepId)
      if (step) step.status = 'active'
    },

    setStepDone(stepId, detail, durationMs) {
      const step = this.steps.find(s => s.id === stepId)
      if (step) {
        step.status = 'done'
        if (detail) step.detail = detail
        if (durationMs !== undefined) step.duration = this.formatDuration(durationMs)
      }
    },

    setStepError(stepId, errorDetail) {
      const step = this.steps.find(s => s.id === stepId)
      if (step) {
        step.status = 'error'
        if (errorDetail) step.detail = errorDetail
      }
    },

    updateProgress(percent) {
      this.progressPercent = Math.min(100, Math.round(percent))
    },

    formatDuration(ms) {
      if (ms < 1000) return `${ms}ms`
      return `${(ms / 1000).toFixed(1)}s`
    },

    // --- Logique principale multi-étapes ---
    async scanLesson() {
      if (this.selectedFiles.length === 0 || !this.selectedChild) {
        return
      }

      // Vérifier que l'utilisateur est connecté
      const token = localStorage.getItem('auth_token')
      if (!token) {
        this.errorMessage = 'Vous devez être connecté pour générer un quiz. Veuillez vous connecter avec votre code PIN.'
        return
      }

      this.isProcessing = true
      this.generatedQuiz = null
      this.successMessage = null
      this.errorMessage = null

      // Initialiser le stepper
      this.initSteps()
      const totalFiles = this.selectedFiles.length
      // Poids: Préparation=5%, OCR=60% (réparti), Génération=25%, Validation=2%, Sauvegarde=8%
      const WEIGHT_PREP = 5
      const WEIGHT_OCR = 60
      const WEIGHT_GEN = 25
      const WEIGHT_VALID = 2
      const WEIGHT_SAVE = 8

      try {
        // ---- Étape 1 : Préparation ----
        this.setStepActive('preparation')
        const prepStart = Date.now()

        // Rate limiting
        const rateLimitCheck = rateLimitService.checkRateLimit(this.selectedChild.id, 'openai')
        if (!rateLimitCheck.allowed) {
          this.setStepError('preparation', `Limite atteinte, réessayez dans ${rateLimitCheck.retryAfter}s`)
          this.errorMessage = `Limite de requêtes atteinte. Réessayez dans ${rateLimitCheck.retryAfter} secondes.`
          return
        }
        rateLimitService.recordRequest(this.selectedChild.id, 'openai')

        // Audit log
        if (this.auditLogService) {
          this.auditLogService.logApiUsage(this.selectedChild.id, 'openai', true, {
            action: 'QUIZ_GENERATION_START',
            fileCount: totalFiles,
            questionCount: parseInt(this.questionCount),
            fileNames: this.selectedFiles.map(f => f.name)
          })
        }

        this.setStepDone('preparation', `${totalFiles} fichier${totalFiles > 1 ? 's' : ''} prêt${totalFiles > 1 ? 's' : ''}`, Date.now() - prepStart)
        this.updateProgress(WEIGHT_PREP)

        // ---- Étape 2 : Extraction OCR par document ----
        const aiService = new AIService()
        const allExtractions = []
        let ocrWarnings = []

        for (let i = 0; i < totalFiles; i++) {
          const stepId = `ocr_${i}`
          const file = this.selectedFiles[i]
          this.setStepActive(stepId)
          const ocrStart = Date.now()

          try {
            const extractions = await aiService.extractTextFromDocuments([file])
            const ocrDuration = Date.now() - ocrStart

            if (extractions && extractions.length > 0) {
              allExtractions.push(...extractions)
              this.setStepDone(stepId, `${file.name} - texte extrait`, ocrDuration)
            } else {
              // Extraction vide mais pas d'erreur
              ocrWarnings.push(file.name)
              this.setStepDone(stepId, `${file.name} - aucun texte détecté`, ocrDuration)
            }
          } catch (ocrError) {
            const ocrDuration = Date.now() - ocrStart
            console.error(`[LessonScanner] OCR échoué pour ${file.name}:`, ocrError.message)
            ocrWarnings.push(file.name)
            this.setStepError(stepId, `${file.name} - ${ocrError.message}`)

            // Continuer avec les autres documents
          }

          // Mise à jour de la progression : prep + proportion OCR faite
          this.updateProgress(WEIGHT_PREP + (WEIGHT_OCR * (i + 1) / totalFiles))
        }

        // Vérifier qu'on a au moins une extraction
        if (allExtractions.length === 0) {
          this.setStepError('generation', 'Aucun texte extrait des documents')
          this.errorMessage = 'Aucun texte n\'a pu être extrait des documents. Vérifiez la qualité des images.'
          return
        }

        // ---- Étape 3 : Génération du quiz ----
        this.setStepActive('generation')
        const genStart = Date.now()

        const quiz = await aiService.generateQuizFromAnalyses(
          allExtractions,
          this.selectedChild,
          parseInt(this.questionCount)
        )

        const genDuration = Date.now() - genStart
        this.setStepDone('generation', `${quiz?.questions?.length || 0} questions générées`, genDuration)
        this.updateProgress(WEIGHT_PREP + WEIGHT_OCR + WEIGHT_GEN)

        // ---- Étape 4 : Validation ----
        this.setStepActive('validation')
        const validStart = Date.now()

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
          this.setStepError('validation', 'Quiz invalide ou vide')
          this.errorMessage = 'Le quiz généré est invalide. Veuillez réessayer avec des documents différents.'
          return
        }

        this.generatedQuiz = quiz
        this.setStepDone('validation', `${quiz.questions.length} questions valides`, Date.now() - validStart)
        this.updateProgress(WEIGHT_PREP + WEIGHT_OCR + WEIGHT_GEN + WEIGHT_VALID)

        // ---- Étape 5 : Sauvegarde ----
        this.setStepActive('save')
        const saveStart = Date.now()

        const savedLesson = await migrationService.saveLesson(
          quiz,
          this.selectedChild.id,
          this.selectedFiles
        )

        this.generatedQuiz.lessonId = savedLesson.id
        this.setStepDone('save', `Leçon #${savedLesson.id} créée`, Date.now() - saveStart)
        this.updateProgress(WEIGHT_PREP + WEIGHT_OCR + WEIGHT_GEN + WEIGHT_VALID + WEIGHT_SAVE)

        // ---- Étape 6 : Terminé ----
        this.setStepActive('done')
        const warningText = ocrWarnings.length > 0
          ? `(${ocrWarnings.length} document${ocrWarnings.length > 1 ? 's' : ''} avec avertissement)`
          : null
        this.setStepDone('done', warningText || 'Redirection vers le quiz...')
        this.updateProgress(100)

        // Audit log succès
        if (this.auditLogService) {
          this.auditLogService.logApiUsage(this.selectedChild.id, 'openai', true, {
            action: 'QUIZ_GENERATION_SUCCESS',
            quizQuestions: quiz.questions?.length || 0,
            lessonId: savedLesson.id,
            fileCount: totalFiles
          })
        }

        // Petite pause pour que l'utilisateur voie le "Terminé"
        await new Promise(resolve => setTimeout(resolve, 800))

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
        console.error('[LessonScanner] scanLesson() - ERREUR:', error.message)

        // Marquer l'étape active comme erreur
        const activeStep = this.steps.find(s => s.status === 'active')
        if (activeStep) {
          this.setStepError(activeStep.id, error.message)
        }

        // Audit log échec
        if (this.auditLogService) {
          this.auditLogService.logApiUsage(this.selectedChild.id, 'openai', false, {
            action: 'QUIZ_GENERATION_FAILED',
            error: error.message,
            fileCount: this.selectedFiles.length
          })
        }

        this.errorMessage = `Erreur lors de la génération du quiz: ${error.message}`
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
/* NOTE: styles "animate-blob" et "glass-card-*" centralisés (src/styles/liquid-glass.css) */
</style>
