<template>
  <div class="mario">
    <div class="mario-hud">
      <dl class="mario-stats">
        <div><dt>Score</dt><dd>{{ score }}</dd></div>
        <div><dt>Record</dt><dd>{{ Math.max(record, score) }}</dd></div>
        <div><dt>Pièces</dt><dd>{{ coins }}</dd></div>
        <div><dt>Monde</dt><dd>{{ world }}</dd></div>
        <div><dt>Temps</dt><dd :class="{ 'mario-hurry': time <= HURRY_TIME }">{{ time }}</dd></div>
        <div><dt>Vies</dt><dd>{{ lives }}</dd></div>
      </dl>
      <button
        type="button"
        class="game-pause-button"
        :disabled="status !== 'playing' && status !== 'paused'"
        @click="togglePause"
      >
        {{ status === 'paused' ? 'Reprendre' : 'Pause' }}
      </button>
    </div>

    <!-- Console façon Game Boy : écran, croix directionnelle, boutons A et B -->
    <div class="mario-console">
      <div class="mario-bezel">
        <span class="mario-led" :class="{ 'mario-led-on': status === 'playing' }" aria-hidden="true"></span>
        <div class="game-stage">
          <canvas
            ref="canvas"
            class="mario-screen"
            role="img"
            :aria-label="`Monde ${world}. Score ${score}, ${coins} pièces, ${lives} vies.`"
          ></canvas>
          <GameOverlay
            :state="overlayState"
            title="Mario Bros"
            :score="score"
            :best-score="record"
            :help="HELP"
            @start="start"
            @resume="resume"
            @restart="restart"
          />
        </div>
      </div>

      <!-- Boutons maintenus : on avance ou on court tant qu'on appuie -->
      <div class="mario-pad" role="group" aria-label="Commandes de Mario">
        <div class="mario-dpad">
          <button
            v-for="button in PAD"
            :key="button.control"
            type="button"
            class="mario-dpad-button"
            :aria-label="button.label"
            @pointerdown.prevent="press(button.control)"
            @pointerup="release(button.control)"
            @pointerleave="release(button.control)"
            @pointercancel="release(button.control)"
            @contextmenu.prevent
            @click="keyboardClick(button.control, $event)"
          >
            <span aria-hidden="true">{{ button.symbol }}</span>
          </button>
        </div>
        <div class="mario-actions">
          <button
            v-for="button in ACTIONS"
            :key="button.control"
            type="button"
            class="mario-action"
            :aria-label="button.label"
            @pointerdown.prevent="press(button.control)"
            @pointerup="release(button.control)"
            @pointerleave="release(button.control)"
            @pointercancel="release(button.control)"
            @contextmenu.prevent
            @click="keyboardClick(button.control, $event)"
          >
            <span class="mario-action-circle" aria-hidden="true">{{ button.symbol }}</span>
            <span class="mario-action-caption" aria-hidden="true">{{ button.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import GameOverlay from './GameOverlay.vue'
import { useGameLoop, setupCanvas } from '../../composables/useGameLoop.js'
import {
  TILE,
  ROWS,
  VIEW_WIDTH,
  VIEW_HEIGHT,
  BUMP_SECONDS,
  createMarioGame,
  setControl,
  releaseControls,
  updateMario,
  poleGeometry,
  worldLabel
} from '../../games/mario.js'
import { PALETTE, SPRITES } from '../../games/marioSprites.js'

const props = defineProps({
  // Pause imposée de l'extérieur (onglet masqué, temps écoulé, fenêtre fermée)
  paused: { type: Boolean, default: false },
  bestScore: { type: Number, default: 0 }
})

const emit = defineEmits(['score', 'running', 'game-over'])

const HELP = 'Flèches ou ZQSD : Q et D pour avancer, Z, ↑ ou Espace pour sauter, Maj pour courir. Saute sur les ennemis ! P : pause.'
const HURRY_TIME = 50
// Clic au clavier sur un bouton : la commande reste appuyée un court instant
const TAP_MS = 220
const GROUND_Y = 7 * TILE

const PAD = [
  { control: 'left', symbol: '◀', label: 'Gauche' },
  { control: 'right', symbol: '▶', label: 'Droite' }
]

const ACTIONS = [
  { control: 'run', symbol: 'B', label: 'Courir' },
  { control: 'jump', symbol: 'A', label: 'Sauter' }
]

// Touches physiques (event.code) : ZQSD sur un clavier AZERTY = WASD en QWERTY
const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ShiftLeft: 'run',
  ShiftRight: 'run'
}

const TILE_SPRITES = {
  X: 'block',
  B: 'brick',
  U: 'used',
  '[': 'pipeTopLeft',
  ']': 'pipeTopRight',
  '{': 'pipeLeft',
  '}': 'pipeRight'
}
const COIN_FRAMES = ['coin', 'coinTurn', 'coinEdge', 'coinTurn']

let game = createMarioGame()

const canvas = ref(null)
// start → playing ⇄ paused → over
const status = ref('start')
const score = ref(game.score)
const coins = ref(game.coins)
const lives = ref(game.lives)
const time = ref(Math.ceil(game.time))
const world = ref(worldLabel(game))
const announcement = ref('')

let ctx = null
let clock = 0
// Décalage de la caméra arrondi au pixel pour l'image en cours
let cam = 0
let images = {}
let stage = game.stage
let heroWasBig = false
const tapTimers = new Map()

// Record avant la partie en cours (« Nouveau record ! » en fin de partie)
const record = ref(props.bestScore)
watch(() => props.bestScore, value => { record.value = Math.max(record.value, value) })

const overlayState = computed(() => (status.value === 'playing' ? null : status.value))
const running = computed(() => status.value === 'playing' && !props.paused)

watch(running, (value) => {
  emit('running', value)
  // Les touches tenues au moment de la pause ne restent pas enfoncées
  if (!value) releaseControls(game)
})
watch(score, value => emit('score', value))

// Une pause imposée reste une pause : l'enfant reprend lui-même
watch(() => props.paused, (value) => {
  if (value && status.value === 'playing') status.value = 'paused'
})

function syncStats () {
  if (game.stage !== stage) announcement.value = `Bravo ! Monde ${worldLabel(game)}.`
  else if (game.lives > lives.value) announcement.value = 'Une vie en plus !'
  else if (game.hero.big && !heroWasBig) announcement.value = 'Tu as grandi !'
  stage = game.stage
  heroWasBig = game.hero.big
  score.value = game.score
  coins.value = game.coins
  lives.value = game.lives
  time.value = Math.ceil(game.time)
  world.value = worldLabel(game)
  if (game.phase === 'over' && status.value === 'playing') {
    status.value = 'over'
    announcement.value = `Partie terminée. Score : ${game.score}.`
    emit('game-over', { score: game.score, level: game.stage })
  }
}

function press (control) {
  if (!running.value) return false
  setControl(game, control, true)
  return true
}

function release (control) {
  setControl(game, control, false)
}

function keyboardClick (control, event) {
  if (event.detail !== 0 || !press(control)) return
  clearTimeout(tapTimers.get(control))
  tapTimers.set(control, setTimeout(() => release(control), TAP_MS))
}

function start () {
  status.value = 'playing'
  announcement.value = 'C\'est parti !'
}

function resume () {
  if (status.value === 'paused') status.value = 'playing'
}

function restart () {
  record.value = Math.max(record.value, score.value)
  game = createMarioGame()
  syncStats()
  status.value = 'playing'
  announcement.value = 'Nouvelle partie.'
}

function togglePause () {
  if (status.value === 'playing') status.value = 'paused'
  else resume()
}

function onKey (event) {
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (status.value === 'playing' || status.value === 'paused') {
      togglePause()
      return true
    }
    return false
  }
  const control = KEYS[event.code]
  return control ? press(control) : false
}

function onKeyUp (event) {
  const control = KEYS[event.code]
  if (!control) return false
  release(control)
  return running.value
}

// Fenêtre quittée touche enfoncée : le relâchement ne nous parviendra pas
function onBlur () {
  releaseControls(game)
}

// ─── Affichage ────────────────────────────────────────────────────────────────

// Dessin en pixel art peint une fois dans un petit canvas (retourné : regarde à gauche)
function paintSprite (rows, flip) {
  const sprite = document.createElement('canvas')
  sprite.width = rows[0].length
  sprite.height = rows.length
  let context = null
  try {
    context = sprite.getContext('2d')
  } catch {
    context = null
  }
  if (!context) return null
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '.') return
    context.fillStyle = PALETTE[cell]
    context.fillRect(flip ? row.length - 1 - x : x, y, 1, 1)
  }))
  return sprite
}

function paintSprites () {
  images = {}
  for (const [name, rows] of Object.entries(SPRITES)) {
    images[name] = { right: paintSprite(rows, false), left: paintSprite(rows, true) }
  }
}

// Dessin à la position (x, y) du niveau ; flipY : à l'envers (ennemi renversé)
function blit (name, x, y, { flip = false, flipY = false } = {}) {
  const image = images[name]?.[flip ? 'left' : 'right']
  if (!image) return
  const px = Math.round(x) - cam
  const py = Math.round(y)
  if (!flipY) {
    ctx.drawImage(image, px, py)
    return
  }
  ctx.save()
  ctx.translate(px, py + image.height)
  ctx.scale(1, -1)
  ctx.drawImage(image, 0, 0)
  ctx.restore()
}

// Décor lointain : défile moins vite que le niveau (impression de profondeur)
function drawScenery (name, depth, spacing, offset, rowY) {
  const image = images[name]?.right
  if (!image) return
  const shift = Math.round(game.cameraX * depth)
  const first = Math.floor((shift - offset - image.width) / spacing) + 1
  for (let i = first; i * spacing + offset - shift < VIEW_WIDTH; i++) {
    ctx.drawImage(image, i * spacing + offset - shift, rowY(i))
  }
}

function tileSprite (tx, ty) {
  const cell = game.tiles[ty][tx]
  switch (cell) {
    case '#':
      return ty > 0 && game.tiles[ty - 1][tx] === '#' ? 'ground' : 'groundTop'
    case '?':
    case 'M':
    case 'H':
      return Math.floor(clock * 3) % 4 === 3 ? 'questionLit' : 'question'
    case 'o':
      return COIN_FRAMES[Math.floor(clock * 8) % 4]
    default:
      return TILE_SPRITES[cell] || null
  }
}

// Bloc cogné : il saute de quelques pixels
function bumpOffset (tx, ty) {
  const bump = game.bumps.find(b => b.x === tx && b.y === ty)
  return bump ? Math.round(Math.sin((1 - bump.t / BUMP_SECONDS) * Math.PI) * 4) : 0
}

function drawTiles () {
  const first = Math.max(0, Math.floor(cam / TILE))
  const last = Math.min(game.width - 1, Math.floor((cam + VIEW_WIDTH) / TILE))
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = first; tx <= last; tx++) {
      const name = tileSprite(tx, ty)
      if (name) blit(name, tx * TILE, ty * TILE - bumpOffset(tx, ty))
    }
  }
}

function drawGoal () {
  const pole = poleGeometry(game)
  if (pole) {
    ctx.fillStyle = PALETTE[2]
    ctx.fillRect(pole.x - 1 - cam, pole.top + 4, 2, pole.bottom - pole.top - 4)
    blit('poleTop', pole.x - 3, pole.top)
    blit('flag', pole.x - 13, game.flagY)
  }
  const castle = game.level.castle
  if (castle) blit('castle', castle.x * TILE + TILE / 2 - 24, (castle.y + 1) * TILE - 40)
}

function drawEnemy (enemy) {
  const step = Math.floor(clock * 5) % 2 === 0
  const flipped = enemy.state === 'flipped'
  const x = enemy.x - 1
  const y = enemy.y + enemy.h - 16
  if (enemy.type === 'goomba') {
    if (enemy.state === 'squashed') blit('goombaFlat', x, y)
    else blit('goomba', x, y, { flip: step && !flipped, flipY: flipped })
  } else if (enemy.state === 'walk') {
    blit(step ? 'koopa' : 'koopaWalk', x, y, { flip: enemy.dir < 0 })
  } else {
    // La carapace tremble juste avant que la tortue n'en sorte
    const shake = enemy.state === 'shell' && enemy.timer < 1.5 ? Math.round(Math.sin(clock * 40)) : 0
    blit('shell', x + shake, y, { flipY: flipped })
  }
}

function heroSprite (hero) {
  if (game.phase === 'dying') return 'heroDead'
  // Juste après avoir grandi ou rapetissé, les deux tailles alternent
  const big = hero.growTimer > 0 && Math.floor(clock * 12) % 2 === 0 ? !hero.big : hero.big
  const prefix = big ? 'big' : 'hero'
  if (!hero.onGround || game.clearStage === 'slide') return `${prefix}Jump`
  if (Math.abs(hero.vx) > 5 && Math.floor(hero.walkCycle / 6) % 2 === 0) return `${prefix}Walk`
  return `${prefix}Stand`
}

function drawHero () {
  const hero = game.hero
  if (hero.hidden) return
  // Clignote tant qu'il ne peut pas être touché
  if (hero.hurtTimer > 0 && Math.floor(clock * 16) % 2 === 0) return
  const name = heroSprite(hero)
  const height = images[name]?.right?.height || TILE
  blit(name, hero.x - 2, hero.y + hero.h - height, { flip: hero.facing < 0 })
}

function drawEffects () {
  ctx.font = 'bold 8px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = PALETTE[3]
  for (const effect of game.effects) {
    if (effect.type === 'debris') blit('debris', effect.x, effect.y)
    else if (effect.type === 'coin') blit(COIN_FRAMES[Math.floor(clock * 16) % 4], effect.x, effect.y)
    else ctx.fillText(effect.label, Math.round(effect.x) - cam, Math.round(effect.y))
  }
}

// Bandeau au centre de l'écran (« MONDE 1-2 », nombre de vies)
function drawBanner (lines) {
  const height = 10 + lines.length * 14
  const top = Math.round((VIEW_HEIGHT - height) / 2) - 12
  ctx.fillStyle = PALETTE[3]
  ctx.fillRect(28, top, VIEW_WIDTH - 56, height)
  ctx.fillStyle = PALETTE[0]
  ctx.font = 'bold 10px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, top + 12 + i * 14))
}

function draw () {
  if (!ctx) return
  cam = Math.round(game.cameraX)
  ctx.fillStyle = PALETTE[0]
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
  drawScenery('hill', 0.5, 176, 16, () => GROUND_Y - SPRITES.hill.length)
  drawScenery('cloud', 0.3, 112, 8, i => 8 + (((i % 3) + 3) % 3) * 12)
  // Les objets passent derrière les blocs : le champignon sort de son bloc
  for (const item of game.items) blit(item.type, item.x - 1, item.y + item.h - TILE)
  drawTiles()
  drawGoal()
  for (const enemy of game.enemies) {
    if (enemy.active) drawEnemy(enemy)
  }
  drawHero()
  drawEffects()
  if (status.value !== 'playing') return
  if (game.phase === 'ready') drawBanner([`MONDE ${worldLabel(game)}`, `VIES x ${game.lives}`])
  if (game.phase === 'clear' && game.clearStage === 'walk') {
    ctx.fillStyle = PALETTE[3]
    ctx.font = 'bold 10px ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    ctx.fillText('BRAVO !', VIEW_WIDTH / 2, 24)
  }
}

useGameLoop((dt) => {
  clock += dt
  if (running.value) {
    updateMario(game, dt)
    syncStats()
  }
  draw()
}, onKey, onKeyUp)

onMounted(() => {
  ctx = setupCanvas(canvas.value, VIEW_WIDTH, VIEW_HEIGHT)
  // Pixel art : agrandi sans flou
  if (ctx) ctx.imageSmoothingEnabled = false
  paintSprites()
  draw()
  window.addEventListener('blur', onBlur)
})

onBeforeUnmount(() => {
  window.removeEventListener('blur', onBlur)
  tapTimers.forEach(timer => clearTimeout(timer))
})

defineExpose({ start, restart })
</script>

<style scoped>
.mario-hud,
.mario-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem 1.25rem;
  color: #ffffff;
}

.mario-hud {
  margin-bottom: 0.75rem;
}

.mario-hud dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.7);
}

.mario-hud dd {
  font-size: 1.2rem;
  font-weight: 700;
  min-height: 1.75rem;
  font-variant-numeric: tabular-nums;
}

.mario-hud dd.mario-hurry {
  color: #fca5a5;
}

.game-pause-button {
  padding: 0.5rem 0.9rem;
  border-radius: 0.75rem;
  color: #ffffff;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-pause-button:disabled {
  opacity: 0.5;
}

/* Boîtier gris, coin inférieur droit arrondi comme la console d'origine */
.mario-console {
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem 1rem 1.25rem;
  border-radius: 1rem 1rem 3.5rem 1rem;
  background: linear-gradient(160deg, #dedbd3, #bdb9b0);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.12), 0 12px 40px rgba(0, 0, 0, 0.35);
}

.mario-bezel {
  position: relative;
  padding: 0.9rem 1.6rem;
  border-radius: 0.6rem 0.6rem 2rem 0.6rem;
  background: #4a4e5d;
}

.mario-led {
  position: absolute;
  left: 0.55rem;
  top: 45%;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #4c1d1d;
}

.mario-led-on {
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
}

.game-stage {
  position: relative;
  border-radius: 0.25rem;
  overflow: hidden;
  background: #cadc9f;
}

/* Écran 160 × 144 agrandi sans flou ; largeur bornée par l'écran et par la hauteur disponible */
.mario-screen {
  display: block;
  width: min(calc(100vw - 6.5rem), 440px, calc(56vh * 160 / 144));
  aspect-ratio: 160 / 144;
  height: auto;
  image-rendering: pixelated;
  touch-action: none;
}

.mario-pad {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1.25rem;
  padding: 0 0.25rem;
}

.mario-dpad {
  display: flex;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.25));
}

.mario-dpad-button {
  width: 3.5rem;
  height: 3.25rem;
  font-size: 1.25rem;
  color: #d1d5db;
  background: #2b2d35;
}

.mario-dpad-button:first-child {
  border-radius: 0.6rem 0 0 0.6rem;
}

.mario-dpad-button:last-child {
  border-radius: 0 0.6rem 0.6rem 0;
}

/* B en bas à gauche, A en haut à droite */
.mario-actions {
  display: flex;
  gap: 0.75rem;
  transform: rotate(-20deg);
}

.mario-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border-radius: 1rem;
}

.mario-action-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  font-size: 1.1rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
  background: #9b1c4a;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.25), 0 3px 0 rgba(0, 0, 0, 0.2);
}

.mario-action-caption {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #3b3f6b;
}

.mario-dpad-button,
.mario-action {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.mario-dpad-button:active {
  background: #1a1b20;
}

.mario-action:active .mario-action-circle {
  background: #7a1238;
  box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.25);
}

.mario-dpad-button:focus-visible,
.mario-action:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}

.game-pause-button:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .mario-console {
    padding: 0.75rem 0.75rem 1rem;
  }

  .mario-bezel {
    padding: 0.75rem 1.1rem;
  }

  .mario-led {
    left: 0.35rem;
  }
}
</style>
