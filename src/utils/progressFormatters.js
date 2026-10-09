/**
 * Formatters et helpers purs pour l'affichage des progrès.
 * Aucune dépendance Vue ; testables unitairement.
 */

export function formatPercentage(value) {
  if (isNaN(value) || value === null || value === undefined) return 0
  return Math.round(Number(value)) || 0
}

export function formatNumber(value) {
  if (isNaN(value) || value === null || value === undefined) return 0
  return Math.round(Number(value)) || 0
}

export function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDuration(minutes) {
  if (!minutes) return 'N/A'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
}

export function getScoreClass(percentage) {
  if (percentage >= 90) return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30'
  if (percentage >= 80) return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-400/30'
  if (percentage >= 70) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-400/30'
  return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border border-red-400/30'
}

export function getChildTypeLabel(type) {
  const types = {
    child: 'Enfant',
    teen: 'Adolescent',
    adult: 'Adulte'
  }
  return types[type] || 'Enfant'
}

/**
 * Filtre l'historique des quiz selon une période ('all', 'week', 'month', 'year').
 */
export function filterHistoryByPeriod(history, period) {
  if (!Array.isArray(history) || period === 'all') return [...(history || [])]

  const now = new Date()
  const filterDate = new Date()
  switch (period) {
    case 'week':  filterDate.setDate(now.getDate() - 7); break
    case 'month': filterDate.setMonth(now.getMonth() - 1); break
    case 'year':  filterDate.setFullYear(now.getFullYear() - 1); break
    default: return [...history]
  }

  return history.filter(quiz => new Date(quiz.completedAt) >= filterDate)
}

/**
 * Meilleure série de bonnes réponses d'une session (champ `answers` de l'historique,
 * renseigné par les pages de cours : { source: 'course_page', bestStreak }).
 * @returns {number} 0 si l'information est absente
 */
export function getBestStreak(answers) {
  let data = answers
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return 0
    }
  }
  const value = Number(data?.bestStreak)
  return Number.isFinite(value) && value > 0 ? value : 0
}
