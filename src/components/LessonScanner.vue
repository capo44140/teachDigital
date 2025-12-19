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
      <div class="glass-card-dashboard mb-8">
        <h2 class="text-xl font-bold text-white mb-4">Sélectionner l'enfant</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            v-for="child in childProfiles"
            :key="child.id"
            :class="[
              'p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-2',
              selectedChild?.id === child.id 
                ? 'border-purple-400 bg-white/20' 
                : 'border-white/20 hover:border-white/40 hover:bg-white/10'
            ]"
            @click="selectChild(child)"
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

        <!-- OCR: géré côté backend -->

        <!-- Zone de téléchargement -->
        <div 
          :class="[
            'border-2 border-dashed rounded-2xl p-8 text-center transition-all',
            isDragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/20'
          ]"
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*,.pdf"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />
          
          <div v-if="selectedFiles.length === 0" class="space-y-4">
            <svg class="w-16 h-16 text-white/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <div>
              <p class="text-lg font-medium text-white">Glissez-déposez vos documents ici</p>
              <p class="text-white/60 text-sm mt-1">ou</p>
              <button 
                class="mt-3 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                @click="$refs.fileInput.click()"
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
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
                  @click="removeFile(index)"
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
    console.log('[LessonScanner] created() - Initialisation du composant')
    
    // Import dynamique pour éviter les problèmes d'initialisation
    try {
      const { auditLogService } = await import('../services/auditLogService.js')
      this.auditLogService = auditLogService
      console.log('[LessonScanner] created() - AuditLogService chargé avec succès')
    } catch (error) {
      console.error('[LessonScanner] created() - Erreur lors du chargement d\'AuditLogService:', error)
    }
    
    const store = useProfileStore()
    console.log('[LessonScanner] created() - Chargement des profils...')
    await store.loadProfiles()
    console.log('[LessonScanner] created() - Profils chargés:', {
      profilesCount: store.nonAdminProfiles?.length || 0,
      profiles: store.nonAdminProfiles?.map(p => ({ id: p.id, name: p.name })) || []
    })
  },
  methods: {
    goBack() {
      this.$router.push('/dashboard')
    },
    
    selectChild(child) {
      console.log('[LessonScanner] selectChild() - Enfant sélectionné:', {
        id: child.id,
        name: child.name,
        age: child.age,
        level: child.level
      })
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
      console.log('[LessonScanner] handleFiles() - Début du traitement des fichiers:', {
        filesCount: files.length,
        fileNames: files.map(f => f.name),
        fileTypes: files.map(f => f.type),
        fileSizes: files.map(f => `${f.name}: ${this.formatFileSize(f.size)}`)
      })
      
      const validFiles = []
      const validPreviews = []
      
      for (const file of files) {
        console.log('[LessonScanner] handleFiles() - Traitement du fichier:', {
          name: file.name,
          type: file.type,
          size: file.size,
          sizeFormatted: this.formatFileSize(file.size)
        })
        
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          console.warn('[LessonScanner] handleFiles() - Type de fichier non supporté:', {
            fileName: file.name,
            fileType: file.type
          })
          alert(`Le fichier ${file.name} n'est pas supporté. Formats acceptés: JPG, PNG, PDF`)
          continue
        }
        
        // Valider l'image côté serveur (pour les images uniquement)
        if (file.type.startsWith('image/')) {
          try {
            console.log('[LessonScanner] handleFiles() - Validation de l\'image:', file.name)
            const validation = await this.imageValidator.validateImage(file)
            console.log('[LessonScanner] handleFiles() - Résultat de la validation:', {
              fileName: file.name,
              valid: validation.valid,
              errors: validation.errors,
              warnings: validation.warnings
            })
            
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
            
            // Enregistrer l'upload d'image dans les logs d'audit (sans métadonnées volumineuses)
            if (this.auditLogService) {
              console.log('[LessonScanner] handleFiles() - Enregistrement de l\'upload dans les logs d\'audit')
              this.auditLogService.logDataAccess(
                this.selectedChild?.id || 'unknown',
                'image_upload',
                'IMAGE_UPLOADED',
                {
                  fileName: file.name,
                  fileSize: file.size,
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
        
        validFiles.push(file)
        console.log('[LessonScanner] handleFiles() - Fichier ajouté à la liste valide:', file.name)
        
        // Créer un aperçu pour les images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            validPreviews.push(e.target.result)
            this.filePreviews = [...validPreviews]
            console.log('[LessonScanner] handleFiles() - Aperçu créé pour:', file.name)
          }
          reader.readAsDataURL(file)
        } else {
          // Pour les PDF, on n'affiche pas d'aperçu
          validPreviews.push(null)
          console.log('[LessonScanner] handleFiles() - PDF détecté, pas d\'aperçu:', file.name)
        }
      }
      
      // Ajouter les fichiers valides à la liste
      console.log('[LessonScanner] handleFiles() - Fichiers valides finaux:', {
        validFilesCount: validFiles.length,
        validFileNames: validFiles.map(f => f.name),
        totalSelectedFiles: this.selectedFiles.length + validFiles.length
      })
      
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
      console.log('[LessonScanner] scanLesson() - Début de la génération de quiz', {
        filesCount: this.selectedFiles.length
      })
      
      if (this.selectedFiles.length === 0 || !this.selectedChild) {
        console.warn('[LessonScanner] scanLesson() - Validation échouée:', {
          filesCount: this.selectedFiles.length,
          hasChild: !!this.selectedChild
        })
        return
      }
      
      // Vérifier que l'utilisateur est connecté
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('[LessonScanner] scanLesson() - Pas de token d\'authentification')
        this.errorMessage = 'Vous devez être connecté pour générer un quiz. Veuillez vous connecter avec votre code PIN.'
        alert('Vous devez être connecté pour générer un quiz. Veuillez vous connecter avec votre code PIN.')
        return
      }
      
      console.log('[LessonScanner] scanLesson() - Paramètres:', {
        childId: this.selectedChild.id,
        childName: this.selectedChild.name,
        filesCount: this.selectedFiles.length,
        fileNames: this.selectedFiles.map(f => f.name),
        fileSizes: this.selectedFiles.map(f => `${f.name}: ${this.formatFileSize(f.size)}`),
        fileTypes: this.selectedFiles.map(f => f.type),
        questionCount: this.questionCount,
        hasToken: !!token
      })
      
      this.isProcessing = true
      this.generatedQuiz = null
      this.successMessage = null
      this.errorMessage = null
      this.processStatus = 'Génération du quiz (OCR côté serveur)...'

      try {
        // Vérifier le rate limiting
        console.log('[LessonScanner] scanLesson() - Vérification du rate limiting...')
        const rateLimitCheck = rateLimitService.checkRateLimit(this.selectedChild.id, 'openai')
        console.log('[LessonScanner] scanLesson() - Rate limit check:', rateLimitCheck)
        
        if (!rateLimitCheck.allowed) {
          console.warn('[LessonScanner] scanLesson() - Rate limit atteint:', rateLimitCheck)
          alert(`Limite de requêtes atteinte. Réessayez dans ${rateLimitCheck.retryAfter} secondes.`)
          return
        }
        
        // Enregistrer la requête dans le rate limiting
        rateLimitService.recordRequest(this.selectedChild.id, 'openai')
        console.log('[LessonScanner] scanLesson() - Requête enregistrée dans le rate limiting')
        
        // Enregistrer le début de l'analyse dans les logs d'audit
        if (this.auditLogService) {
          console.log('[LessonScanner] scanLesson() - Enregistrement du début dans les logs d\'audit...')
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
        
        const aiService = new AIService()
        const startTime = Date.now()

        // Un seul appel: OCR + analyse + génération sont gérés côté backend
        const quiz = await aiService.generateQuizFromDocuments(
          this.selectedFiles,
          this.selectedChild,
          parseInt(this.questionCount)
        )

        const totalDuration = Date.now() - startTime
        console.log('[LessonScanner] scanLesson() - Quiz généré avec succès:', {
          totalDuration: `${totalDuration}ms`,
          hasQuiz: !!quiz,
          quizTitle: quiz?.title,
          questionsCount: quiz?.questions?.length || 0
        })
        
        this.generatedQuiz = quiz
        
        // Sauvegarder la leçon via le service de migration
        console.log('[LessonScanner] scanLesson() - Sauvegarde de la leçon...')
        this.processStatus = 'Sauvegarde de la leçon...'
        
        const savedLesson = await migrationService.saveLesson(
          quiz, 
          this.selectedChild.id, 
          this.selectedFiles
        )
        
        console.log('[LessonScanner] scanLesson() - Leçon sauvegardée:', {
          lessonId: savedLesson?.id,
          hasLesson: !!savedLesson
        })
        
        // Ajouter l'ID de la leçon sauvegardée au quiz
        this.generatedQuiz.lessonId = savedLesson.id
        
        // Enregistrer le succès de l'analyse
        if (this.auditLogService) {
          console.log('[LessonScanner] scanLesson() - Enregistrement du succès dans les logs d\'audit...')
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
        
        console.log('[LessonScanner] scanLesson() - Redirection vers QuizGenerator...')
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
        console.error('[LessonScanner] scanLesson() - ERREUR lors de la génération du quiz:', {
          error: error,
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
          response: error.response,
          status: error.status,
          statusText: error.statusText
        })
        
        // Enregistrer l'échec de l'analyse
        if (this.auditLogService) {
          console.log('[LessonScanner] scanLesson() - Enregistrement de l\'échec dans les logs d\'audit...')
          this.auditLogService.logApiUsage(
            this.selectedChild.id,
            'openai',
            false,
            {
              action: 'QUIZ_GENERATION_FAILED',
              error: error.message,
              errorName: error.name,
              errorStack: error.stack?.substring(0, 500),
              fileCount: this.selectedFiles.length,
              fileNames: this.selectedFiles.map(f => f.name),
              questionCount: this.questionCount
            }
          )
        }
        
        this.errorMessage = `Erreur lors de la génération du quiz: ${error.message}`
        alert('Erreur lors de la génération du quiz. Veuillez réessayer.')
      } finally {
        console.log('[LessonScanner] scanLesson() - Fin du traitement (finally)')
        this.isProcessing = false
        this.processStatus = ''
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
