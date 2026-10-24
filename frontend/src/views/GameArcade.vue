<template>
  <div class="min-h-screen overflow-hidden">
    <header class="td-page-header relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-white/20"
            @click="goBack"
          >
            <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span class="font-medium">Retour au dashboard</span>
          </button>
          <p v-if="currentProfile" class="text-white font-medium">{{ currentProfile.name }}</p>
        </div>
      </nav>
    </header>

    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-white mb-4">Mes jeux <span aria-hidden="true">🎮</span></h1>
        <p class="text-xl text-white/70">Tes parents choisissent quand tu peux jouer. Bonne partie !</p>
      </div>

      <div v-if="isLoading" class="glass-card-dashboard text-center py-16" role="status">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/80 mb-4" aria-hidden="true"></div>
        <p class="text-white text-lg">Chargement des jeux...</p>
      </div>

      <div v-else-if="loadError" class="glass-card-dashboard text-center py-16" role="alert">
        <h2 class="text-2xl font-bold text-white mb-4">Oups, les jeux ne se chargent pas</h2>
        <p class="text-white/70 mb-2">{{ loadError }}</p>
        <p v-if="loadErrorRef" class="text-xs text-white/70 mb-6">Réf. {{ loadErrorRef }}</p>
        <button
          type="button"
          class="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl border border-white/20"
          @click="loadGames"
        >
          Réessayer
        </button>
      </div>

      <ul v-else class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto" aria-label="Jeux">
        <li v-for="game in games" :key="game.key" class="glass-card-dashboard">
          <div class="flex items-start gap-4">
            <span
              class="w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl flex-shrink-0"
              :class="display(game.key).gradient"
              aria-hidden="true"
            >{{ display(game.key).icon }}</span>
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold text-white">{{ game.title }}</h2>
              <p class="text-white/70 text-sm mt-1">{{ game.description }}</p>
            </div>
          </div>

          <!-- Jeu ouvert -->
          <div v-if="game.access.unlocked" class="mt-4 space-y-3">
            <p class="text-green-200 text-sm">
              <span aria-hidden="true">✅</span>
              {{ game.access.remainingSeconds === null
                ? 'Tu peux jouer aujourd\'hui.'
                : `Il te reste ${formatPlayTime(game.access.remainingSeconds)} de jeu aujourd'hui.` }}
            </p>
            <p v-if="game.bestScore > 0" class="text-white/70 text-sm">Ton record : <strong class="text-white">{{ game.bestScore }}</strong></p>
            <button
              type="button"
              class="w-full px-6 py-3 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-yellow-300 to-amber-400 hover:shadow-lg transition-all"
              @click="play(game)"
            >
              Jouer à {{ game.title }}
            </button>
          </div>

          <!-- Jeu verrouillé : motif et progression -->
          <div v-else class="mt-4 space-y-3">
            <p class="text-white/90 text-sm">
              <span aria-hidden="true">🔒</span> {{ game.access.message }}
            </p>
            <div v-if="game.access.reason === 'condition' && game.access.condition.target > 0">
              <div
                class="h-3 rounded-full bg-white/10 overflow-hidden"
                role="progressbar"
                :aria-valuenow="Math.min(game.access.condition.current, game.access.condition.target)"
                aria-valuemin="0"
                :aria-valuemax="game.access.condition.target"
                :aria-label="game.access.condition.label"
              >
                <div class="h-full bg-gradient-to-r from-yellow-300 to-amber-400" :style="{ width: `${progressPercent(game)}%` }"></div>
              </div>
              <p class="text-white/70 text-xs mt-1">{{ progressText(game) }}</p>
            </div>
            <button
              v-if="game.access.reason === 'condition'"
              type="button"
              class="w-full px-6 py-3 rounded-xl font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
              @click="goBack"
            >
              Aller faire mes quiz
            </button>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '../stores/profileStore.js'
import { getGames } from '../services/gameService.js'
import { gameDisplay, formatPlayTime } from '../games/catalog.js'
import { describeError } from '../utils/apiErrors.js'

export default {
  name: 'GameArcade',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const profileStore = useProfileStore()

    const games = ref([])
    const isLoading = ref(false)
    const loadError = ref('')
    const loadErrorRef = ref(null)
    const currentProfile = ref(null)

    const profileId = () => route.query.profile

    const loadProfile = async () => {
      try {
        currentProfile.value = await profileStore.loadProfile(profileId())
      } catch (error) {
        // Le nom n'est qu'un confort d'affichage : la liste des jeux reste utilisable
        console.warn('Profil indisponible:', error?.message || error)
      }
    }

    const loadGames = async () => {
      isLoading.value = true
      loadError.value = ''
      loadErrorRef.value = null
      try {
        games.value = (await getGames(profileId())).games
      } catch (error) {
        console.error('Erreur lors du chargement des jeux:', error)
        const { message, requestId } = describeError(error, 'Les jeux n\'ont pas pu être chargés.')
        games.value = []
        loadError.value = message
        loadErrorRef.value = requestId
      } finally {
        isLoading.value = false
      }
    }

    const progressPercent = (game) => {
      const { current, target } = game.access.condition
      return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    }

    const progressText = (game) => {
      const { type, current, target } = game.access.condition
      if (type === 'average_score_week') return `Ta moyenne cette semaine : ${current} % (objectif ${target} %)`
      if (type === 'daily_streak') return `${current} / ${target} jours de suite`
      return `${current} / ${target} quiz`
    }

    const play = (game) => {
      router.push({ name: 'GamePlayer', params: { gameKey: game.key }, query: { profile: profileId() } })
    }

    const goBack = () => {
      router.push({ path: '/user-dashboard', query: { profile: profileId() } })
    }

    onMounted(() => {
      loadProfile()
      loadGames()
    })

    return {
      games,
      isLoading,
      loadError,
      loadErrorRef,
      currentProfile,
      loadGames,
      display: gameDisplay,
      formatPlayTime,
      progressPercent,
      progressText,
      play,
      goBack
    }
  }
}
</script>
