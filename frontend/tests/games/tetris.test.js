import { describe, it, expect } from 'vitest'
import {
  COLS,
  ROWS,
  PIECES,
  createBoard,
  createBag,
  createTetrisGame,
  rotateMatrix,
  collides,
  moveLeft,
  moveRight,
  rotate,
  stepDown,
  hardDrop,
  ghostY,
  dropInterval
} from '../../src/games/tetris.js'

// Générateur déterministe : le sac garde l'ordre I, J, L, O, S, T, Z
const noShuffle = () => 0.999999

function fillRow (board, y, except = []) {
  board[y] = board[y].map((_, x) => (except.includes(x) ? null : '#999'))
}

describe('tetris : pièces et grille', () => {
  it('le sac contient les 7 pièces une fois chacune', () => {
    const bag = createBag(Math.random)
    expect([...bag].sort()).toEqual(Object.keys(PIECES).sort())
  })

  it('rotation horaire d\'une matrice', () => {
    expect(rotateMatrix([[1, 0, 0], [1, 1, 1], [0, 0, 0]])).toEqual([[0, 1, 1], [0, 1, 0], [0, 1, 0]])
  })

  it('collisions : murs, fond et cases remplies ; au-dessus de la grille permis', () => {
    const board = createBoard()
    const piece = { shape: PIECES.O.shape, x: 0, y: 0 }
    expect(collides(board, piece)).toBe(false)
    expect(collides(board, { ...piece, x: -1 })).toBe(true)
    expect(collides(board, { ...piece, x: COLS - 1 })).toBe(true)
    expect(collides(board, { ...piece, y: ROWS - 1 })).toBe(true)
    expect(collides(board, { ...piece, y: -1 })).toBe(false)
    board[1][1] = '#fff'
    expect(collides(board, piece)).toBe(true)
  })
})

describe('tetris : partie', () => {
  it('nouvelle partie : pièce centrée en haut, pièce suivante connue', () => {
    const game = createTetrisGame(noShuffle)
    expect(game.current.type).toBe('I')
    expect(game.nextType).toBe('J')
    expect(game.current.x).toBe(3)
    expect(game).toMatchObject({ score: 0, lines: 0, level: 1, over: false })
  })

  it('déplacements bloqués par les murs', () => {
    const game = createTetrisGame(noShuffle)
    for (let i = 0; i < 10; i++) moveLeft(game)
    expect(game.current.x).toBe(0)
    expect(moveLeft(game)).toBe(false)
    for (let i = 0; i < 10; i++) moveRight(game)
    expect(game.current.x).toBe(COLS - 4)
  })

  it('rotation contre un mur : décalée pour tenir dans la grille', () => {
    const game = createTetrisGame(noShuffle)
    rotate(game) // I vertical
    for (let i = 0; i < 10; i++) moveRight(game)
    expect(rotate(game)).toBe(true)
    expect(collides(game.board, game.current)).toBe(false)
  })

  it('la pièce O ne tourne pas', () => {
    const game = createTetrisGame(noShuffle)
    game.current = { type: 'O', shape: PIECES.O.shape, x: 4, y: 0 }
    expect(rotate(game)).toBe(false)
  })

  it('descente douce : 1 point par case ; pose au fond puis pièce suivante', () => {
    const game = createTetrisGame(noShuffle)
    expect(stepDown(game, true)).toEqual({ locked: false, cleared: 0 })
    expect(game.score).toBe(1)
    let result
    do {
      result = stepDown(game)
    } while (!result.locked)
    expect(game.board[ROWS - 1].filter(Boolean)).toHaveLength(4)
    expect(game.current.type).toBe('J')
  })

  it('chute immédiate : 2 points par case, pièce fantôme au même endroit', () => {
    const game = createTetrisGame(noShuffle)
    const landing = ghostY(game)
    const distance = landing - game.current.y
    hardDrop(game)
    expect(game.score).toBe(distance * 2)
    expect(game.board[ROWS - 1].filter(Boolean)).toHaveLength(4)
  })

  it('ligne complète effacée : 100 points × niveau, les lignes du dessus descendent', () => {
    const game = createTetrisGame(noShuffle)
    // Ligne du bas : il manque 4 cases, comblées par la barre I horizontale
    fillRow(game.board, ROWS - 1, [3, 4, 5, 6])
    game.board[ROWS - 2][0] = '#123'
    const dropPoints = (ghostY(game) - game.current.y) * 2
    hardDrop(game)
    expect(game.lines).toBe(1)
    expect(game.score).toBe(dropPoints + 100)
    expect(game.board[ROWS - 1][0]).toBe('#123')
    expect(game.board[ROWS - 1].filter(Boolean)).toHaveLength(1)
  })

  it('quatre lignes d\'un coup avec la barre verticale : 800 points', () => {
    const game = createTetrisGame(noShuffle)
    for (let y = ROWS - 4; y < ROWS; y++) fillRow(game.board, y, [0])
    rotate(game)
    while (moveLeft(game));
    const dropPoints = (ghostY(game) - game.current.y) * 2
    hardDrop(game)
    expect(game.lines).toBe(4)
    expect(game.score).toBe(dropPoints + 800)
    expect(game.board.every(row => row.every(cell => cell === null))).toBe(true)
  })

  it('niveau supérieur toutes les 10 lignes, chute plus rapide', () => {
    const game = createTetrisGame(noShuffle)
    game.lines = 9
    fillRow(game.board, ROWS - 1, [3, 4, 5, 6])
    hardDrop(game)
    expect(game.level).toBe(2)
    expect(dropInterval(2)).toBeLessThan(dropInterval(1))
    expect(dropInterval(50)).toBe(90)
  })

  it('pile jusqu\'en haut : partie terminée, plus aucune action', () => {
    const game = createTetrisGame(noShuffle)
    for (let y = 0; y < ROWS; y++) fillRow(game.board, y, [0])
    hardDrop(game)
    expect(game.over).toBe(true)
    expect(moveLeft(game)).toBe(false)
    expect(stepDown(game)).toEqual({ locked: false, cleared: 0 })
    expect(hardDrop(game)).toEqual({ locked: false, cleared: 0 })
  })
})
