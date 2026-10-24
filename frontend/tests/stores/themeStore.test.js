import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { APP_THEMES, DEFAULT_THEME_ID, getAppTheme, isAppThemeId } from '../../src/themes/index.js'
import { CHILD_THEMES } from '../../src/stores/settingsStore.js'
import {
  useThemeStore,
  normalizeThemeState,
  resolveThemeId,
  applyThemeToDocument,
  THEME_STORAGE_KEY
} from '../../src/stores/themeStore.js'

const root = document.documentElement
const appliedTheme = () => root.getAttribute('data-app-theme')
const themeColor = () => document.querySelector('meta[name="theme-color"]').getAttribute('content')
const stored = () => JSON.parse(localStorage.getItem(THEME_STORAGE_KEY))

describe('registre des thèmes', () => {
  it('propose le thème d\'origine par défaut, puis les thèmes des séries et de la Formule 1', () => {
    expect(APP_THEMES.map(theme => theme.id)).toEqual([
      'liquid-glass', 'netflix', 'paw-patrol', 'desperate-housewives', 'one-tree-hill', 'formula-1'
    ])
    expect(DEFAULT_THEME_ID).toBe('liquid-glass')
    expect(new Set(APP_THEMES.map(theme => theme.id)).size).toBe(APP_THEMES.length)
  })

  it('décrit chaque thème complètement (nom, aperçu, couleur de la barre d\'état)', () => {
    for (const theme of APP_THEMES) {
      expect(theme.name && theme.emoji && theme.tagline && theme.description).toBeTruthy()
      expect(theme.themeColor).toMatch(/^#[0-9A-F]{6}$/i)
      for (const key of ['background', 'surface', 'border', 'accent', 'text', 'radius', 'font', 'titleFont', 'titleWeight']) {
        expect(theme.preview[key], `${theme.id}.preview.${key}`).toBeTruthy()
      }
    }
  })

  it('retombe sur le thème par défaut pour un identifiant inconnu', () => {
    expect(getAppTheme('disco').id).toBe(DEFAULT_THEME_ID)
    expect(getAppTheme(undefined).id).toBe(DEFAULT_THEME_ID)
    expect(isAppThemeId('netflix')).toBe(true)
    expect(isAppThemeId('constructor')).toBe(false)
    expect(isAppThemeId(null)).toBe(false)
  })

  it.each([
    ['paw-patrol', 'un chiot'],
    ['formula-1', 'une écurie']
  ])('%s : %s pour chaque couleur préférée proposée à l\'enfant', (themeId) => {
    const { options } = getAppTheme(themeId).tones
    for (const tone of CHILD_THEMES) {
      expect(options[tone.id], tone.id).toMatchObject({ name: expect.any(String), emoji: expect.any(String), swatch: expect.any(String) })
    }
  })

  it('les autres thèmes ignorent la couleur préférée, ou gardent les couleurs d\'origine', () => {
    for (const themeId of ['netflix', 'desperate-housewives', 'one-tree-hill']) {
      expect(getAppTheme(themeId).tones, themeId).toBeNull()
    }
    expect(getAppTheme('liquid-glass').tones.options).toBeUndefined()
  })
})

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    root.removeAttribute('data-app-theme')
    root.className = ''
    document.head.innerHTML = '<meta name="theme-color" content="#4C1D95">'
    setActivePinia(createPinia())
  })

  afterEach(() => {
    delete document.startViewTransition
  })

  it('normalise un état enregistré (thèmes et clés inconnus ignorés, valeurs par défaut)', () => {
    expect(normalizeThemeState(null)).toEqual({ family: 'liquid-glass', profiles: {}, childChoice: true })
    expect(normalizeThemeState(JSON.parse('{"family":"disco","childChoice":"oui","profiles":{"2":"netflix","3":"disco","__proto__":"netflix","constructor":"netflix"}}')))
      .toEqual({ family: 'liquid-glass', profiles: { 2: 'netflix' }, childChoice: true })
  })

  it('résout le thème d\'un profil : le sien, sinon celui de la famille', () => {
    const state = { family: 'netflix', profiles: { 2: 'paw-patrol' } }
    expect(resolveThemeId(state, 2)).toBe('paw-patrol')
    expect(resolveThemeId(state, '2')).toBe('paw-patrol')
    expect(resolveThemeId(state, '3')).toBe('netflix')
    expect(resolveThemeId(state, null)).toBe('netflix')
    expect(resolveThemeId(state, 'constructor')).toBe('netflix')
  })

  it('applique le thème de la famille hors de l\'espace enfant, celui de l\'enfant dans son espace', () => {
    const store = useThemeStore()
    store.initialize()
    expect(appliedTheme()).toBe('liquid-glass')
    expect(themeColor()).toBe('#4C1D95')

    store.setFamilyTheme('netflix')
    expect(appliedTheme()).toBe('netflix')
    expect(themeColor()).toBe('#141414')

    // Thème attribué à l'enfant 2 : appliqué seulement dans son espace
    store.setProfileTheme(2, 'paw-patrol')
    expect(appliedTheme()).toBe('netflix')
    store.setActiveProfile('2')
    expect(appliedTheme()).toBe('paw-patrol')
    expect(store.activeTheme.id).toBe('paw-patrol')

    // Un enfant sans thème propre suit la famille
    store.setActiveProfile(3)
    expect(appliedTheme()).toBe('netflix')

    // Retrait du thème propre : retour au thème de la famille
    store.setActiveProfile('2')
    store.setProfileTheme('2', null)
    expect(appliedTheme()).toBe('netflix')
    expect(store.profileThemeId('2')).toBeNull()
  })

  it('au démarrage, garde le thème posé par public/theme-boot.js jusqu\'à ce que la route soit connue', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ family: 'netflix', profiles: { 2: 'paw-patrol' }, applied: 'paw-patrol' }))
    root.setAttribute('data-app-theme', 'paw-patrol')
    const store = useThemeStore()

    store.initialize()
    // Pas de passage par le thème de la famille (le fond changerait le temps de charger la page)
    expect(appliedTheme()).toBe('paw-patrol')

    store.setActiveProfile('2')
    expect(appliedTheme()).toBe('paw-patrol')
    store.setActiveProfile(null)
    expect(appliedTheme()).toBe('netflix')
  })

  it('enregistre les choix et le dernier thème appliqué, relus au démarrage suivant', () => {
    const store = useThemeStore()
    store.setFamilyTheme('desperate-housewives')
    store.setProfileTheme('2', 'paw-patrol')
    store.setActiveProfile('2')

    expect(stored()).toEqual({
      family: 'desperate-housewives',
      profiles: { 2: 'paw-patrol' },
      childChoice: true,
      // Relus par public/theme-boot.js avant le premier rendu
      applied: 'paw-patrol',
      appliedColor: '#0D47A1'
    })

    setActivePinia(createPinia())
    const reloaded = useThemeStore()
    expect(reloaded.familyTheme.id).toBe('desperate-housewives')
    expect(reloaded.themeForProfile('2').id).toBe('paw-patrol')
    expect(reloaded.themeForProfile('3').id).toBe('desperate-housewives')
  })

  it('ignore un thème inconnu', () => {
    const store = useThemeStore()
    store.setFamilyTheme('netflix')
    store.setFamilyTheme('disco')
    store.setProfileTheme('constructor', 'paw-patrol')
    expect(store.family).toBe('netflix')
    expect(store.profiles).toEqual({})
  })

  it('interdire le choix aux enfants garde les thèmes déjà attribués', () => {
    const store = useThemeStore()
    store.setProfileTheme('2', 'netflix')
    store.setChildChoice(false)

    expect(store.childChoice).toBe(false)
    expect(stored().childChoice).toBe(false)
    expect(store.themeForProfile('2').id).toBe('netflix')
  })

  it('remet tout au thème d\'origine', () => {
    const store = useThemeStore()
    store.setFamilyTheme('netflix')
    store.setProfileTheme('2', 'paw-patrol')
    store.setChildChoice(false)

    store.resetAll()

    expect(store.family).toBe('liquid-glass')
    expect(store.profiles).toEqual({})
    expect(store.childChoice).toBe(true)
    expect(appliedTheme()).toBe('liquid-glass')
  })

  it('suit les changements d\'un autre onglet sans réécrire le stockage', () => {
    const store = useThemeStore()
    store.initialize()
    localStorage.setItem.mockClear()

    window.dispatchEvent(new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: JSON.stringify({ family: 'netflix', profiles: { 2: 'paw-patrol' }, childChoice: false })
    }))

    expect(store.family).toBe('netflix')
    expect(store.childChoice).toBe(false)
    expect(store.themeForProfile('2').id).toBe('paw-patrol')
    expect(appliedTheme()).toBe('netflix')
    // Sinon deux onglets affichant des thèmes différents se répondraient sans fin
    expect(localStorage.setItem).not.toHaveBeenCalled()

    // Thème retiré dans l'autre onglet : retiré ici aussi
    window.dispatchEvent(new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: JSON.stringify({ family: 'netflix', profiles: {}, childChoice: false })
    }))
    expect(store.profileThemeId('2')).toBeNull()

    // Autre clé, ou valeur illisible : ignorées
    window.dispatchEvent(new StorageEvent('storage', { key: 'autre', newValue: '{}' }))
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: '{illisible' }))
    expect(store.family).toBe('netflix')
  })

  it('fondu enchaîné (View Transitions API) pour un choix explicite, sauf animations réduites', () => {
    const startViewTransition = vi.fn((update) => update())
    document.startViewTransition = startViewTransition

    applyThemeToDocument('netflix', { animate: true })
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(appliedTheme()).toBe('netflix')

    // Même thème : rien à animer
    applyThemeToDocument('netflix', { animate: true })
    // Sans animation demandée (navigation) : application directe
    applyThemeToDocument('paw-patrol')
    expect(startViewTransition).toHaveBeenCalledTimes(1)

    // Préférence « animations désactivées » de l'enfant
    root.classList.add('td-reduce-motion')
    applyThemeToDocument('desperate-housewives', { animate: true })
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(appliedTheme()).toBe('desperate-housewives')
  })
})
