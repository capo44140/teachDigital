import { defineStore } from 'pinia'
import {
  getNotifications,
  getUnreadCount,
  setNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from '../services/notificationService.js'

// Dernières lectures lancées : les réponses plus anciennes sont ignorées
let latestListRequest = 0
let latestCountRequest = 0

const toProfileId = value => (value === undefined || value === null || value === '' ? null : String(value))

/**
 * Notifications du profil parent : liste affichée par le panneau et compteur de non lues
 * partagé avec la cloche de l'en-tête du tableau de bord.
 * Les actions (lue, tout lire, suppression) portent sur la liste chargée par le panneau.
 */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    profileId: null,
    items: [],
    unreadCount: 0,
    loading: false,
    // Liste chargée au moins une fois (le panneau garde l'ancienne liste pendant l'actualisation)
    loaded: false,
    error: null
  }),

  actions: {
    /**
     * Profil parent courant ; un autre profil repart d'un état vide
     * @returns {string|null}
     */
    setProfile (profileId) {
      const id = toProfileId(profileId)
      if (id !== this.profileId) {
        latestListRequest++
        latestCountRequest++
        this.$reset()
        this.profileId = id
      }
      return id
    },

    /**
     * Actualiser le compteur de non lues (cloche). Une erreur garde la dernière valeur connue.
     * @returns {Promise<number>}
     */
    async refreshUnreadCount (profileId = this.profileId) {
      const id = this.setProfile(profileId)
      if (!id) return this.unreadCount
      const request = ++latestCountRequest
      try {
        const count = await getUnreadCount(id)
        if (request === latestCountRequest) this.unreadCount = count
      } catch (error) {
        console.warn('Compteur de notifications indisponible:', error?.message || error)
      }
      return this.unreadCount
    },

    /**
     * Charger la liste (et recalculer le compteur). L'erreur est conservée dans `error`.
     * @returns {Promise<Array>}
     */
    async fetchNotifications (profileId = this.profileId) {
      const id = this.setProfile(profileId)
      if (!id) return this.items
      const request = ++latestListRequest
      this.loading = true
      this.error = null
      try {
        const items = await getNotifications(id)
        if (request === latestListRequest) {
          this.items = items
          this.loaded = true
          this.syncUnreadCount()
        }
      } catch (error) {
        if (request === latestListRequest) this.error = error
      } finally {
        if (request === latestListRequest) this.loading = false
      }
      return this.items
    },

    // Compteur déduit de la liste ; une lecture du compteur encore en cours devient périmée
    syncUnreadCount () {
      latestCountRequest++
      this.unreadCount = this.items.filter(item => !item.isRead).length
    },

    async markAsRead (id, isRead = true) {
      const updated = await setNotificationRead(id, isRead)
      const item = this.items.find(notification => notification.id === id)
      if (item) item.isRead = updated ? updated.isRead : isRead
      this.syncUnreadCount()
    },

    /**
     * @returns {Promise<number>} nombre de notifications modifiées par le serveur
     */
    async markAllAsRead () {
      if (!this.profileId) return 0
      const updated = await markAllNotificationsRead(this.profileId)
      this.items.forEach(item => { item.isRead = true })
      this.syncUnreadCount()
      return updated
    },

    async remove (id) {
      try {
        await deleteNotification(id)
      } catch (error) {
        // Déjà supprimée (autre appareil, autre parent) : le résultat attendu est atteint
        if (error?.status !== 404) throw error
      }
      this.items = this.items.filter(notification => notification.id !== id)
      this.syncUnreadCount()
    }
  }
})
