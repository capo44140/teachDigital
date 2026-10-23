import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  useSettingsStore,
  normalizeSettings,
  resolveActiveChildProfileId,
  applySettingsToDocument,
  DEFAULT_CHILD_SETTINGS
} from '../../src/stores/settingsStore.js'

const root = document.documentElement

describe('settingsStore - préférences d\'affichage', () => {
  beforeEach(() => {
    localStorage.clear()
    root.className = ''
    delete root.dataset.theme
    setActivePinia(createPinia())
  })

  it('normalise les valeurs inconnues et reprend l\'ancien champ selectedTheme', () => {
    expect(normalizeSettings({ fontSize: 'huge', animations: 'oui', selectedTheme: 'green' })).toEqual({
      ...DEFAULT_CHILD_SETTINGS,
      theme: 'green'
    })
  })

  it('applique les préférences sur <html> (classes + data-theme)', () => {
    applySettingsToDocument({ fontSize: 'large', easyReadMode: true, highContrast: true, animations: false, theme: 'blue' })

    expect(root.classList.contains('td-font-large')).toBe(true)
    expect(root.classList.contains('td-easy-read')).toBe(true)
    expect(root.classList.contains('td-high-contrast')).toBe(true)
    expect(root.classList.contains('td-reduce-motion')).toBe(true)
    expect(root.dataset.theme).toBe('blue')

    applySettingsToDocument(DEFAULT_CHILD_SETTINGS)
    expect(root.className).toBe('')
    expect(root.dataset.theme).toBeUndefined()
  })

  it('enregistre par profil et applique seulement pour le profil actif', () => {
    const store = useSettingsStore()
    store.setActiveProfile('2')

    store.updateSettings('2', { fontSize: 'large' })
    expect(root.classList.contains('td-font-large')).toBe(true)
    expect(JSON.parse(localStorage.getItem('teachdigital_child_settings'))['2'].fontSize).toBe('large')

    // Un autre profil n'affecte pas l'affichage courant
    store.updateSettings('3', { highContrast: true })
    expect(root.classList.contains('td-high-contrast')).toBe(false)

    // Hors espace enfant : valeurs par défaut
    store.setActiveProfile(null)
    expect(root.classList.contains('td-font-large')).toBe(false)
  })

  it('reprend les préférences de l\'ancien format puis supprime l\'ancienne clé', () => {
    localStorage.setItem('childSettings_5', JSON.stringify({ selectedTheme: 'orange', fontSize: 'small' }))
    const store = useSettingsStore()

    expect(store.getSettings(5)).toMatchObject({ theme: 'orange', fontSize: 'small' })
    expect(localStorage.getItem('childSettings_5')).toBeNull()
  })

  it('réinitialise un profil', () => {
    const store = useSettingsStore()
    store.setActiveProfile('2')
    store.updateSettings('2', { easyReadMode: true })

    store.resetSettings('2')

    expect(store.getSettings('2')).toEqual({ ...DEFAULT_CHILD_SETTINGS })
    expect(root.classList.contains('td-easy-read')).toBe(false)
  })

  it('ne retient le profil actif que dans l\'espace enfant', () => {
    const childRoute = { meta: { requiresChildOrTeen: true }, query: { childId: '7' } }
    const parentRoute = { meta: { requiresAdmin: true }, query: { profile: '1' } }
    const selected = { id: 4, is_child: true }

    expect(resolveActiveChildProfileId(childRoute, selected)).toBe('7')
    expect(resolveActiveChildProfileId({ meta: { requiresChildOrTeen: true }, query: {} }, selected)).toBe('4')
    expect(resolveActiveChildProfileId(parentRoute, selected)).toBeNull()
  })
})
