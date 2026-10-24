/**
 * Affichage des jeux : pictogramme et couleurs par clé de jeu (titre, description et
 * règles viennent du serveur), composant de jeu chargé à la demande, durées lisibles.
 */
import { defineAsyncComponent } from 'vue'

export const GAME_DISPLAY = {
  pacman: {
    icon: '🟡',
    gradient: 'from-yellow-400 to-amber-500',
    component: defineAsyncComponent(() => import('../components/games/PacmanGame.vue'))
  },
  tetris: {
    icon: '🧱',
    gradient: 'from-cyan-400 to-violet-500',
    component: defineAsyncComponent(() => import('../components/games/TetrisGame.vue'))
  }
}

const FALLBACK_DISPLAY = { icon: '🎮', gradient: 'from-purple-400 to-pink-400', component: null }

export function gameDisplay (key) {
  return GAME_DISPLAY[key] || FALLBACK_DISPLAY
}

/**
 * Durée lisible : « 45 s », « 12 min », « 1 h 05 »
 * @param {number} seconds
 */
export function formatPlayTime (seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

/**
 * Compte à rebours « 4:07 » (minutes:secondes)
 * @param {number} seconds
 */
export function formatCountdown (seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Durées proposées au parent (minutes par jour) ; null = sans limite
export const DAILY_LIMIT_PRESETS = [null, 10, 15, 20, 30, 45, 60, 90, 120]
