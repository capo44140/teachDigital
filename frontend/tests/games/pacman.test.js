import { describe, it, expect } from 'vitest'
import {
  MAZE,
  WIDTH,
  HEIGHT,
  DIRECTIONS,
  POINTS,
  createPacmanGame,
  setDirection,
  updatePacman,
  isPassable,
  entityPosition,
  pelletsLeft,
  frightenedDuration,
  isFrightenedEnding
} from '../../src/games/pacman.js'

const random = () => 0

// Fait avancer la partie de `seconds` secondes, par images de 1/60 s
function run (game, seconds) {
  for (let t = 0; t < seconds; t += 1 / 60) updatePacman(game, 1 / 60)
}

// Avance jusqu'à la fin du « Prêt ! », sans plus
function startPlaying (game) {
  for (let i = 0; i < 300 && game.phase !== 'playing'; i++) updatePacman(game, 1 / 60)
  expect(game.phase).toBe('playing')
}

// Fantômes rangés hors de portée (tests sans fantômes)
function parkGhosts (game) {
  for (const ghost of game.ghosts) {
    ghost.state = 'house'
    ghost.releaseTimer = 1000
  }
}

describe('pacman : labyrinthe', () => {
  it('lignes de même largeur', () => {
    expect(MAZE.every(row => row.length === WIDTH)).toBe(true)
    expect(HEIGHT).toBe(21)
  })

  it('toutes les pastilles sont atteignables depuis le départ', () => {
    const start = { x: 9, y: 15 }
    const seen = new Set([`${start.x},${start.y}`])
    const queue = [start]
    while (queue.length) {
      const { x, y } = queue.shift()
      for (const dir of Object.values(DIRECTIONS)) {
        const nx = (x + dir.x + WIDTH) % WIDTH
        const ny = y + dir.y
        const key = `${nx},${ny}`
        if (!seen.has(key) && isPassable(nx, ny)) {
          seen.add(key)
          queue.push({ x: nx, y: ny })
        }
      }
    }
    const game = createPacmanGame({ random })
    for (const key of [...game.pellets, ...game.powers]) expect(seen.has(key)).toBe(true)
    expect(pelletsLeft(game)).toBeGreaterThan(100)
    expect(game.powers.size).toBe(4)
  })

  it('porte de la maison fermée à Pac-Man, ouverte aux fantômes qui sortent', () => {
    expect(isPassable(9, 8)).toBe(false)
    expect(isPassable(9, 8, { door: true })).toBe(true)
    // Tunnel : les bords se rejoignent
    expect(isPassable(-1, 9)).toBe(true)
    expect(isPassable(0, -1)).toBe(false)
  })
})

describe('pacman : déplacements', () => {
  it('« Prêt ! » puis départ vers la gauche en mangeant les pastilles', () => {
    const game = createPacmanGame({ random })
    parkGhosts(game)
    run(game, 1)
    expect(game.phase).toBe('ready')
    expect(game.pacman.x).toBe(9)
    startPlaying(game)
    run(game, 0.5)
    expect(game.pacman.x).toBeLessThan(9)
    expect(game.score).toBeGreaterThan(0)
    expect(game.score % POINTS.pellet).toBe(0)
  })

  it('s\'arrête devant un mur', () => {
    const game = createPacmanGame({ random })
    parkGhosts(game)
    startPlaying(game)
    run(game, 3)
    // Rangée 15 : mur en x = 3
    expect(game.pacman).toMatchObject({ x: 4, y: 15, dir: null })
  })

  it('demi-tour immédiat entre deux cases', () => {
    const game = createPacmanGame({ random })
    parkGhosts(game)
    startPlaying(game)
    run(game, 0.05)
    const before = entityPosition(game.pacman).x
    setDirection(game, 'right')
    updatePacman(game, 1 / 60)
    expect(game.pacman.dir).toEqual(DIRECTIONS.right)
    expect(Math.abs(entityPosition(game.pacman).x - before)).toBeLessThan(0.2)
  })

  it('tourne à la case suivante quand la direction demandée est libre', () => {
    const game = createPacmanGame({ random })
    parkGhosts(game)
    startPlaying(game)
    setDirection(game, 'up')
    run(game, 1)
    // Premier passage vers le haut : colonne 8 (rangées 14 et 13 libres)
    expect(game.pacman.x).toBe(8)
    expect(game.pacman.y).toBeLessThan(15)
  })

  it('direction inconnue ignorée', () => {
    const game = createPacmanGame({ random })
    setDirection(game, 'diagonale')
    expect(game.pacman.nextDir).toEqual(DIRECTIONS.left)
  })

  it('le tunnel fait passer d\'un bord à l\'autre', () => {
    const game = createPacmanGame({ random })
    parkGhosts(game)
    game.phase = 'playing'
    Object.assign(game.pacman, { x: 1, y: 9, dir: DIRECTIONS.left, nextDir: DIRECTIONS.left, progress: 0 })
    run(game, 0.5)
    expect(game.pacman.x).toBeGreaterThan(14)
  })
})

describe('pacman : fantômes, vies et niveaux', () => {
  it('super-pastille : fantômes effrayés, mangés pour 200 puis 400 points', () => {
    const game = createPacmanGame({ random })
    game.phase = 'playing'
    game.pellets.delete('8,15')
    game.powers.add('8,15')
    for (const ghost of game.ghosts) ghost.state = 'house'
    Object.assign(game.ghosts[0], { state: 'active', x: 6, y: 15, dir: DIRECTIONS.right, progress: 0 })
    Object.assign(game.ghosts[1], { state: 'active', x: 5, y: 15, dir: DIRECTIONS.right, progress: 0 })
    game.ghosts[2].releaseTimer = 1000
    game.ghosts[3].releaseTimer = 1000
    const scoreBefore = game.score
    run(game, 1)
    expect(game.ghosts[0].state).toBe('eaten')
    expect(game.ghosts[1].state).toBe('eaten')
    expect(game.score - scoreBefore).toBeGreaterThanOrEqual(POINTS.power + 200 + 400)
    expect(game.frightenedTimer).toBeGreaterThan(0)
  })

  it('peur de plus en plus courte, fin signalée (clignotement)', () => {
    expect(frightenedDuration(1)).toBe(7)
    expect(frightenedDuration(10)).toBe(2)
    const game = createPacmanGame({ random })
    game.frightenedTimer = 1.5
    expect(isFrightenedEnding(game)).toBe(true)
  })

  it('touché par un fantôme : une vie en moins, puis fin de partie', () => {
    const game = createPacmanGame({ random })
    game.lives = 2
    game.phase = 'playing'
    Object.assign(game.ghosts[0], { x: game.pacman.x, y: game.pacman.y, dir: null })
    updatePacman(game, 1 / 60)
    expect(game.phase).toBe('dying')
    run(game, 1.5)
    expect(game.lives).toBe(1)
    expect(game.phase).toBe('ready')
    expect(game.pacman).toMatchObject({ x: 9, y: 15 })

    game.phase = 'playing'
    Object.assign(game.ghosts[0], { state: 'active', x: game.pacman.x, y: game.pacman.y, dir: null })
    updatePacman(game, 1 / 60)
    run(game, 1.5)
    expect(game.phase).toBe('over')
    expect(game.lives).toBe(0)
  })

  it('toutes les pastilles mangées : niveau suivant, labyrinthe rempli', () => {
    const game = createPacmanGame({ random })
    parkGhosts(game)
    game.phase = 'playing'
    game.pellets = new Set(['8,15'])
    game.powers = new Set()
    run(game, 0.3)
    expect(game.phase).toBe('levelClear')
    run(game, 2)
    expect(game.level).toBe(2)
    expect(pelletsLeft(game)).toBeGreaterThan(100)
    expect(game.phase).toBe('ready')
  })

  it('les fantômes sortent de la maison puis poursuivent sans traverser les murs', () => {
    const game = createPacmanGame({ random })
    startPlaying(game)
    run(game, 8)
    const out = game.ghosts.filter(g => g.state === 'active' || g.state === 'leaving')
    expect(out.length).toBeGreaterThanOrEqual(2)
    for (const ghost of game.ghosts) {
      expect(isPassable(ghost.x, ghost.y, { door: true })).toBe(true)
    }
  })
})
