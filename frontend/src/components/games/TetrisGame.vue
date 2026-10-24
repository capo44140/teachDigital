<template>
  <div class="tetris">
    <div class="tetris-layout">
      <div class="game-stage tetris-stage">
        <canvas
          ref="boardCanvas"
          class="tetris-board"
          role="img"
          :aria-label="`Plateau de Tetris. Score ${score}, ${lines} lignes, niveau ${level}.`"
        ></canvas>
        <GameOverlay
          :state="overlayState"
          title="Tetris"
          :score="score"
          :best-score="record"
          :help="HELP"
          @start="start"
          @resume="resume"
          @restart="restart"
        />
      </div>

      <aside class="tetris-side">
        <div class="tetris-panel">
          <p class="tetris-label">Suivante</p>
          <canvas ref="previewCanvas" class="tetris-preview" aria-hidden="true"></canvas>
        </div>
        <dl class="tetris-panel tetris-stats">
          <div><dt>Score</dt><dd>{{ score }}</dd></div>
          <div><dt>Lignes</dt><dd>{{ lines }}</dd></div>
          <div><dt>Niveau</dt><dd>{{ level }}</dd></div>
          <div><dt>Record</dt><dd>{{ Math.max(record, score) }}</dd></div>
        </dl>
        <button
          type="button"
          class="game-pause-button"
          :disabled="status !== 'playing' && status !== 'paused'"
          @click="togglePause"
        >
          {{ status === 'paused' ? 'Reprendre' : 'Pause' }}
        </button>
      </aside>
    </div>

    <!-- Commandes tactiles (le clavier reste utilisable) -->
    <div class="game-controls" role="group" aria-label="Commandes de Tetris">
      <button
        v-for="control in CONTROLS"
        :key="control.action"
        type="button"
        class="game-control-button"
        :aria-label="control.label"
        @pointerdown.prevent="startHold(control.action)"
        @pointerup="stopHold"
        @pointerleave="stopHold"
        @pointercancel="stopHold"
        @click="keyboardClick(control.action, $event)"
      >
        <span aria-hidden="true">{{ control.symbol }}</span>
      </button>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import GameOverlay from './GameOverlay.vue'
import { useGameLoop, setupCanvas } from '../../composables/useGameLoop.js'
import {
  COLS,
  ROWS,
  PIECES,
  createTetrisGame,
  moveLeft,
  moveRight,
  rotate,
  stepDown,
  hardDrop,
  ghostY,
  dropInterval,
  pieceCells
} from '../../games/tetris.js'

const props = defineProps({
  // Pause imposée de l'extérieur (onglet masqué, temps écoulé, fenêtre fermée)
  paused: { type: Boolean, default: false },
  bestScore: { type: Number, default: 0 }
})

const emit = defineEmits(['score', 'running', 'game-over'])

const HELP = 'Flèches ou ZQSD : déplacer et tourner. Espace : faire tomber. P : pause.'
const CELL = 30
const PREVIEW_CELL = 22
const PREVIEW_SIZE = PREVIEW_CELL * 4
const REPEATABLE = new Set(['left', 'right', 'down'])

const CONTROLS = [
  { action: 'left', symbol: '◀', label: 'Gauche' },
  { action: 'rotate', symbol: '⟳', label: 'Tourner' },
  { action: 'right', symbol: '▶', label: 'Droite' },
  { action: 'down', symbol: '▼', label: 'Descendre' },
  { action: 'drop', symbol: '⤓', label: 'Faire tomber' }
]

// Touches physiques (event.code) : ZQSD sur un clavier AZERTY = WASD en QWERTY
const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'rotate',
  KeyW: 'rotate',
  KeyX: 'rotate',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'drop'
}

const boardCanvas = ref(null)
const previewCanvas = ref(null)
// start → playing ⇄ paused → over
const status = ref('start')
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const announcement = ref('')

let game = createTetrisGame()
let boardCtx = null
let previewCtx = null
let dropTimer = 0
let holdTimer = null

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
  score.value = game.score
  lines.value = game.lines
  level.value = game.level
  if (game.over && status.value === 'playing') {
    status.value = 'over'
    stopHold()
    announcement.value = `Partie terminée. Score : ${game.score}.`
    emit('game-over', { score: game.score, lines: game.lines, level: game.level })
  }
}

function act (action) {
  if (!running.value) return false
  switch (action) {
    case 'left':
      moveLeft(game)
      break
    case 'right':
      moveRight(game)
      break
    case 'rotate':
      rotate(game)
      break
    case 'down':
      if (stepDown(game, true).locked) dropTimer = 0
      break
    case 'drop':
      hardDrop(game)
      dropTimer = 0
      break
    default:
      return false
  }
  syncStats()
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
  game = createTetrisGame()
  dropTimer = 0
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
  const action = KEYS[event.code]
  return action ? act(action) : false
}

// Bouton tactile maintenu : action répétée (déplacements, descente)
function startHold (action) {
  stopHold()
  act(action)
  if (!REPEATABLE.has(action)) return
  const repeat = () => {
    act(action)
    holdTimer = setTimeout(repeat, 70)
  }
  holdTimer = setTimeout(repeat, 220)
}

function stopHold () {
  if (holdTimer !== null) clearTimeout(holdTimer)
  holdTimer = null
}

// Clic au clavier sur un bouton (detail = 0) ; les clics à la souris ou au doigt passent par pointerdown
function keyboardClick (action, event) {
  if (event.detail === 0) act(action)
}

// ─── Affichage ────────────────────────────────────────────────────────────────

function drawCell (ctx, x, y, size, color, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4)
  ctx.globalAlpha = 1
}

function drawBoard () {
  const ctx = boardCtx
  if (!ctx) return
  ctx.fillStyle = '#0b1020'
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.lineWidth = 1
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(x * CELL + 0.5, 0)
    ctx.lineTo(x * CELL + 0.5, ROWS * CELL)
    ctx.stroke()
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL + 0.5)
    ctx.lineTo(COLS * CELL, y * CELL + 0.5)
    ctx.stroke()
  }

  game.board.forEach((row, y) => row.forEach((color, x) => {
    if (color) drawCell(ctx, x, y, CELL, color)
  }))

  if (!game.over && game.current) {
    const color = PIECES[game.current.type].color
    // Pièce fantôme : où la pièce va tomber
    const landing = { ...game.current, y: ghostY(game) }
    for (const { x, y } of pieceCells(landing)) {
      if (y >= 0) drawCell(ctx, x, y, CELL, color, 0.2)
    }
    for (const { x, y } of pieceCells(game.current)) {
      if (y >= 0) drawCell(ctx, x, y, CELL, color)
    }
  }
}

function drawPreview () {
  const ctx = previewCtx
  if (!ctx) return
  ctx.fillStyle = '#0b1020'
  ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
  const piece = PIECES[game.nextType]
  if (!piece) return
  const size = piece.shape.length
  // Pièce centrée sur ses cases remplies
  const rows = piece.shape.map((row, y) => (row.some(Boolean) ? y : null)).filter(y => y !== null)
  const offsetX = (4 - size) / 2
  const offsetY = (4 - rows.length) / 2 - rows[0]
  piece.shape.forEach((row, y) => row.forEach((filled, x) => {
    if (filled) drawCell(ctx, x + offsetX, y + offsetY, PREVIEW_CELL, piece.color)
  }))
}

useGameLoop((dt) => {
  if (running.value) {
    dropTimer += dt * 1000
    const interval = dropInterval(game.level)
    while (dropTimer >= interval && running.value) {
      dropTimer -= interval
      stepDown(game)
      syncStats()
    }
  }
  drawBoard()
  drawPreview()
}, onKey)

onMounted(() => {
  boardCtx = setupCanvas(boardCanvas.value, COLS * CELL, ROWS * CELL)
  previewCtx = setupCanvas(previewCanvas.value, PREVIEW_SIZE, PREVIEW_SIZE)
  drawBoard()
  drawPreview()
})

onBeforeUnmount(stopHold)

defineExpose({ start, restart })
</script>

<style scoped>
.tetris-layout {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1rem;
}

.game-stage {
  position: relative;
  border-radius: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  background: #0b1020;
  overflow: hidden;
}

.tetris-board {
  display: block;
  height: min(62vh, 600px);
  aspect-ratio: 1 / 2;
  width: auto;
  touch-action: none;
}

.tetris-side {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 6.5rem;
}

.tetris-panel {
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.tetris-label,
.tetris-stats dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.7);
}

.tetris-preview {
  display: block;
  width: 88px;
  height: 88px;
  margin-top: 0.5rem;
  border-radius: 0.5rem;
}

.tetris-stats {
  display: grid;
  gap: 0.5rem;
}

.tetris-stats dd {
  font-size: 1.25rem;
  font-weight: 700;
}

.game-pause-button {
  padding: 0.6rem 0.75rem;
  border-radius: 0.75rem;
  color: #ffffff;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.game-pause-button:disabled {
  opacity: 0.5;
}

.game-controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.game-control-button {
  width: 3.75rem;
  height: 3.75rem;
  border-radius: 1rem;
  font-size: 1.6rem;
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

@media (max-width: 480px) {
  .tetris-layout {
    gap: 0.5rem;
  }

  .tetris-board {
    height: min(56vh, 600px);
  }

  .tetris-side {
    min-width: 5.5rem;
  }

  .game-control-button {
    width: 3.25rem;
    height: 3.25rem;
  }
}
</style>
