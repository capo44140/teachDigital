/**
 * Jeux (section « Jeux ») : endpoints /api/games
 * - liste des jeux d'un profil, avec la règle du parent et l'accès évalué par le serveur ;
 * - règle d'accès d'un enfant (parents) ;
 * - parties : début, signaux de vie (temps de jeu compté par le serveur), fin.
 */

import { apiService, buildQuery } from './apiService.js'

// Intervalle des signaux de vie pendant une partie (le serveur compte au plus 45 s par signal)
export const HEARTBEAT_INTERVAL_MS = 15000

/**
 * Jeux d'un profil et catalogue des conditions d'accès
 * @param {number|string} profileId
 * @returns {Promise<{games: Array, conditionTypes: Array}>}
 */
export async function getGames (profileId) {
  const response = await apiService.request(`/api/games${buildQuery({ profileId })}`)
  return {
    games: Array.isArray(response?.data?.games) ? response.data.games : [],
    conditionTypes: Array.isArray(response?.data?.conditionTypes) ? response.data.conditionTypes : []
  }
}

/**
 * Enregistrer la règle d'accès d'un enfant à un jeu (parents)
 * @param {number|string} profileId
 * @param {string} gameKey
 * @param {{isEnabled: boolean, conditionType: string, conditionValue: number, dailyLimitMinutes: number|null}} rule
 * @returns {Promise<Object>} Jeu mis à jour (règle et accès recalculés)
 */
export async function saveGameRule (profileId, gameKey, rule) {
  const response = await apiService.request(
    `/api/games/${encodeURIComponent(gameKey)}/rules/${encodeURIComponent(profileId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        isEnabled: rule.isEnabled === true,
        conditionType: rule.conditionType || 'none',
        conditionValue: Number(rule.conditionValue) || 0,
        dailyLimitMinutes: rule.dailyLimitMinutes === null || rule.dailyLimitMinutes === ''
          ? null
          : Number(rule.dailyLimitMinutes)
      })
    }
  )
  return response?.data?.game || null
}

/**
 * Commencer une partie. Jeu verrouillé : ApiError code GAME_LOCKED (voir isGameLocked)
 * @returns {Promise<{session: Object, access: Object}>}
 */
export async function startGameSession (gameKey, profileId) {
  const response = await apiService.request(`/api/games/${encodeURIComponent(gameKey)}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ profileId: Number(profileId) })
  })
  return response?.data
}

/**
 * Signal de vie ou fin de partie
 * @param {number} sessionId
 * @param {{score?: number, ended?: boolean, idle?: boolean}} update - idle : reprise après une pause
 * @param {{keepalive?: boolean}} [options] - keepalive : la requête survit à la fermeture de la page
 * @returns {Promise<{session: Object, access: Object|null, stop: boolean}>}
 */
export async function updateGameSession (sessionId, { score = 0, ended = false, idle = false } = {}, { keepalive = false } = {}) {
  const response = await apiService.request(`/api/games/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    body: JSON.stringify({ score: Math.max(0, Math.floor(Number(score) || 0)), ended, idle }),
    ...(keepalive ? { keepalive: true } : {})
  })
  return response?.data
}

/**
 * Erreur « jeu verrouillé » (fermé par le parent, condition non remplie, temps du jour écoulé)
 * @returns {Object|null} accès renvoyé par le serveur, ou null si ce n'est pas un verrou
 */
export function lockedAccess (error) {
  if (error?.code !== 'GAME_LOCKED') return null
  return error.data?.access || { unlocked: false, message: error.message }
}
