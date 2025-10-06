/**
 * Service de validation des images côté serveur
 * Valide le type, la taille, le contenu et la sécurité des images
 */

class ImageValidationService {
  constructor() {
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    this.maxSize = 10 * 1024 * 1024 // 10MB
    this.minSize = 1024 // 1KB
    this.maxDimensions = { width: 4096, height: 4096 }
    this.minDimensions = { width: 100, height: 100 }
  }

  /**
   * Valide un fichier image de manière complète
   * @param {File} file - Fichier à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateImage(file) {
    const errors = []
    const warnings = []

    try {
      // 1. Validation du type MIME
      const typeValidation = this.validateMimeType(file)
      if (!typeValidation.valid) {
        errors.push(typeValidation.error)
        return { valid: false, errors, warnings }
      }

      // 2. Validation de la taille
      const sizeValidation = this.validateFileSize(file)
      if (!sizeValidation.valid) {
        errors.push(sizeValidation.error)
        return { valid: false, errors, warnings }
      }

      // 3. Validation du contenu (magic numbers)
      const contentValidation = await this.validateFileContent(file)
      if (!contentValidation.valid) {
        errors.push(contentValidation.error)
        return { valid: false, errors, warnings }
      }

      // 4. Validation des dimensions
      const dimensionsValidation = await this.validateDimensions(file)
      if (!dimensionsValidation.valid) {
        errors.push(dimensionsValidation.error)
        return { valid: false, errors, warnings }
      }

      // 5. Détection de contenu malveillant
      const securityValidation = await this.validateSecurity(file)
      if (!securityValidation.valid) {
        errors.push(securityValidation.error)
        return { valid: false, errors, warnings }
      }

      // 6. Optimisation recommandations
      const optimizationWarnings = await this.getOptimizationWarnings(file)
      warnings.push(...optimizationWarnings)

      return {
        valid: true,
        errors: [],
        warnings,
        metadata: {
          type: file.type,
          size: file.size,
          dimensions: dimensionsValidation.dimensions,
          quality: this.assessImageQuality(file)
        }
      }

    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur lors de la validation: ${error.message}`],
        warnings
      }
    }
  }

  /**
   * Valide le type MIME du fichier
   * @param {File} file - Fichier à valider
   * @returns {Object} Résultat de la validation
   */
  validateMimeType(file) {
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Type de fichier non autorisé: ${file.type}. Types acceptés: ${this.allowedTypes.join(', ')}`
      }
    }
    return { valid: true }
  }

  /**
   * Valide la taille du fichier
   * @param {File} file - Fichier à valider
   * @returns {Object} Résultat de la validation
   */
  validateFileSize(file) {
    if (file.size > this.maxSize) {
      return {
        valid: false,
        error: `Fichier trop volumineux: ${this.formatFileSize(file.size)}. Taille maximale: ${this.formatFileSize(this.maxSize)}`
      }
    }
    
    if (file.size < this.minSize) {
      return {
        valid: false,
        error: `Fichier trop petit: ${this.formatFileSize(file.size)}. Taille minimale: ${this.formatFileSize(this.minSize)}`
      }
    }

    return { valid: true }
  }

  /**
   * Valide le contenu du fichier (magic numbers)
   * @param {File} file - Fichier à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateFileContent(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const arrayBuffer = e.target.result
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Vérifier les magic numbers
        const magicNumbers = {
          'image/jpeg': [0xFF, 0xD8, 0xFF],
          'image/png': [0x89, 0x50, 0x4E, 0x47],
          'image/gif': [0x47, 0x49, 0x46],
          'image/webp': [0x52, 0x49, 0x46, 0x46]
        }

        const expectedMagic = magicNumbers[file.type]
        if (!expectedMagic) {
          resolve({ valid: false, error: 'Type de fichier non reconnu' })
          return
        }

        const isValidMagic = expectedMagic.every((byte, index) => 
          uint8Array[index] === byte
        )

        if (!isValidMagic) {
          resolve({ 
            valid: false, 
            error: 'Le contenu du fichier ne correspond pas au type déclaré' 
          })
          return
        }

        resolve({ valid: true })
      }

      reader.onerror = () => {
        resolve({ valid: false, error: 'Impossible de lire le fichier' })
      }

      reader.readAsArrayBuffer(file.slice(0, 10)) // Lire seulement les premiers octets
    })
  }

  /**
   * Valide les dimensions de l'image
   * @param {File} file - Fichier à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image()
      
      img.onload = () => {
        const dimensions = { width: img.width, height: img.height }
        
        if (img.width > this.maxDimensions.width || img.height > this.maxDimensions.height) {
          resolve({
            valid: false,
            error: `Dimensions trop grandes: ${img.width}x${img.height}. Maximum: ${this.maxDimensions.width}x${this.maxDimensions.height}`
          })
          return
        }

        if (img.width < this.minDimensions.width || img.height < this.minDimensions.height) {
          resolve({
            valid: false,
            error: `Dimensions trop petites: ${img.width}x${img.height}. Minimum: ${this.minDimensions.width}x${this.minDimensions.height}`
          })
          return
        }

        resolve({ valid: true, dimensions })
      }

      img.onerror = () => {
        resolve({ valid: false, error: 'Impossible de charger l\'image' })
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Valide la sécurité de l'image
   * @param {File} file - Fichier à valider
   * @returns {Promise<Object>} Résultat de la validation
   */
  async validateSecurity(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target.result
        
        // Vérifier la présence de scripts ou de code malveillant
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /onload=/i,
          /onerror=/i,
          /eval\(/i,
          /document\./i,
          /window\./i
        ]

        const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
          pattern.test(content)
        )

        if (hasSuspiciousContent) {
          resolve({
            valid: false,
            error: 'Contenu suspect détecté dans l\'image'
          })
          return
        }

        resolve({ valid: true })
      }

      reader.onerror = () => {
        resolve({ valid: false, error: 'Impossible de vérifier la sécurité du fichier' })
      }

      reader.readAsText(file)
    })
  }

  /**
   * Obtient les recommandations d'optimisation
   * @param {File} file - Fichier à analyser
   * @returns {Promise<Array>} Liste des avertissements
   */
  async getOptimizationWarnings(file) {
    const warnings = []

    // Vérifier la taille
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('Image volumineuse détectée. Considérez la compression pour améliorer les performances.')
    }

    // Vérifier le type
    if (file.type === 'image/gif' && file.size > 1024 * 1024) { // 1MB
      warnings.push('GIF volumineux détecté. Considérez convertir en MP4 pour de meilleures performances.')
    }

    return warnings
  }

  /**
   * Évalue la qualité de l'image
   * @param {File} file - Fichier à évaluer
   * @returns {string} Niveau de qualité
   */
  assessImageQuality(file) {
    const sizeInMB = file.size / (1024 * 1024)
    
    if (sizeInMB < 0.5) return 'low'
    if (sizeInMB < 2) return 'medium'
    if (sizeInMB < 5) return 'high'
    return 'very-high'
  }

  /**
   * Formate la taille d'un fichier
   * @param {number} bytes - Taille en octets
   * @returns {string} Taille formatée
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Optimise une image si nécessaire
   * @param {File} file - Fichier à optimiser
   * @returns {Promise<File>} Fichier optimisé
   */
  async optimizeImage(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculer les nouvelles dimensions (max 1920px de large)
        const maxWidth = 1920
        const ratio = Math.min(maxWidth / img.width, 1)
        const newWidth = img.width * ratio
        const newHeight = img.height * ratio

        canvas.width = newWidth
        canvas.height = newHeight

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // Convertir en blob
        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(optimizedFile)
        }, 'image/jpeg', 0.8) // Qualité 80%
      }

      img.src = URL.createObjectURL(file)
    })
  }
}

export { ImageValidationService }
