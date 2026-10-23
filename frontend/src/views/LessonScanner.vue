<template>
  <div class="min-h-screen overflow-hidden">
    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
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
              <h1 class="text-2xl font-bold text-white">Scanner de Leçons</h1>
              <p class="text-sm text-white/70 hidden sm:block">Générez des quiz à partir de vos leçons</p>
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

      <!-- Zone de scan -->
      <div class="glass-card-dashboard">
        <div class="text-center mb-8">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg aria-hidden="true" class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Scanner une Leçon</h2>
          <p class="text-white/70">Prenez une photo ou téléchargez une image de la leçon</p>
        </div>

        <!-- Sélecteur du nombre de questions -->
        <div class="mb-8">
          <label for="scanner-question-count" class="block text-sm font-medium text-white/80 mb-3">Nombre de questions à générer</label>
          <select
            id="scanner-question-count"
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
        <div v-if="validationWarnings.length > 0" role="status" class="mt-6 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-xl rounded-xl p-4">
          <div class="flex items-center mb-2">
            <svg aria-hidden="true" class="w-5 h-5 text-yellow-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
            type="button"
            class="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 hover:border-white/30 transition-all"
            @click="removeAllFiles"
          >
            Supprimer tous les fichiers
          </button>
          <button
            type="button"
            :disabled="selectedFiles.length === 0 || !selectedChild || isProcessing"
            :class="[
              'px-8 py-3 rounded-xl font-medium transition-all',
              (selectedFiles.length === 0 || !selectedChild || isProcessing)
                ? 'bg-white/5 text-white/70 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
            ]"
            @click="scanLesson"
          >
            <span v-if="isProcessing" class="flex items-center justify-center space-x-2">
              <svg aria-hidden="true" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
        <div v-if="successMessage" role="status" class="mt-6 bg-green-500/20 border border-green-500/30 backdrop-blur-xl text-green-200 px-6 py-4 rounded-xl flex items-center space-x-3">
          <svg aria-hidden="true" class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span>{{ successMessage }}</span>
        </div>

        <!-- Message d'erreur -->
        <div v-if="errorMessage" class="mt-6 bg-red-500/20 border border-red-500/30 backdrop-blur-xl text-red-200 px-6 py-4 rounded-xl flex items-center space-x-3" role="alert">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>
            {{ errorMessage }}
            <span v-if="errorReference" class="block text-xs text-red-200 mt-1">Réf. {{ errorReference }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import { AIService } from '../services/aiService.js'
import { ImageValidationService } from '../services/imageValidationService.js'
import imageOptimizationService from '../services/imageOptimizationService.js'
import { auditLogService } from '../services/auditLogService.js'
import { apiService } from '../services/apiService.js'
import { useQuizGeneration } from '../composables/useQuizGeneration.js'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { AI_MAX_DOCUMENTS, boundQuestionCount } from '../constants/aiLimits.js'
import LessonScannerChildSelector from '../components/lesson-scanner/LessonScannerChildSelector.vue'
import LessonScannerFileUpload from '../components/lesson-scanner/LessonScannerFileUpload.vue'
import LessonScannerProgressStepper from '../components/lesson-scanner/LessonScannerProgressStepper.vue'

// Les routes IA n'acceptent que des images (PDF refusés côté serveur : 415)
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Erreurs qui concernent toute la génération (et pas un seul document) : inutile de continuer
const BLOCKING_STATUSES = new Set([401, 403, 413, 415, 429])

export default {
  name: 'LessonScanner',
  components: {
    LessonScannerChildSelector,
    LessonScannerFileUpload,
    LessonScannerProgressStepper
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
    } = useQuizGeneration({ source: 'scanner' })

    return {
      profileStore,
      parentNav,
      isProcessing,
      errorMessage,
      errorReference,
      runGeneration,
      saveGeneratedLesson,
      openQuizPreview,
      assertValidQuiz
    }
  },
  data() {
    return {
      selectedFiles: [],
      filePreviews: [],
      selectedChild: null,
      imageValidator: new ImageValidationService(),
      validationWarnings: [],
      questionCount: 5,
      successMessage: null,
      // Stepper de progression
      steps: [],
      progressPercent: 0,
      stepperVisible: false
    }
  },
  computed: {
    childProfiles() {
      // Tous les profils non administrateurs (enfants et adolescents)
      return this.profileStore.nonAdminProfiles || []
    }
  },
  async created() {
    await this.profileStore.loadProfiles()
  },
  beforeUnmount() {
    // Libérer les aperçus (URL blob) en quittant la page, y compris après une génération réussie
    this.filePreviews.forEach((url) => this.revokePreviewUrl(url))
  },
  methods: {
    isCompressibleImage(file) {
      return file?.type === 'image/jpeg' || file?.type === 'image/png'
    },

    revokePreviewUrl(previewUrl) {
      if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(previewUrl)
        } catch {
          // URL déjà révoquée : rien à faire
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
      this.parentNav.goToDashboard()
    },

    async handleFiles(files) {
      const validFiles = []
      const validPreviews = []

      // 10 documents maximum par requête (refusé par le serveur au-delà)
      const room = AI_MAX_DOCUMENTS - this.selectedFiles.length
      if (files.length > room) {
        this.$toast.warning(`${AI_MAX_DOCUMENTS} images maximum par leçon : les fichiers en trop sont ignorés.`)
      }

      for (const file of Array.from(files).slice(0, Math.max(0, room))) {
        // Images uniquement : les PDF sont refusés par le serveur
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          this.$toast.warning(`« ${file.name} » n'est pas pris en charge. Formats acceptés : JPG, PNG ou WebP (pas de PDF).`)
          continue
        }

        let finalFile = file

        try {
          const validation = await this.imageValidator.validateImage(file)

          if (!validation.valid) {
            this.validationWarnings = validation.warnings
            this.$toast.error(`« ${file.name} » refusé : ${validation.errors.join(', ')}`)
            continue
          }

          this.validationWarnings = validation.warnings

          // Compression côté client (PNG/JPG) avant upload
          try {
            const compression = await this.maybeCompressImage(file)
            finalFile = compression.file
          } catch (compressError) {
            // On ne bloque pas l'upload si la compression échoue
            console.warn('[LessonScanner] Compression impossible, fichier original conservé:', compressError?.message)
            finalFile = file
          }
        } catch (error) {
          console.error('[LessonScanner] Erreur lors de la validation de l\'image:', error)
          auditLogService.logSystemError('Image validation failed', 'LessonScanner', { error: error.message })
          this.$toast.error(`Impossible de vérifier « ${file.name} ».`)
          continue
        }

        validFiles.push(finalFile)
        validPreviews.push(URL.createObjectURL(finalFile))
      }

      // Ajouter les fichiers valides à la liste
      this.selectedFiles = [...this.selectedFiles, ...validFiles]
      this.filePreviews = [...this.filePreviews, ...validPreviews]
    },

    removeFile(index) {
      this.revokePreviewUrl(this.filePreviews[index])
      this.selectedFiles.splice(index, 1)
      this.filePreviews.splice(index, 1)
    },

    removeAllFiles() {
      this.filePreviews.forEach((url) => this.revokePreviewUrl(url))
      this.selectedFiles = []
      this.filePreviews = []
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

      // Vérifier que le parent est connecté (jeton profil valide, session parent active)
      if (!apiService.isAuthenticated()) {
        this.errorMessage = 'Vous devez être connecté pour générer un quiz. Veuillez vous connecter avec votre code PIN.'
        return
      }

      this.successMessage = null
      this.initSteps()

      const child = this.selectedChild
      const outcome = await this.runGeneration({
        child,
        details: {
          fileCount: this.selectedFiles.length,
          questionCount: boundQuestionCount(this.questionCount)
        },
        task: () => this.runScanSteps(child)
      })

      if (!outcome) {
        // Marquer l'étape en cours comme erreur (message détaillé sous le bouton)
        const activeStep = this.steps.find(s => s.status === 'active')
        if (activeStep) this.setStepError(activeStep.id, this.errorMessage)
        return
      }

      // Petite pause pour que l'utilisateur voie le "Terminé", puis aperçu du quiz
      await new Promise(resolve => setTimeout(resolve, 800))
      this.openQuizPreview(child, outcome.lesson.id)
    },

    /**
     * Étapes : OCR par document, génération, validation, sauvegarde (une seule requête)
     * @returns {Promise<{ quiz: Object, lesson: Object }>}
     */
    async runScanSteps(child) {
      const totalFiles = this.selectedFiles.length
      // Poids: Préparation=5%, OCR=60% (réparti), Génération=25%, Validation=2%, Sauvegarde=8%
      const WEIGHT_PREP = 5
      const WEIGHT_OCR = 60
      const WEIGHT_GEN = 25
      const WEIGHT_VALID = 2
      const WEIGHT_SAVE = 8

      // ---- Étape 1 : Préparation ----
      this.setStepActive('preparation')
      this.setStepDone('preparation', `${totalFiles} fichier${totalFiles > 1 ? 's' : ''} prêt${totalFiles > 1 ? 's' : ''}`, 0)
      this.updateProgress(WEIGHT_PREP)

      // ---- Étape 2 : Extraction OCR par document ----
      const aiService = new AIService()
      const allExtractions = []
      const ocrWarnings = []

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
          // Limite atteinte, session expirée, format refusé… : arrêter toute la génération
          if (BLOCKING_STATUSES.has(ocrError?.status)) throw ocrError
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
        this.setStepActive('generation')
        throw new Error('Aucun texte n\'a pu être extrait des documents. Vérifiez la qualité des images.')
      }

      // ---- Étape 3 : Génération du quiz ----
      this.setStepActive('generation')
      const genStart = Date.now()
      const quiz = await aiService.generateQuizFromAnalyses(
        allExtractions,
        child,
        boundQuestionCount(this.questionCount)
      )
      this.setStepDone('generation', `${quiz?.questions?.length || 0} questions générées`, Date.now() - genStart)
      this.updateProgress(WEIGHT_PREP + WEIGHT_OCR + WEIGHT_GEN)

      // ---- Étape 4 : Validation ----
      this.setStepActive('validation')
      this.assertValidQuiz(quiz)
      this.setStepDone('validation', `${quiz.questions.length} questions valides`, 0)
      this.updateProgress(WEIGHT_PREP + WEIGHT_OCR + WEIGHT_GEN + WEIGHT_VALID)

      // ---- Étape 5 : Sauvegarde (une seule requête : pas de doublon en cas de lenteur) ----
      this.setStepActive('save')
      const saveStart = Date.now()
      const lesson = await this.saveGeneratedLesson(quiz, child, { files: this.selectedFiles })
      this.setStepDone('save', `Leçon #${lesson.id} créée`, Date.now() - saveStart)
      this.updateProgress(WEIGHT_PREP + WEIGHT_OCR + WEIGHT_GEN + WEIGHT_VALID + WEIGHT_SAVE)

      // ---- Étape 6 : Terminé ----
      this.setStepActive('done')
      const warningText = ocrWarnings.length > 0
        ? `(${ocrWarnings.length} document${ocrWarnings.length > 1 ? 's' : ''} avec avertissement)`
        : null
      this.setStepDone('done', warningText || 'Ouverture de l\'aperçu du quiz...')
      this.updateProgress(100)

      return { quiz, lesson }
    }
  }
}
</script>

<style scoped>
/* NOTE: styles "glass-card-*" centralisés (src/styles/liquid-glass.css) ; fond animé : AppBackground.vue */
</style>
