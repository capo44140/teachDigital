/**
 * Notifications de l'espace parent, créées par le serveur (backend/lib/notify.js) :
 * - quiz_completed : un enfant a terminé un quiz (data : childProfileId, childName, lessonTitle, score…) ;
 * - security_alert : code PIN parent verrouillé après trop d'essais (data : lockMinutes, ip…) ;
 * - profile_request : un enfant demande un nouveau profil (data : requestedName, requestedType) ;
 * - info : information générale.
 *
 * Endpoints /api/notifications (jeton parent, envoyé automatiquement par apiService) :
 * - GET    /api/notifications?profileId=&isRead=&type=  → 500 au plus, les plus récentes d'abord
 * - PUT    /api/notifications/:id          { isRead }
 * - POST   /api/notifications/mark-all-read { profileId }
 * - DELETE /api/notifications/:id
 */

import { apiService, buildQuery } from './apiService.js'

export const NOTIFICATION_TYPES = Object.freeze({
  QUIZ_COMPLETED: 'quiz_completed',
  SECURITY_ALERT: 'security_alert',
  PROFILE_REQUEST: 'profile_request',
  INFO: 'info'
})

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value)

// Colonne JSONB : objet renvoyé par pg (une chaîne JSON reste tolérée)
function parseData (data) {
  if (isPlainObject(data)) return data
  if (typeof data !== 'string' || !data) return {}
  try {
    const parsed = JSON.parse(data)
    return isPlainObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Notification telle qu'affichée (champs du serveur en camelCase, `data` toujours un objet)
 * @param {Object} raw - ligne renvoyée par l'API (is_read, created_at…)
 * @returns {{ id: number, type: string, title: string, message: string, data: Object, isRead: boolean, createdAt: string|null }}
 */
export function normalizeNotification (raw = {}) {
  return {
    id: raw.id,
    type: raw.type || NOTIFICATION_TYPES.INFO,
    title: raw.title || '',
    message: raw.message || '',
    data: parseData(raw.data),
    isRead: raw.is_read === true,
    createdAt: raw.created_at || null
  }
}

/**
 * Notifications d'un profil parent, les plus récentes d'abord
 * @param {string|number} profileId - profil parent de la session
 * @param {{ isRead?: boolean, type?: string }} filters
 * @returns {Promise<Array>} notifications normalisées
 */
export async function getNotifications (profileId, { isRead, type } = {}) {
  const response = await apiService.request(`/api/notifications${buildQuery({ profileId, isRead, type })}`)
  const list = response?.data?.notifications
  return Array.isArray(list) ? list.map(normalizeNotification) : []
}

/**
 * Nombre de notifications non lues
 * @returns {Promise<number>}
 */
export async function getUnreadCount (profileId) {
  const unread = await getNotifications(profileId, { isRead: false })
  return unread.length
}

/**
 * Marquer une notification comme lue (ou non lue)
 * @returns {Promise<Object|null>} notification mise à jour
 */
export async function setNotificationRead (id, isRead = true) {
  const response = await apiService.request(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ isRead })
  })
  const notification = response?.data?.notification
  return notification ? normalizeNotification(notification) : null
}

/**
 * Marquer comme lues toutes les notifications d'un profil
 * @returns {Promise<number>} nombre de notifications modifiées
 */
export async function markAllNotificationsRead (profileId) {
  const response = await apiService.request('/api/notifications/mark-all-read', {
    method: 'POST',
    body: JSON.stringify({ profileId })
  })
  return Number(response?.data?.updated) || 0
}

/**
 * Supprimer une notification
 * @returns {Promise<boolean>}
 */
export async function deleteNotification (id) {
  const response = await apiService.request(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return response?.success !== false
}

// ─── Affichage ───────────────────────────────────────────────────────────────

/**
 * Profil demandé par un enfant (profile_request), ou null
 * (profileController : data.requestedName, data.requestedType 'child' | 'teen')
 * @returns {{ name: string, type: 'child'|'teen' }|null}
 */
export function getProfileRequestDetails (notification) {
  if (notification?.type !== NOTIFICATION_TYPES.PROFILE_REQUEST) return null
  const name = typeof notification.data?.requestedName === 'string' ? notification.data.requestedName.trim() : ''
  if (!name) return null
  return { name, type: notification.data.requestedType === 'teen' ? 'teen' : 'child' }
}

/**
 * Enfant concerné par un quiz terminé (lien vers sa page de progrès), ou null
 * (lessonController : data.childProfileId, data.childName)
 * @returns {{ id: string, name: string }|null}
 */
export function getQuizCompletedChild (notification) {
  if (notification?.type !== NOTIFICATION_TYPES.QUIZ_COMPLETED) return null
  const id = notification.data?.childProfileId
  if (id === undefined || id === null || id === '') return null
  const name = typeof notification.data.childName === 'string' ? notification.data.childName.trim() : ''
  return { id: String(id), name }
}

export default {
  getNotifications,
  getUnreadCount,
  setNotificationRead,
  markAllNotificationsRead,
  deleteNotification
}
