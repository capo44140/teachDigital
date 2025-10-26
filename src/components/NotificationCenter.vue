<template>
  <div class="notification-center">
    <!-- Bouton de notification avec badge - Liquid Glass Style -->
    <div class="relative">
      <button 
        @click="toggleNotifications"
        class="p-3 text-white/80 hover:text-white backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-white/10 relative group"
        title="Notifications"
      >
        <svg class="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z"/>
        </svg>
        
        <!-- Badge de notification - Liquid Glass Style -->
        <span 
          v-if="unreadCount > 0"
          class="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold backdrop-blur-xl border border-white/30 shadow-lg animate-pulse"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </div>

    <!-- Panneau des notifications - Liquid Glass Style -->
    <div 
      v-if="showNotifications"
      class="absolute right-0 top-16 w-96 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto glass-notification-panel"
    >
      <!-- En-tête - Liquid Glass Style -->
      <div class="p-6 border-b border-white/20 backdrop-blur-xl bg-white/5">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-white flex items-center">
            <svg class="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z"/>
            </svg>
            Notifications
          </h3>
          <div class="flex space-x-3">
            <button 
              @click="markAllAsRead"
              v-if="unreadCount > 0"
              class="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 font-medium"
            >
              Tout marquer lu
            </button>
            <button 
              @click="clearAllRead"
              v-if="notifications.length > unreadCount"
              class="px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm rounded-lg hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300 font-medium"
            >
              Nettoyer
            </button>
          </div>
        </div>
      </div>

      <!-- Liste des notifications - Liquid Glass Style -->
      <div v-if="notifications.length === 0" class="p-8 text-center text-white/60">
        <div class="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
          <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z"/>
          </svg>
        </div>
        <p class="text-lg font-medium">Aucune notification</p>
        <p class="text-sm text-white/40 mt-1">Vous êtes à jour !</p>
      </div>

      <div v-else class="divide-y divide-white/10">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          :class="[
            'p-5 hover:bg-white/10 transition-all duration-300 cursor-pointer group',
            !notification.is_read ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-l-4 border-l-blue-400' : ''
          ]"
          @click="markAsRead(notification.id)"
        >
          <div class="flex items-start space-x-4">
            <!-- Icône selon le type - Liquid Glass Style -->
            <div class="flex-shrink-0">
              <div 
                :class="[
                  'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl border border-white/20 transition-all duration-300 group-hover:scale-110',
                  getNotificationIconClass(notification.type)
                ]"
              >
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path v-if="notification.type === 'quiz_completed'" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  <path v-else-if="notification.type === 'achievement'" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  <path v-else d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>

            <!-- Contenu - Liquid Glass Style -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                  {{ notification.title }}
                </h4>
                <span class="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-xl border border-white/20">
                  {{ formatDate(notification.created_at) }}
                </span>
              </div>
              <p class="text-sm text-white/70 leading-relaxed">
                {{ notification.message }}
              </p>
              
              <!-- Données supplémentaires pour les quiz - Liquid Glass Style -->
              <div v-if="notification.type === 'quiz_completed' && notification.data" class="mt-3">
                <div class="flex items-center space-x-4">
                  <div class="flex items-center space-x-2 text-xs text-white/60 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xl border border-white/20">
                    <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Score: {{ notification.data.score }}/{{ notification.data.totalQuestions }}</span>
                  </div>
                  <div class="flex items-center space-x-2 text-xs text-white/60 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xl border border-white/20">
                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    <span>{{ notification.data.percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Indicateur de non-lu - Liquid Glass Style -->
            <div v-if="!notification.is_read" class="flex-shrink-0">
              <div class="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full shadow-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { NotificationService } from '../services/notificationService.js'

export default {
  name: 'NotificationCenter',
  data() {
    return {
      showNotifications: false,
      notifications: [],
      unreadCount: 0,
      isLoading: false
    }
  },
  async mounted() {
    await this.loadNotifications()
    // Recharger les notifications toutes les 30 secondes
    this.interval = setInterval(this.loadNotifications, 30000)
  },
  beforeUnmount() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  },
  methods: {
    async loadNotifications() {
      try {
        this.isLoading = true
        const profileId = this.$route.query.profile || '1'
        this.notifications = await NotificationService.getNotifications(profileId)
        this.unreadCount = this.notifications.filter(n => !n.is_read).length
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    toggleNotifications() {
      this.showNotifications = !this.showNotifications
      if (this.showNotifications) {
        this.loadNotifications()
      }
    },
    
    async markAsRead(notificationId) {
      try {
        await NotificationService.markAsRead(notificationId)
        await this.loadNotifications()
      } catch (error) {
        console.error('Erreur lors du marquage de la notification:', error)
      }
    },
    
    async markAllAsRead() {
      try {
        const profileId = this.$route.query.profile || '1'
        await NotificationService.markAllAsRead(profileId)
        await this.loadNotifications()
      } catch (error) {
        console.error('Erreur lors du marquage des notifications:', error)
      }
    },
    
    async clearAllRead() {
      try {
        const profileId = this.$route.query.profile || '1'
        await NotificationService.deleteReadNotifications(profileId)
        await this.loadNotifications()
      } catch (error) {
        console.error('Erreur lors de la suppression des notifications:', error)
      }
    },
    
    getNotificationIconClass(type) {
      const classes = {
        'quiz_completed': 'bg-gradient-to-br from-green-500/30 to-emerald-500/30',
        'achievement': 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30',
        'reminder': 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30',
        'system_alert': 'bg-gradient-to-br from-red-500/30 to-pink-500/30',
        'default': 'bg-gradient-to-br from-gray-500/30 to-slate-500/30'
      }
      return classes[type] || classes.default
    },
    
    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // Moins d'une minute
        return 'À l\'instant'
      } else if (diff < 3600000) { // Moins d'une heure
        const minutes = Math.floor(diff / 60000)
        return `Il y a ${minutes} min`
      } else if (diff < 86400000) { // Moins d'un jour
        const hours = Math.floor(diff / 3600000)
        return `Il y a ${hours}h`
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }
  }
}
</script>

<style scoped>
.notification-center {
  position: relative;
}

/* Animation pour le panneau des notifications - Liquid Glass Style */
.glass-notification-panel {
  animation: slideDownGlass 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.glass-notification-panel:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 
    0 12px 48px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

@keyframes slideDownGlass {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    backdrop-filter: blur(20px);
  }
}

/* Animation pour les éléments de notification */
.notification-center .glass-notification-panel > div:last-child > div {
  animation: fadeInUp 0.3s ease-out;
  animation-fill-mode: both;
}

.notification-center .glass-notification-panel > div:last-child > div:nth-child(1) { animation-delay: 0.1s; }
.notification-center .glass-notification-panel > div:last-child > div:nth-child(2) { animation-delay: 0.2s; }
.notification-center .glass-notification-panel > div:last-child > div:nth-child(3) { animation-delay: 0.3s; }
.notification-center .glass-notification-panel > div:last-child > div:nth-child(4) { animation-delay: 0.4s; }
.notification-center .glass-notification-panel > div:last-child > div:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Effet de hover pour les notifications individuelles */
.notification-center .glass-notification-panel > div:last-child > div:hover {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.15) !important;
}

/* Animation pour le badge de notification */
.notification-center button span {
  animation: pulseGlow 2s infinite;
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

/* Scrollbar personnalisée pour le panneau */
.glass-notification-panel::-webkit-scrollbar {
  width: 6px;
}

.glass-notification-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.glass-notification-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.glass-notification-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Responsive design */
@media (max-width: 640px) {
  .glass-notification-panel {
    width: calc(100vw - 2rem);
    right: -1rem;
    left: -1rem;
  }
}
</style>
