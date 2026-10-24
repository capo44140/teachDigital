<template>
  <div class="min-h-screen overflow-hidden">
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-4 sm:px-6 py-3">
        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all"
            @click="goBack"
          >
            <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span class="font-medium">Mes jeux</span>
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-white truncate">{{ title }}</h1>
          <p
            v-if="mode === 'ready'"
            class="px-3 py-1.5 rounded-xl text-sm font-semibold border"
            :class="isLowTime ? 'bg-red-500/30 border-red-400/50 text-red-100' : 'bg-white/10 border-white/20 text-white'"
            role="timer"
            :aria-label="timeLabel"
          >
            <span aria-hidden="true">⏱</span> {{ timeBadge }}
          </p>
          <span v-else class="w-16" aria-hidden="true"></span>
        </div>
      </nav>
    </header>

    <main class="relative z-10 container mx-auto px-4 sm:px-6 py-6">
      <div v-if="mode === 'loading'" class="glass-card-dashboard text-center py-16 max-w-xl mx-auto" role="status">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4" aria-hidden="true"></div>
        <p class="text-white text-lg">Préparation du jeu...</p>
      </div>

      <div v-else-if="mode === 'locked'" class="glass-card-dashboard text-center py-12 max-w-xl mx-auto" role="alert">
        <p class="text-5xl mb-4" aria-hidden="true">🔒</p>
        <h2 class="text-2xl font-bold text-white mb-3">Ce jeu est fermé pour l'instant</h2>
        <p class="text-white/80 mb-6">{{ message }}</p>
        <button type="button" class="game-player-button" @click="goBack">Retour à mes jeux</button>
      </div>

      <div v-else-if="mode === 'error'" class="glass-card-dashboard text-center py-12 max-w-xl mx-auto" role="alert">
        <h2 class="text-2xl font-bold text-white mb-3">Le jeu n'a pas pu démarrer</h2>
        <p class="text-white/80 mb-2">{{ message }}</p>
        <p v-if="messageRef" class="text-xs text-white/70 mb-6">Réf. {{ messageRef }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <button v-if="gameComponent" type="button" class="game-player-button" @click="prepare">Réessayer</button>
          <button type="button" class="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white" @click="goBack">Retour à mes jeux</button>
        </div>
      </div>

      <template v-else>
        <!-- Aperçu parent : aucune partie enregistrée, temps non compté -->
        <p v-if="preview" class="max-w-xl mx-auto mb-4 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 text-sm text-center" role="note">
          <strong class="font-semibold">Aperçu parent</strong> — vous testez ce jeu depuis l'espace parent : le temps n'est pas compté.
        </p>

        <div class="relative">
          <component
            :is="gameComponent"
            :paused="paused"
            :best-score="bestScore"
            @score="onScore"
            @running="onRunning"
          />

          <!-- Fin imposée : temps écoulé, jeu refermé par un parent... -->
          <div v-if="stopped" class="game-player-stop" role="alertdialog" aria-labelledby="game-stop-title" aria-describedby="game-stop-message">
            <div class="glass-card-dashboard text-center max-w-md">
              <p class="text-5xl mb-2" aria-hidden="true">⏰</p>
              <h2 id="game-stop-title" class="text-2xl font-bold text-white">{{ stopTitle }}</h2>
              <p id="game-stop-message" class="text-white/80">{{ message }}</p>
              <p v-if="sessionScore > 0" class="text-white/70 text-sm">Ton meilleur score de la partie : {{ sessionScore }}</p>
              <button ref="stopButton" type="button" class="game-player-button" @click="goBack">Retour à mes jeux</button>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useParentNavigation } from '../composables/useParentNavigation.js'
import { startGameSession, updateGameSession, lockedAccess, HEARTBEAT_INTERVAL_MS } from '../services/gameService.js'
import { gameDisplay, formatCountdown } from '../games/catalog.js'
import { describeError } from '../utils/apiErrors.js'

const TIME_UP_MESSAGE = 'Tu as utilisé tout ton temps de jeu pour aujourd\'hui. Reviens demain !'
const INTERRUPTED_MESSAGE = 'Cette partie a été interrompue. Reviens à tes jeux pour en commencer une autre.'
const TITLES = { pacman: 'Pac-Man', tetris: 'Tetris' }

export default {
  name: 'GamePlayer',
  props: {
    gameKey: { type: String, required: true }
  },
  setup(props) {
    const route = useRoute()
    const router = useRouter()
    const parentNav = useParentNavigation()

    const gameComponent = gameDisplay(props.gameKey).component
    const title = TITLES[props.gameKey] || 'Jeu'

    // loading → ready | locked | error
    const mode = ref('loading')
    const message = ref('')
    const messageRef = ref(null)
    const preview = ref(false)
    const session = ref(null)
    const sessionEnded = ref(false)
    const bestScore = ref(0)
    const sessionScore = ref(0)
    // null : sans limite
    const remainingSeconds = ref(null)
    const hidden = ref(false)
    const stopped = ref(false)
    const stopTitle = ref('')
    const stopButton = ref(null)

    let heartbeatTimer = null
    let countdownTimer = null

    const paused = computed(() => hidden.value || stopped.value)
    const isLowTime = computed(() => remainingSeconds.value !== null && remainingSeconds.value <= 60)
    const timeBadge = computed(() => {
      if (preview.value) return 'Aperçu'
      return remainingSeconds.value === null ? 'Illimité' : formatCountdown(remainingSeconds.value)
    })
    const timeLabel = computed(() => {
      if (preview.value) return 'Aperçu parent : temps non compté'
      if (remainingSeconds.value === null) return 'Temps de jeu illimité aujourd\'hui'
      return `Temps de jeu restant : ${formatCountdown(remainingSeconds.value)}`
    })

    const profileId = () => route.query.profile

    function clearTimers () {
      if (heartbeatTimer !== null) clearInterval(heartbeatTimer)
      if (countdownTimer !== null) clearInterval(countdownTimer)
      heartbeatTimer = null
      countdownTimer = null
    }

    async function stop (reason, heading = 'C\'est fini pour aujourd\'hui') {
      if (stopped.value) return
      stopped.value = true
      stopTitle.value = heading
      message.value = reason || TIME_UP_MESSAGE
      clearTimers()
      await nextTick()
      stopButton.value?.focus()
    }

    async function sendHeartbeat ({ idle = false, ended = false } = {}) {
      if (!session.value || sessionEnded.value) return
      if (ended) sessionEnded.value = true
      try {
        const data = await updateGameSession(session.value.id, { score: sessionScore.value, idle, ended })
        if (data?.stop) sessionEnded.value = true
        if (ended) return
        if (data?.access && data.access.remainingSeconds !== undefined) {
          remainingSeconds.value = data.access.remainingSeconds
        }
        if (data?.stop) {
          // Jeu verrouillé entre-temps (temps écoulé, fermé par un parent…) ou partie déjà close
          if (data.access?.unlocked === false) stop(data.access.message)
          else stop(INTERRUPTED_MESSAGE, 'Partie interrompue')
        }
      } catch (error) {
        // Réseau coupé : le compte à rebours local continue de limiter la partie
        console.warn('Signal de partie non envoyé:', error?.message || error)
      }
    }

    function tick () {
      if (remainingSeconds.value === null) return
      remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
      if (remainingSeconds.value <= 0) {
        stop(TIME_UP_MESSAGE)
        sendHeartbeat({ ended: true })
      }
    }

    // Le temps ne compte que pendant une partie en cours (ni pause, ni écran de fin)
    function onRunning (value) {
      if (preview.value || !session.value || stopped.value) return
      clearTimers()
      if (value) {
        // Reprise : le temps passé en pause n'est pas compté
        sendHeartbeat({ idle: true })
        heartbeatTimer = setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL_MS)
        countdownTimer = setInterval(tick, 1000)
      } else {
        sendHeartbeat()
      }
    }

    function onScore (score) {
      sessionScore.value = Math.max(sessionScore.value, score)
    }

    async function prepare () {
      mode.value = 'loading'
      message.value = ''
      messageRef.value = null
      if (!gameComponent) {
        message.value = 'Ce jeu n\'existe pas.'
        mode.value = 'error'
        return
      }
      preview.value = parentNav.isParentSession()
      if (preview.value) {
        mode.value = 'ready'
        return
      }
      try {
        const data = await startGameSession(props.gameKey, profileId())
        session.value = data.session
        sessionEnded.value = false
        bestScore.value = data.bestScore || 0
        remainingSeconds.value = data.access?.remainingSeconds ?? null
        mode.value = 'ready'
      } catch (error) {
        const access = lockedAccess(error)
        if (access) {
          message.value = access.message || error.message
          mode.value = 'locked'
          return
        }
        console.error('Partie non démarrée:', error)
        const { message: text, requestId } = describeError(error, 'Le jeu n\'a pas pu démarrer.')
        message.value = text
        messageRef.value = requestId
        mode.value = 'error'
      }
    }

    function onVisibilityChange () {
      hidden.value = document.visibilityState === 'hidden'
    }

    // Page fermée ou quittée : fin de partie (keepalive : la requête survit à la fermeture)
    function endSession () {
      clearTimers()
      if (!session.value || sessionEnded.value) return
      sessionEnded.value = true
      updateGameSession(session.value.id, { score: sessionScore.value, ended: true }, { keepalive: true })
        .catch(error => console.warn('Fin de partie non envoyée:', error?.message || error))
    }

    function goBack () {
      router.push({ name: 'GameArcade', query: { profile: profileId() } })
    }

    onMounted(() => {
      onVisibilityChange()
      document.addEventListener('visibilitychange', onVisibilityChange)
      window.addEventListener('pagehide', endSession)
      prepare()
    })

    onBeforeUnmount(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', endSession)
      endSession()
    })

    return {
      gameComponent,
      title,
      mode,
      message,
      messageRef,
      preview,
      bestScore,
      sessionScore,
      paused,
      stopped,
      stopTitle,
      stopButton,
      isLowTime,
      timeBadge,
      timeLabel,
      prepare,
      onRunning,
      onScore,
      goBack
    }
  }
}
</script>

<style scoped>
.game-player-button {
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(135deg, #fde047, #f59e0b);
}

.game-player-button:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 3px;
}

.game-player-stop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 1rem;
  z-index: 5;
}
</style>
