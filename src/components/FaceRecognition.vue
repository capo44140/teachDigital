<template>
  <div class="face-recognition-container">
    <!-- État de chargement -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- Interface principale -->
    <div v-else class="face-interface">
      <!-- Zone de capture vidéo -->
      <div class="video-container">
        <video
          ref="videoElement"
          :class="{ 'video-active': isVideoActive }"
          autoplay
          muted
          playsinline
        ></video>
        
        <!-- Canvas pour la capture d'image -->
        <canvas
          ref="canvasElement"
          style="display: none"
        ></canvas>

        <!-- Overlay avec instructions -->
        <div v-if="!isVideoActive" class="video-overlay">
          <div class="overlay-content">
            <Icon icon="mdi:camera" class="camera-icon" />
            <h3>Reconnaissance faciale</h3>
            <p>Cliquez sur "Démarrer la caméra" pour commencer</p>
          </div>
        </div>

        <!-- Indicateur de détection -->
        <div v-if="isVideoActive && faceDetected" class="face-indicator">
          <div class="face-box" :style="faceBoxStyle"></div>
          <div class="face-status">
            <Icon icon="mdi:check-circle" class="status-icon success" />
            <span>Visage détecté</span>
          </div>
        </div>
      </div>

      <!-- Contrôles -->
      <div class="controls">
        <button
          v-if="!isVideoActive"
          @click="startCamera"
          class="btn btn-primary"
          :disabled="isLoading"
        >
          <Icon icon="mdi:camera" />
          Démarrer la caméra
        </button>

        <button
          v-if="isVideoActive"
          @click="stopCamera"
          class="btn btn-secondary"
        >
          <Icon icon="mdi:camera-off" />
          Arrêter la caméra
        </button>

        <button
          v-if="isVideoActive && faceDetected"
          @click="captureAndProcess"
          class="btn btn-success"
          :disabled="isProcessing"
        >
          <Icon icon="mdi:camera-capture" />
          {{ isProcessing ? 'Traitement...' : 'Capturer' }}
        </button>
      </div>

      <!-- Résultats -->
      <div v-if="result" class="results">
        <div :class="['result-card', result.success ? 'success' : 'error']">
          <div class="result-header">
            <Icon 
              :icon="result.success ? 'mdi:check-circle' : 'mdi:alert-circle'" 
              class="result-icon"
            />
            <h4>{{ result.success ? 'Succès' : 'Échec' }}</h4>
          </div>
          <p class="result-message">{{ result.message }}</p>
          
          <div v-if="result.confidence !== undefined" class="confidence">
            <span>Confiance: {{ Math.round(result.confidence * 100) }}%</span>
            <div class="confidence-bar">
              <div 
                class="confidence-fill" 
                :style="{ width: `${result.confidence * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Informations supplémentaires -->
          <div v-if="result.expressions" class="expressions">
            <h5>Expressions détectées:</h5>
            <div class="expression-list">
              <div 
                v-for="(value, emotion) in result.expressions" 
                :key="emotion"
                class="expression-item"
              >
                <span class="emotion-name">{{ getEmotionLabel(emotion) }}</span>
                <span class="emotion-value">{{ Math.round(value * 100) }}%</span>
              </div>
            </div>
          </div>

          <div v-if="result.ageGender" class="age-gender">
            <p><strong>Âge estimé:</strong> {{ result.ageGender.age }} ans</p>
            <p><strong>Genre:</strong> {{ result.ageGender.gender }} ({{ Math.round(result.ageGender.genderProbability * 100) }}%)</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="result && result.success" class="actions">
        <button @click="onSuccess" class="btn btn-primary">
          Continuer
        </button>
        <button @click="reset" class="btn btn-outline">
          Recommencer
        </button>
      </div>

      <div v-else-if="result && !result.success" class="actions">
        <button @click="reset" class="btn btn-primary">
          Réessayer
        </button>
        <button @click="onCancel" class="btn btn-outline">
          Annuler
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import faceRecognitionService from '../services/faceRecognitionService.js'
import simpleFaceService from '../services/simpleFaceService.js'

export default {
  name: 'FaceRecognition',
  components: {
    Icon
  },
  props: {
    mode: {
      type: String,
      default: 'detect', // 'detect', 'authenticate', 'register'
      validator: (value) => ['detect', 'authenticate', 'register'].includes(value)
    },
    userId: {
      type: String,
      default: null
    },
    threshold: {
      type: Number,
      default: 0.5
    }
  },
  emits: ['success', 'error', 'cancel'],
  setup(props, { emit }) {
    // Références
    const videoElement = ref(null)
    const canvasElement = ref(null)
    const isVideoActive = ref(false)
    const isLoading = ref(true)
    const isProcessing = ref(false)
    const loadingMessage = ref('Initialisation de la reconnaissance faciale...')
    const faceDetected = ref(false)
    const faceBoxStyle = ref({})
    const result = ref(null)
    const detectionInterval = ref(null)

    // Initialisation
    onMounted(async () => {
      await initializeFaceRecognition()
    })

    onUnmounted(() => {
      stopCamera()
    })

    // Méthodes
    const initializeFaceRecognition = async () => {
      try {
        loadingMessage.value = 'Chargement des modèles de reconnaissance...'
        
        // Essayer d'abord le service complet
        let success = await faceRecognitionService.initialize()
        
        if (!success) {
          console.warn('⚠️ Service complet échoué, utilisation du service simplifié...')
          loadingMessage.value = 'Initialisation du mode simplifié...'
          success = await simpleFaceService.initialize()
          
          if (!success) {
            throw new Error('Impossible d\'initialiser la reconnaissance faciale')
          }
        }
        
        isLoading.value = false
      } catch (error) {
        console.error('Erreur d\'initialisation:', error)
        emit('error', error.message)
        isLoading.value = false
      }
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })

        videoElement.value.srcObject = stream
        isVideoActive.value = true

        // Démarrer la détection en temps réel
        startFaceDetection()
      } catch (error) {
        console.error('Erreur d\'accès à la caméra:', error)
        emit('error', 'Impossible d\'accéder à la caméra')
      }
    }

    const stopCamera = () => {
      if (videoElement.value && videoElement.value.srcObject) {
        const tracks = videoElement.value.srcObject.getTracks()
        tracks.forEach(track => track.stop())
        videoElement.value.srcObject = null
      }
      
      isVideoActive.value = false
      faceDetected.value = false
      stopFaceDetection()
    }

    const startFaceDetection = () => {
      detectionInterval.value = setInterval(async () => {
        if (videoElement.value && isVideoActive.value) {
          try {
            let detection = null
            
            // Essayer d'abord le service complet
            if (faceRecognitionService.isInitialized) {
              detection = await faceRecognitionService.detectFirstFace(videoElement.value)
            } else if (simpleFaceService.isInitialized) {
              // Fallback vers le service simplifié
              detection = await simpleFaceService.detectFace(videoElement.value)
            }
            
            if (detection) {
              faceDetected.value = true
              updateFaceBox(detection)
            } else {
              faceDetected.value = false
            }
          } catch (error) {
            console.warn('Erreur de détection:', error)
          }
        }
      }, 500) // Détection toutes les 500ms
    }

    const stopFaceDetection = () => {
      if (detectionInterval.value) {
        clearInterval(detectionInterval.value)
        detectionInterval.value = null
      }
    }

    const updateFaceBox = (detection) => {
      const video = videoElement.value
      const videoRect = video.getBoundingClientRect()
      const box = detection.detection.box

      faceBoxStyle.value = {
        left: `${(box.x / video.videoWidth) * 100}%`,
        top: `${(box.y / video.videoHeight) * 100}%`,
        width: `${(box.width / video.videoWidth) * 100}%`,
        height: `${(box.height / video.videoHeight) * 100}%`
      }
    }

    const captureAndProcess = async () => {
      if (!faceDetected.value) {
        emit('error', 'Aucun visage détecté')
        return
      }

      isProcessing.value = true
      result.value = null

      try {
        // Capturer l'image depuis la vidéo
        const canvas = canvasElement.value
        const video = videoElement.value
        const context = canvas.getContext('2d')

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        let processResult

        // Traitement selon le mode
        switch (props.mode) {
          case 'authenticate':
            if (!props.userId) {
              throw new Error('ID utilisateur requis pour l\'authentification')
            }
            
            if (faceRecognitionService.isInitialized) {
              processResult = await faceRecognitionService.authenticateUser(
                canvas, 
                props.userId, 
                props.threshold
              )
            } else {
              processResult = await simpleFaceService.authenticateUser(
                videoElement.value, 
                props.userId
              )
            }
            break

          case 'register':
            if (!props.userId) {
              throw new Error('ID utilisateur requis pour l\'enregistrement')
            }
            
            if (faceRecognitionService.isInitialized) {
              processResult = await faceRecognitionService.registerFace(canvas, props.userId)
            } else {
              processResult = await simpleFaceService.registerFace(videoElement.value, props.userId)
            }
            break

          case 'detect':
          default:
            let detection = null
            let expressions = null
            let ageGender = null
            
            if (faceRecognitionService.isInitialized) {
              detection = await faceRecognitionService.detectFirstFace(canvas)
              if (detection) {
                expressions = await faceRecognitionService.analyzeExpressions(canvas)
                ageGender = await faceRecognitionService.estimateAgeAndGender(canvas)
              }
            } else {
              detection = await simpleFaceService.detectFace(videoElement.value)
              if (detection) {
                expressions = await simpleFaceService.analyzeExpressions(videoElement.value)
                ageGender = await simpleFaceService.estimateAgeAndGender(videoElement.value)
              }
            }
            
            if (detection) {
              processResult = {
                success: true,
                message: 'Visage détecté avec succès',
                confidence: detection.confidence || 1.0,
                expressions,
                ageGender
              }
            } else {
              processResult = {
                success: false,
                message: 'Aucun visage détecté'
              }
            }
            break
        }

        result.value = processResult

        if (processResult.success) {
          emit('success', processResult)
        } else {
          emit('error', processResult.message)
        }

      } catch (error) {
        console.error('Erreur de traitement:', error)
        result.value = {
          success: false,
          message: error.message || 'Erreur lors du traitement'
        }
        emit('error', error.message)
      } finally {
        isProcessing.value = false
      }
    }

    const reset = () => {
      result.value = null
      faceDetected.value = false
    }

    const onSuccess = () => {
      emit('success', result.value)
    }

    const onCancel = () => {
      emit('cancel')
    }

    const getEmotionLabel = (emotion) => {
      const labels = {
        neutral: 'Neutre',
        happy: 'Joyeux',
        sad: 'Triste',
        angry: 'En colère',
        fearful: 'Peur',
        disgusted: 'Dégoûté',
        surprised: 'Surpris'
      }
      return labels[emotion] || emotion
    }

    return {
      // Références
      videoElement,
      canvasElement,
      isVideoActive,
      isLoading,
      isProcessing,
      loadingMessage,
      faceDetected,
      faceBoxStyle,
      result,
      
      // Méthodes
      startCamera,
      stopCamera,
      captureAndProcess,
      reset,
      onSuccess,
      onCancel,
      getEmotionLabel
    }
  }
}
</script>

<style scoped>
.face-recognition-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto 20px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.video-active {
  width: 100%;
  height: auto;
  display: block;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.overlay-content {
  text-align: center;
}

.camera-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.7;
}

.face-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.face-box {
  position: absolute;
  border: 3px solid #4CAF50;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.5); }
  50% { box-shadow: 0 0 30px rgba(76, 175, 80, 0.8); }
  100% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.5); }
}

.face-status {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(76, 175, 80, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.status-icon {
  font-size: 16px;
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #229954;
}

.btn-outline {
  background: transparent;
  color: #3498db;
  border: 2px solid #3498db;
}

.btn-outline:hover {
  background: #3498db;
  color: white;
}

.results {
  margin: 20px 0;
}

.result-card {
  padding: 20px;
  border-radius: 12px;
  border: 2px solid;
}

.result-card.success {
  background: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.result-card.error {
  background: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.result-icon {
  font-size: 24px;
}

.confidence {
  margin: 16px 0;
}

.confidence-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #f39c12, #27ae60);
  transition: width 0.3s ease;
}

.expressions {
  margin: 16px 0;
}

.expression-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.expression-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 14px;
}

.age-gender {
  margin: 16px 0;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 640px) {
  .face-recognition-container {
    padding: 10px;
  }
  
  .controls {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
