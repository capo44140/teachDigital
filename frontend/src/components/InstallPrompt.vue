<template>
  <div v-if="showPrompt" class="install-prompt-overlay">
    <div class="install-prompt">
      <div class="prompt-header">
        <div class="app-icon">
          <img src="/icons/icon-192x192.png" alt="TeachDigital" />
        </div>
        <div class="app-info">
          <h3>Installer TeachDigital</h3>
          <p>Accédez rapidement à votre application d'apprentissage</p>
        </div>
        <button class="close-button" aria-label="Fermer" @click="dismissPrompt">
          ✕
        </button>
      </div>

      <div class="prompt-content">
        <div class="benefits">
          <div class="benefit-item">
            <span class="benefit-icon">⚡</span>
            <span>Lancement rapide</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📱</span>
            <span>Accès depuis l'écran d'accueil</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🔄</span>
            <span>Fonctionne hors ligne</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🔔</span>
            <span>Notifications push</span>
          </div>
        </div>

        <div class="prompt-actions">
          <button class="install-button" :disabled="isInstalling" @click="installApp">
            <span v-if="isInstalling">Installation...</span>
            <span v-else>Installer maintenant</span>
          </button>
          <button class="guide-button" @click="showInstallGuide">
            Comment installer ?
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Guide d'installation -->
  <div v-if="showGuide" class="install-guide-overlay">
    <div class="install-guide">
      <div class="guide-header">
        <h3>{{ installGuide.title }}</h3>
        <button class="close-button" aria-label="Fermer" @click="hideInstallGuide">
          ✕
        </button>
      </div>

      <div class="guide-content">
        <div class="browser-info">
          <span class="browser-badge">{{ installGuide.browser }}</span>
        </div>

        <div class="guide-steps">
          <div 
            v-for="(step, index) in installGuide.steps" 
            :key="index"
            class="guide-step"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <div class="step-icon">{{ step.icon }}</div>
              <div class="step-text">{{ step.text }}</div>
            </div>
          </div>
        </div>

        <div class="guide-footer">
          <button class="got-it-button" @click="hideInstallGuide">
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Bouton d'installation flottant -->
  <div v-if="showFloatingButton" class="floating-install-button">
    <button class="floating-button" title="Installer l'application" @click="showInstallPrompt">
      <span class="button-icon">📱</span>
      <span class="button-text">Installer</span>
    </button>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import installService from '../services/installService.js'

export default {
  name: 'InstallPrompt',
  setup() {
    const showPrompt = ref(false)
    const showGuide = ref(false)
    const showFloatingButton = ref(false)
    const isInstalling = ref(false)
    const installGuide = ref(null)
    const installEventListeners = []

    // Vérifier si le prompt doit être affiché
    const shouldShowPrompt = computed(() => {
      return installService.shouldShowInstallPrompt()
    })

    // Initialiser le composant
    onMounted(() => {
      // Écouter les événements d'installation
      const handleInstallEvent = (event) => {
        const { type, detail } = event.detail
        
        switch (type) {
          case 'installable':
            checkAndShowPrompt()
            break
          case 'installed':
            hidePrompt()
            hideFloatingButton()
            break
          case 'prompt-dismissed':
            hidePrompt()
            showFloatingButton.value = true
            break
          case 'show-guide':
            showInstallGuideModal(detail.guide)
            break
        }
      }

      window.addEventListener('install-event', handleInstallEvent)
      installEventListeners.push(() => {
        window.removeEventListener('install-event', handleInstallEvent)
      })

      // Vérifier l'état initial
      checkAndShowPrompt()
    })

    // Nettoyer les écouteurs
    onUnmounted(() => {
      installEventListeners.forEach(cleanup => cleanup())
    })

    // Vérifier et afficher le prompt
    const checkAndShowPrompt = () => {
      if (shouldShowPrompt.value) {
        // Délai pour une meilleure UX
        setTimeout(() => {
          showPrompt.value = true
        }, 2000)
      }
    }

    // Installer l'application
    const installApp = async () => {
      isInstalling.value = true
      
      try {
        const outcome = await installService.showInstallPrompt()
        
        if (outcome === 'accepted') {
          hidePrompt()
          // Le prompt sera automatiquement fermé par l'événement 'installed'
        } else {
          hidePrompt()
          showFloatingButton.value = true
        }
      } catch (error) {
        console.error('Erreur lors de l\'installation:', error)
        // Afficher le guide d'installation en cas d'erreur
        showInstallGuide()
      } finally {
        isInstalling.value = false
      }
    }

    // Afficher le guide d'installation
    const showInstallGuide = () => {
      const guide = installService.showInstallGuide()
      showInstallGuideModal(guide)
    }

    // Afficher le modal du guide
    const showInstallGuideModal = (guide) => {
      installGuide.value = guide
      showGuide.value = true
      hidePrompt()
    }

    // Masquer le guide
    const hideInstallGuide = () => {
      showGuide.value = false
      installGuide.value = null
    }

    // Masquer le prompt
    const hidePrompt = () => {
      showPrompt.value = false
    }

    // Afficher le prompt d'installation
    const showInstallPrompt = () => {
      if (installService.canInstallApp()) {
        showPrompt.value = true
        showFloatingButton.value = false
      } else {
        showInstallGuide()
      }
    }

    // Masquer le bouton flottant
    const hideFloatingButton = () => {
      showFloatingButton.value = false
    }

    // Rejeter le prompt
    const dismissPrompt = () => {
      hidePrompt()
      showFloatingButton.value = true
      installService.installPromptDismissed = true
      installService.saveInstallationState()
    }

    return {
      showPrompt,
      showGuide,
      showFloatingButton,
      isInstalling,
      installGuide,
      installApp,
      showInstallGuide,
      hideInstallGuide,
      showInstallPrompt,
      dismissPrompt
    }
  }
}
</script>

<style scoped>
.install-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.install-prompt {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 100%;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prompt-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

.app-icon {
  width: 48px;
  height: 48px;
  margin-right: 12px;
  flex-shrink: 0;
}

.app-icon img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.app-info {
  flex: 1;
}

.app-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
}

.app-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.close-button:hover {
  background: #f3f4f6;
}

.prompt-content {
  padding: 20px;
}

.benefits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #374151;
}

.benefit-icon {
  font-size: 1.1rem;
}

.prompt-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.install-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.install-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.install-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.guide-button {
  background: none;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.guide-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.install-guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 20px;
}

.install-guide {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

.guide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.guide-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #111827;
}

.guide-content {
  padding: 20px;
}

.browser-info {
  margin-bottom: 20px;
  text-align: center;
}

.browser-badge {
  background: #3b82f6;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  background: #3b82f6;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.step-text {
  font-size: 0.95rem;
  color: #374151;
  line-height: 1.4;
}

.guide-footer {
  text-align: center;
}

.got-it-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.got-it-button:hover {
  background: #2563eb;
}

.floating-install-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
}

.floating-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-3px);
  }
}

.floating-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.button-icon {
  font-size: 1.1rem;
}

.button-text {
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .install-prompt-overlay,
  .install-guide-overlay {
    padding: 10px;
  }
  
  .benefits {
    grid-template-columns: 1fr;
  }
  
  .floating-button {
    padding: 10px 16px;
  }
  
  .button-text {
    display: none;
  }
}
</style>
