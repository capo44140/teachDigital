/**
 * Logique du jeu de plateformes façon Mario sur Game Boy, sans DOM : niveaux en tuiles
 * (marioLevels.js), course et saut (plus haut tant que la touche est tenue), blocs, pièces,
 * champignon, cœur, ennemis, chrono et drapeau de fin. L'état est un objet modifié en
 * place ; MarioGame.vue l'affiche et le pilote (setControl pour les commandes, updateMario
 * à chaque image).
 *
 * Coordonnées en pixels, y vers le bas ; une tuile fait TILE pixels. Une entité est un
 * rectangle (x, y, w, h) qui avance à la vitesse (vx, vy), en pixels par seconde.
 */
import { LEVELS } from './marioLevels.js'

export { LEVELS }

export const TILE = 16
export const ROWS = 9
// Écran de la Game Boy : 160 × 144 pixels, soit 10 × 9 tuiles
export const VIEW_WIDTH = 160
export const VIEW_HEIGHT = ROWS * TILE

export const POINTS = { coin: 100, brick: 50, mushroom: 1000, knock: 100, timeTick: 10 }
// Ennemis écrasés d'affilée sans toucher le sol (ou renversés par une même carapace)
export const COMBO_POINTS = [100, 200, 400, 800, 1000, 2000, 4000, 8000]
// Bonus du drapeau selon la hauteur atteinte sur le mât (0 : en bas, 1 : tout en haut)
const FLAG_POINTS = [[0.85, 5000], [0.6, 2000], [0.4, 800], [0.2, 400], [0, 100]]

export const START_LIVES = 3
export const LEVEL_TIME = 300
export const COINS_FOR_LIFE = 100

const SOLID_TILES = new Set(['#', 'X', 'B', '?', 'M', 'H', 'U', '[', ']', '{', '}'])
// Ce que libère un bloc cogné par en dessous
const BLOCK_CONTENT = { '?': 'coin', M: 'mushroom', H: 'heart' }
const ENEMY_TYPES = { g: 'goomba', k: 'koopa' }

const HERO_WIDTH = 12
const SMALL_HEIGHT = 15
const BIG_HEIGHT = 27

const WALK_SPEED = 80
const RUN_SPEED = 130
const GROUND_ACCEL = 420
const AIR_ACCEL = 300
const SKID_DECEL = 900
const FRICTION = 480
const JUMP_SPEED = 350
// Plus on court vite, plus on saute haut
const JUMP_RUN_BONUS = 0.15
const JUMP_GRAVITY = 900
const RELEASE_GRAVITY = 2400
const FALL_GRAVITY = 1400
const MAX_FALL = 330
const STOMP_BOUNCE = 220
// Saut accepté juste après avoir quitté un bord, ou juste avant d'atterrir
const COYOTE_TIME = 0.08
const JUMP_BUFFER = 0.12
// Écrasement : le héros tombe et ses pieds sont à peine plus bas que le haut de l'ennemi
const STOMP_TOLERANCE = 8
const HURT_SECONDS = 2
const GROW_SECONDS = 0.6

const ENEMY_SPEEDS = { goomba: 32, koopa: 28 }
const SHELL_SPEED = 190
const SHELL_WAKE_SECONDS = 6
// Juste après le coup de pied, la carapace ne blesse pas le héros qui l'a lancée
const KICK_GRACE = 0.3
const SQUASHED_SECONDS = 0.5
const ITEM_SPEED = 50
const ITEM_RISE_SPEED = 32

const READY_SECONDS = 1.8
const DYING_SECONDS = 2.6
const DEATH_PAUSE = 0.5
const DEATH_JUMP_SPEED = 300
const SLIDE_SPEED = 110
const CLEAR_WALK_SPEED = 60
// Temps restant changé en points à la fin du niveau, en unités par seconde
const TIME_BONUS_RATE = 120
const CLEAR_MIN_SECONDS = 2.5
export const BUMP_SECONDS = 0.15
// Le héros est un peu en retrait du centre de l'écran : on voit venir les ennemis
const CAMERA_LEAD = 0.45
// Pas de simulation maximal : une image lente ne fait pas traverser les blocs
const MAX_STEP = 1 / 120
const EPSILON = 0.001

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const approach = (value, target, delta) =>
  value < target ? Math.min(target, value + delta) : Math.max(target, value - delta)

export const isSolid = cell => SOLID_TILES.has(cell)

export function overlaps (a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * Tuile de la case (tx, ty) : les bords gauche et droit du niveau sont des murs, le ciel
 * au-dessus et le vide sous le niveau sont libres
 */
export function tileAt (game, tx, ty) {
  if (tx < 0 || tx >= game.width) return 'X'
  if (ty < 0 || ty >= ROWS) return '.'
  return game.tiles[ty][tx]
}

const solidAt = (game, tx, ty) => isSolid(tileAt(game, tx, ty))

/**
 * Plan d'un niveau : tuiles (copie modifiable) et entités placées sur le plan
 * @param {{rows: string[], checkpoint?: number}} definition
 */
export function parseLevel (definition) {
  const tiles = definition.rows.map(row => [...row])
  const level = {
    width: tiles[0].length,
    checkpoint: definition.checkpoint || null,
    start: null,
    pole: null,
    poleBase: ROWS,
    castle: null,
    enemies: []
  }
  tiles.forEach((row, y) => row.forEach((cell, x) => {
    if (cell === 'S') level.start = { x, y }
    else if (cell === 'F') level.pole = { x, y }
    else if (cell === 'C') level.castle = { x, y }
    else if (ENEMY_TYPES[cell]) level.enemies.push({ type: ENEMY_TYPES[cell], x, y })
    else return
    row[x] = '.'
  }))
  if (level.pole) {
    // Le mât descend jusqu'au premier bloc plein
    let base = level.pole.y + 1
    while (base < ROWS && !isSolid(tiles[base][level.pole.x])) base++
    level.poleBase = base
  }
  return { tiles, level }
}

// Rangée du premier bloc plein en partant du haut (là où l'on repart)
function surfaceRow (tiles, column) {
  for (let y = 0; y < ROWS; y++) {
    if (isSolid(tiles[y][column])) return y
  }
  return ROWS
}

// Mât du drapeau : abscisse du centre, haut et bas (haut du bloc de base)
export function poleGeometry (game) {
  const { pole, poleBase } = game.level
  if (!pole) return null
  return { x: pole.x * TILE + TILE / 2, top: pole.y * TILE, bottom: poleBase * TILE }
}

export function flagPoints (height) {
  return FLAG_POINTS.find(([min]) => height >= min)[1]
}

export const enemySpeedFactor = round => Math.min(1.6, 1 + (round - 1) * 0.15)

export function worldLabel (game) {
  return `${game.round}-${game.levelIndex + 1}`
}

function createHero (big) {
  return {
    x: 0,
    y: 0,
    w: HERO_WIDTH,
    h: big ? BIG_HEIGHT : SMALL_HEIGHT,
    vx: 0,
    vy: 0,
    big,
    facing: 1,
    onGround: true,
    coyote: 0,
    hurtTimer: 0,
    growTimer: 0,
    // Distance parcourue au sol (animation de la marche)
    walkCycle: 0,
    deathJump: false,
    hidden: false
  }
}

function setBig (hero, big) {
  if (hero.big === big) return
  const height = big ? BIG_HEIGHT : SMALL_HEIGHT
  // Les pieds restent en place
  hero.y += hero.h - height
  hero.h = height
  hero.big = big
}

function createEnemy ({ type, x, y }) {
  return {
    type,
    x: x * TILE + 1,
    y: (y + 1) * TILE - 14,
    w: 14,
    h: 14,
    vx: 0,
    vy: 0,
    dir: -1,
    // walk ; shell (carapace immobile) ; spin (carapace lancée) ; squashed (écrasé) ; flipped (renversé, tombe)
    state: 'walk',
    active: false,
    timer: 0,
    kickGrace: 0,
    combo: 0
  }
}

const cameraMax = game => Math.max(0, game.width * TILE - VIEW_WIDTH)

function loadLevel (game, index, big = false) {
  const { tiles, level } = parseLevel(game.levels[index])
  game.levelIndex = index
  game.tiles = tiles
  game.level = level
  game.width = level.width

  const fromCheckpoint = game.checkpointReached && level.checkpoint !== null
  const column = fromCheckpoint ? level.checkpoint : level.start.x
  const hero = createHero(big)
  hero.x = column * TILE + (TILE - hero.w) / 2
  hero.y = (fromCheckpoint ? surfaceRow(tiles, column) : level.start.y + 1) * TILE - hero.h
  game.hero = hero
  game.cameraX = clamp(hero.x + hero.w / 2 - VIEW_WIDTH * CAMERA_LEAD, 0, cameraMax(game))

  // Au point de reprise, aucun ennemi juste à côté du héros
  game.enemies = level.enemies
    .filter(enemy => !fromCheckpoint || enemy.x > column + 3)
    .map(createEnemy)
  game.items = []
  game.effects = []
  game.bumps = []
  game.time = LEVEL_TIME
  game.stompCombo = 0
  // Drapeau en haut du mât, sous la boule
  game.flagY = level.pole ? level.pole.y * TILE + 6 : 0
  game.clearStage = null
  game.timeBonusClock = 0
  game.phase = 'ready'
  game.phaseTimer = READY_SECONDS
}

/**
 * Nouvelle partie
 * @param {{levels?: Array<{rows: string[], checkpoint?: number}>}} [options] - niveaux (injectables pour les tests)
 */
export function createMarioGame ({ levels = LEVELS } = {}) {
  const game = {
    levels,
    score: 0,
    coins: 0,
    lives: START_LIVES,
    // Tour du jeu (après le dernier niveau, on recommence au premier, ennemis plus rapides)
    round: 1,
    levelIndex: 0,
    // Niveaux joués depuis le début de la partie (1, 2, 3...)
    stage: 1,
    checkpointReached: false,
    input: { left: false, right: false, jump: false, run: false },
    jumpBuffer: 0,
    // ready → playing → (dying → ready | clear → ready | over)
    phase: 'ready',
    phaseTimer: READY_SECONDS
  }
  loadLevel(game, 0)
  return game
}

/**
 * Commande appuyée ou relâchée : left, right, jump, run
 */
export function setControl (game, name, pressed) {
  if (!(name in game.input)) return
  // Un nouvel appui sur « sauter » est retenu un court instant (saut juste avant d'atterrir)
  if (name === 'jump' && pressed && !game.input.jump) game.jumpBuffer = JUMP_BUFFER
  game.input[name] = !!pressed
}

export function releaseControls (game) {
  for (const name of Object.keys(game.input)) game.input[name] = false
}

// ─── Collisions avec les tuiles ──────────────────────────────────────────────

function rowSpan (body) {
  return [Math.floor(body.y / TILE), Math.floor((body.y + body.h - EPSILON) / TILE)]
}

function columnSpan (body) {
  return [Math.floor(body.x / TILE), Math.floor((body.x + body.w - EPSILON) / TILE)]
}

// Déplacement horizontal ; renvoie true si un bloc a arrêté l'entité
function moveX (game, body, dx) {
  if (dx === 0) return false
  body.x += dx
  const [top, bottom] = rowSpan(body)
  const tx = Math.floor((dx > 0 ? body.x + body.w - EPSILON : body.x) / TILE)
  for (let ty = top; ty <= bottom; ty++) {
    if (solidAt(game, tx, ty)) {
      body.x = dx > 0 ? tx * TILE - body.w : (tx + 1) * TILE
      return true
    }
  }
  return false
}

// Déplacement vertical ; renvoie la rangée et les colonnes des blocs touchés, ou null
function moveY (game, body, dy) {
  if (dy === 0) return null
  body.y += dy
  const [left, right] = columnSpan(body)
  const ty = Math.floor((dy > 0 ? body.y + body.h - EPSILON : body.y) / TILE)
  const columns = []
  for (let tx = left; tx <= right; tx++) {
    if (solidAt(game, tx, ty)) columns.push(tx)
  }
  if (columns.length === 0) return null
  body.y = dy > 0 ? ty * TILE - body.h : (ty + 1) * TILE
  return { ty, columns }
}

// Gravité et déplacement d'une entité qui marche (ennemi, objet) ; demi-tour contre un mur
function walkBody (game, body, speed, dt) {
  body.vy = Math.min(MAX_FALL, body.vy + FALL_GRAVITY * dt)
  if (moveX(game, body, body.dir * speed * dt)) body.dir = -body.dir
  if (moveY(game, body, body.vy * dt)) body.vy = 0
}

// ─── Points, pièces, effets ──────────────────────────────────────────────────

function addEffect (game, effect) {
  game.effects.push({ vx: 0, vy: 0, gravity: 0, ...effect })
}

function addPoints (game, value, at) {
  game.score += value
  addEffect(game, { type: 'label', label: String(value), x: at.x + at.w / 2, y: at.y, vy: -24, t: 0.8 })
}

function addLife (game, at) {
  game.lives++
  addEffect(game, { type: 'label', label: '1UP', x: at.x + at.w / 2, y: at.y, vy: -24, t: 0.8 })
}

function addCoin (game) {
  game.coins++
  game.score += POINTS.coin
  if (game.coins >= COINS_FOR_LIFE) {
    game.coins -= COINS_FOR_LIFE
    addLife(game, game.hero)
  }
}

function comboPoints (index) {
  return COMBO_POINTS[Math.min(index, COMBO_POINTS.length - 1)]
}

function collectCoins (game) {
  const hero = game.hero
  const [left, right] = columnSpan(hero)
  const [top, bottom] = rowSpan(hero)
  for (let ty = Math.max(0, top); ty <= Math.min(ROWS - 1, bottom); ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tileAt(game, tx, ty) === 'o') {
        game.tiles[ty][tx] = '.'
        addCoin(game)
      }
    }
  }
}

// ─── Blocs ───────────────────────────────────────────────────────────────────

const isAlive = enemy => enemy.state !== 'squashed' && enemy.state !== 'flipped'

// Ennemi renversé : il tombe hors de l'écran
function knockOut (game, enemy, points) {
  enemy.state = 'flipped'
  enemy.vy = -200
  enemy.vx = enemy.dir * 40
  addPoints(game, points, enemy)
}

// Ce qui se tient sur un bloc cogné saute : ennemis renversés, objets qui rebondissent
function knockOnTop (game, tx, ty) {
  const top = ty * TILE
  const onBlock = body => Math.abs(body.y + body.h - top) < 3 && body.x + body.w > tx * TILE && body.x < (tx + 1) * TILE
  for (const enemy of game.enemies) {
    if (enemy.active && isAlive(enemy) && onBlock(enemy)) knockOut(game, enemy, POINTS.knock)
  }
  for (const item of game.items) {
    if (item.rise <= 0 && onBlock(item)) item.vy = -220
  }
}

function bumpBlock (game, tx, ty) {
  const cell = tileAt(game, tx, ty)
  const content = BLOCK_CONTENT[cell]
  if (content) {
    game.tiles[ty][tx] = 'U'
    game.bumps.push({ x: tx, y: ty, t: BUMP_SECONDS })
    if (content === 'coin') {
      addCoin(game)
      addEffect(game, { type: 'coin', x: tx * TILE, y: (ty - 1) * TILE, vy: -200, gravity: 900, t: 0.45 })
    } else {
      // L'objet sort lentement du bloc, puis part vers la droite
      game.items.push({ type: content, x: tx * TILE + 1, y: ty * TILE, w: 14, h: 14, vy: 0, dir: 1, rise: TILE })
    }
  } else if (cell === 'B') {
    if (game.hero.big) {
      // Grand, le héros casse les briques
      game.tiles[ty][tx] = '.'
      game.score += POINTS.brick
      for (const [dx, dy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
        addEffect(game, {
          type: 'debris',
          x: tx * TILE + dx,
          y: ty * TILE + dy,
          vx: dx ? 60 : -60,
          vy: dy ? -180 : -260,
          gravity: FALL_GRAVITY,
          t: 1
        })
      }
    } else {
      game.bumps.push({ x: tx, y: ty, t: BUMP_SECONDS })
    }
  } else {
    return
  }
  knockOnTop(game, tx, ty)
}

// ─── Héros ───────────────────────────────────────────────────────────────────

function killHero (game) {
  const hero = game.hero
  game.phase = 'dying'
  game.phaseTimer = DYING_SECONDS
  hero.vx = 0
  hero.vy = 0
  hero.hurtTimer = 0
  hero.growTimer = 0
  setBig(hero, false)
}

function hurtHero (game) {
  const hero = game.hero
  if (!hero.big) {
    killHero(game)
    return
  }
  // Grand : il rapetisse et clignote un moment, sans pouvoir être touché
  setBig(hero, false)
  hero.hurtTimer = HURT_SECONDS
  hero.growTimer = GROW_SECONDS
}

function updateHero (game, dt) {
  const hero = game.hero
  const { input } = game
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)

  if (dir !== 0) {
    // Demi-tour : on dérape avant de repartir
    const rate = hero.vx * dir < 0 ? SKID_DECEL : hero.onGround ? GROUND_ACCEL : AIR_ACCEL
    hero.vx = approach(hero.vx, dir * (input.run ? RUN_SPEED : WALK_SPEED), rate * dt)
    hero.facing = dir
  } else if (hero.onGround) {
    hero.vx = approach(hero.vx, 0, FRICTION * dt)
  }

  hero.coyote = hero.onGround ? COYOTE_TIME : Math.max(0, hero.coyote - dt)
  game.jumpBuffer = Math.max(0, game.jumpBuffer - dt)
  if (game.jumpBuffer > 0 && hero.coyote > 0) {
    hero.vy = -(JUMP_SPEED + Math.abs(hero.vx) * JUMP_RUN_BONUS)
    hero.coyote = 0
    game.jumpBuffer = 0
  }
  // Saut plus haut tant que la touche est tenue
  let gravity = FALL_GRAVITY
  if (hero.vy < 0) gravity = input.jump ? JUMP_GRAVITY : RELEASE_GRAVITY
  hero.vy = Math.min(MAX_FALL, hero.vy + gravity * dt)

  if (moveX(game, hero, hero.vx * dt)) hero.vx = 0
  // Le bord gauche de l'écran est un mur : on ne revient pas en arrière
  if (hero.x < game.cameraX) {
    hero.x = game.cameraX
    if (hero.vx < 0) hero.vx = 0
  }

  const hit = moveY(game, hero, hero.vy * dt)
  hero.onGround = false
  if (hit) {
    if (hero.vy > 0) {
      hero.onGround = true
      game.stompCombo = 0
    } else {
      // Tête dans un bloc : celui au-dessus du centre du héros, sinon l'autre
      const center = Math.floor((hero.x + hero.w / 2) / TILE)
      bumpBlock(game, hit.columns.includes(center) ? center : hit.columns[0], hit.ty)
    }
    hero.vy = 0
  }
  if (hero.onGround) hero.walkCycle += Math.abs(hero.vx) * dt
  hero.hurtTimer = Math.max(0, hero.hurtTimer - dt)
  hero.growTimer = Math.max(0, hero.growTimer - dt)

  collectCoins(game)
  if (hero.y > VIEW_HEIGHT) killHero(game)
}

function updateCamera (game) {
  const hero = game.hero
  const target = hero.x + hero.w / 2 - VIEW_WIDTH * CAMERA_LEAD
  // La caméra ne fait qu'avancer
  game.cameraX = clamp(Math.max(game.cameraX, target), 0, cameraMax(game))
}

// ─── Ennemis et objets ───────────────────────────────────────────────────────

function updateEnemy (game, enemy, dt) {
  if (enemy.state === 'squashed') {
    enemy.timer -= dt
    return
  }
  if (enemy.state === 'flipped') {
    enemy.vy += FALL_GRAVITY * dt
    enemy.x += enemy.vx * dt
    enemy.y += enemy.vy * dt
    return
  }
  if (enemy.state === 'shell') {
    enemy.timer -= dt
    if (enemy.timer <= 0) {
      // La tortue sort de sa carapace et repart vers le héros
      enemy.state = 'walk'
      enemy.dir = game.hero.x < enemy.x ? -1 : 1
    }
  }
  enemy.kickGrace = Math.max(0, enemy.kickGrace - dt)
  let speed = 0
  if (enemy.state === 'walk') speed = ENEMY_SPEEDS[enemy.type] * enemySpeedFactor(game.round)
  if (enemy.state === 'spin') speed = SHELL_SPEED
  walkBody(game, enemy, speed, dt)
}

// Les ennemis qui se rencontrent font demi-tour ; une carapace lancée renverse tout
function collideEnemies (game) {
  const moving = game.enemies.filter(enemy => enemy.active && isAlive(enemy))
  for (let i = 0; i < moving.length; i++) {
    for (let j = i + 1; j < moving.length; j++) {
      const a = moving[i]
      const b = moving[j]
      if (!isAlive(a) || !isAlive(b) || !overlaps(a, b)) continue
      if (a.state === 'spin' || b.state === 'spin') {
        if (a.state === 'spin') knockOut(game, b, comboPoints(a.combo++))
        if (b.state === 'spin') knockOut(game, a, comboPoints(b.combo++))
      } else {
        const aLeft = a.x < b.x
        if (a.state === 'walk') a.dir = aLeft ? -1 : 1
        if (b.state === 'walk') b.dir = aLeft ? 1 : -1
      }
    }
  }
}

function kickShell (shell, dir) {
  shell.state = 'spin'
  shell.dir = dir
  shell.kickGrace = KICK_GRACE
  shell.combo = 0
}

function heroMeetsEnemies (game) {
  const hero = game.hero
  for (const enemy of game.enemies) {
    if (!enemy.active || !isAlive(enemy) || !overlaps(hero, enemy)) continue
    const stomp = hero.vy > 0 && hero.y + hero.h - enemy.y < STOMP_TOLERANCE
    const bounce = () => { hero.vy = -(game.input.jump ? JUMP_SPEED : STOMP_BOUNCE) }

    if (enemy.state === 'shell') {
      // Carapace immobile : on la lance, en sautant dessus ou en la poussant
      if (enemy.kickGrace > 0) continue
      kickShell(enemy, hero.x + hero.w / 2 < enemy.x + enemy.w / 2 ? 1 : -1)
      if (stomp) bounce()
      continue
    }
    if (stomp) {
      bounce()
      addPoints(game, comboPoints(game.stompCombo++), enemy)
      if (enemy.type === 'goomba') {
        enemy.state = 'squashed'
        enemy.timer = SQUASHED_SECONDS
      } else {
        // Tortue (ou carapace lancée) : carapace immobile, que le rebond ne relance pas aussitôt
        enemy.state = 'shell'
        enemy.timer = SHELL_WAKE_SECONDS
        enemy.kickGrace = KICK_GRACE
      }
      continue
    }
    if (enemy.state === 'spin' && enemy.kickGrace > 0) continue
    if (hero.hurtTimer > 0) continue
    hurtHero(game)
    return
  }
}

function updateItems (game, dt) {
  const hero = game.hero
  for (const item of game.items) {
    if (item.rise > 0) {
      const rise = Math.min(item.rise, ITEM_RISE_SPEED * dt)
      item.y -= rise
      item.rise -= rise
      continue
    }
    walkBody(game, item, ITEM_SPEED, dt)
    if (!overlaps(hero, item)) continue
    item.taken = true
    if (item.type === 'heart') {
      addLife(game, item)
    } else {
      addPoints(game, POINTS.mushroom, item)
      if (!hero.big) {
        setBig(hero, true)
        hero.growTimer = GROW_SECONDS
      }
    }
  }
  game.items = game.items.filter(item => !item.taken && item.y < VIEW_HEIGHT && item.x + item.w > game.cameraX - TILE)
}

function updateEffects (game, dt) {
  for (const effect of game.effects) {
    effect.t -= dt
    effect.vy += effect.gravity * dt
    effect.x += effect.vx * dt
    effect.y += effect.vy * dt
  }
  game.effects = game.effects.filter(effect => effect.t > 0)
  for (const bump of game.bumps) bump.t -= dt
  game.bumps = game.bumps.filter(bump => bump.t > 0)
}

function updateEnemies (game, dt) {
  const viewRight = game.cameraX + VIEW_WIDTH
  for (const enemy of game.enemies) {
    // Un ennemi se met en route quand il arrive au bord de l'écran
    if (!enemy.active && enemy.x < viewRight + TILE) enemy.active = true
    if (enemy.active) updateEnemy(game, enemy, dt)
  }
  collideEnemies(game)
  game.enemies = game.enemies.filter(enemy =>
    !(enemy.state === 'squashed' && enemy.timer <= 0) &&
    enemy.y < VIEW_HEIGHT + TILE &&
    !(enemy.active && enemy.x + enemy.w < game.cameraX - 2 * TILE) &&
    !(enemy.state === 'spin' && enemy.x > viewRight + 3 * TILE))
}

// ─── Fin de niveau ───────────────────────────────────────────────────────────

function startClear (game, pole) {
  const hero = game.hero
  const height = clamp((pole.bottom - hero.y - hero.h) / (pole.bottom - pole.top), 0, 1)
  hero.x = pole.x - 1 - hero.w
  hero.vx = 0
  hero.vy = 0
  hero.facing = 1
  hero.hurtTimer = 0
  addPoints(game, flagPoints(height), hero)
  game.phase = 'clear'
  game.clearStage = 'slide'
  game.phaseTimer = 0
  game.time = Math.ceil(game.time)
}

function nextLevel (game) {
  game.stage++
  game.checkpointReached = false
  let index = game.levelIndex + 1
  if (index >= game.levels.length) {
    index = 0
    game.round++
  }
  // Le héros garde sa taille d'un niveau à l'autre
  loadLevel(game, index, game.hero.big)
}

function stepClear (game, dt) {
  const hero = game.hero
  const pole = poleGeometry(game)
  game.phaseTimer += dt
  if (game.clearStage === 'slide') {
    // Glissade le long du mât ; le héros attend en bas que le drapeau soit descendu
    hero.y = Math.min(pole.bottom - hero.h, hero.y + SLIDE_SPEED * dt)
    game.flagY = Math.min(pole.bottom - TILE, game.flagY + SLIDE_SPEED * dt)
    if (hero.y >= pole.bottom - hero.h && game.flagY >= pole.bottom - TILE) game.clearStage = 'walk'
    return
  }
  // Marche jusqu'au château ; pendant ce temps, le temps restant devient des points
  if (!hero.hidden) {
    hero.vx = CLEAR_WALK_SPEED
    hero.vy = Math.min(MAX_FALL, hero.vy + FALL_GRAVITY * dt)
    moveX(game, hero, hero.vx * dt)
    const hit = moveY(game, hero, hero.vy * dt)
    hero.onGround = !!hit && hero.vy > 0
    if (hit) hero.vy = 0
    hero.walkCycle += hero.vx * dt
    updateCamera(game)
    const castle = game.level.castle
    if (castle && hero.x + hero.w / 2 >= castle.x * TILE + TILE / 2) hero.hidden = true
  }
  game.timeBonusClock += TIME_BONUS_RATE * dt
  while (game.timeBonusClock >= 1 && game.time > 0) {
    game.timeBonusClock -= 1
    game.time--
    game.score += POINTS.timeTick
  }
  if (game.time <= 0 && game.phaseTimer >= CLEAR_MIN_SECONDS) nextLevel(game)
}

function stepDying (game, dt) {
  const hero = game.hero
  game.phaseTimer -= dt
  // Petit temps d'arrêt, puis le héros saute et tombe hors de l'écran
  if (game.phaseTimer < DYING_SECONDS - DEATH_PAUSE && hero.y < VIEW_HEIGHT) {
    if (!hero.deathJump) {
      hero.deathJump = true
      hero.vy = -DEATH_JUMP_SPEED
    }
    hero.vy += FALL_GRAVITY * dt
    hero.y += hero.vy * dt
  }
  if (game.phaseTimer > 0) return
  game.lives--
  if (game.lives <= 0) {
    game.phase = 'over'
    return
  }
  loadLevel(game, game.levelIndex)
}

// ─── Boucle ──────────────────────────────────────────────────────────────────

function step (game, dt) {
  updateEffects(game, dt)
  if (game.phase === 'ready') {
    game.phaseTimer -= dt
    if (game.phaseTimer <= 0) game.phase = 'playing'
    return
  }
  if (game.phase === 'dying') {
    stepDying(game, dt)
    return
  }
  if (game.phase === 'clear') {
    stepClear(game, dt)
    return
  }
  if (game.phase !== 'playing') return

  game.time = Math.max(0, game.time - dt)
  if (game.time <= 0) {
    killHero(game)
    return
  }
  updateHero(game, dt)
  if (game.phase !== 'playing') return
  updateCamera(game)

  const { level } = game
  if (level.checkpoint !== null && game.hero.x >= level.checkpoint * TILE) game.checkpointReached = true

  updateEnemies(game, dt)
  updateItems(game, dt)
  heroMeetsEnemies(game)
  if (game.phase !== 'playing') return

  // Drapeau atteint (en touchant le mât ou en butant contre son socle)
  const pole = poleGeometry(game)
  if (pole && game.hero.x + game.hero.w >= pole.x - TILE / 2) startClear(game, pole)
}

/**
 * Avance la partie de dt secondes (découpé en pas courts)
 */
export function updateMario (game, dt) {
  let remaining = Math.min(Math.max(dt, 0), 0.25)
  // Reste infime (arrondis) ignoré : un pas minuscule ne détecterait pas le sol sous les pieds
  while (remaining > 1e-6 && game.phase !== 'over') {
    const delta = Math.min(remaining, MAX_STEP)
    step(game, delta)
    remaining -= delta
  }
}
