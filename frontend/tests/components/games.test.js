/**
 * Composants de jeu (Tetris, Pac-Man) : écrans de début / pause / fin, commandes clavier,
 * tactiles et glissements, événements envoyés à l'écran de partie (score, running).
 * Le dessin passe par un faux contexte 2D ; les images sont avancées à la main.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TetrisGame from '../../src/components/games/TetrisGame.vue'
import PacmanGame from '../../src/components/games/PacmanGame.vue'

// Contexte 2D factice : toute méthode est une fonction neutre, toute propriété est assignable
const noop = () => {}
function fakeContext () {
  return new Proxy({}, {
    get: (target, key) => (key in target ? target[key] : noop),
    set: (target, key, value) => { target[key] = value; return true }
  })
}

let frameCallbacks = []
let now = 0
const originalRaf = window.requestAnimationFrame
const originalCancel = window.cancelAnimationFrame
const originalGetContext = HTMLCanvasElement.prototype.getContext

// Avance l'animation de `seconds` secondes, par images de 1/60 s
async function frames (seconds) {
  const count = Math.round(seconds * 60)
  for (let i = 0; i < count; i++) {
    now += 1000 / 60
    const callbacks = frameCallbacks
    frameCallbacks = []
    callbacks.forEach(callback => callback(now))
  }
  await nextTick()
}

function key (code) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }))
}

beforeEach(() => {
  frameCallbacks = []
  now = 0
  window.requestAnimationFrame = vi.fn(callback => { frameCallbacks.push(callback); return frameCallbacks.length })
  window.cancelAnimationFrame = vi.fn()
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext())
})

// Composants montés : démontés après chaque test, même en échec (écouteurs clavier retirés)
const mounted = []
function mountGame (component, props = {}) {
  const wrapper = mount(component, { props, attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  window.requestAnimationFrame = originalRaf
  window.cancelAnimationFrame = originalCancel
  HTMLCanvasElement.prototype.getContext = originalGetContext
})

const buttonByText = (wrapper, text) => wrapper.findAll('button').find(b => b.text().trim() === text)

describe('TetrisGame', () => {
  it('écran de départ, puis partie en cours (running) et dessin du plateau', async () => {
    const wrapper = mountGame(TetrisGame, { bestScore: 1200 })
    expect(wrapper.text()).toContain('Tetris')
    expect(wrapper.text()).toContain('1200')

    await buttonByText(wrapper, 'Jouer').trigger('click')
    await frames(0.1)

    expect(wrapper.emitted('running')).toEqual([[true]])
    expect(wrapper.find('.game-overlay').exists()).toBe(false)
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled()
  })

  it('clavier : chute immédiate (Espace) = points ; P met en pause puis reprend', async () => {
    const wrapper = mountGame(TetrisGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')

    key('ArrowLeft')
    key('ArrowUp')
    key('Space')
    await nextTick()
    const scores = wrapper.emitted('score').map(([score]) => score)
    expect(scores.at(-1)).toBeGreaterThan(0)

    key('KeyP')
    await nextTick()
    expect(wrapper.text()).toContain('Pause')
    expect(wrapper.emitted('running').at(-1)).toEqual([false])
    key('KeyP')
    await nextTick()
    expect(wrapper.emitted('running').at(-1)).toEqual([true])
  })

  it('la gravité fait descendre et poser les pièces', async () => {
    const wrapper = mountGame(TetrisGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')
    // 20 lignes à 0,8 s : au moins une pièce posée en 20 s, sans action du joueur
    await frames(20)
    expect(wrapper.text()).toMatch(/Score\s*0/)
    expect(wrapper.emitted('game-over')).toBeUndefined()
  })

  it('pause imposée (onglet masqué) : l\'enfant reprend lui-même', async () => {
    const wrapper = mountGame(TetrisGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')
    await wrapper.setProps({ paused: true })
    await wrapper.setProps({ paused: false })
    expect(wrapper.text()).toContain('Reprendre')
    await buttonByText(wrapper.find('.game-overlay'), 'Reprendre').trigger('click')
    expect(wrapper.find('.game-overlay').exists()).toBe(false)
  })

  it('boutons tactiles : action immédiate et répétée tant qu\'on appuie', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const wrapper = mountGame(TetrisGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')

    const down = wrapper.find('[aria-label="Descendre"]')
    await down.trigger('pointerdown')
    vi.advanceTimersByTime(220 + 70 * 3)
    await down.trigger('pointerup')
    await nextTick()
    // 1 + 4 répétitions de descente douce : 1 point par case
    expect(wrapper.emitted('score').at(-1)[0]).toBe(5)

    // Clic au clavier sur un bouton (detail = 0, comme un clic simulé) : une action
    await wrapper.find('[aria-label="Faire tomber"]').trigger('click')
    expect(wrapper.emitted('score').at(-1)[0]).toBeGreaterThan(5)
  })

  it('pile jusqu\'en haut : partie terminée, « Rejouer » recommence', async () => {
    const wrapper = mountGame(TetrisGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')
    for (let i = 0; i < 40 && !wrapper.emitted('game-over'); i++) {
      key('Space')
      await nextTick()
    }
    expect(wrapper.emitted('game-over')).toHaveLength(1)
    expect(wrapper.text()).toContain('Partie terminée')
    expect(wrapper.text()).toContain('Nouveau record')

    await buttonByText(wrapper, 'Rejouer').trigger('click')
    expect(wrapper.find('.game-overlay').exists()).toBe(false)
    expect(wrapper.emitted('score').at(-1)).toEqual([0])
  })
})

describe('PacmanGame', () => {
  it('départ, déplacement et pastilles mangées', async () => {
    const wrapper = mountGame(PacmanGame, { bestScore: 50 })
    expect(wrapper.text()).toContain('Pac-Man')

    await buttonByText(wrapper, 'Jouer').trigger('click')
    await frames(3)

    expect(wrapper.emitted('running')).toEqual([[true]])
    expect(wrapper.emitted('score').at(-1)[0]).toBeGreaterThan(0)
  })

  it('clavier, croix directionnelle et glissement du doigt dirigent Pac-Man', async () => {
    const wrapper = mountGame(PacmanGame)
    // Avant la partie : les flèches ne font rien (et ne bloquent pas la page)
    const early = new KeyboardEvent('keydown', { code: 'ArrowUp', cancelable: true })
    window.dispatchEvent(early)
    expect(early.defaultPrevented).toBe(false)

    await buttonByText(wrapper, 'Jouer').trigger('click')
    const during = new KeyboardEvent('keydown', { code: 'KeyD', cancelable: true })
    window.dispatchEvent(during)
    expect(during.defaultPrevented).toBe(true)

    await wrapper.find('[aria-label="Haut"]').trigger('pointerdown')
    await wrapper.find('[aria-label="Bas"]').trigger('click')
    const canvas = wrapper.find('canvas')
    await canvas.trigger('pointerdown', { clientX: 100, clientY: 100 })
    await canvas.trigger('pointerup', { clientX: 60, clientY: 104 })
    await frames(2.5)
    expect(wrapper.emitted('score').at(-1)[0]).toBeGreaterThan(0)
  })

  it('touché par les fantômes jusqu\'à la fin de la partie', async () => {
    const wrapper = mountGame(PacmanGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')
    // Sans aucune commande, Pac-Man reste bloqué contre un mur : les fantômes finissent par l'attraper
    await frames(120)
    expect(wrapper.emitted('game-over')).toHaveLength(1)
    expect(wrapper.text()).toContain('Partie terminée')
    await buttonByText(wrapper, 'Rejouer').trigger('click')
    expect(wrapper.text()).toMatch(/Vies\s*3/)
  }, 20000)

  it('pause au clavier (Échap) puis bouton Reprendre', async () => {
    const wrapper = mountGame(PacmanGame)
    await buttonByText(wrapper, 'Jouer').trigger('click')
    key('Escape')
    await nextTick()
    expect(wrapper.emitted('running').at(-1)).toEqual([false])
    await buttonByText(wrapper.find('.pacman-hud'), 'Reprendre').trigger('click')
    expect(wrapper.emitted('running').at(-1)).toEqual([true])
  })
})
