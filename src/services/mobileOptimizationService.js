/**
 * Service d'optimisation mobile
 * Gère les optimisations spécifiques aux appareils mobiles
 */

/* global IntersectionObserver, HTMLImageElement, requestAnimationFrame, caches, MutationObserver */

class MobileOptimizationService {
  constructor () {
    this.isMobile = this.detectMobile()
    this.isLowEndDevice = false
    this.connectionType = 'unknown'
    this.deviceMemory = 0
    this.hardwareConcurrency = 0

    // Configuration des optimisations
    this.optimizations = {
      lazyLoading: true,
      imageCompression: true,
      reducedAnimations: false,
      simplifiedUI: false,
      preloadCritical: true,
      deferNonCritical: true
    }

    this.init()
  }

  /**
   * Initialise le service d'optimisation
   */
  async init () {
    if (!this.isMobile) {
      return
    }

    try {
      // Détecter les caractéristiques de l'appareil
      await this.detectDeviceCapabilities()

      // Appliquer les optimisations appropriées
      this.applyOptimizations()

      // Configurer les écouteurs d'événements
      this.setupEventListeners()

      // eslint-disable-next-line no-console
      console.log('📱 Service d\'optimisation mobile initialisé')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erreur lors de l\'initialisation de l\'optimisation mobile:', error)
    }
  }

  /**
   * Détecte si l'appareil est mobile
   */
  detectMobile () {
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']

    return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
           window.innerWidth <= 768 ||
           ('ontouchstart' in window)
  }

  /**
   * Détecte les capacités de l'appareil
   */
  async detectDeviceCapabilities () {
    // Détecter le type de connexion
    if ('connection' in navigator) {
      this.connectionType = navigator.connection.effectiveType || 'unknown'
    }

    // Détecter la mémoire de l'appareil
    if ('deviceMemory' in navigator) {
      this.deviceMemory = navigator.deviceMemory || 0
    }

    // Détecter le nombre de cœurs CPU
    this.hardwareConcurrency = navigator.hardwareConcurrency || 0

    // Déterminer si c'est un appareil bas de gamme
    this.isLowEndDevice = this.detectLowEndDevice()

    // eslint-disable-next-line no-console
    console.log('📱 Capacités détectées:', {
      isMobile: this.isMobile,
      isLowEndDevice: this.isLowEndDevice,
      connectionType: this.connectionType,
      deviceMemory: this.deviceMemory,
      hardwareConcurrency: this.hardwareConcurrency
    })
  }

  /**
   * Détecte si l'appareil est bas de gamme
   */
  detectLowEndDevice () {
    // Critères pour un appareil bas de gamme
    const lowMemory = this.deviceMemory > 0 && this.deviceMemory < 4
    const lowCPU = this.hardwareConcurrency > 0 && this.hardwareConcurrency < 4
    const slowConnection = ['slow-2g', '2g', '3g'].includes(this.connectionType)

    return lowMemory || lowCPU || slowConnection
  }

  /**
   * Applique les optimisations appropriées
   */
  applyOptimizations () {
    // Optimisations pour appareils bas de gamme
    if (this.isLowEndDevice) {
      this.optimizations.reducedAnimations = true
      this.optimizations.simplifiedUI = true
      this.optimizations.imageCompression = true
    }

    // Optimisations pour connexions lentes
    if (['slow-2g', '2g', '3g'].includes(this.connectionType)) {
      this.optimizations.lazyLoading = true
      this.optimizations.deferNonCritical = true
      this.optimizations.imageCompression = true
    }

    // Appliquer les optimisations CSS
    this.applyCSSOptimizations()

    // Configurer le lazy loading
    this.setupLazyLoading()

    // Optimiser les images
    this.optimizeImages()

    // Réduire les animations si nécessaire
    if (this.optimizations.reducedAnimations) {
      this.reduceAnimations()
    }
  }

  /**
   * Applique les optimisations CSS
   */
  applyCSSOptimizations () {
    const style = document.createElement('style')
    style.id = 'mobile-optimizations'

    let css = ''

    // Optimisations pour appareils bas de gamme
    if (this.isLowEndDevice) {
      css += `
        /* Réduire les effets visuels */
        * {
          box-shadow: none !important;
          filter: none !important;
          backdrop-filter: none !important;
        }

        /* Simplifier les transitions */
        * {
          transition-duration: 0.1s !important;
          animation-duration: 0.2s !important;
        }

        /* Optimiser le rendu */
        * {
          will-change: auto !important;
          transform: none !important;
        }
      `
    }

    // Optimisations pour connexions lentes
    if (['slow-2g', '2g', '3g'].includes(this.connectionType)) {
      css += `
        /* Masquer les éléments non critiques */
        .non-critical {
          display: none !important;
        }

        /* Réduire la qualité des images */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      `
    }

    if (css) {
      style.textContent = css
      document.head.appendChild(style)
    }
  }

  /**
   * Configure le lazy loading
   */
  setupLazyLoading () {
    if (!this.optimizations.lazyLoading) {
      return
    }

    // Observer pour le lazy loading des images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
              imageObserver.unobserve(img)
            }
          }
        })
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      })

      // Observer toutes les images avec data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img)
      })
    }

    // Lazy loading des composants Vue
    this.setupVueLazyLoading()
  }

  /**
   * Configure le lazy loading pour Vue
   */
  setupVueLazyLoading () {
    // Marquer les composants non critiques pour le lazy loading
    const nonCriticalComponents = [
      'PerformanceDashboard',
      'ImageOptimizer',
      'AdvancedSettings'
    ]

    // Stocker la configuration pour Vue
    window.__mobileOptimizations = {
      lazyLoadComponents: nonCriticalComponents,
      isLowEndDevice: this.isLowEndDevice,
      connectionType: this.connectionType
    }
  }

  /**
   * Optimise les images
   */
  optimizeImages () {
    if (!this.optimizations.imageCompression) {
      return
    }

    // Ajouter des attributs d'optimisation aux images
    document.querySelectorAll('img').forEach(img => {
      // Ajouter loading="lazy" si supporté
      if ('loading' in HTMLImageElement.prototype) {
        img.loading = 'lazy'
      }

      // Optimiser la qualité selon la connexion
      if (['slow-2g', '2g'].includes(this.connectionType)) {
        img.style.imageRendering = 'crisp-edges'
        img.style.imageRendering = '-webkit-optimize-contrast'
      }
    })
  }

  /**
   * Réduit les animations
   */
  reduceAnimations () {
    // Désactiver les animations CSS
    const style = document.createElement('style')
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `
    document.head.appendChild(style)

    // Respecter la préférence utilisateur pour les animations réduites
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners () {
    // Écouter les changements de connexion
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.connectionType = navigator.connection.effectiveType || 'unknown'
        this.applyOptimizations()
      })
    }

    // Écouter les changements de préférences d'accessibilité
    if (window.matchMedia) {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reducedMotionQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.reduceAnimations()
        }
      })
    }

    // Optimiser le scroll sur mobile
    this.optimizeScroll()
  }

  /**
   * Optimise le scroll sur mobile
   */
  optimizeScroll () {
    let ticking = false

    const optimizeScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Optimisations de scroll pour mobile
          document.body.style.overflowScrolling = 'touch'
          document.body.style.webkitOverflowScrolling = 'touch'

          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', optimizeScroll, { passive: true })
  }

  /**
   * Précharge les ressources critiques
   */
  preloadCriticalResources () {
    if (!this.optimizations.preloadCritical) {
      return
    }

    const criticalResources = [
      '/icons/icon-192x192.png',
      '/manifest.json'
    ]

    criticalResources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      link.as = resource.endsWith('.png') ? 'image' : 'fetch'
      document.head.appendChild(link)
    })
  }

  /**
   * Diffère le chargement des ressources non critiques
   */
  deferNonCriticalResources () {
    if (!this.optimizations.deferNonCritical) {
      return
    }

    // Différer le chargement des scripts non critiques
    const nonCriticalScripts = document.querySelectorAll('script[data-defer]')
    nonCriticalScripts.forEach(script => {
      script.defer = true
    })

    // Différer le chargement des styles non critiques
    const nonCriticalStyles = document.querySelectorAll('link[data-defer]')
    nonCriticalStyles.forEach(style => {
      style.media = 'print'
      style.onload = () => {
        style.media = 'all'
      }
    })
  }

  /**
   * Optimise la gestion mémoire
   */
  optimizeMemoryUsage () {
    if (this.isLowEndDevice) {
      // Nettoyer périodiquement les caches
      setInterval(() => {
        if ('caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              if (cacheName.includes('old-') || cacheName.includes('temp-')) {
                caches.delete(cacheName)
              }
            })
          })
        }
      }, 5 * 60 * 1000) // Toutes les 5 minutes

      // Limiter le nombre d'éléments DOM
      this.limitDOMElements()
    }
  }

  /**
   * Limite le nombre d'éléments DOM
   */
  limitDOMElements () {
    const maxElements = 1000
    const observer = new MutationObserver(() => {
      const elementCount = document.querySelectorAll('*').length
      if (elementCount > maxElements) {
        // Supprimer les éléments non visibles
        const nonVisibleElements = document.querySelectorAll('.hidden, [style*="display: none"]')
        nonVisibleElements.forEach(el => {
          if (el.parentNode) {
            el.parentNode.removeChild(el)
          }
        })
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Obtient les statistiques d'optimisation
   */
  getOptimizationStats () {
    return {
      isMobile: this.isMobile,
      isLowEndDevice: this.isLowEndDevice,
      connectionType: this.connectionType,
      deviceMemory: this.deviceMemory,
      hardwareConcurrency: this.hardwareConcurrency,
      optimizations: this.optimizations,
      domElementCount: document.querySelectorAll('*').length,
      imageCount: document.querySelectorAll('img').length,
      scriptCount: document.querySelectorAll('script').length,
      styleCount: document.querySelectorAll('style, link[rel="stylesheet"]').length
    }
  }

  /**
   * Force l'application des optimisations
   */
  forceOptimizations () {
    this.applyOptimizations()
    this.preloadCriticalResources()
    this.deferNonCriticalResources()
    this.optimizeMemoryUsage()
  }

  /**
   * Désactive les optimisations (pour les tests)
   */
  disableOptimizations () {
    const style = document.getElementById('mobile-optimizations')
    if (style) {
      style.remove()
    }

    this.optimizations = {
      lazyLoading: false,
      imageCompression: false,
      reducedAnimations: false,
      simplifiedUI: false,
      preloadCritical: false,
      deferNonCritical: false
    }
  }
}

// Instance singleton
const mobileOptimizationService = new MobileOptimizationService()

export default mobileOptimizationService
export { MobileOptimizationService }