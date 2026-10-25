import { describe, it, expect } from 'vitest'
import {
  TILE,
  ROWS,
  POINTS,
  COINS_FOR_LIFE,
  LEVEL_TIME,
  START_LIVES,
  LEVELS,
  createMarioGame,
  setControl,
  releaseControls,
  updateMario,
  parseLevel,
  isSolid,
  flagPoints,
  enemySpeedFactor,
  worldLabel
} from '../../src/games/mario.js'

// Fait avancer la partie de `seconds` secondes, par images de 1/60 s
function run (game, seconds) {
  for (let t = 0; t < seconds; t += 1 / 60) updateMario(game, 1 / 60)
}

// Avance jusqu'à ce que la condition soit remplie (au plus `seconds` secondes)
function runUntil (game, condition, seconds = 10) {
  for (let t = 0; t < seconds && !condition(game); t += 1 / 60) updateMario(game, 1 / 60)
  expect(condition(game)).toBe(true)
}

// Avance jusqu'à la fin du bandeau « MONDE 1-1 », sans plus
function startPlaying (game) {
  for (let i = 0; i < 300 && game.phase !== 'playing'; i++) updateMario(game, 1 / 60)
  expect(game.phase).toBe('playing')
}

/**
 * Niveau de test : sol plat de `width` cases, départ en (2, 6) ; `cells` place des tuiles
 * ({ 'x,y': caractère })
 */
function makeLevel (cells = {}, { width = 40, checkpoint } = {}) {
  const rows = Array.from({ length: ROWS }, (_, y) => [...(y >= 7 ? '#' : '.').repeat(width)])
  rows[6][2] = 'S'
  for (const [key, char] of Object.entries(cells)) {
    const [x, y] = key.split(',').map(Number)
    rows[y][x] = char
  }
  return { rows: rows.map(row => row.join('')), checkpoint }
}

// Trou dans le sol, de la colonne `from` à `to` incluses
function pit (from, to) {
  const cells = {}
  for (let x = from; x <= to; x++) {
    cells[`${x},7`] = '.'
    cells[`${x},8`] = '.'
  }
  return cells
}

function newGame (cells, options) {
  const game = createMarioGame({ levels: [makeLevel(cells, options)] })
  startPlaying(game)
  return game
}

// Héros grand, sans passer par un champignon
function makeBig (game) {
  const hero = game.hero
  hero.y -= 27 - hero.h
  hero.h = 27
  hero.big = true
}

/**
 * Le niveau peut-il être terminé (sans ennemis) ? Recherche en largeur sur les commandes,
 * du plus avancé au moins avancé, avec la vraie physique du jeu
 */
function canFinish (definition) {
  const rows = definition.rows.map(row => row.replace(/[gk]/g, '.'))
  const game = createMarioGame({ levels: [{ ...definition, rows }] })
  game.phase = 'playing'
  const snapshot = () => ({ hero: { ...game.hero }, cameraX: game.cameraX, jumpBuffer: game.jumpBuffer, input: { ...game.input } })
  const restore = (state) => {
    Object.assign(game, { hero: { ...state.hero }, cameraX: state.cameraX, jumpBuffer: state.jumpBuffer, input: { ...state.input } })
    Object.assign(game, { phase: 'playing', time: LEVEL_TIME, items: [], enemies: [] })
  }
  const keyOf = ({ hero, input }) =>
    [hero.x / 2, hero.y / 2, hero.vx / 20, hero.vy / 40].map(Math.round).concat(hero.onGround, input.jump).join()
  const actions = []
  for (const dir of [1, 0, -1]) for (const jump of [false, true]) actions.push({ dir, jump })

  const frontier = [snapshot()]
  const seen = new Set([keyOf(frontier[0])])
  for (let expanded = 0; frontier.length > 0 && expanded < 20000; expanded++) {
    frontier.sort((a, b) => a.hero.x - b.hero.x)
    const state = frontier.pop()
    for (const { dir, jump } of actions) {
      restore(state)
      setControl(game, 'left', dir < 0)
      setControl(game, 'right', dir > 0)
      setControl(game, 'jump', jump)
      updateMario(game, 1 / 15)
      if (game.phase === 'clear') return true
      if (game.phase !== 'playing') continue
      const next = snapshot()
      const key = keyOf(next)
      if (!seen.has(key)) {
        seen.add(key)
        frontier.push(next)
      }
    }
  }
  return false
}

describe('mario : niveaux', () => {
  it.each(LEVELS.map((level, i) => [i + 1, level]))('niveau %i : plan complet', (_, definition) => {
    expect(definition.rows).toHaveLength(ROWS)
    expect(new Set(definition.rows.map(row => row.length)).size).toBe(1)
    expect(definition.rows.every(row => /^[.#XB?MHo[\]{}SFCgk]+$/.test(row))).toBe(true)

    const { tiles, level } = parseLevel(definition)
    expect(level.start).not.toBeNull()
    expect(level.pole).not.toBeNull()
    expect(level.castle).not.toBeNull()
    expect(level.poleBase).toBeLessThan(ROWS)
    // Point de reprise sur le sol, sans rien au-dessus
    const column = level.checkpoint
    expect(column).toBeGreaterThan(level.start.x)
    expect(isSolid(tiles[7][column])).toBe(true)
    expect(tiles.slice(0, 7).every(row => row[column] === '.')).toBe(true)
    // Les entités placées sur le plan laissent une case vide
    expect(tiles.flat().some(cell => 'SFCgk'.includes(cell))).toBe(false)
  })

  it.each(LEVELS.map((level, i) => [i + 1, level]))('niveau %i : on peut l\'atteindre au bout en marchant', (_, definition) => {
    expect(canFinish(definition)).toBe(true)
  })

  it('un trou trop large est infranchissable (contrôle de la vérification)', () => {
    expect(canFinish(makeLevel({ ...pit(6, 17), '30,0': 'F', '30,6': 'X' }))).toBe(false)
  })
})

describe('mario : déplacements', () => {
  it('bandeau « MONDE 1-1 », puis marche, course et arrêt en douceur', () => {
    const game = createMarioGame({ levels: [makeLevel()] })
    expect(game.phase).toBe('ready')
    expect(worldLabel(game)).toBe('1-1')
    setControl(game, 'right', true)
    run(game, 1)
    // Rien ne bouge pendant le bandeau
    expect(game.hero.vx).toBe(0)
    startPlaying(game)

    run(game, 1)
    expect(game.hero.vx).toBeCloseTo(80)
    setControl(game, 'run', true)
    run(game, 0.5)
    expect(game.hero.vx).toBeCloseTo(130)
    const x = game.hero.x
    releaseControls(game)
    run(game, 0.1)
    // Il glisse encore un peu avant de s'arrêter
    expect(game.hero.x).toBeGreaterThan(x)
    run(game, 1)
    expect(game.hero.vx).toBe(0)
  })

  it('saut plus haut quand la touche est tenue ; pas de nouveau saut sans relâcher', () => {
    function jump (holdFrames) {
      const game = newGame()
      const ground = game.hero.y
      let top = ground
      setControl(game, 'jump', true)
      for (let i = 0; i < 90; i++) {
        if (i === holdFrames) setControl(game, 'jump', false)
        updateMario(game, 1 / 60)
        top = Math.min(top, game.hero.y)
      }
      return { game, ground, height: ground - top }
    }
    expect(jump(90).height).toBeGreaterThan(4 * TILE)
    expect(jump(3).height).toBeLessThan(2.5 * TILE)

    // Touche toujours tenue après l'atterrissage : le héros reste au sol
    const { game, ground } = jump(1000)
    run(game, 1)
    expect(game.hero.y).toBeCloseTo(ground)
    expect(game.hero.onGround).toBe(true)
  })

  it('le bord gauche de l\'écran est un mur', () => {
    const game = newGame()
    setControl(game, 'left', true)
    run(game, 2)
    expect(game.hero.x).toBe(0)
  })

  it('la caméra suit le héros et ne revient jamais en arrière', () => {
    const game = newGame()
    setControl(game, 'right', true)
    run(game, 3)
    releaseControls(game)
    run(game, 1)
    const camera = game.cameraX
    expect(camera).toBeGreaterThan(0)
    setControl(game, 'left', true)
    run(game, 3)
    expect(game.cameraX).toBe(camera)
    expect(game.hero.x).toBeCloseTo(camera)
  })
})

describe('mario : blocs, pièces et objets', () => {
  it('bloc « ? » cogné par en dessous : une pièce, puis un bloc vide', () => {
    const game = newGame({ '2,4': '?' })
    setControl(game, 'jump', true)
    run(game, 0.1)
    expect(game.coins).toBe(1)
    expect(game.score).toBe(POINTS.coin)
    expect(game.tiles[4][2]).toBe('U')
    // La pièce jaillit du bloc
    expect(game.effects.some(effect => effect.type === 'coin')).toBe(true)

    run(game, 0.7)
    setControl(game, 'jump', false)
    run(game, 0.1)
    setControl(game, 'jump', true)
    run(game, 0.8)
    expect(game.coins).toBe(1)
  })

  it('pièces ramassées en passant ; la centième donne une vie', () => {
    const game = newGame({ '4,6': 'o', '6,6': 'o' })
    game.coins = COINS_FOR_LIFE - 2
    setControl(game, 'right', true)
    run(game, 1.5)
    expect(game.tiles[6][4]).toBe('.')
    expect(game.coins).toBe(0)
    expect(game.lives).toBe(START_LIVES + 1)
    expect(game.score).toBe(2 * POINTS.coin)
  })

  it('champignon : il sort du bloc, rebondit contre un mur et fait grandir le héros', () => {
    const game = newGame({ '2,4': 'M', '6,6': 'X' })
    setControl(game, 'jump', true)
    run(game, 0.3)
    expect(game.items).toHaveLength(1)
    releaseControls(game)
    run(game, 3)
    expect(game.items).toHaveLength(0)
    expect(game.hero.big).toBe(true)
    expect(game.hero.h).toBe(27)
    expect(game.score).toBe(POINTS.mushroom)
  })

  it('bloc cœur : une vie en plus', () => {
    const game = newGame({ '2,4': 'H', '6,6': 'X' })
    setControl(game, 'jump', true)
    run(game, 0.3)
    releaseControls(game)
    run(game, 3)
    expect(game.lives).toBe(START_LIVES + 1)
  })

  it('brique : petit, le héros la fait sauter ; grand, il la casse', () => {
    const small = newGame({ '2,4': 'B' })
    setControl(small, 'jump', true)
    run(small, 0.1)
    expect(small.tiles[4][2]).toBe('B')
    expect(small.bumps).toHaveLength(1)

    const big = newGame({ '2,4': 'B' })
    makeBig(big)
    setControl(big, 'jump', true)
    run(big, 0.2)
    expect(big.tiles[4][2]).toBe('.')
    expect(big.score).toBe(POINTS.brick)
    expect(big.effects.filter(effect => effect.type === 'debris')).toHaveLength(4)
  })

  it('un bloc cogné renverse l\'ennemi posé dessus', () => {
    const game = newGame({ '2,4': '?', '2,3': 'g' })
    setControl(game, 'jump', true)
    run(game, 0.3)
    expect(game.enemies[0].state).toBe('flipped')
    expect(game.score).toBe(POINTS.coin + POINTS.knock)
  })
})

describe('mario : ennemis', () => {
  // Héros posé juste au-dessus d'un ennemi, en train de tomber
  function dropOn (game, enemy) {
    game.hero.x = enemy.x + 1
    game.hero.y = enemy.y - game.hero.h - 4
    game.hero.vy = 120
  }

  it('écraser un champignon méchant : points et rebond', () => {
    const game = newGame({ '6,6': 'g' })
    const enemy = game.enemies[0]
    dropOn(game, enemy)
    run(game, 1 / 30)
    expect(enemy.state).toBe('squashed')
    expect(game.score).toBe(100)
    expect(game.hero.vy).toBeLessThan(0)
    run(game, 1)
    expect(game.enemies).toHaveLength(0)
  })

  it('touché de côté : petit, le héros perd une vie ; grand, il rapetisse et clignote', () => {
    const small = newGame({ '7,6': 'g' })
    setControl(small, 'right', true)
    run(small, 2)
    expect(small.phase).toBe('dying')
    run(small, 3)
    expect(small.lives).toBe(START_LIVES - 1)
    expect(small.phase).toBe('ready')

    const big = newGame({ '7,6': 'g' })
    makeBig(big)
    setControl(big, 'right', true)
    run(big, 1)
    expect(big.phase).toBe('playing')
    expect(big.hero.big).toBe(false)
    expect(big.hero.hurtTimer).toBeGreaterThan(0)
    // Pendant qu'il clignote, il traverse les ennemis
    run(big, 0.5)
    expect(big.phase).toBe('playing')
  })

  it('tortue : carapace, coup de pied, la carapace renverse les autres ennemis', () => {
    const game = newGame({ '6,6': 'k', '10,6': 'g' })
    const koopa = game.enemies[0]
    dropOn(game, koopa)
    run(game, 1 / 30)
    expect(koopa.state).toBe('shell')
    expect(game.score).toBe(100)

    // Le héros se pose à gauche (sinon il retomberait sur la carapace), puis la pousse
    Object.assign(game.hero, { x: koopa.x - 40, y: 7 * TILE - game.hero.h, vy: 0 })
    run(game, 0.5)
    expect(koopa.state).toBe('shell')
    setControl(game, 'right', true)
    run(game, 0.6)
    releaseControls(game)
    expect(koopa.state).toBe('spin')
    expect(koopa.dir).toBe(1)

    run(game, 1)
    const goomba = game.enemies.find(enemy => enemy.type === 'goomba')
    expect(goomba === undefined || goomba.state === 'flipped').toBe(true)
    expect(game.score).toBe(200)
    expect(game.phase).toBe('playing')
  })

  it('la carapace immobile finit par libérer la tortue', () => {
    const game = newGame({ '8,6': 'k' })
    const koopa = game.enemies[0]
    dropOn(game, koopa)
    run(game, 1 / 30)
    game.hero.x = 0
    run(game, 7)
    expect(koopa.state).toBe('walk')
  })

  it('les ennemis plus loin que l\'écran attendent avant de bouger', () => {
    const game = newGame({ '30,6': 'g' })
    run(game, 1)
    expect(game.enemies[0].active).toBe(false)
    expect(game.enemies[0].x).toBe(30 * TILE + 1)
  })
})

describe('mario : vies, chrono et fin de niveau', () => {
  it('chute dans un trou : une vie en moins, retour au départ', () => {
    const game = newGame(pit(5, 7))
    setControl(game, 'right', true)
    run(game, 1.5)
    expect(game.phase).toBe('dying')
    releaseControls(game)
    run(game, 3)
    expect(game.lives).toBe(START_LIVES - 1)
    expect(game.hero.x).toBe(2 * TILE + 2)
    expect(game.time).toBe(LEVEL_TIME)
  })

  it('point de reprise dépassé : on y repart', () => {
    const game = newGame(pit(8, 10), { checkpoint: 5 })
    setControl(game, 'right', true)
    run(game, 2)
    releaseControls(game)
    run(game, 3)
    expect(game.checkpointReached).toBe(true)
    expect(game.hero.x).toBe(5 * TILE + 2)
  })

  it('chrono écoulé : une vie en moins', () => {
    const game = newGame()
    game.time = 0.5
    run(game, 1)
    expect(game.phase).toBe('dying')
  })

  it('dernière vie perdue : partie terminée', () => {
    const game = newGame(pit(5, 7))
    game.lives = 1
    setControl(game, 'right', true)
    run(game, 5)
    expect(game.phase).toBe('over')
    expect(game.lives).toBe(0)
  })

  it('bonus du drapeau selon la hauteur', () => {
    expect(flagPoints(1)).toBe(5000)
    expect(flagPoints(0.7)).toBe(2000)
    expect(flagPoints(0.5)).toBe(800)
    expect(flagPoints(0.3)).toBe(400)
    expect(flagPoints(0)).toBe(100)
  })

  it('drapeau : glissade, marche jusqu\'au château, temps changé en points, niveau suivant', () => {
    const levels = [makeLevel({ '10,0': 'F', '10,6': 'X', '15,6': 'C' }), makeLevel({ '10,0': 'F', '10,6': 'X' })]
    const game = createMarioGame({ levels })
    startPlaying(game)
    makeBig(game)
    setControl(game, 'right', true)
    runUntil(game, ({ phase }) => phase === 'clear')
    releaseControls(game)
    const time = game.time
    expect(Number.isInteger(time)).toBe(true)
    // Butée contre le socle du mât : bonus le plus bas
    expect(game.score).toBe(100)

    runUntil(game, ({ clearStage }) => clearStage === 'walk', 1.5)
    // Le drapeau est descendu avec le héros
    expect(game.flagY).toBe(5 * TILE)
    runUntil(game, ({ hero }) => hero.hidden, 3)
    expect(game.phase).toBe('clear')
    runUntil(game, ({ stage }) => stage === 2, 3)
    expect(game.phase).toBe('ready')
    expect(worldLabel(game)).toBe('1-2')
    expect(game.score).toBe(100 + time * POINTS.timeTick)
    // Le héros garde sa taille
    expect(game.hero.big).toBe(true)
  })

  it('après le dernier niveau, on recommence au premier avec des ennemis plus rapides', () => {
    const game = createMarioGame({ levels: [makeLevel({ '6,0': 'F', '6,6': 'X' })] })
    startPlaying(game)
    setControl(game, 'right', true)
    run(game, 8)
    expect(game.round).toBe(2)
    expect(worldLabel(game)).toBe('2-1')
    expect(enemySpeedFactor(1)).toBe(1)
    expect(enemySpeedFactor(2)).toBeGreaterThan(1)
    expect(enemySpeedFactor(20)).toBe(1.6)
  })
})

describe('mario : commandes', () => {
  it('commande inconnue ignorée, relâchement de toutes les commandes', () => {
    const game = newGame()
    setControl(game, 'fly', true)
    expect(game.input).toEqual({ left: false, right: false, jump: false, run: false })
    setControl(game, 'right', true)
    setControl(game, 'run', true)
    releaseControls(game)
    expect(Object.values(game.input).every(pressed => !pressed)).toBe(true)
  })

  it('un grand pas de temps est découpé : pas de traversée du sol', () => {
    const game = newGame()
    game.hero.vy = 330
    updateMario(game, 0.25)
    expect(game.hero.onGround).toBe(true)
    expect(game.hero.y + game.hero.h).toBe(7 * TILE)
  })
})
