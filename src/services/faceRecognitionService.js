import * as faceapi from '@vladmandic/face-api'

class FaceRecognitionService {
  constructor() {
    this.isInitialized = false
    this.modelsLoaded = false
    this.faceDescriptors = new Map() // Stockage des descripteurs faciaux
  }

  /**
   * Initialise face-api.js et charge les modèles nécessaires
   */
  async initialize() {
    if (this.isInitialized) {
      return true
    }

    try {
      console.log('🚀 Initialisation de face-api.js...')
      
      // Essayer de charger les modèles depuis le CDN
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
        await faceapi.nets.ageGenderNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
      } catch (cdnError) {
        console.warn('⚠️ Impossible de charger depuis le CDN, tentative avec les modèles locaux...')
        
        // Fallback vers les modèles locaux
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        await faceapi.nets.faceExpressionNet.loadFromUri('/models')
        await faceapi.nets.ageGenderNet.loadFromUri('/models')
      }

      this.modelsLoaded = true
      this.isInitialized = true
      console.log('✅ Face-api.js initialisé avec succès')
      return true
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de face-api.js:', error)
      return false
    }
  }

  /**
   * Détecte tous les visages dans une image
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Élément image/vidéo
   * @returns {Promise<Array>} Liste des détections de visages
   */
  async detectFaces(input) {
    if (!this.modelsLoaded) {
      throw new Error('Les modèles ne sont pas encore chargés')
    }

    try {
      const detections = await faceapi
        .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()
        .withAgeAndGender()

      return detections
    } catch (error) {
      console.error('Erreur lors de la détection des visages:', error)
      throw error
    }
  }

  /**
   * Détecte le premier visage dans une image
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Élément image/vidéo
   * @returns {Promise<Object|null>} Détection du premier visage ou null
   */
  async detectFirstFace(input) {
    const detections = await this.detectFaces(input)
    return detections.length > 0 ? detections[0] : null
  }

  /**
   * Génère un descripteur facial unique pour un visage
   * @param {Object} faceDetection - Détection de visage avec descripteur
   * @returns {Float32Array} Descripteur facial
   */
  getFaceDescriptor(faceDetection) {
    if (!faceDetection || !faceDetection.descriptor) {
      throw new Error('Aucun descripteur facial trouvé')
    }
    return faceDetection.descriptor
  }

  /**
   * Enregistre un descripteur facial pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Float32Array} descriptor - Descripteur facial
   */
  saveFaceDescriptor(userId, descriptor) {
    this.faceDescriptors.set(userId, descriptor)
    // Optionnel: sauvegarder dans le localStorage
    try {
      const serialized = Array.from(descriptor)
      localStorage.setItem(`face_descriptor_${userId}`, JSON.stringify(serialized))
    } catch (error) {
      console.warn('Impossible de sauvegarder le descripteur dans localStorage:', error)
    }
  }

  /**
   * Charge un descripteur facial depuis le localStorage
   * @param {string} userId - ID de l'utilisateur
   * @returns {Float32Array|null} Descripteur facial ou null
   */
  loadFaceDescriptor(userId) {
    try {
      const stored = localStorage.getItem(`face_descriptor_${userId}`)
      if (stored) {
        const array = JSON.parse(stored)
        return new Float32Array(array)
      }
    } catch (error) {
      console.warn('Impossible de charger le descripteur depuis localStorage:', error)
    }
    return null
  }

  /**
   * Compare deux descripteurs faciaux
   * @param {Float32Array} descriptor1 - Premier descripteur
   * @param {Float32Array} descriptor2 - Deuxième descripteur
   * @returns {number} Distance euclidienne (plus c'est petit, plus c'est similaire)
   */
  compareFaceDescriptors(descriptor1, descriptor2) {
    return faceapi.euclideanDistance(descriptor1, descriptor2)
  }

  /**
   * Reconnaît un visage en le comparant avec les descripteurs enregistrés
   * @param {Float32Array} inputDescriptor - Descripteur du visage à reconnaître
   * @param {number} threshold - Seuil de similarité (défaut: 0.6)
   * @returns {Object|null} {userId, distance} ou null si aucune correspondance
   */
  recognizeFace(inputDescriptor, threshold = 0.6) {
    let bestMatch = null
    let minDistance = Infinity

    for (const [userId, storedDescriptor] of this.faceDescriptors) {
      const distance = this.compareFaceDescriptors(inputDescriptor, storedDescriptor)
      
      if (distance < threshold && distance < minDistance) {
        minDistance = distance
        bestMatch = { userId, distance }
      }
    }

    return bestMatch
  }

  /**
   * Authentifie un utilisateur par reconnaissance faciale
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Image du visage
   * @param {string} expectedUserId - ID de l'utilisateur attendu
   * @param {number} threshold - Seuil de similarité
   * @returns {Promise<Object>} {success: boolean, confidence: number, message: string}
   */
  async authenticateUser(input, expectedUserId, threshold = 0.5) {
    try {
      const faceDetection = await this.detectFirstFace(input)
      
      if (!faceDetection) {
        return {
          success: false,
          confidence: 0,
          message: 'Aucun visage détecté'
        }
      }

      const inputDescriptor = this.getFaceDescriptor(faceDetection)
      const storedDescriptor = this.loadFaceDescriptor(expectedUserId)

      if (!storedDescriptor) {
        return {
          success: false,
          confidence: 0,
          message: 'Aucun profil facial enregistré pour cet utilisateur'
        }
      }

      const distance = this.compareFaceDescriptors(inputDescriptor, storedDescriptor)
      const confidence = Math.max(0, 1 - distance)

      if (distance <= threshold) {
        return {
          success: true,
          confidence: confidence,
          message: 'Authentification réussie'
        }
      } else {
        return {
          success: false,
          confidence: confidence,
          message: 'Visage non reconnu'
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error)
      return {
        success: false,
        confidence: 0,
        message: 'Erreur lors de l\'authentification'
      }
    }
  }

  /**
   * Enregistre un nouveau profil facial
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Image du visage
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} {success: boolean, message: string}
   */
  async registerFace(input, userId) {
    try {
      const faceDetection = await this.detectFirstFace(input)
      
      if (!faceDetection) {
        return {
          success: false,
          message: 'Aucun visage détecté'
        }
      }

      const descriptor = this.getFaceDescriptor(faceDetection)
      this.saveFaceDescriptor(userId, descriptor)

      return {
        success: true,
        message: 'Profil facial enregistré avec succès'
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error)
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement du profil'
      }
    }
  }

  /**
   * Analyse les expressions faciales
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Image du visage
   * @returns {Promise<Object|null>} Expressions détectées ou null
   */
  async analyzeExpressions(input) {
    try {
      const faceDetection = await this.detectFirstFace(input)
      
      if (!faceDetection || !faceDetection.expressions) {
        return null
      }

      return faceDetection.expressions
    } catch (error) {
      console.error('Erreur lors de l\'analyse des expressions:', error)
      return null
    }
  }

  /**
   * Estime l'âge et le genre
   * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Image du visage
   * @returns {Promise<Object|null>} {age: number, gender: string, genderProbability: number} ou null
   */
  async estimateAgeAndGender(input) {
    try {
      const faceDetection = await this.detectFirstFace(input)
      
      if (!faceDetection || !faceDetection.age || !faceDetection.gender) {
        return null
      }

      return {
        age: Math.round(faceDetection.age),
        gender: faceDetection.gender,
        genderProbability: faceDetection.genderProbability
      }
    } catch (error) {
      console.error('Erreur lors de l\'estimation âge/genre:', error)
      return null
    }
  }

  /**
   * Vérifie si l'utilisateur regarde l'écran (basé sur les landmarks)
   * @param {Object} faceDetection - Détection de visage avec landmarks
   * @returns {boolean} true si l'utilisateur regarde l'écran
   */
  isLookingAtScreen(faceDetection) {
    if (!faceDetection || !faceDetection.landmarks) {
      return false
    }

    // Logique simplifiée basée sur la position des yeux
    const leftEye = faceDetection.landmarks.getLeftEye()
    const rightEye = faceDetection.landmarks.getRightEye()
    
    // Calculer la direction du regard (simplifié)
    const eyeCenter = {
      x: (leftEye[0].x + rightEye[0].x) / 2,
      y: (leftEye[0].y + rightEye[0].y) / 2
    }

    // Vérifier si les yeux sont centrés (logique simplifiée)
    const faceBox = faceDetection.detection.box
    const faceCenter = {
      x: faceBox.x + faceBox.width / 2,
      y: faceBox.y + faceBox.height / 2
    }

    const distance = Math.sqrt(
      Math.pow(eyeCenter.x - faceCenter.x, 2) + 
      Math.pow(eyeCenter.y - faceCenter.y, 2)
    )

    // Si la distance est faible, l'utilisateur regarde probablement l'écran
    return distance < faceBox.width * 0.1
  }

  /**
   * Nettoie les données stockées
   */
  clearStoredData() {
    this.faceDescriptors.clear()
    
    // Nettoyer le localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('face_descriptor_')) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Instance singleton
const faceRecognitionService = new FaceRecognitionService()

export default faceRecognitionService
