/**
 * Installation de la PWA (carte « Installer l'application » des paramètres parent).
 *
 * Chargé dynamiquement par main.js au démarrage (hors du bundle initial).
 * L'événement beforeinstallprompt est conservé pour pouvoir appeler prompt() depuis le bouton,
 * mais preventDefault() — qui supprime la bannière d'installation native de Chrome — n'est
 * appelé que si l'interface d'installation est affichée au moment où l'événement arrive.
 */

import { reactive, readonly } from 'vue'

const state = reactive({
  // Le navigateur a fourni un prompt d'installation utilisable
  canPrompt: false,
  // Application lancée en mode installé (écran d'accueil)
  isInstalled: false,
  // Nombre d'interfaces d'installation affichées
  visibleUiCount: 0
})

let deferredPrompt = null
let initialized = false

function detectInstalled () {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

function onBeforeInstallPrompt (event) {
  // Interface visible : éviter la bannière native en double
  if (state.visibleUiCount > 0) {
    event.preventDefault()
  }
  deferredPrompt = event
  state.canPrompt = true
}

function onAppInstalled () {
  deferredPrompt = null
  state.canPrompt = false
  state.isInstalled = true
}

/**
 * Écouter les événements d'installation (idempotent)
 */
export function initInstallService () {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  state.isInstalled = detectInstalled()
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
}

/**
 * Signaler qu'une interface d'installation est affichée
 * @returns {Function} à appeler quand l'interface disparaît
 */
export function registerInstallUi () {
  initInstallService()
  state.visibleUiCount++
  let released = false
  return () => {
    if (released) return
    released = true
    state.visibleUiCount = Math.max(0, state.visibleUiCount - 1)
  }
}

/**
 * Afficher le prompt d'installation natif (à appeler depuis un clic)
 * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
 */
export async function promptInstall () {
  if (!deferredPrompt) return 'unavailable'
  const event = deferredPrompt
  // Un prompt ne sert qu'une fois
  deferredPrompt = null
  state.canPrompt = false
  await event.prompt()
  const choice = await event.userChoice
  if (choice?.outcome === 'accepted') {
    state.isInstalled = true
    return 'accepted'
  }
  return 'dismissed'
}

/**
 * Consignes d'installation manuelle selon le navigateur
 * @returns {{ browser: string, steps: string[] }}
 */
export function getInstallGuide () {
  const ua = (navigator.userAgent || '').toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIOS) {
    return {
      browser: 'Safari (iPhone / iPad)',
      steps: [
        'Ouvrez TeachDigital dans Safari.',
        'Touchez le bouton Partager (carré avec une flèche vers le haut).',
        'Choisissez « Sur l\'écran d\'accueil », puis « Ajouter ».'
      ]
    }
  }
  if (ua.includes('firefox') && !ua.includes('android')) {
    return {
      browser: 'Firefox',
      steps: [
        'Firefox pour ordinateur ne permet pas d\'installer l\'application.',
        'Ouvrez TeachDigital dans Chrome, Edge ou Safari pour l\'installer.'
      ]
    }
  }
  if (ua.includes('android')) {
    return {
      browser: 'Android',
      steps: [
        'Ouvrez le menu du navigateur (⋮).',
        'Choisissez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».'
      ]
    }
  }
  return {
    browser: 'Chrome / Edge',
    steps: [
      'Cliquez sur l\'icône d\'installation à droite de la barre d\'adresse,',
      'ou ouvrez le menu (⋮) puis « Installer TeachDigital ».'
    ]
  }
}

export const installState = readonly(state)

export default {
  init: initInstallService,
  registerInstallUi,
  promptInstall,
  getInstallGuide,
  state: installState
}
