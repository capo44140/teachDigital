/**
 * Logique de Tetris, sans DOM : grille, pièces, rotations, lignes, score et niveau.
 * L'état est un objet modifié en place ; TetrisGame.vue l'affiche et le pilote.
 */

export const COLS = 10
export const ROWS = 20

// Matrices carrées (rotation autour du centre) et couleurs des pièces
export const PIECES = {
  I: { color: '#22d3ee', shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  J: { color: '#3b82f6', shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: '#f97316', shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  O: { color: '#facc15', shape: [[1, 1], [1, 1]] },
  S: { color: '#22c55e', shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  T: { color: '#a855f7', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  Z: { color: '#ef4444', shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] }
}

const PIECE_TYPES = Object.keys(PIECES)

// Points pour 1, 2, 3 ou 4 lignes d'un coup, multipliés par le niveau
const LINE_POINTS = [0, 100, 300, 500, 800]
const LINES_PER_LEVEL = 10

// Décalages essayés quand une rotation touche un mur ou une pièce
const WALL_KICKS = [0, -1, 1, -2, 2]

export function createBoard () {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

// Rotation horaire d'une matrice carrée
export function rotateMatrix (matrix) {
  const size = matrix.length
  return matrix.map((row, y) => row.map((_, x) => matrix[size - 1 - x][y]))
}

// Cases occupées par une pièce, en coordonnées de la grille
export function pieceCells (piece) {
  const cells = []
  piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    if (filled) cells.push({ x: piece.x + x, y: piece.y + y })
  }))
  return cells
}

// La pièce sort-elle de la grille ou chevauche-t-elle une case remplie ? (au-dessus de la grille : permis)
export function collides (board, piece) {
  return pieceCells(piece).some(({ x, y }) =>
    x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null))
}

// Sac de 7 : chaque pièce sort une fois par série, dans un ordre aléatoire
export function createBag (random = Math.random) {
  const bag = [...PIECE_TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

function takeNextType (game) {
  if (game.queue.length === 0) game.queue = createBag(game.random)
  return game.queue.shift()
}

function createPiece (type) {
  const shape = PIECES[type].shape.map(row => [...row])
  return { type, shape, x: Math.floor((COLS - shape.length) / 2), y: type === 'I' ? -1 : 0 }
}

// Intervalle de chute automatique (ms) : de plus en plus rapide avec le niveau
export function dropInterval (level) {
  return Math.max(90, 800 - (level - 1) * 70)
}

function spawn (game) {
  game.current = createPiece(game.nextType)
  game.nextType = takeNextType(game)
  if (collides(game.board, game.current)) {
    game.over = true
  }
}

/**
 * Nouvelle partie
 * @param {() => number} [random] - générateur aléatoire (injectable pour les tests)
 */
export function createTetrisGame (random = Math.random) {
  const game = {
    board: createBoard(),
    current: null,
    nextType: null,
    queue: [],
    random,
    score: 0,
    lines: 0,
    level: 1,
    over: false
  }
  game.nextType = takeNextType(game)
  spawn(game)
  return game
}

function tryMove (game, dx, dy) {
  if (game.over) return false
  const moved = { ...game.current, x: game.current.x + dx, y: game.current.y + dy }
  if (collides(game.board, moved)) return false
  game.current = moved
  return true
}

export function moveLeft (game) {
  return tryMove(game, -1, 0)
}

export function moveRight (game) {
  return tryMove(game, 1, 0)
}

export function rotate (game) {
  if (game.over || game.current.type === 'O') return false
  const shape = rotateMatrix(game.current.shape)
  for (const kick of WALL_KICKS) {
    const rotated = { ...game.current, shape, x: game.current.x + kick }
    if (!collides(game.board, rotated)) {
      game.current = rotated
      return true
    }
  }
  return false
}

// Supprime les lignes pleines ; renvoie leur nombre
function clearLines (game) {
  const remaining = game.board.filter(row => row.some(cell => cell === null))
  const cleared = ROWS - remaining.length
  if (cleared > 0) {
    game.board = [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...remaining]
    game.score += LINE_POINTS[cleared] * game.level
    game.lines += cleared
    game.level = Math.floor(game.lines / LINES_PER_LEVEL) + 1
  }
  return cleared
}

// Pose la pièce, efface les lignes, fait apparaître la suivante ; renvoie le nombre de lignes
function lock (game) {
  const color = PIECES[game.current.type].color
  let outside = false
  for (const { x, y } of pieceCells(game.current)) {
    if (y < 0) {
      outside = true
    } else {
      game.board[y][x] = color
    }
  }
  // Pièce posée en partie hors de la grille : la pile a atteint le haut
  if (outside) {
    game.over = true
    return 0
  }
  const cleared = clearLines(game)
  spawn(game)
  return cleared
}

/**
 * Chute d'une case (gravité ou touche bas) ; la pièce est posée si elle ne peut plus descendre
 * @param {boolean} [soft] - descente demandée par le joueur : 1 point par case
 * @returns {{locked: boolean, cleared: number}}
 */
export function stepDown (game, soft = false) {
  if (game.over) return { locked: false, cleared: 0 }
  if (tryMove(game, 0, 1)) {
    if (soft) game.score += 1
    return { locked: false, cleared: 0 }
  }
  return { locked: true, cleared: lock(game) }
}

// Chute immédiate : 2 points par case parcourue
export function hardDrop (game) {
  if (game.over) return { locked: false, cleared: 0 }
  let distance = 0
  while (tryMove(game, 0, 1)) distance++
  game.score += distance * 2
  return { locked: true, cleared: lock(game) }
}

// Ligne où la pièce courante atterrirait (pièce « fantôme »)
export function ghostY (game) {
  let y = game.current.y
  while (!collides(game.board, { ...game.current, y: y + 1 })) y++
  return y
}
