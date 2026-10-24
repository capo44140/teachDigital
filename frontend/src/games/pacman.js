/**
 * Logique de Pac-Man, sans DOM : labyrinthe, déplacements case par case, pastilles,
 * fantômes, vies et niveaux. L'état est un objet modifié en place ; PacmanGame.vue
 * l'affiche et le pilote (updatePacman à chaque image).
 *
 * Une entité est sur la case (x, y) et avance vers la case voisine dans la direction `dir`,
 * `progress` (0 → 1) mesurant le chemin parcouru entre les deux centres.
 */

// # mur, . pastille, o super-pastille, - porte de la maison des fantômes, P départ de Pac-Man
export const MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '####.#       #.####',
  '####.# ##-## #.####',
  '    .  #   #  .    ',
  '####.# ##### #.####',
  '####.#       #.####',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################'
]

export const WIDTH = MAZE[0].length
export const HEIGHT = MAZE.length

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
}

// Sortie de la maison (au-dessus de la porte) et centre de la maison
const HOUSE_EXIT = { x: 9, y: 7 }
const HOUSE_CENTER = { x: 9, y: 9 }

// Couleur, case de départ, attente avant de sortir (s) et coin de dispersion de chaque fantôme
const GHOSTS = [
  { name: 'blinky', color: '#ef4444', start: { x: 9, y: 7 }, release: 0, corner: { x: WIDTH - 2, y: -2 } },
  { name: 'pinky', color: '#f472b6', start: { x: 9, y: 9 }, release: 1, corner: { x: 1, y: -2 } },
  { name: 'inky', color: '#22d3ee', start: { x: 8, y: 9 }, release: 5, corner: { x: WIDTH - 1, y: HEIGHT } },
  { name: 'clyde', color: '#fb923c', start: { x: 10, y: 9 }, release: 9, corner: { x: 0, y: HEIGHT } }
]

// Alternance dispersion / poursuite (s) ; ensuite, poursuite permanente
const MODE_SCHEDULE = [
  { mode: 'scatter', duration: 7 },
  { mode: 'chase', duration: 20 },
  { mode: 'scatter', duration: 7 },
  { mode: 'chase', duration: 20 },
  { mode: 'scatter', duration: 5 }
]

export const POINTS = { pellet: 10, power: 50, ghost: 200 }
const START_LIVES = 3
const READY_SECONDS = 1.8
const DYING_SECONDS = 1.4
const LEVEL_CLEAR_SECONDS = 1.6
// Pas de simulation maximal : une image lente ne fait pas traverser les murs
const MAX_STEP = 1 / 60

const isOpposite = (a, b) => !!a && !!b && a.x === -b.x && a.y === -b.y
const opposite = dir => Object.values(DIRECTIONS).find(other => isOpposite(other, dir))
const wrapX = x => (x + WIDTH) % WIDTH

function findCell (char) {
  for (let y = 0; y < HEIGHT; y++) {
    const x = MAZE[y].indexOf(char)
    if (x !== -1) return { x, y }
  }
  return null
}

const PACMAN_START = findCell('P')

// Pastilles restantes : Set de clés « x,y »
function createPellets () {
  const pellets = new Set()
  const powers = new Set()
  MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '.') pellets.add(`${x},${y}`)
    if (cell === 'o') powers.add(`${x},${y}`)
  }))
  return { pellets, powers }
}

/**
 * Une entité peut-elle entrer dans la case (x, y) ? Le tunnel relie les bords gauche et droit ;
 * la porte de la maison ne laisse passer que les fantômes qui en sortent ou y rentrent.
 */
export function isPassable (x, y, { door = false } = {}) {
  if (y < 0 || y >= HEIGHT) return false
  const cell = MAZE[y][wrapX(x)]
  if (cell === '#') return false
  if (cell === '-') return door
  return true
}

function canGo (entity, dir, options) {
  return !!dir && isPassable(entity.x + dir.x, entity.y + dir.y, options)
}

// Position continue (en cases) d'une entité, pour l'affichage et les collisions
export function entityPosition (entity) {
  const dir = entity.dir || { x: 0, y: 0 }
  return { x: entity.x + dir.x * entity.progress, y: entity.y + dir.y * entity.progress }
}

// Départ vers la gauche, comme dans le jeu d'origine
function createPacman () {
  const { left } = DIRECTIONS
  return { x: PACMAN_START.x, y: PACMAN_START.y, dir: left, nextDir: left, progress: 0, facing: left }
}

function createGhosts () {
  return GHOSTS.map(ghost => ({
    name: ghost.name,
    color: ghost.color,
    corner: ghost.corner,
    x: ghost.start.x,
    y: ghost.start.y,
    dir: null,
    progress: 0,
    // house : attend dans la maison ; leaving : en sort ; active : dans le labyrinthe ; eaten : yeux qui rentrent
    state: ghost.release === 0 ? 'active' : 'house',
    releaseTimer: ghost.release,
    frightened: false
  }))
}

/**
 * Nouvelle partie
 * @param {{random?: () => number}} [options] - générateur aléatoire (injectable pour les tests)
 */
export function createPacmanGame ({ random = Math.random } = {}) {
  const game = {
    random,
    score: 0,
    lives: START_LIVES,
    level: 1,
    // ready → playing → (dying → ready | levelClear → ready | over)
    phase: 'ready',
    phaseTimer: READY_SECONDS,
    modeIndex: 0,
    modeTimer: MODE_SCHEDULE[0].duration,
    frightenedTimer: 0,
    ghostCombo: 0,
    pacman: createPacman(),
    ghosts: createGhosts(),
    ...createPellets()
  }
  return game
}

export function setDirection (game, name) {
  const dir = DIRECTIONS[name]
  if (dir) game.pacman.nextDir = dir
}

export function pelletsLeft (game) {
  return game.pellets.size + game.powers.size
}

export function frightenedDuration (level) {
  return Math.max(2, 8 - level)
}

const pacmanSpeed = level => Math.min(9, 7 + (level - 1) * 0.3)

function ghostSpeed (game, ghost) {
  if (ghost.state === 'eaten') return 12
  if (ghost.state === 'house' || ghost.state === 'leaving') return 4
  if (ghost.frightened) return 3.8
  // Ralentis dans le tunnel
  if (ghost.y === 9 && (ghost.x < 4 || ghost.x > WIDTH - 5)) return 3.5
  return Math.min(8.5, 6.4 + (game.level - 1) * 0.3)
}

function currentMode (game) {
  return MODE_SCHEDULE[game.modeIndex]?.mode || 'chase'
}

// Case visée par un fantôme selon son caractère
function ghostTarget (game, ghost) {
  if (ghost.state === 'eaten') return HOUSE_CENTER
  if (ghost.state === 'leaving') return HOUSE_EXIT
  if (currentMode(game) === 'scatter') return ghost.corner

  const pac = game.pacman
  const facing = pac.dir || pac.facing
  switch (ghost.name) {
    case 'pinky':
      // Embuscade : 4 cases devant Pac-Man
      return { x: pac.x + facing.x * 4, y: pac.y + facing.y * 4 }
    case 'inky': {
      // Encerclement : symétrique de Blinky par rapport à la case 2 cases devant Pac-Man
      const blinky = game.ghosts.find(g => g.name === 'blinky')
      const ahead = { x: pac.x + facing.x * 2, y: pac.y + facing.y * 2 }
      return { x: ahead.x * 2 - blinky.x, y: ahead.y * 2 - blinky.y }
    }
    case 'clyde': {
      // Timide : poursuit de loin, se disperse de près
      const distance = Math.hypot(ghost.x - pac.x, ghost.y - pac.y)
      return distance > 6 ? { x: pac.x, y: pac.y } : ghost.corner
    }
    default:
      return { x: pac.x, y: pac.y }
  }
}

// Direction d'un fantôme arrivé au centre d'une case : jamais de demi-tour sauf impasse
function chooseGhostDirection (game, ghost) {
  const door = ghost.state === 'leaving' || ghost.state === 'eaten'
  const options = Object.values(DIRECTIONS).filter(dir => canGo(ghost, dir, { door }))
  const forward = options.filter(dir => !isOpposite(dir, ghost.dir))
  const candidates = forward.length > 0 ? forward : options
  if (candidates.length === 0) return null

  if (ghost.frightened) {
    return candidates[Math.floor(game.random() * candidates.length)]
  }
  const target = ghostTarget(game, ghost)
  let best = candidates[0]
  let bestDistance = Infinity
  for (const dir of candidates) {
    const distance = Math.hypot(ghost.x + dir.x - target.x, ghost.y + dir.y - target.y)
    if (distance < bestDistance) {
      best = dir
      bestDistance = distance
    }
  }
  return best
}

function reverse (entity) {
  if (!entity.dir) return
  entity.x = wrapX(entity.x + entity.dir.x)
  entity.y += entity.dir.y
  entity.dir = opposite(entity.dir)
  entity.progress = 1 - entity.progress
}

function eatAt (game, x, y) {
  const key = `${x},${y}`
  if (game.pellets.delete(key)) {
    game.score += POINTS.pellet
  } else if (game.powers.delete(key)) {
    game.score += POINTS.power
    game.frightenedTimer = frightenedDuration(game.level)
    game.ghostCombo = 0
    for (const ghost of game.ghosts) {
      if (ghost.state === 'active') {
        ghost.frightened = true
        reverse(ghost)
      }
    }
  }
}

function movePacman (game, dt) {
  const pac = game.pacman
  // Demi-tour immédiat, même entre deux cases
  if (pac.dir && isOpposite(pac.nextDir, pac.dir)) {
    reverse(pac)
    pac.facing = pac.dir
  }
  if (!pac.dir) {
    if (!canGo(pac, pac.nextDir)) return
    pac.dir = pac.nextDir
    pac.facing = pac.dir
  }

  pac.progress += pacmanSpeed(game.level) * dt
  while (pac.progress >= 1) {
    pac.progress -= 1
    pac.x = wrapX(pac.x + pac.dir.x)
    pac.y += pac.dir.y
    eatAt(game, pac.x, pac.y)
    if (canGo(pac, pac.nextDir)) {
      pac.dir = pac.nextDir
      pac.facing = pac.dir
    } else if (!canGo(pac, pac.dir)) {
      // Mur devant : arrêt au centre de la case
      pac.dir = null
      pac.progress = 0
      return
    }
  }
}

function moveGhost (game, ghost, dt) {
  if (ghost.state === 'house') {
    ghost.releaseTimer -= dt
    if (ghost.releaseTimer <= 0) {
      ghost.state = 'leaving'
      ghost.dir = null
    }
    return
  }

  if (!ghost.dir) {
    ghost.dir = chooseGhostDirection(game, ghost)
    ghost.progress = 0
    if (!ghost.dir) return
  }

  ghost.progress += ghostSpeed(game, ghost) * dt
  while (ghost.progress >= 1) {
    ghost.progress -= 1
    ghost.x = wrapX(ghost.x + ghost.dir.x)
    ghost.y += ghost.dir.y

    if (ghost.state === 'leaving' && ghost.x === HOUSE_EXIT.x && ghost.y === HOUSE_EXIT.y) {
      ghost.state = 'active'
    } else if (ghost.state === 'eaten' && ghost.x === HOUSE_CENTER.x && ghost.y === HOUSE_CENTER.y) {
      // Rentré à la maison : il ressort aussitôt
      ghost.state = 'leaving'
      ghost.dir = null
    }
    ghost.dir = chooseGhostDirection(game, ghost)
    if (!ghost.dir) {
      ghost.progress = 0
      return
    }
  }
}

function resetPositions (game) {
  game.pacman = createPacman()
  game.ghosts = createGhosts()
  game.frightenedTimer = 0
  game.ghostCombo = 0
}

function checkCollisions (game) {
  const pac = entityPosition(game.pacman)
  for (const ghost of game.ghosts) {
    if (ghost.state !== 'active') continue
    const pos = entityPosition(ghost)
    if (Math.hypot(pac.x - pos.x, pac.y - pos.y) > 0.6) continue
    if (ghost.frightened) {
      // Fantôme mangé : 200, 400, 800, 1600 points pendant une même super-pastille
      game.score += POINTS.ghost * 2 ** game.ghostCombo
      game.ghostCombo++
      ghost.state = 'eaten'
      ghost.frightened = false
    } else {
      game.phase = 'dying'
      game.phaseTimer = DYING_SECONDS
      return
    }
  }
}

function updateModes (game, dt) {
  if (game.frightenedTimer > 0) {
    // Le cycle dispersion / poursuite est suspendu pendant la peur
    game.frightenedTimer -= dt
    if (game.frightenedTimer <= 0) {
      game.frightenedTimer = 0
      for (const ghost of game.ghosts) ghost.frightened = false
    }
    return
  }
  if (game.modeIndex < MODE_SCHEDULE.length) {
    game.modeTimer -= dt
    if (game.modeTimer <= 0) {
      game.modeIndex++
      game.modeTimer = MODE_SCHEDULE[game.modeIndex]?.duration || 0
      // Changement de mode : les fantômes font demi-tour
      for (const ghost of game.ghosts) {
        if (ghost.state === 'active') reverse(ghost)
      }
    }
  }
}

function step (game, dt) {
  if (game.phase === 'ready' || game.phase === 'dying' || game.phase === 'levelClear') {
    game.phaseTimer -= dt
    if (game.phaseTimer > 0) return
    if (game.phase === 'dying') {
      game.lives--
      if (game.lives <= 0) {
        game.phase = 'over'
        return
      }
      resetPositions(game)
    } else if (game.phase === 'levelClear') {
      game.level++
      Object.assign(game, createPellets())
      game.modeIndex = 0
      game.modeTimer = MODE_SCHEDULE[0].duration
      resetPositions(game)
    }
    if (game.phase !== 'ready') {
      game.phase = 'ready'
      game.phaseTimer = READY_SECONDS
      return
    }
    game.phase = 'playing'
    return
  }
  if (game.phase !== 'playing') return

  updateModes(game, dt)
  movePacman(game, dt)
  checkCollisions(game)
  if (game.phase !== 'playing') return
  if (pelletsLeft(game) === 0) {
    game.phase = 'levelClear'
    game.phaseTimer = LEVEL_CLEAR_SECONDS
    return
  }
  for (const ghost of game.ghosts) moveGhost(game, ghost, dt)
  checkCollisions(game)
}

/**
 * Avance la partie de dt secondes (découpé en pas courts)
 */
export function updatePacman (game, dt) {
  let remaining = Math.min(Math.max(dt, 0), 0.25)
  while (remaining > 0 && game.phase !== 'over') {
    const delta = Math.min(remaining, MAX_STEP)
    step(game, delta)
    remaining -= delta
  }
}

// Phase de la partie où la peur touche à sa fin (les fantômes clignotent)
export function isFrightenedEnding (game) {
  return game.frightenedTimer > 0 && game.frightenedTimer < 2
}
