/**
 * Écrans des jeux : salle de jeux de l'enfant, partie (temps compté par le serveur, verrous,
 * aperçu parent) et règles d'accès fixées par un parent. API simulée au niveau de fetch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { jsonResponse, storeFamilySession, storeParentSession, profileToken } from '../services/testUtils.js'
import GameArcade from '../../src/views/GameArcade.vue'
import GamePlayer from '../../src/views/GamePlayer.vue'
import ParentGameManagement from '../../src/views/ParentGameManagement.vue'

const PROFILES = [
  { id: 1, name: 'Parent', is_admin: true, is_child: false, is_teen: false, is_active: true },
  { id: 2, name: 'Léa', is_admin: false, is_child: true, is_teen: false, is_active: true },
  { id: 3, name: 'Tom', is_admin: false, is_child: false, is_teen: true, is_active: true }
]

const CONDITIONS = [
  { type: 'none', label: 'Sans condition', unit: null, min: 0, max: 0, defaultValue: 0 },
  { type: 'quizzes_today', label: 'Quiz terminés aujourd\'hui', unit: 'quiz', min: 1, max: 20, defaultValue: 1 },
  { type: 'average_score_week', label: 'Moyenne des quiz de la semaine', unit: '%', min: 1, max: 100, defaultValue: 70 }
]

const openAccess = (remainingSeconds = null) => ({
  unlocked: true,
  reason: null,
  message: null,
  condition: { type: 'none', label: 'Aucune condition', target: 0, current: 0, met: true },
  dailyLimitMinutes: remainingSeconds === null ? null : 10,
  usedSecondsToday: 0,
  remainingSeconds
})

const GAMES = [
  {
    key: 'pacman',
    title: 'Pac-Man',
    description: 'Mange les pastilles.',
    rule: { isEnabled: true, conditionType: 'none', conditionValue: 0, dailyLimitMinutes: 10 },
    access: openAccess(600),
    bestScore: 1500
  },
  {
    key: 'tetris',
    title: 'Tetris',
    description: 'Empile les pièces.',
    rule: { isEnabled: true, conditionType: 'quizzes_today', conditionValue: 2, dailyLimitMinutes: null },
    access: {
      unlocked: false,
      reason: 'condition',
      message: 'Pour jouer : terminer 2 quiz aujourd\'hui.',
      condition: { type: 'quizzes_today', label: 'Terminer 2 quiz aujourd\'hui', target: 2, current: 1, met: false },
      dailyLimitMinutes: null,
      usedSecondsToday: 0,
      remainingSeconds: null
    },
    bestScore: 0
  }
]

const SESSION = { id: 9, gameKey: 'tetris', durationSeconds: 0, score: 0, ended: false }

// Réponses de l'API : handlers[`${méthode} ${chemin}`] = (body, url) => Response
let handlers
const calls = () => fetch.mock.calls.map(([url, options]) => ({
  method: (options?.method || 'GET').toUpperCase(),
  path: new URL(url, 'http://localhost').pathname,
  search: new URL(url, 'http://localhost').search,
  body: options?.body ? JSON.parse(options.body) : undefined,
  keepalive: options?.keepalive
}))
const sessionUpdates = () => calls().filter(c => c.method === 'PUT' && c.path === '/api/games/sessions/9')

function ok (data, status = 200) {
  return jsonResponse(status, { success: true, data })
}

function makeRouter () {
  const blank = { render: () => null }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/games', name: 'GameArcade', component: blank },
      { path: '/games/:gameKey', name: 'GamePlayer', component: blank },
      { path: '/:pathMatch(.*)*', component: blank }
    ]
  })
}

const mounted = []
async function mountScreen (component, path, props = {}) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { props, attachTo: document.body, global: { plugins: [createPinia(), router] } })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

const buttonByText = (wrapper, text) => wrapper.findAll('button').find(b => b.text().trim().startsWith(text))

// Le composant de jeu est chargé à la demande : attendre que son bouton apparaisse
async function waitForButton (wrapper, text) {
  for (let i = 0; i < 100; i++) {
    const button = buttonByText(wrapper, text)
    if (button) return button
    await new Promise(resolve => setTimeout(resolve, 10))
    await flushPromises()
  }
  throw new Error(`Bouton « ${text} » introuvable`)
}

let visibility = 'visible'
const originalRaf = window.requestAnimationFrame
const originalGetContext = HTMLCanvasElement.prototype.getContext

beforeEach(() => {
  localStorage.clear()
  storeFamilySession()
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  // Jeux : pas d'animation ni de dessin réels dans ces tests d'écrans
  window.requestAnimationFrame = vi.fn(() => 1)
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
  handlers = {
    'GET /api/profiles': () => ok({ profiles: PROFILES }),
    'GET /api/profiles/2': () => ok({ profile: PROFILES[1] }),
    'GET /api/games': () => ok({ profileId: 2, games: GAMES, conditionTypes: CONDITIONS }),
    'POST /api/games/tetris/sessions': () => ok({ session: SESSION, access: openAccess(3), bestScore: 40 }, 201),
    'PUT /api/games/sessions/9': (body) => ok({
      session: { ...SESSION, ended: body.ended },
      access: openAccess(3),
      stop: body.ended
    })
  }
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    const key = `${(options.method || 'GET').toUpperCase()} ${new URL(url, 'http://localhost').pathname}`
    const handler = handlers[key]
    return handler ? handler(options.body ? JSON.parse(options.body) : {}, url) : jsonResponse(404, { success: false, code: 'NOT_FOUND' })
  }))
})

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.requestAnimationFrame = originalRaf
  HTMLCanvasElement.prototype.getContext = originalGetContext
  delete document.visibilityState
})

describe('GameArcade (enfant)', () => {
  it('jeux ouverts et verrouillés, avec la progression vers la condition', async () => {
    const { wrapper } = await mountScreen(GameArcade, '/games?profile=2')

    expect(calls().some(c => c.path === '/api/games' && c.search === '?profileId=2')).toBe(true)
    const text = wrapper.text()
    expect(text).toContain('Il te reste 10 min de jeu aujourd\'hui.')
    expect(text).toContain('Ton record : 1500')
    expect(text).toContain('Pour jouer : terminer 2 quiz aujourd\'hui.')
    expect(text).toContain('1 / 2 quiz')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('1')
    expect(buttonByText(wrapper, 'Jouer à Tetris')).toBeUndefined()
  })

  it('« Jouer » ouvre la partie du jeu pour ce profil', async () => {
    const { wrapper, router } = await mountScreen(GameArcade, '/games?profile=2')
    await buttonByText(wrapper, 'Jouer à Pac-Man').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('GamePlayer')
    expect(router.currentRoute.value.params.gameKey).toBe('pacman')
    expect(router.currentRoute.value.query.profile).toBe('2')
  })

  it('API en panne : message et nouvel essai', async () => {
    handlers['GET /api/games'] = () => jsonResponse(500, { success: false, message: 'Panne', requestId: 'req-1' })
    const { wrapper } = await mountScreen(GameArcade, '/games?profile=2')
    expect(wrapper.text()).toContain('Oups, les jeux ne se chargent pas')
    expect(wrapper.text()).toContain('Réf. req-1')

    handlers['GET /api/games'] = () => ok({ games: GAMES, conditionTypes: CONDITIONS })
    await buttonByText(wrapper, 'Réessayer').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Pac-Man')
  })
})

describe('GamePlayer (partie)', () => {
  it('temps compté pendant la partie seulement, arrêt quand il est écoulé', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { wrapper } = await mountScreen(GamePlayer, '/games/tetris?profile=2', { gameKey: 'tetris' })

    const start = calls().find(c => c.method === 'POST')
    expect(start).toMatchObject({ path: '/api/games/tetris/sessions', body: { profileId: 2 } })
    expect(wrapper.text()).toContain('0:03')
    // Pas encore de partie en cours : aucun signal
    expect(sessionUpdates()).toHaveLength(0)

    await (await waitForButton(wrapper, 'Jouer')).trigger('click')
    await flushPromises()
    // Début de partie : l'horloge du serveur repart (idle), sans compter l'attente
    expect(sessionUpdates()[0].body).toEqual({ score: 0, ended: false, idle: true })

    vi.advanceTimersByTime(3000)
    await flushPromises()

    expect(wrapper.text()).toContain('C\'est fini pour aujourd\'hui')
    expect(wrapper.text()).toContain('Reviens demain')
    expect(sessionUpdates().at(-1).body).toMatchObject({ ended: true })
  })

  it('jeu verrouillé (409 GAME_LOCKED) : motif expliqué à l\'enfant', async () => {
    handlers['POST /api/games/tetris/sessions'] = () => jsonResponse(409, {
      success: false,
      code: 'GAME_LOCKED',
      message: 'Pour jouer : terminer 2 quiz aujourd\'hui.',
      access: GAMES[1].access
    })
    const { wrapper } = await mountScreen(GamePlayer, '/games/tetris?profile=2', { gameKey: 'tetris' })
    expect(wrapper.text()).toContain('Ce jeu est fermé pour l\'instant')
    expect(wrapper.text()).toContain('Pour jouer : terminer 2 quiz aujourd\'hui.')
  })

  it('jeu refermé par un parent pendant la partie : le serveur l\'arrête', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    handlers['POST /api/games/tetris/sessions'] = () => ok({ session: SESSION, access: openAccess(null), bestScore: 0 }, 201)
    handlers['PUT /api/games/sessions/9'] = () => ok({ session: SESSION, access: openAccess(null), stop: false })
    const { wrapper } = await mountScreen(GamePlayer, '/games/tetris?profile=2', { gameKey: 'tetris' })
    expect(wrapper.text()).toContain('Illimité')

    await (await waitForButton(wrapper, 'Jouer')).trigger('click')
    await flushPromises()
    handlers['PUT /api/games/sessions/9'] = () => ok({
      session: { ...SESSION, ended: true },
      access: { ...GAMES[1].access, reason: 'disabled', message: 'Ce jeu n\'est pas encore ouvert : demande à tes parents !' },
      stop: true
    })
    vi.advanceTimersByTime(15000)
    await flushPromises()

    expect(wrapper.text()).toContain('demande à tes parents')
    // Partie déjà close par le serveur : pas de fin renvoyée en quittant
    const count = sessionUpdates().length
    wrapper.unmount()
    mounted.splice(0)
    expect(sessionUpdates()).toHaveLength(count)
  })

  it('onglet masqué : pause et temps compté jusque-là ; fin envoyée en quittant (keepalive)', async () => {
    const { wrapper } = await mountScreen(GamePlayer, '/games/tetris?profile=2', { gameKey: 'tetris' })
    await (await waitForButton(wrapper, 'Jouer')).trigger('click')
    await flushPromises()

    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(sessionUpdates().at(-1).body).toEqual({ score: 0, ended: false, idle: false })
    expect(wrapper.text()).toContain('Reprendre')

    wrapper.unmount()
    mounted.splice(0)
    await flushPromises()
    expect(sessionUpdates().at(-1)).toMatchObject({ body: { ended: true }, keepalive: true })
  })

  it('aperçu parent : aucune partie enregistrée', async () => {
    localStorage.setItem('auth_token', profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    const { wrapper } = await mountScreen(GamePlayer, '/games/pacman?profile=2', { gameKey: 'pacman' })
    expect(wrapper.text()).toContain('Aperçu parent')
    expect(wrapper.text()).toContain('Aperçu')
    expect(calls().filter(c => c.path.startsWith('/api/games'))).toHaveLength(0)
  })

  it('erreur au démarrage puis nouvel essai ; jeu inconnu', async () => {
    handlers['POST /api/games/tetris/sessions'] = () => jsonResponse(500, { success: false, message: 'Panne' })
    const { wrapper } = await mountScreen(GamePlayer, '/games/tetris?profile=2', { gameKey: 'tetris' })
    expect(wrapper.text()).toContain('Le jeu n\'a pas pu démarrer')

    handlers['POST /api/games/tetris/sessions'] = () => ok({ session: SESSION, access: openAccess(60), bestScore: 0 }, 201)
    await buttonByText(wrapper, 'Réessayer').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1:00')

    const unknown = await mountScreen(GamePlayer, '/games/doom?profile=2', { gameKey: 'doom' })
    expect(unknown.wrapper.text()).toContain('Ce jeu n\'existe pas.')
  })
})

describe('ParentGameManagement (parent)', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', profileToken({ profileId: 1, isAdmin: true }))
    storeParentSession(1)
    handlers['PUT /api/games/tetris/rules/2'] = (body) => ok({
      game: { ...GAMES[1], rule: body, access: openAccess(null) }
    })
  })

  it('jeux du premier enfant, état vu par l\'enfant', async () => {
    const { wrapper } = await mountScreen(ParentGameManagement, '/parent-game-management?profile=1')
    expect(wrapper.text()).toContain('Léa')
    expect(wrapper.text()).toContain('Tom')
    expect(wrapper.text()).toContain('Accessible maintenant : 10 min restantes aujourd\'hui.')
    expect(wrapper.text()).toContain('Verrouillé : terminer 2 quiz aujourd\'hui (1 / 2).')
    // Rien de modifié : enregistrement désactivé
    expect(wrapper.findAll('button[type="submit"]').every(b => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('modifier puis enregistrer une règle', async () => {
    const { wrapper } = await mountScreen(ParentGameManagement, '/parent-game-management?profile=1')
    const form = wrapper.findAll('form')[1]

    await form.find('select').setValue('average_score_week')
    // Objectif hors bornes pour la nouvelle condition : valeur par défaut proposée
    expect(form.find('input[type="number"]').element.value).toBe('2')
    await form.find('input[type="number"]').setValue(80)
    await form.findAll('select')[1].setValue('30')
    await form.trigger('submit')
    await flushPromises()

    const save = calls().find(c => c.method === 'PUT')
    expect(save.path).toBe('/api/games/tetris/rules/2')
    expect(save.body).toEqual({ isEnabled: true, conditionType: 'average_score_week', conditionValue: 80, dailyLimitMinutes: 30 })
    expect(wrapper.text()).toContain('Accessible maintenant, sans limite de temps.')
  })

  it('autre enfant : ses jeux sont chargés', async () => {
    const { wrapper } = await mountScreen(ParentGameManagement, '/parent-game-management?profile=1')
    await buttonByText(wrapper, 'Tom').trigger('click')
    await flushPromises()
    expect(calls().some(c => c.path === '/api/games' && c.search === '?profileId=3')).toBe(true)
    expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Tom')
  })

  it('« Essayer » ouvre le jeu dans une fenêtre, sans partie enregistrée', async () => {
    const { wrapper } = await mountScreen(ParentGameManagement, '/parent-game-management?profile=1')
    await buttonByText(wrapper, 'Essayer').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Essai : Pac-Man')
    expect(calls().some(c => c.path.includes('/sessions'))).toBe(false)
  })

  it('aucun enfant : message', async () => {
    handlers['GET /api/profiles'] = () => ok({ profiles: [PROFILES[0]] })
    const { wrapper } = await mountScreen(ParentGameManagement, '/parent-game-management?profile=1')
    expect(wrapper.text()).toContain('Aucun profil enfant actif')
  })
})
