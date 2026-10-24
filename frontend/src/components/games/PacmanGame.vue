<template>
  <div class="pacman">
    <div class="pacman-hud">
      <dl class="pacman-stats">
        <div><dt>Score</dt><dd>{{ score }}</dd></div>
        <div><dt>Record</dt><dd>{{ Math.max(record, score) }}</dd></div>
        <div><dt>Niveau</dt><dd>{{ level }}</dd></div>
        <div>
          <dt>Vies</dt>
          <dd>
            <span class="sr-only">{{ lives }}</span>
            <span aria-hidden="true">{{ lives > 0 ? '🟡'.repeat(lives) : '—' }}</span>
          </dd>
        </div>
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

    <div class="game-stage">
      <canvas
        ref="canvas"
        class="pacman-board"
        role="img"
        :aria-label="`Labyrinthe de Pac-Man. Score ${score}, ${lives} vies, niveau ${level}.`"
        @pointerdown="onSwipeStart"
        @pointerup="onSwipeEnd"
        @pointercancel="swipeStart = null"
      ></canvas>
      <GameOverlay
        :state="overlayState"
        title="Pac-Man"
        :score="score"
        :best-score="record"
        :help="HELP"
        @start="start"
        @resume="resume"
        @restart="restart"
      />
    </div>

    <!-- Croix directionnelle (on peut aussi glisser le doigt sur le labyrinthe) -->
    <div class="pacman-pad" role="group" aria-label="Commandes de Pac-Man">
      <button
        v-for="control in CONTROLS"
        :key="control.direction"
        type="button"
        class="game-control-button"
        :class="`pad-${control.direction}`"
        :aria-label="control.label"
        @pointerdown.prevent="steer(control.direction)"
        @click="keyboardClick(control.direction, $event)"
      >
        <span aria-hidden="true">{{ control.symbol }}</span>
      </button>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import GameOverlay from './GameOverlay.vue'
import { useGameLoop, setupCanvas, swipeDirection } from '../../composables/useGameLoop.js'
import {
  MAZE,
  WIDTH,
  HEIGHT,
  createPacmanGame,
  setDirection,
  updatePacman,
  entityPosition,
  isFrightenedEnding
} from '../../games/pacman.js'

const props = defineProps({
  // Pause imposée de l'extérieur (onglet masqué, temps écoulé, fenêtre fermée)
  paused: { type: Boolean, default: false },
  bestScore: { type: Number, default: 0 }
})

const emit = defineEmits(['score', 'running', 'game-over'])

const HELP = 'Flèches ou ZQSD (ou glisse le doigt) pour te diriger. Les grosses pastilles font fuir les fantômes ! P : pause.'
const TILE = 24

const CONTROLS = [
  { direction: 'up', symbol: '▲', label: 'Haut' },
  { direction: 'left', symbol: '◀', label: 'Gauche' },
  { direction: 'right', symbol: '▶', label: 'Droite' },
  { direction: 'down', symbol: '▼', label: 'Bas' }
]

// Touches physiques (event.code) : ZQSD sur un clavier AZERTY = WASD en QWERTY
const KEYS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right'
}

const ANGLES = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }

const canvas = ref(null)
// start → playing ⇄ paused → over
const status = ref('start')
const score = ref(0)
const lives = ref(3)
const level = ref(1)
const announcement = ref('')
const swipeStart = ref(null)

let game = createPacmanGame()
let ctx = null
let clock = 0

// Record avant la partie en cours (« Nouveau record ! » en fin de partie)
const record = ref(props.bestScore)
watch(() => props.bestScore, value => { record.value = Math.max(record.value, value) })

const overlayState = computed(() => (status.value === 'playing' ? null : status.value))
const running = computed(() => status.value === 'playing' && !props.paused)

watch(running, value => emit('running', value))
watch(score, value => emit('score', value))

// Une pause imposée reste une pause : l'enfant reprend lui-même
watch(() => props.paused, (value) => {
  if (value && status.value === 'playing') status.value = 'paused'
})

function syncStats () {
  if (level.value !== game.level) announcement.value = `Niveau ${game.level} !`
  score.value = game.score
  lives.value = game.lives
  level.value = game.level
  if (game.phase === 'over' && status.value === 'playing') {
    status.value = 'over'
    announcement.value = `Partie terminée. Score : ${game.score}.`
    emit('game-over', { score: game.score, level: game.level })
  }
}

function steer (direction) {
  if (!running.value) return false
  setDirection(game, direction)
  return true
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
  game = createPacmanGame()
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
  const direction = KEYS[event.code]
  return direction ? steer(direction) : false
}

function keyboardClick (direction, event) {
  if (event.detail === 0) steer(direction)
}

function onSwipeStart (event) {
  swipeStart.value = { x: event.clientX, y: event.clientY }
}

function onSwipeEnd (event) {
  if (!swipeStart.value) return
  const direction = swipeDirection(event.clientX - swipeStart.value.x, event.clientY - swipeStart.value.y)
  swipeStart.value = null
  if (direction) steer(direction)
}

// ─── Affichage ────────────────────────────────────────────────────────────────

const isWall = (x, y) => y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH && MAZE[y][x] === '#'

function drawMaze () {
  ctx.fillStyle = '#020617'
  ctx.fillRect(0, 0, WIDTH * TILE, HEIGHT * TILE)
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const cell = MAZE[y][x]
      if (cell === '-') {
        ctx.fillStyle = '#f9a8d4'
        ctx.fillRect(x * TILE, y * TILE + TILE / 2 - 2, TILE, 4)
        continue
      }
      if (cell !== '#') continue
      ctx.fillStyle = '#0b1a4a'
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
      // Contour bleu sur les bords qui donnent sur un couloir
      const left = x * TILE + 1
      const top = y * TILE + 1
      const right = (x + 1) * TILE - 1
      const bottom = (y + 1) * TILE - 1
      ctx.beginPath()
      if (y > 0 && !isWall(x, y - 1)) { ctx.moveTo(left, top); ctx.lineTo(right, top) }
      if (y < HEIGHT - 1 && !isWall(x, y + 1)) { ctx.moveTo(left, bottom); ctx.lineTo(right, bottom) }
      if (x > 0 && !isWall(x - 1, y)) { ctx.moveTo(left, top); ctx.lineTo(left, bottom) }
      if (x < WIDTH - 1 && !isWall(x + 1, y)) { ctx.moveTo(right, top); ctx.lineTo(right, bottom) }
      ctx.stroke()
    }
  }
}

function drawPellets () {
  ctx.fillStyle = '#fde68a'
  for (const key of game.pellets) {
    const [x, y] = key.split(',').map(Number)
    ctx.beginPath()
    ctx.arc((x + 0.5) * TILE, (y + 0.5) * TILE, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Super-pastilles clignotantes
  if (Math.floor(clock * 4) % 2 === 0 || status.value !== 'playing') {
    for (const key of game.powers) {
      const [x, y] = key.split(',').map(Number)
      ctx.beginPath()
      ctx.arc((x + 0.5) * TILE, (y + 0.5) * TILE, 7, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function directionName (dir) {
  if (!dir) return 'left'
  if (dir.x > 0) return 'right'
  if (dir.x < 0) return 'left'
  return dir.y > 0 ? 'down' : 'up'
}

function drawPacman () {
  const pac = game.pacman
  const { x, y } = entityPosition(pac)
  const cx = (x + 0.5) * TILE
  const cy = (y + 0.5) * TILE
  const radius = TILE * 0.45
  let mouth = pac.dir && game.phase === 'playing' ? 0.25 * Math.abs(Math.sin(clock * 12)) * Math.PI : 0.15 * Math.PI
  let scale = 1
  if (game.phase === 'dying') {
    // Pac-Man se referme et disparaît
    mouth = Math.min(Math.PI, 0.2 * Math.PI + (1.4 - game.phaseTimer) * 2.2)
    scale = Math.max(0, game.phaseTimer / 1.4)
  }
  const angle = ANGLES[directionName(pac.facing)]
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, radius * (0.4 + 0.6 * scale), angle + mouth, angle + Math.PI * 2 - mouth)
  ctx.closePath()
  ctx.fill()
}

function drawGhost (ghost) {
  const { x, y } = entityPosition(ghost)
  const cx = (x + 0.5) * TILE
  const cy = (y + 0.5) * TILE
  const r = TILE * 0.45
  // Fantôme dans la maison : il flotte sur place
  const bob = ghost.state === 'house' ? Math.sin(clock * 5 + ghost.x) * 2 : 0

  if (ghost.state !== 'eaten') {
    let body = ghost.color
    if (ghost.frightened) {
      body = isFrightenedEnding(game) && Math.floor(clock * 6) % 2 === 0 ? '#f8fafc' : '#2563eb'
    }
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(cx, cy - 2 + bob, r, Math.PI, 0)
    const bottom = cy + r + bob
    ctx.lineTo(cx + r, bottom)
    // Bas ondulé
    for (let i = 0; i < 4; i++) {
      const px = cx + r - (i + 0.5) * (r / 2)
      ctx.lineTo(px, bottom - (i % 2 === 0 ? 4 : 0))
    }
    ctx.lineTo(cx - r, bottom)
    ctx.closePath()
    ctx.fill()
  }

  if (ghost.frightened) {
    ctx.fillStyle = '#fde68a'
    ctx.fillRect(cx - 5, cy - 4 + bob, 3, 3)
    ctx.fillRect(cx + 2, cy - 4 + bob, 3, 3)
    return
  }
  // Yeux tournés vers la direction suivie
  const look = ghost.dir || { x: 0, y: 0 }
  for (const side of [-1, 1]) {
    const ex = cx + side * 4.5
    const ey = cy - 3 + bob
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(ex, ey, 3.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1e3a8a'
    ctx.beginPath()
    ctx.arc(ex + look.x * 1.6, ey + look.y * 1.6, 1.9, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMessage (text, color) {
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, (WIDTH / 2) * TILE, 11.5 * TILE)
}

function draw () {
  if (!ctx) return
  drawMaze()
  drawPellets()
  if (game.phase !== 'levelClear') {
    for (const ghost of game.ghosts) drawGhost(ghost)
  }
  drawPacman()
  if (status.value === 'playing' && game.phase === 'ready') drawMessage('Prêt !', '#facc15')
  if (game.phase === 'levelClear') drawMessage('Bravo !', '#4ade80')
}

useGameLoop((dt) => {
  clock += dt
  if (running.value) {
    updatePacman(game, dt)
    syncStats()
  }
  draw()
}, onKey)

onMounted(() => {
  ctx = setupCanvas(canvas.value, WIDTH * TILE, HEIGHT * TILE)
  draw()
})

defineExpose({ start, restart })
</script>

<style scoped>
.pacman-hud,
.pacman-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem 1.25rem;
  color: #ffffff;
}

.pacman-hud {
  margin-bottom: 0.75rem;
}

.pacman-hud dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.7);
}

.pacman-hud dd {
  font-size: 1.2rem;
  font-weight: 700;
  min-height: 1.75rem;
}

.game-stage {
  position: relative;
  width: fit-content;
  margin: 0 auto;
  border-radius: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  background: #020617;
  overflow: hidden;
}

/* Largeur bornée par l'écran et par la hauteur disponible : le rapport 19/21 est toujours gardé */
.pacman-board {
  display: block;
  width: min(92vw, 456px, calc(62vh * 19 / 21));
  aspect-ratio: 19 / 21;
  height: auto;
  touch-action: none;
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

.pacman-pad {
  display: grid;
  grid-template-columns: repeat(3, 3.75rem);
  grid-template-areas:
    ". up ."
    "left . right"
    ". down .";
  gap: 0.4rem;
  justify-content: center;
  margin-top: 1rem;
}

.pad-up { grid-area: up; }
.pad-left { grid-area: left; }
.pad-right { grid-area: right; }
.pad-down { grid-area: down; }

.game-control-button {
  width: 3.75rem;
  height: 3.75rem;
  border-radius: 1rem;
  font-size: 1.5rem;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.game-control-button:active {
  background: rgba(255, 255, 255, 0.25);
}

.game-control-button:focus-visible,
.game-pause-button:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
}
</style>
