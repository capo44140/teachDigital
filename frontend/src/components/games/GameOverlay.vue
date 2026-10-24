<template>
  <!--
    Écran posé sur l'aire de jeu : avant la partie (start), en pause (paused),
    partie terminée (over). Rien n'est affiché pendant la partie (state null).
  -->
  <div v-if="state" class="game-overlay" role="dialog" :aria-label="heading" aria-modal="false">
    <div class="game-overlay-panel">
      <p class="text-2xl font-bold text-white mb-2">{{ heading }}</p>

      <template v-if="state === 'over'">
        <p class="text-white/80 mb-1">Score : <strong class="text-white">{{ score }}</strong></p>
        <p v-if="isRecord" class="text-yellow-300 font-semibold mb-3">Nouveau record ! <span aria-hidden="true">🏆</span></p>
        <p v-else-if="bestScore > 0" class="text-white/70 text-sm mb-3">Ton record : {{ bestScore }}</p>
      </template>

      <p v-if="state === 'start' && help" class="text-white/70 text-sm mb-4">{{ help }}</p>

      <button
        ref="actionButton"
        type="button"
        class="game-overlay-button"
        @click="onAction"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  // 'start' | 'paused' | 'over' | null
  state: { type: String, default: null },
  title: { type: String, default: '' },
  score: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  help: { type: String, default: '' }
})

const emit = defineEmits(['start', 'resume', 'restart'])

const HEADINGS = { start: 'Prêt à jouer ?', paused: 'Pause', over: 'Partie terminée' }
const ACTIONS = { start: 'Jouer', paused: 'Reprendre', over: 'Rejouer' }
const EVENTS = { start: 'start', paused: 'resume', over: 'restart' }

const heading = computed(() => (props.state === 'start' && props.title ? props.title : HEADINGS[props.state] || ''))
const actionLabel = computed(() => ACTIONS[props.state] || '')
const isRecord = computed(() => props.score > 0 && props.score > props.bestScore)

const actionButton = ref(null)

function onAction () {
  const event = EVENTS[props.state]
  if (event) emit(event)
}

// Le bouton reçoit le focus : Entrée suffit pour jouer, reprendre ou rejouer
watch(() => props.state, async (state) => {
  if (!state) return
  await nextTick()
  actionButton.value?.focus({ preventScroll: true })
})
</script>

<style scoped>
.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(3px);
  border-radius: inherit;
  z-index: 2;
}

.game-overlay-panel {
  text-align: center;
  max-width: 18rem;
}

.game-overlay-button {
  min-width: 9rem;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: #0f172a;
  background: linear-gradient(135deg, #fde047, #f59e0b);
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.35);
  transition: transform 0.15s ease;
}

.game-overlay-button:hover,
.game-overlay-button:focus-visible {
  transform: translateY(-2px);
}

.game-overlay-button:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 3px;
}
</style>
