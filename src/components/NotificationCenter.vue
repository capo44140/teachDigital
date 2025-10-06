<template>
  <div class="notification-center">
    <!-- Bouton de notification avec badge -->
    <div class="relative">
      <button 
        @click="toggleNotifications"
        class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors relative"
        title="Notifications"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z"/>
        </svg>
        
        <!-- Badge de notification -->
        <span 
          v-if="unreadCount > 0"
          class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </div>

    <!-- Panneau des notifications -->
    <div 
      v-if="showNotifications"
      class="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
    >
      <!-- En-tête -->
      <div class="p-4 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800">Notifications</h3>
          <div class="flex space-x-2">
            <button 
              @click="markAllAsRead"
              v-if="unreadCount > 0"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Tout marquer comme lu
            </button>
            <button 
              @click="clearAllRead"
              v-if="notifications.length > unreadCount"
              class="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Nettoyer
            </button>
          </div>
        </div>
      </div>

      <!-- Liste des notifications -->
      <div v-if="notifications.length === 0" class="p-6 text-center text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0 15 0v5z"/>
        </svg>
        <p>Aucune notification</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          :class="[
            'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
            !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          ]"
          @click="markAsRead(notification.id)"
        >
          <div class="flex items-start space-x-3">
            <!-- Icône selon le type -->
            <div class="flex-shrink-0">
              <div 
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  getNotificationIconClass(notification.type)
                ]"
              >
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path v-if="notification.type === 'quiz_completed'" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  <path v-else d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>

            <!-- Contenu -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-gray-900 truncate">
                  {{ notification.title }}
                </h4>
                <span class="text-xs text-gray-500">
                  {{ formatDate(notification.created_at) }}
                </span>
              </div>
              <p class="text-sm text-gray-600 mt-1">
                {{ notification.message }}
              </p>
              
              <!-- Données supplémentaires pour les quiz -->
              <div v-if="notification.type === 'quiz_completed' && notification.data" class="mt-2">
                <div class="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Score: {{ notification.data.score }}/{{ notification.data.totalQuestions }}</span>
                  <span>Note: {{ notification.data.percentage }}%</span>
                </div>
              </div>
            </div>

            <!-- Indicateur de non-lu -->
            <div v-if="!notification.is_read" class="flex-shrink-0">
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
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
        'quiz_completed': 'bg-green-500',
        'achievement': 'bg-yellow-500',
        'reminder': 'bg-blue-500',
        'default': 'bg-gray-500'
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

/* Animation pour le panneau des notifications */
.notification-center > div:last-child {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
