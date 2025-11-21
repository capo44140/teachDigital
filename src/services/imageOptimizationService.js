/**
 * Service d'optimisation des images
 * Compression automatique, conversion WebP et redimensionnement
 */

class ImageOptimizationService {
  constructor () {
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
    this.maxDimensions = 4096
    this.qualitySettings = {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    }
    this.webpSupported = this.checkWebPSupport()
  }

  /**
   * Vérifie le support WebP du navigateur
   */
  checkWebPSupport () {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  /**
   * Optimise une image avec compression et conversion WebP
   * @param {File} file - Fichier image à optimiser
   * @param {Object} options - Options d'optimisation
   * @returns {Promise<Object>} - Résultat de l'optimisation
   */
  async optimizeImage (file, options = {}) {
    const {
      quality = 'medium',
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'auto', // 'auto', 'webp', 'jpeg', 'png'
      progressive = true
    } = options

    try {
      // Validation du fichier
      const validation = this.validateImage(file)
      if (!validation.valid) {
        throw new Error(`Image invalide: ${validation.errors.join(', ')}`)
      }

      // Créer l'image
      const image = await this.loadImage(file)

      // Calculer les nouvelles dimensions
      const dimensions = this.calculateDimensions(
        image.width,
        image.height,
        maxWidth,
        maxHeight
      )

      // Créer le canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = dimensions.width
      canvas.height = dimensions.height

      // Optimiser le contexte
      this.optimizeCanvasContext(ctx)

      // Dessiner l'image redimensionnée
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height)

      // Déterminer le format de sortie
      const outputFormat = this.determineOutputFormat(format, file.type)
      const outputQuality = this.qualitySettings[quality] || 0.7

      // Convertir en blob
      const blob = await this.canvasToBlob(canvas, outputFormat, outputQuality, progressive)

      return {
        success: true,
        blob,
        originalSize: file.size,
        optimizedSize: blob.size,
        compressionRatio: Math.round((1 - blob.size / file.size) * 100),
        dimensions: {
          original: { width: image.width, height: image.height },
          optimized: { width: dimensions.width, height: dimensions.height }
        },
        format: outputFormat,
        quality: outputQuality
      }
    } catch (error) {
      console.error('Erreur lors de l\'optimisation de l\'image:', error)
      return {
        success: false,
        error: error.message,
        originalSize: file.size
      }
    }
  }

  /**
   * Valide un fichier image
   */
  validateImage (file) {
    const errors = []
    const warnings = []

    // Vérifier le type MIME
    if (!this.supportedFormats.includes(file.type)) {
      errors.push(`Format non supporté: ${file.type}`)
    }

    // Vérifier la taille
    if (file.size > this.maxFileSize) {
      errors.push(`Fichier trop volumineux: ${Math.round(file.size / 1024 / 1024)}MB (max: 10MB)`)
    }

    // Avertissements
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('Fichier volumineux, optimisation recommandée')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Charge une image dans un élément Image
   */
  loadImage (file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Impossible de charger l\'image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Calcule les nouvelles dimensions en préservant le ratio
   */
  calculateDimensions (originalWidth, originalHeight, maxWidth, maxHeight) {
    const { width, height } = { width: originalWidth, height: originalHeight }

    // Vérifier si un redimensionnement est nécessaire
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height }
    }

    // Calculer le ratio de redimensionnement
    const widthRatio = maxWidth / width
    const heightRatio = maxHeight / height
    const ratio = Math.min(widthRatio, heightRatio)

    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio)
    }
  }

  /**
   * Optimise le contexte du canvas pour de meilleures performances
   */
  optimizeCanvasContext (ctx) {
    // Désactiver l'anti-aliasing pour les images pixelisées
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Optimiser les performances
    ctx.save()
  }

  /**
   * Détermine le format de sortie optimal
   */
  determineOutputFormat (preferredFormat, originalType) {
    if (preferredFormat === 'auto') {
      // Utiliser WebP si supporté et si l'image n'est pas déjà WebP
      if (this.webpSupported && originalType !== 'image/webp') {
        return 'image/webp'
      }
      // Sinon, garder le format original
      return originalType
    }

    return preferredFormat
  }

  /**
   * Convertit un canvas en blob avec options avancées
   */
  async canvasToBlob (canvas, format, quality, progressive = false) {
    return new Promise((resolve) => {
      // Options pour JPEG progressif
      const options = { quality }

      if (format === 'image/jpeg' && progressive) {
        // Note: toBlob ne supporte pas directement le JPEG progressif
        // mais nous pouvons optimiser la qualité
        options.quality = Math.min(quality + 0.1, 1.0)
      }

      canvas.toBlob(resolve, format, options.quality)
    })
  }

  /**
   * Crée une vignette (thumbnail) d'une image
   */
  async createThumbnail (file, size = 200) {
    const result = await this.optimizeImage(file, {
      quality: 'medium',
      maxWidth: size,
      maxHeight: size,
      format: 'webp'
    })

    if (result.success) {
      return {
        ...result,
        type: 'thumbnail',
        size
      }
    }

    return result
  }

  /**
   * Optimise plusieurs images en parallèle
   */
  async optimizeImages (files, options = {}) {
    const promises = files.map(file => this.optimizeImage(file, options))
    const results = await Promise.allSettled(promises)

    return results.map((result, index) => ({
      file: files[index].name,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : { error: result.reason?.message }
    }))
  }

  /**
   * Génère un aperçu d'image optimisé
   */
  async generatePreview (file, maxSize = 400) {
    const result = await this.optimizeImage(file, {
      quality: 'low',
      maxWidth: maxSize,
      maxHeight: maxSize,
      format: 'webp'
    })

    if (result.success) {
      return URL.createObjectURL(result.blob)
    }

    return null
  }

  /**
   * Analyse les métadonnées d'une image
   */
  async analyzeImage (file) {
    try {
      const image = await this.loadImage(file)

      return {
        width: image.width,
        height: image.height,
        aspectRatio: image.width / image.height,
        fileSize: file.size,
        format: file.type,
        isLandscape: image.width > image.height,
        isPortrait: image.height > image.width,
        isSquare: image.width === image.height,
        megapixels: Math.round((image.width * image.height) / 1000000 * 100) / 100
      }
    } catch (error) {
      return {
        error: error.message
      }
    }
  }

  /**
   * Recommande les paramètres d'optimisation
   */
  getOptimizationRecommendations (analysis) {
    const recommendations = []

    if (analysis.fileSize > 5 * 1024 * 1024) {
      recommendations.push({
        type: 'warning',
        message: 'Fichier volumineux détecté',
        suggestion: 'Utilisez une qualité "medium" ou "low"'
      })
    }

    if (analysis.megapixels > 8) {
      recommendations.push({
        type: 'info',
        message: 'Image haute résolution',
        suggestion: 'Redimensionnement recommandé pour le web'
      })
    }

    if (analysis.format === 'image/png' && analysis.fileSize > 1024 * 1024) {
      recommendations.push({
        type: 'suggestion',
        message: 'PNG volumineux',
        suggestion: 'Conversion en WebP recommandée'
      })
    }

    return recommendations
  }
}

// Instance singleton
const imageOptimizationService = new ImageOptimizationService()

export default imageOptimizationService
export { ImageOptimizationService }
