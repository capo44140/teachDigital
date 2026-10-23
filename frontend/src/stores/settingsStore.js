import { defineStore } from 'pinia'

/**
 * Préférences d'affichage des profils enfant/ado (page « Mes paramètres »).
 *
 * Elles sont enregistrées par profil (localStorage de l'appareil) et appliquées à toute
 * l'application via des classes sur <html> (voir src/styles/preferences.css) :
 * - td-font-small / td-font-large : taille du texte (rem → toute l'interface suit) ;
 * - td-easy-read : lecture facile (texte plus grand, interlignage et espacement accrus) ;
 * - td-high-contrast : contraste élevé (textes opaques, fonds pleins, sans flou) ;
 * - td-reduce-motion : animations désactivées ;
 * - data-theme : couleur préférée, reprise par le fond animé (AppBackground).
 * Hors de l'espace enfant (pages parent, choix du profil), les valeurs par défaut s'appliquent.
 */

const STORAGE_KEY = 'teachdigital_child_settings'
// Anciennes clés : préférences par profil jamais lues, et paramètres parent fictifs
const LEGACY_CHILD_PREFIX = 'childSettings_'
const DEAD_KEYS = ['parentSettings']

export const FONT_SIZES = ['small', 'normal', 'large']

export const CHILD_THEMES = [
  { id: 'purple', name: 'Violet', emoji: '💜', gradient: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { id: 'blue', name: 'Bleu', emoji: '💙', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
  { id: 'green', name: 'Vert', emoji: '💚', gradient: 'bg-gradient-to-br from-green-500 to-emerald-500' },
  { id: 'orange', name: 'Orange', emoji: '🧡', gradient: 'bg-gradient-to-br from-orange-500 to-red-500' },
  { id: 'yellow', name: 'Jaune', emoji: '💛', gradient: 'bg-gradient-to-br from-yellow-400 to-orange-400' },
  { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈', gradient: 'bg-gradient-to-br from-red-400 via-purple-400 to-blue-400' }
]

const THEME_IDS = CHILD_THEMES.map(theme => theme.id)

export const DEFAULT_CHILD_SETTINGS = Object.freeze({
  // null : couleur de la page (automatique)
  theme: null,
  fontSize: 'normal',
  animations: true,
  easyReadMode: false,
  highContrast: false
})

/**
 * Valider des préférences (valeurs inconnues → valeur par défaut)
 * @param {Object} raw
 * @returns {typeof DEFAULT_CHILD_SETTINGS}
 */
export function normalizeSettings (raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  // Ancien format : selectedTheme
  const theme = source.theme ?? source.selectedTheme ?? null
  return {
    theme: THEME_IDS.includes(theme) ? theme : null,
    fontSize: FONT_SIZES.includes(source.fontSize) ? source.fontSize : DEFAULT_CHILD_SETTINGS.fontSize,
    animations: typeof source.animations === 'boolean' ? source.animations : DEFAULT_CHILD_SETTINGS.animations,
    easyReadMode: typeof source.easyReadMode === 'boolean' ? source.easyReadMode : DEFAULT_CHILD_SETTINGS.easyReadMode,
    highContrast: typeof source.highContrast === 'boolean' ? source.highContrast : DEFAULT_CHILD_SETTINGS.highContrast
  }
}

/**
 * Profil enfant/ado dont les préférences s'appliquent à la page courante, ou null
 * (pages parent, code familial, choix du profil : valeurs par défaut)
 * @param {Object} route - route courante (meta, query)
 * @param {Object|null} selectedProfile - profil choisi sur « Qui est-ce ? »
 * @returns {string|null}
 */
export function resolveActiveChildProfileId (route, selectedProfile = null) {
  if (!route?.meta?.requiresChildOrTeen) return null
  const fromQuery = route.query?.profile ?? route.query?.childId
  if (fromQuery !== undefined && fromQuery !== null && fromQuery !== '') return String(fromQuery)
  if (selectedProfile && (selectedProfile.is_child || selectedProfile.is_teen)) {
    return String(selectedProfile.id)
  }
  return null
}

/**
 * Appliquer des préférences au document (classes + data-theme sur <html>)
 * @param {Object} settings
 * @param {HTMLElement} [root]
 */
export function applySettingsToDocument (settings, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!root) return
  const s = normalizeSettings(settings)
  root.classList.toggle('td-font-small', s.fontSize === 'small')
  root.classList.toggle('td-font-large', s.fontSize === 'large')
  root.classList.toggle('td-easy-read', s.easyReadMode)
  root.classList.toggle('td-high-contrast', s.highContrast)
  root.classList.toggle('td-reduce-motion', !s.animations)
  if (s.theme) {
    root.dataset.theme = s.theme
  } else {
    delete root.dataset.theme
  }
}

function readStorage () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStorage (byProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byProfile))
  } catch {
    // Stockage indisponible : les préférences restent actives pour cette session
  }
}

function readLegacySettings (profileId) {
  try {
    const raw = localStorage.getItem(LEGACY_CHILD_PREFIX + profileId)
    if (!raw) return null
    localStorage.removeItem(LEGACY_CHILD_PREFIX + profileId)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    byProfile: readStorage(),
    activeProfileId: null
  }),

  getters: {
    // Préférences effectivement appliquées (profil actif ou valeurs par défaut)
    activeSettings: (state) => {
      const id = state.activeProfileId
      return id ? normalizeSettings(state.byProfile[id]) : { ...DEFAULT_CHILD_SETTINGS }
    }
  },

  actions: {
    /**
     * Préférences d'un profil (copie modifiable)
     * @param {string|number} profileId
     */
    getSettings (profileId) {
      if (profileId === undefined || profileId === null || profileId === '') {
        return { ...DEFAULT_CHILD_SETTINGS }
      }
      const id = String(profileId)
      if (!this.byProfile[id]) {
        // Reprendre une éventuelle sauvegarde de l'ancien format
        const legacy = readLegacySettings(id)
        if (legacy) {
          this.byProfile = { ...this.byProfile, [id]: normalizeSettings(legacy) }
          writeStorage(this.byProfile)
        }
      }
      return normalizeSettings(this.byProfile[id])
    },

    /**
     * Modifier (et enregistrer) les préférences d'un profil ; appliquées tout de suite
     * si c'est le profil actif
     */
    updateSettings (profileId, changes = {}) {
      const id = String(profileId)
      const next = normalizeSettings({ ...this.getSettings(id), ...changes })
      this.byProfile = { ...this.byProfile, [id]: next }
      writeStorage(this.byProfile)
      if (this.activeProfileId === id) applySettingsToDocument(next)
      return next
    },

    /**
     * Revenir aux valeurs par défaut pour un profil
     */
    resetSettings (profileId) {
      const id = String(profileId)
      const rest = { ...this.byProfile }
      delete rest[id]
      this.byProfile = rest
      writeStorage(this.byProfile)
      if (this.activeProfileId === id) applySettingsToDocument(DEFAULT_CHILD_SETTINGS)
      return { ...DEFAULT_CHILD_SETTINGS }
    },

    /**
     * Changer de profil actif (null : valeurs par défaut) et appliquer ses préférences
     */
    setActiveProfile (profileId) {
      const id = profileId === undefined || profileId === null || profileId === '' ? null : String(profileId)
      this.activeProfileId = id
      applySettingsToDocument(id ? this.getSettings(id) : DEFAULT_CHILD_SETTINGS)
    },

    /**
     * Démarrage : supprimer les anciennes clés jamais lues et appliquer l'état par défaut
     */
    initialize () {
      DEAD_KEYS.forEach((key) => {
        try { localStorage.removeItem(key) } catch { /* rien à nettoyer */ }
      })
      this.setActiveProfile(this.activeProfileId)
    }
  }
})
