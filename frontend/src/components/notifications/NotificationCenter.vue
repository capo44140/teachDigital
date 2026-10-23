<template>
  <div class="relative">
    <!-- Cloche : le nombre de non lues fait partie du nom accessible (« Notifications, 3 non lues ») -->
    <button
      type="button"
      class="relative p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
      :title="buttonLabel"
      :aria-label="buttonLabel"
      aria-haspopup="dialog"
      @click="openPanel"
    >
      <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-pink-500 border border-white/40 text-white text-xs font-bold leading-none flex items-center justify-center shadow-lg"
        aria-hidden="true"
      >{{ badgeText }}</span>
    </button>

    <NotificationPanel :open="isOpen" :profile-id="profileId" @close="closePanel" />
  </div>
</template>

<script>
import NotificationPanel from './NotificationPanel.vue'
import { useNotificationStore } from '../../stores/notificationStore.js'

// Retour sur l'onglet : pas plus d'une actualisation du compteur toutes les 30 s
const FOCUS_REFRESH_INTERVAL_MS = 30 * 1000

export default {
  name: 'NotificationCenter',
  components: { NotificationPanel },
  props: {
    // Profil parent de la session (getParentProfileId)
    profileId: { type: String, required: true }
  },
  setup() {
    const notificationStore = useNotificationStore()
    return { notificationStore }
  },
  data() {
    return {
      isOpen: false,
      lastRefreshAt: 0
    }
  },
  computed: {
    unreadCount() {
      return this.notificationStore.unreadCount
    },
    badgeText() {
      return this.unreadCount > 99 ? '99+' : String(this.unreadCount)
    },
    buttonLabel() {
      if (this.unreadCount === 0) return 'Notifications'
      return `Notifications, ${this.unreadCount} ${this.unreadCount > 1 ? 'non lues' : 'non lue'}`
    }
  },
  watch: {
    profileId() {
      this.refreshUnreadCount()
    }
  },
  mounted() {
    this.refreshUnreadCount()
    window.addEventListener('focus', this.onWindowFocus)
  },
  beforeUnmount() {
    window.removeEventListener('focus', this.onWindowFocus)
  },
  methods: {
    refreshUnreadCount() {
      this.lastRefreshAt = Date.now()
      return this.notificationStore.refreshUnreadCount(this.profileId)
    },
    // Le panneau ouvert recharge déjà sa liste (et le compteur)
    onWindowFocus() {
      if (this.isOpen || Date.now() - this.lastRefreshAt < FOCUS_REFRESH_INTERVAL_MS) return
      this.refreshUnreadCount()
    },
    openPanel() {
      this.isOpen = true
    },
    closePanel() {
      this.isOpen = false
    }
  }
}
</script>
