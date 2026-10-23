<template>
  <BaseModal
    :open="open"
    labelledby="notification-panel-title"
    describedby="notification-panel-summary"
    initial-focus="[data-notification-close]"
    overlay-class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
    panel-class="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-2xl shadow-2xl"
    @close="close"
  >
    <div class="p-6 border-b border-white/10">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 id="notification-panel-title" ref="title" tabindex="-1" class="text-xl font-bold text-white focus:outline-none">
            Notifications
          </h2>
          <!-- Résumé annoncé à l'ouverture (aria-describedby) puis à chaque mise à jour -->
          <p id="notification-panel-summary" class="text-sm text-white/70 mt-1" aria-live="polite">{{ summary }}</p>
        </div>
        <button
          type="button"
          data-notification-close
          class="p-2 text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-xl hover:bg-white/10 transition-all flex-shrink-0"
          aria-label="Fermer les notifications"
          title="Fermer"
          @click="close"
        >
          <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <button
        v-if="unreadCount > 0 && !showError && !showLoading"
        type="button"
        class="mt-4 px-3 py-2 text-sm font-medium text-white/90 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="markingAll"
        @click="markAllAsRead"
      >
        Tout marquer comme lu
      </button>
    </div>

    <!-- Résultat des actions (lue, supprimée…) pour les lecteurs d'écran -->
    <p class="sr-only" role="status">{{ announcement }}</p>

    <div class="p-4 sm:p-6 overflow-y-auto">
      <div v-if="showLoading" class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-white/20 border-t-white/80 mb-3" aria-hidden="true"></div>
        <p class="text-white/70">Chargement des notifications…</p>
      </div>

      <div v-else-if="showError" class="text-center py-8" role="alert">
        <p class="text-white font-medium">Impossible de charger les notifications.</p>
        <p class="text-white/70 text-sm mt-1">{{ errorText.message }}</p>
        <p v-if="errorText.requestId" class="text-white/50 text-xs mt-1">Réf. {{ errorText.requestId }}</p>
        <button
          type="button"
          class="mt-4 px-4 py-2 text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:opacity-90 transition-all"
          @click="retry"
        >
          Réessayer
        </button>
      </div>

      <div v-else-if="notifications.length === 0" class="text-center py-10">
        <svg aria-hidden="true" class="w-12 h-12 mx-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="BELL_PATH"/>
        </svg>
        <p class="text-white font-medium mt-3">Aucune notification</p>
        <p class="text-white/70 text-sm mt-1">
          Les résultats des quiz, les demandes de profil et les alertes de sécurité apparaîtront ici.
        </p>
      </div>

      <ul v-else ref="list" class="space-y-3" aria-label="Notifications reçues">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          :data-notification-id="notification.id"
          tabindex="-1"
          :class="itemClass(notification)"
        >
          <div class="flex items-start gap-3">
            <span
              class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              :class="notification.isSecurityAlert ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/80'"
              aria-hidden="true"
            >
              <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath(notification)"/>
              </svg>
            </span>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-white break-words">{{ notification.label }}</h3>
                <span
                  v-if="notification.isSecurityAlert"
                  class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/40"
                >Alerte de sécurité</span>
                <span
                  v-if="!notification.isRead"
                  class="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-200 border border-pink-400/40"
                >Non lue</span>
              </div>

              <p v-if="notification.message" class="text-white/80 text-sm mt-1 whitespace-pre-line break-words">{{ notification.message }}</p>

              <p v-if="notification.request" class="text-sm text-white/80 mt-2">
                Profil demandé : <strong class="text-white">{{ notification.request.name }}</strong>
                ({{ notification.request.typeLabel }})
              </p>

              <p class="text-xs text-white/60 mt-2">
                <time :datetime="notification.createdAt || undefined" :title="notification.absoluteDate">{{ notification.relativeDate }}</time>
              </p>

              <div class="flex flex-wrap gap-2 mt-3">
                <button
                  v-if="notification.child"
                  type="button"
                  class="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition-all"
                  @click="openChildProgress(notification)"
                >
                  {{ notification.child.name ? `Voir les progrès de ${notification.child.name}` : 'Voir les progrès' }}
                </button>
                <button
                  v-if="notification.type === TYPES.PROFILE_REQUEST"
                  type="button"
                  class="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition-all"
                  @click="goToProfiles(notification)"
                >
                  Gérer les profils
                </button>
                <button
                  v-if="!notification.isRead"
                  type="button"
                  class="px-3 py-1.5 text-sm text-white/90 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isPending(notification.id)"
                  :aria-label="`Marquer comme lue : ${notification.label}`"
                  @click="markAsRead(notification)"
                >
                  Marquer comme lue
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm text-red-300 border border-red-400/30 rounded-lg hover:bg-red-400/10 hover:border-red-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isPending(notification.id)"
                  :aria-label="`Supprimer : ${notification.label}`"
                  @click="remove(notification)"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue'
import { useNotificationStore } from '../../stores/notificationStore.js'
import { useToastStore } from '../../stores/toastStore.js'
import { useConfirm } from '../../composables/useConfirm.js'
import { parentLocation } from '../../composables/useParentNavigation.js'
import {
  NOTIFICATION_TYPES,
  getProfileRequestDetails,
  getQuizCompletedChild
} from '../../services/notificationService.js'
import { formatDate, formatRelativeDate, getChildTypeLabel } from '../../utils/progressFormatters.js'
import { describeError } from '../../utils/apiErrors.js'

const BELL_PATH = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'

// Icône par type (info par défaut)
const ICON_PATHS = {
  [NOTIFICATION_TYPES.QUIZ_COMPLETED]: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  [NOTIFICATION_TYPES.SECURITY_ALERT]: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  [NOTIFICATION_TYPES.PROFILE_REQUEST]: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  [NOTIFICATION_TYPES.INFO]: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
}

const plural = (count, singular, pluralForm) => `${count} ${count > 1 ? pluralForm : singular}`

export default {
  name: 'NotificationPanel',
  components: { BaseModal },
  props: {
    open: { type: Boolean, default: false },
    // Profil parent de la session
    profileId: { type: String, required: true }
  },
  emits: ['close'],
  setup() {
    const notificationStore = useNotificationStore()
    const toast = useToastStore()
    const { confirm } = useConfirm()
    return { notificationStore, toast, confirm, TYPES: NOTIFICATION_TYPES, BELL_PATH }
  },
  data() {
    return {
      // Instant de référence des dates relatives (fixé à chaque chargement)
      now: Date.now(),
      pendingIds: [],
      markingAll: false,
      announcement: ''
    }
  },
  computed: {
    notifications() {
      return this.notificationStore.items.map(notification => {
        const request = getProfileRequestDetails(notification)
        return {
          ...notification,
          label: notification.title || 'Notification',
          isSecurityAlert: notification.type === NOTIFICATION_TYPES.SECURITY_ALERT,
          request: request ? { ...request, typeLabel: getChildTypeLabel(request.type) } : null,
          child: getQuizCompletedChild(notification),
          relativeDate: formatRelativeDate(notification.createdAt, { now: this.now }),
          absoluteDate: formatDate(notification.createdAt)
        }
      })
    },
    unreadCount() {
      return this.notificationStore.unreadCount
    },
    showLoading() {
      return this.notificationStore.loading && !this.notificationStore.loaded
    },
    showError() {
      return !!this.notificationStore.error && !this.notificationStore.loading
    },
    errorText() {
      return describeError(this.notificationStore.error, 'Vérifiez votre connexion puis réessayez.')
    },
    summary() {
      if (this.showLoading) return 'Chargement…'
      if (this.showError) return 'Liste indisponible.'
      const total = this.notifications.length
      if (total === 0) return 'Aucune notification.'
      const unread = this.notifications.filter(notification => !notification.isRead).length
      if (unread === 0) return `${plural(total, 'notification', 'notifications')}, aucune non lue.`
      return `${plural(total, 'notification', 'notifications')}, dont ${plural(unread, 'non lue', 'non lues')}.`
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        if (open) this.load()
      }
    }
  },
  methods: {
    // Liste + compteur de la cloche (rechargés à chaque ouverture)
    load() {
      this.now = Date.now()
      return this.notificationStore.fetchNotifications(this.profileId)
    },
    // « Réessayer » disparaît pendant le chargement : le focus passe sur le titre
    async retry() {
      await this.load()
      await this.$nextTick()
      this.focusElement(this.$refs.title)
    },
    close() {
      this.$emit('close')
    },
    iconPath(notification) {
      return ICON_PATHS[notification.type] || ICON_PATHS[NOTIFICATION_TYPES.INFO]
    },
    itemClass(notification) {
      const tone = notification.isSecurityAlert
        ? 'border-amber-400/50 bg-amber-500/10'
        : (notification.isRead ? 'border-white/10 bg-white/5' : 'border-purple-400/40 bg-white/10')
      return [
        'rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400',
        tone,
        // Non lue : liseré à gauche (ambre pour une alerte de sécurité)
        notification.isRead ? '' : ['border-l-4', notification.isSecurityAlert ? 'border-l-amber-400' : 'border-l-pink-400']
      ]
    },
    isPending(id) {
      return this.pendingIds.includes(id)
    },
    // Même message répété : vider puis réécrire pour qu'il soit annoncé de nouveau
    async announce(message) {
      this.announcement = ''
      await this.$nextTick()
      this.announcement = message
    },
    focusElement(element) {
      if (element && typeof element.focus === 'function') element.focus()
    },
    // Le bouton activé disparaît (ou la notification) : le focus va sur la notification, sinon le titre
    async restoreFocus(index) {
      await this.$nextTick()
      const items = this.$refs.list ? [...this.$refs.list.querySelectorAll('[data-notification-id]')] : []
      const target = items.length > 0 ? items[Math.min(Math.max(index, 0), items.length - 1)] : null
      this.focusElement(target || this.$refs.title)
    },
    indexOf(id) {
      return this.notifications.findIndex(notification => notification.id === id)
    },
    async markAsRead(notification) {
      const { id } = notification
      if (this.isPending(id)) return
      this.pendingIds.push(id)
      try {
        await this.notificationStore.markAsRead(id)
        this.announce('Notification marquée comme lue.')
        this.restoreFocus(this.indexOf(id))
      } catch (error) {
        this.toast.errorFrom(error, 'Impossible de marquer la notification comme lue.')
      } finally {
        this.pendingIds = this.pendingIds.filter(pendingId => pendingId !== id)
      }
    },
    async markAllAsRead() {
      if (this.markingAll) return
      this.markingAll = true
      try {
        await this.notificationStore.markAllAsRead()
        this.announce('Toutes les notifications sont marquées comme lues.')
        await this.$nextTick()
        this.focusElement(this.$refs.title)
      } catch (error) {
        this.toast.errorFrom(error, 'Impossible de marquer les notifications comme lues.')
      } finally {
        this.markingAll = false
      }
    },
    async remove(notification) {
      const { id } = notification
      if (this.isPending(id)) return
      const confirmed = await this.confirm({
        title: 'Supprimer la notification ?',
        message: `« ${notification.label} » sera définitivement supprimée.`,
        confirmLabel: 'Supprimer',
        danger: true
      })
      if (!confirmed) return

      const index = this.indexOf(id)
      this.pendingIds.push(id)
      try {
        await this.notificationStore.remove(id)
        this.announce('Notification supprimée.')
        this.restoreFocus(index)
      } catch (error) {
        this.toast.errorFrom(error, 'Impossible de supprimer la notification.')
      } finally {
        this.pendingIds = this.pendingIds.filter(pendingId => pendingId !== id)
      }
    },
    // Ouvrir le sujet d'une notification la marque comme lue (sans bloquer la navigation)
    markAsReadInBackground(notification) {
      if (notification.isRead) return
      this.notificationStore.markAsRead(notification.id).catch(error => {
        console.warn('Notification non marquée comme lue:', error?.message || error)
      })
    },
    openChildProgress(notification) {
      this.markAsReadInBackground(notification)
      this.close()
      this.$router.push({ name: 'ProgressTracking', query: { childId: notification.child.id } })
    },
    goToProfiles(notification) {
      this.markAsReadInBackground(notification)
      this.close()
      this.$router.push(parentLocation('/manage-profiles'))
    }
  }
}
</script>
