import { defineStore } from 'pinia'
import { APP_THEMES, DEFAULT_THEME_ID, getAppTheme, isAppThemeId } from '../themes/index.js'

/**
 * Thèmes de l'application (registre : src/themes/index.js, styles : src/styles/themes/).
 *
 * - Thème de la famille : choisi par le parent (page « Thèmes de l'application »). Il habille le
 *   code familial, le choix du profil et l'espace parent, et sert de thème par défaut aux enfants.
 * - Thème d'un profil enfant/ado : attribué par le parent, ou choisi par l'enfant dans
 *   « Mes paramètres » si le parent l'y autorise (childChoice). Absent : thème de la famille.
 *
 * Le thème actif est posé sur <html> (data-app-theme) et dans <meta name="theme-color">.
 * Tout est enregistré sur l'appareil (localStorage), comme les préférences d'affichage ; le
 * dernier thème appliqué (applied) est relu par public/theme-boot.js avant le premier rendu.
 */

export const THEME_STORAGE_KEY = 'teachdigital_theme'

const DEFAULT_STATE = Object.freeze({
  family: DEFAULT_THEME_ID,
  profiles: Object.freeze({}),
  childChoice: true
})

function isProfileId (profileId) {
  return profileId !== undefined && profileId !== null && profileId !== ''
}

// Clé de profil acceptée dans l'état enregistré (jamais __proto__ ni constructor…)
const PROFILE_KEY = /^[A-Za-z0-9_-]{1,64}$/
function isProfileKey (key) {
  return PROFILE_KEY.test(key) && !(key in Object.prototype)
}

// Thème attribué en propre à un profil, ou null
function ownThemeOf (profiles, profileId) {
  if (!isProfileId(profileId)) return null
  const key = String(profileId)
  return Object.hasOwn(profiles, key) ? profiles[key] : null
}

/**
 * Valider un état enregistré (thèmes inconnus ignorés, valeurs par défaut sinon)
 * @param {Object} raw
 * @returns {{ family: string, profiles: Object<string, string>, childChoice: boolean }}
 */
export function normalizeThemeState (raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const profiles = {}
  if (source.profiles && typeof source.profiles === 'object') {
    for (const [profileId, themeId] of Object.entries(source.profiles)) {
      if (isProfileKey(profileId) && isAppThemeId(themeId)) profiles[profileId] = themeId
    }
  }
  return {
    family: isAppThemeId(source.family) ? source.family : DEFAULT_STATE.family,
    profiles,
    childChoice: typeof source.childChoice === 'boolean' ? source.childChoice : DEFAULT_STATE.childChoice
  }
}

/**
 * Thème qui s'applique à un profil (null : hors espace enfant → thème de la famille)
 * @param {{ family: string, profiles: Object<string, string> }} state
 * @param {string|number|null} profileId
 * @returns {string}
 */
export function resolveThemeId (state, profileId = null) {
  const { family, profiles } = normalizeThemeState(state)
  return ownThemeOf(profiles, profileId) || family
}

// Fondu enchaîné (View Transitions API) sauf si l'utilisateur demande moins d'animations
function canAnimate () {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return false
  if (document.documentElement.classList.contains('td-reduce-motion')) return false
  return !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

/**
 * Appliquer un thème au document : data-app-theme sur <html> et couleur de la barre d'état
 * @param {string} themeId
 * @param {{ root?: HTMLElement, animate?: boolean }} [options]
 * @returns {import('../themes/index.js').AppTheme} le thème appliqué
 */
export function applyThemeToDocument (themeId, { root = (typeof document !== 'undefined' ? document.documentElement : null), animate = false } = {}) {
  const theme = getAppTheme(themeId)
  if (!root) return theme

  const update = () => {
    root.setAttribute('data-app-theme', theme.id)
    const meta = root.ownerDocument?.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme.themeColor)
  }
  // Thème déjà en place (posé par public/theme-boot.js, par exemple) : pas de fondu
  if (animate && canAnimate() && root.getAttribute('data-app-theme') !== theme.id) {
    document.startViewTransition(update)
  } else {
    update()
  }
  return theme
}

function readStorage () {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStorage (value) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Stockage indisponible : le thème reste actif pour cette session
  }
}

let storageListener = null

export const useThemeStore = defineStore('theme', {
  state: () => ({
    ...normalizeThemeState(readStorage()),
    // Profil enfant/ado dont l'espace est affiché (null : thème de la famille)
    activeProfileId: null
  }),

  getters: {
    themes: () => APP_THEMES,
    familyTheme: (state) => getAppTheme(state.family),
    activeThemeId: (state) => resolveThemeId(state, state.activeProfileId),
    activeTheme () {
      return getAppTheme(this.activeThemeId)
    }
  },

  actions: {
    /**
     * Thème attribué en propre à un profil (null : il suit le thème de la famille)
     * @param {string|number} profileId
     * @returns {string|null}
     */
    profileThemeId (profileId) {
      return ownThemeOf(this.profiles, profileId)
    },

    /**
     * Thème effectif d'un profil (le sien, sinon celui de la famille)
     * @param {string|number|null} profileId
     */
    themeForProfile (profileId) {
      return getAppTheme(resolveThemeId(this.$state, profileId))
    },

    /**
     * Choisir le thème de la famille
     * @param {string} themeId
     * @param {{ animate?: boolean }} [options] - fondu enchaîné (choix explicite de l'utilisateur)
     */
    setFamilyTheme (themeId, { animate = false } = {}) {
      if (!isAppThemeId(themeId)) return
      this.family = themeId
      this.apply({ animate })
    },

    /**
     * Attribuer un thème à un profil (null : revenir au thème de la famille)
     * @param {string|number} profileId
     * @param {string|null} themeId
     * @param {{ animate?: boolean }} [options]
     */
    setProfileTheme (profileId, themeId, { animate = false } = {}) {
      if (!isProfileId(profileId) || !isProfileKey(String(profileId))) return
      const id = String(profileId)
      const profiles = { ...this.profiles }
      if (isAppThemeId(themeId)) {
        profiles[id] = themeId
      } else {
        delete profiles[id]
      }
      this.profiles = profiles
      this.apply({ animate })
    },

    /**
     * Autoriser (ou non) les enfants à changer leur thème dans « Mes paramètres ».
     * Les thèmes déjà attribués restent appliqués.
     * @param {boolean} allowed
     */
    setChildChoice (allowed) {
      this.childChoice = !!allowed
      this.persist()
    },

    /**
     * Tout remettre par défaut : thème Liquid Glass partout, choix laissé aux enfants
     */
    resetAll ({ animate = false } = {}) {
      this.family = DEFAULT_STATE.family
      this.profiles = {}
      this.childChoice = DEFAULT_STATE.childChoice
      this.apply({ animate })
    },

    /**
     * Changer de profil actif (null : hors espace enfant) et appliquer son thème
     * @param {string|number|null} profileId
     */
    setActiveProfile (profileId) {
      this.activeProfileId = isProfileId(profileId) ? String(profileId) : null
      this.apply()
    },

    /**
     * Appliquer le thème actif au document et l'enregistrer
     * @param {{ animate?: boolean, persist?: boolean }} [options] - persist: false lors d'une
     *   synchronisation depuis un autre onglet (sinon les onglets se répondraient sans fin)
     */
    apply ({ animate = false, persist = true } = {}) {
      applyThemeToDocument(this.activeThemeId, { animate })
      if (persist) this.persist()
    },

    persist () {
      const theme = this.activeTheme
      writeStorage({
        family: this.family,
        profiles: this.profiles,
        childChoice: this.childChoice,
        // Lus par public/theme-boot.js au prochain chargement
        applied: theme.id,
        appliedColor: theme.themeColor
      })
    },

    /**
     * Démarrage : garder le thème posé par public/theme-boot.js jusqu'à ce que la route soit
     * connue (App.vue appelle alors setActiveProfile), sinon appliquer celui de la famille ;
     * puis suivre les changements faits dans les autres onglets
     */
    initialize () {
      const current = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-app-theme') : null
      if (!isAppThemeId(current)) this.apply({ persist: false })
      if (typeof window === 'undefined') return
      if (storageListener) window.removeEventListener('storage', storageListener)
      storageListener = (event) => {
        if (event.key !== THEME_STORAGE_KEY) return
        let next = {}
        try {
          next = event.newValue ? JSON.parse(event.newValue) : {}
        } catch {
          return
        }
        // Affectation (et non $patch, qui fusionnerait : un thème retiré ailleurs resterait ici)
        const { family, profiles, childChoice } = normalizeThemeState(next)
        this.family = family
        this.profiles = profiles
        this.childChoice = childChoice
        this.apply({ persist: false })
      }
      window.addEventListener('storage', storageListener)
    }
  }
})
