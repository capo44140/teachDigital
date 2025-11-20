/**
 * Service de gestion de l'installation PWA
 * Gère les prompts d'installation et l'expérience utilisateur
 */

class InstallService {
  constructor() {
    this.deferredPrompt = null
    this.isInstalled = false
    this.isInstallable = false
    this.installPromptShown = false
    this.installPromptDismissed = false
    
    // Écouter les événements d'installation
    this.setupEventListeners()
    
    // Vérifier l'état d'installation
    this.checkInstallationStatus()
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Événement avant l'installation
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 Prompt d\'installation disponible')
      // Intercepter l'événement pour contrôler quand afficher le prompt
      // L'avertissement du navigateur est normal : on appelle prompt() plus tard
      e.preventDefault()
      this.deferredPrompt = e
      this.isInstallable = true
      this.installPromptShown = false
      this.installPromptDismissed = false
      
      // Déclencher un événement personnalisé pour que les composants puissent afficher le prompt
      this.dispatchInstallEvent('installable')
      
      // Note: L'avertissement "Banner not shown" est normal ici.
      // On contrôle manuellement quand afficher le prompt via showInstallPrompt()
    })

    // Événement après l'installation
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installée avec succès')
      this.isInstalled = true
      this.isInstallable = false
      this.deferredPrompt = null
      
      // Déclencher un événement personnalisé
      this.dispatchInstallEvent('installed')
      
      // Sauvegarder l'état d'installation
      this.saveInstallationState()
    })

    // Détecter si l'app est lancée depuis l'écran d'accueil
    window.addEventListener('load', () => {
      this.detectStandaloneMode()
    })
  }

  /**
   * Vérifie l'état d'installation
   */
  checkInstallationStatus() {
    // Vérifier si l'app est déjà installée
    this.isInstalled = this.isAppInstalled()
    
    // Vérifier si l'app peut être installée
    this.isInstallable = this.canInstallApp()
    
    console.log('📱 État d\'installation:', {
      isInstalled: this.isInstalled,
      isInstallable: this.isInstallable
    })
  }

  /**
   * Vérifie si l'app est installée
   */
  isAppInstalled() {
    // Vérifier le mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true
    }
    
    // Vérifier si l'app est lancée depuis l'écran d'accueil (iOS)
    if (window.navigator.standalone === true) {
      return true
    }
    
    // Vérifier les paramètres sauvegardés
    const savedState = this.getInstallationState()
    return savedState.isInstalled || false
  }

  /**
   * Vérifie si l'app peut être installée
   */
  canInstallApp() {
    return this.deferredPrompt !== null
  }

  /**
   * Détecte le mode standalone
   */
  detectStandaloneMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true
    
    if (isStandalone && !this.isInstalled) {
      this.isInstalled = true
      this.saveInstallationState()
      this.dispatchInstallEvent('installed')
    }
  }

  /**
   * Affiche le prompt d'installation
   * Cette méthode doit être appelée en réponse à une action utilisateur
   * (clique sur un bouton) pour éviter l'avertissement du navigateur
   */
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      console.warn('⚠️ Prompt d\'installation non disponible. L\'app peut déjà être installée ou le navigateur ne supporte pas l\'installation.')
      throw new Error('Prompt d\'installation non disponible')
    }

    try {
      console.log('📱 Affichage du prompt d\'installation natif...')
      // Afficher le prompt natif (cela résout l'avertissement du navigateur)
      this.deferredPrompt.prompt()
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await this.deferredPrompt.userChoice
      
      console.log('📱 Résultat du prompt d\'installation:', outcome)
      
      if (outcome === 'accepted') {
        console.log('✅ Utilisateur a accepté l\'installation')
        this.installPromptShown = true
        this.dispatchInstallEvent('prompt-accepted')
      } else {
        console.log('❌ Utilisateur a refusé l\'installation')
        this.installPromptDismissed = true
        this.dispatchInstallEvent('prompt-dismissed')
      }
      
      // Nettoyer le prompt (important pour éviter les fuites mémoire)
      this.deferredPrompt = null
      this.isInstallable = false
      
      // Sauvegarder l'état
      this.saveInstallationState()
      
      return outcome
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage du prompt d\'installation:', error)
      // Nettoyer le prompt même en cas d'erreur
      this.deferredPrompt = null
      this.isInstallable = false
      throw error
    }
  }

  /**
   * Affiche un guide d'installation personnalisé
   */
  showInstallGuide() {
    const userAgent = navigator.userAgent.toLowerCase()
    let guide = null

    if (userAgent.includes('chrome') || userAgent.includes('edge')) {
      guide = this.getChromeInstallGuide()
    } else if (userAgent.includes('firefox')) {
      guide = this.getFirefoxInstallGuide()
    } else if (userAgent.includes('safari')) {
      guide = this.getSafariInstallGuide()
    } else {
      guide = this.getGenericInstallGuide()
    }

    this.dispatchInstallEvent('show-guide', { guide })
    return guide
  }

  /**
   * Guide d'installation pour Chrome/Edge
   */
  getChromeInstallGuide() {
    return {
      title: 'Installer TeachDigital',
      steps: [
        {
          icon: '🔽',
          text: 'Cliquez sur l\'icône "Installer" dans la barre d\'adresse'
        },
        {
          icon: '📱',
          text: 'Ou utilisez le menu (⋮) > "Installer TeachDigital"'
        },
        {
          icon: '✅',
          text: 'Confirmez l\'installation dans la popup'
        }
      ],
      browser: 'Chrome/Edge'
    }
  }

  /**
   * Guide d'installation pour Firefox
   */
  getFirefoxInstallGuide() {
    return {
      title: 'Installer TeachDigital',
      steps: [
        {
          icon: '➕',
          text: 'Cliquez sur l\'icône "+" dans la barre d\'adresse'
        },
        {
          icon: '📱',
          text: 'Ou utilisez le menu (☰) > "Installer"'
        },
        {
          icon: '✅',
          text: 'Confirmez l\'installation'
        }
      ],
      browser: 'Firefox'
    }
  }

  /**
   * Guide d'installation pour Safari (iOS)
   */
  getSafariInstallGuide() {
    return {
      title: 'Ajouter à l\'écran d\'accueil',
      steps: [
        {
          icon: '📤',
          text: 'Appuyez sur le bouton de partage (📤)'
        },
        {
          icon: '🏠',
          text: 'Sélectionnez "Ajouter à l\'écran d\'accueil"'
        },
        {
          icon: '✏️',
          text: 'Modifiez le nom si souhaité'
        },
        {
          icon: '✅',
          text: 'Appuyez sur "Ajouter"'
        }
      ],
      browser: 'Safari (iOS)'
    }
  }

  /**
   * Guide d'installation générique
   */
  getGenericInstallGuide() {
    return {
      title: 'Installer TeachDigital',
      steps: [
        {
          icon: '🔍',
          text: 'Recherchez l\'option "Installer" dans votre navigateur'
        },
        {
          icon: '📱',
          text: 'Suivez les instructions pour ajouter l\'app à votre écran d\'accueil'
        },
        {
          icon: '✅',
          text: 'Lancez l\'app depuis votre écran d\'accueil'
        }
      ],
      browser: 'Générique'
    }
  }

  /**
   * Vérifie si l'utilisateur a déjà vu le prompt
   */
  hasSeenInstallPrompt() {
    const state = this.getInstallationState()
    return state.promptShown || state.promptDismissed
  }

  /**
   * Détermine si le prompt doit être affiché
   */
  shouldShowInstallPrompt() {
    // Ne pas afficher si déjà installé
    if (this.isInstalled) {
      return false
    }

    // Ne pas afficher si pas installable
    if (!this.isInstallable) {
      return false
    }

    // Ne pas afficher si déjà vu
    if (this.hasSeenInstallPrompt()) {
      return false
    }

    // Vérifier les conditions d'affichage
    return this.checkInstallConditions()
  }

  /**
   * Vérifie les conditions d'affichage du prompt
   */
  checkInstallConditions() {
    // Attendre que l'utilisateur ait interagi avec l'app
    const sessionTime = Date.now() - (window.sessionStartTime || Date.now())
    const minSessionTime = 30 * 1000 // 30 secondes

    if (sessionTime < minSessionTime) {
      return false
    }

    // Vérifier le nombre de visites
    const visitCount = this.getVisitCount()
    if (visitCount < 2) {
      return false
    }

    // Vérifier si l'utilisateur a effectué des actions significatives
    const hasSignificantActivity = this.hasSignificantActivity()
    if (!hasSignificantActivity) {
      return false
    }

    return true
  }

  /**
   * Vérifie si l'utilisateur a effectué des actions significatives
   */
  hasSignificantActivity() {
    const state = this.getInstallationState()
    return state.hasCreatedProfile || 
           state.hasCompletedQuiz || 
           state.hasViewedLessons ||
           state.sessionCount > 3
  }

  /**
   * Incrémente le compteur de visites
   */
  incrementVisitCount() {
    const state = this.getInstallationState()
    state.visitCount = (state.visitCount || 0) + 1
    state.lastVisit = Date.now()
    this.saveInstallationState(state)
  }

  /**
   * Marque une activité significative
   */
  markSignificantActivity(activityType) {
    const state = this.getInstallationState()
    
    switch (activityType) {
      case 'profile_created':
        state.hasCreatedProfile = true
        break
      case 'quiz_completed':
        state.hasCompletedQuiz = true
        break
      case 'lessons_viewed':
        state.hasViewedLessons = true
        break
    }
    
    this.saveInstallationState(state)
  }

  /**
   * Sauvegarde l'état d'installation
   */
  saveInstallationState(customState = null) {
    const state = customState || this.getInstallationState()
    
    state.isInstalled = this.isInstalled
    state.promptShown = this.installPromptShown
    state.promptDismissed = this.installPromptDismissed
    state.lastUpdated = Date.now()
    
    try {
      localStorage.setItem('teachdigital_install_state', JSON.stringify(state))
    } catch (error) {
      console.warn('Impossible de sauvegarder l\'état d\'installation:', error)
    }
  }

  /**
   * Récupère l'état d'installation
   */
  getInstallationState() {
    try {
      const stored = localStorage.getItem('teachdigital_install_state')
      return stored ? JSON.parse(stored) : {
        isInstalled: false,
        promptShown: false,
        promptDismissed: false,
        visitCount: 0,
        sessionCount: 0,
        hasCreatedProfile: false,
        hasCompletedQuiz: false,
        hasViewedLessons: false,
        lastVisit: null,
        lastUpdated: null
      }
    } catch (error) {
      console.warn('Impossible de charger l\'état d\'installation:', error)
      return {
        isInstalled: false,
        promptShown: false,
        promptDismissed: false,
        visitCount: 0,
        sessionCount: 0,
        hasCreatedProfile: false,
        hasCompletedQuiz: false,
        hasViewedLessons: false,
        lastVisit: null,
        lastUpdated: null
      }
    }
  }

  /**
   * Récupère le nombre de visites
   */
  getVisitCount() {
    const state = this.getInstallationState()
    return state.visitCount || 0
  }

  /**
   * Déclenche un événement personnalisé
   */
  dispatchInstallEvent(eventType, detail = {}) {
    const event = new CustomEvent('install-event', {
      detail: {
        type: eventType,
        ...detail
      }
    })
    window.dispatchEvent(event)
  }

  /**
   * Obtient les statistiques d'installation
   */
  getStats() {
    const state = this.getInstallationState()
    
    return {
      isInstalled: this.isInstalled,
      isInstallable: this.isInstallable,
      hasSeenPrompt: this.hasSeenInstallPrompt(),
      shouldShowPrompt: this.shouldShowInstallPrompt(),
      visitCount: state.visitCount || 0,
      sessionCount: state.sessionCount || 0,
      hasSignificantActivity: this.hasSignificantActivity(),
      lastVisit: state.lastVisit,
      userAgent: navigator.userAgent,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
    }
  }

  /**
   * Réinitialise l'état d'installation (pour les tests)
   */
  resetInstallationState() {
    localStorage.removeItem('teachdigital_install_state')
    this.isInstalled = false
    this.installPromptShown = false
    this.installPromptDismissed = false
    this.deferredPrompt = null
    this.isInstallable = false
  }
}

// Instance singleton
const installService = new InstallService()

// Initialiser le temps de session
window.sessionStartTime = Date.now()

// Incrémenter le compteur de visites au chargement
installService.incrementVisitCount()

export default installService
export { InstallService }
