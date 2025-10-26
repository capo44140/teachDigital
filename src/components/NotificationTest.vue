<template>
  <!-- 
    LIQUID GLASS DESIGN - Test du Système de Notifications
    
    ✨ Backdrop blur translucide
    🌈 Gradients animés en arrière-plan
    💎 Cartes glass semi-transparentes
    ✨ Animations fluides
  -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header avec navigation -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au tableau de bord"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white flex items-center">
                <div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl mr-3 flex items-center justify-center">
                  <span class="text-lg">🧪</span>
                </div>
                Test du Système de Notifications
              </h1>
              <p class="text-sm text-white/60 hidden sm:block">Interface de test pour valider toutes les fonctionnalités du système de notifications</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <div class="max-w-6xl mx-auto space-y-8">

        <!-- Sélection du profil - Liquid Glass Style -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
            Profil de Test
          </h2>
          <div class="flex items-center space-x-4">
            <label class="text-sm font-medium text-white/80">Profil ID:</label>
            <input
              v-model="testProfileId"
              type="number"
              min="1"
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="1"
            />
            <button
              @click="loadProfileData"
              class="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 font-medium"
            >
              Charger les données
            </button>
          </div>
        </div>

        <!-- Tests automatiques - Liquid Glass Style -->
        <div class="glass-card-dashboard">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <svg class="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Tests Automatiques
          </h2>
          <div class="flex space-x-4 mb-6">
            <button
              @click="runAllTests"
              :disabled="isRunningTests"
              class="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 transition-all duration-300 font-medium"
            >
              {{ isRunningTests ? 'Tests en cours...' : 'Lancer tous les tests' }}
            </button>
            <button
              @click="clearTestResults"
              class="px-6 py-3 bg-gradient-to-r from-gray-500 to-slate-500 text-white rounded-xl hover:shadow-lg hover:shadow-gray-500/50 transition-all duration-300 font-medium"
            >
              Effacer les résultats
            </button>
          </div>

          <!-- Résultats des tests - Liquid Glass Style -->
          <div v-if="testResults.length > 0" class="space-y-3">
            <div
              v-for="(result, index) in testResults"
              :key="index"
              :class="[
                'p-4 rounded-xl border-l-4 transition-all duration-300 backdrop-blur-xl',
                result.success 
                  ? 'bg-green-500/10 border-green-400 text-green-100' 
                  : 'bg-red-500/10 border-red-400 text-red-100'
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <span class="text-xl">{{ result.success ? '✅' : '❌' }}</span>
                  <span class="font-medium">{{ result.test }}</span>
                </div>
                <span class="text-sm text-white/60 bg-white/10 px-2 py-1 rounded-lg">{{ result.duration }}ms</span>
              </div>
              <p v-if="result.message" class="mt-2 text-sm">{{ result.message }}</p>
              <div v-if="result.details" class="mt-3 text-xs bg-white/5 p-3 rounded-lg backdrop-blur-xl border border-white/10">
                <pre class="text-white/70">{{ JSON.stringify(result.details, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>

      <!-- Tests manuels -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Création de notification -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Créer une Notification</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                v-model="newNotification.type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="test">Test</option>
                <option value="quiz_completed">Quiz Terminé</option>
                <option value="achievement">Réussite</option>
                <option value="reminder">Rappel</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input
                v-model="newNotification.title"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Titre de la notification"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                v-model="newNotification.message"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Message de la notification"
              ></textarea>
            </div>
            <button
              @click="createNotification"
              :disabled="isCreating"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {{ isCreating ? 'Création...' : 'Créer la notification' }}
            </button>
          </div>
        </div>

        <!-- Notification de quiz -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Notification de Quiz</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Score</label>
              <input
                v-model.number="quizData.score"
                type="number"
                min="0"
                max="100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Total des questions</label>
              <input
                v-model.number="quizData.totalQuestions"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Titre de la leçon</label>
              <input
                v-model="quizData.lessonTitle"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nom de la leçon"
              />
            </div>
            <button
              @click="createQuizNotification"
              :disabled="isCreatingQuiz"
              class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {{ isCreatingQuiz ? 'Création...' : 'Créer notification de quiz' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Actions sur les notifications -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Actions sur les Notifications</h3>
        <div class="flex flex-wrap gap-4">
          <button
            @click="loadNotifications"
            :disabled="isLoading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {{ isLoading ? 'Chargement...' : 'Charger les notifications' }}
          </button>
          <button
            @click="markAllAsRead"
            :disabled="isMarkingAll"
            class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            {{ isMarkingAll ? 'Marquage...' : 'Tout marquer comme lu' }}
          </button>
          <button
            @click="deleteReadNotifications"
            :disabled="isDeleting"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {{ isDeleting ? 'Suppression...' : 'Supprimer les lues' }}
          </button>
          <button
            @click="getNotificationStats"
            :disabled="isLoadingStats"
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {{ isLoadingStats ? 'Chargement...' : 'Statistiques' }}
          </button>
        </div>
      </div>

      <!-- Liste des notifications -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Notifications Actuelles</h3>
        <div v-if="notifications.length === 0" class="text-center text-gray-500 py-8">
          Aucune notification trouvée
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            :class="[
              'p-4 rounded-lg border-l-4 transition-all duration-300',
              !notification.is_read 
                ? 'bg-blue-50 border-blue-500' 
                : 'bg-gray-50 border-gray-300'
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="text-sm font-medium text-gray-900">{{ notification.title }}</span>
                  <span class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                    {{ notification.type }}
                  </span>
                  <span v-if="!notification.is_read" class="text-xs px-2 py-1 bg-blue-200 text-blue-700 rounded-full">
                    Non lu
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-2">{{ notification.message }}</p>
                <div class="text-xs text-gray-500">
                  {{ formatDate(notification.created_at) }}
                </div>
                <div v-if="notification.data" class="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                  <pre>{{ JSON.stringify(notification.data, null, 2) }}</pre>
                </div>
              </div>
              <div class="flex space-x-2 ml-4">
                <button
                  v-if="!notification.is_read"
                  @click="markAsRead(notification.id)"
                  class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Marquer lu
                </button>
                <button
                  @click="deleteNotification(notification.id)"
                  class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques -->
      <div v-if="stats" class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Statistiques</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ stats.total }}</div>
            <div class="text-sm text-blue-800">Total</div>
          </div>
          <div class="text-center p-4 bg-yellow-50 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{{ stats.unread }}</div>
            <div class="text-sm text-yellow-800">Non lues</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ stats.quiz_notifications }}</div>
            <div class="text-sm text-green-800">Quiz</div>
          </div>
        </div>
      </div>

      <!-- Bouton de retour -->
      <div class="mt-8 text-center">
        <button
          @click="goBack"
          class="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Retour au Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { NotificationService } from '../services/notificationService.js'

export default {
  name: 'NotificationTest',
  data() {
    return {
      testProfileId: 1,
      notifications: [],
      stats: null,
      testResults: [],
      isRunningTests: false,
      isLoading: false,
      isCreating: false,
      isCreatingQuiz: false,
      isMarkingAll: false,
      isDeleting: false,
      isLoadingStats: false,
      newNotification: {
        type: 'test',
        title: '',
        message: ''
      },
      quizData: {
        score: 8,
        totalQuestions: 10,
        lessonTitle: 'Test de leçon'
      }
    }
  },
  async mounted() {
    await this.loadNotifications()
    await this.getNotificationStats()
  },
  methods: {
    async loadProfileData() {
      await this.loadNotifications()
      await this.getNotificationStats()
    },

    async runAllTests() {
      this.isRunningTests = true
      this.testResults = []
      
      const tests = [
        { name: 'Création de notification', fn: this.testCreateNotification },
        { name: 'Récupération des notifications', fn: this.testGetNotifications },
        { name: 'Marquage comme lu', fn: this.testMarkAsRead },
        { name: 'Suppression de notification', fn: this.testDeleteNotification },
        { name: 'Création de notification de quiz', fn: this.testCreateQuizNotification },
        { name: 'Statistiques des notifications', fn: this.testGetStats }
      ]
      
      for (const test of tests) {
        const startTime = Date.now()
        try {
          const result = await test.fn()
          const duration = Date.now() - startTime
          this.testResults.push({
            test: test.name,
            success: result,
            message: result ? 'Test réussi' : 'Test échoué',
            duration
          })
        } catch (error) {
          const duration = Date.now() - startTime
          this.testResults.push({
            test: test.name,
            success: false,
            message: error.message,
            duration
          })
        }
      }
      
      this.isRunningTests = false
    },

    clearTestResults() {
      this.testResults = []
    },

    async testCreateNotification() {
      try {
        const notification = await NotificationService.createNotification(
          this.testProfileId,
          'test',
          'Test automatique',
          'Notification créée par le test automatique',
          { testType: 'automatic' }
        )
        return notification && notification.id
      } catch (error) {
        console.error('Erreur test création:', error)
        return false
      }
    },

    async testGetNotifications() {
      try {
        const notifications = await NotificationService.getNotifications(this.testProfileId)
        return Array.isArray(notifications)
      } catch (error) {
        console.error('Erreur test récupération:', error)
        return false
      }
    },

    async testMarkAsRead() {
      try {
        const notifications = await NotificationService.getNotifications(this.testProfileId)
        if (notifications.length > 0) {
          const result = await NotificationService.markAsRead(notifications[0].id)
          return result && result.is_read === true
        }
        return false
      } catch (error) {
        console.error('Erreur test marquage:', error)
        return false
      }
    },

    async testDeleteNotification() {
      try {
        const notification = await NotificationService.createNotification(
          this.testProfileId,
          'test',
          'Test suppression',
          'Notification à supprimer',
          { testType: 'deletion' }
        )
        if (notification && notification.id) {
          const result = await NotificationService.deleteNotification(notification.id)
          return result === true
        }
        return false
      } catch (error) {
        console.error('Erreur test suppression:', error)
        return false
      }
    },

    async testCreateQuizNotification() {
      try {
        const notification = await NotificationService.createQuizCompletionNotification(
          this.testProfileId,
          {
            score: 8,
            totalQuestions: 10,
            percentage: 80,
            lessonTitle: 'Test automatique'
          }
        )
        return notification && notification.type === 'quiz_completed'
      } catch (error) {
        console.error('Erreur test quiz:', error)
        return false
      }
    },

    async testGetStats() {
      try {
        const stats = await NotificationService.getNotificationStats(this.testProfileId)
        return stats && typeof stats.total === 'number'
      } catch (error) {
        console.error('Erreur test stats:', error)
        return false
      }
    },

    async createNotification() {
      if (!this.newNotification.title || !this.newNotification.message) {
        alert('Veuillez remplir le titre et le message')
        return
      }
      
      this.isCreating = true
      try {
        await NotificationService.createNotification(
          this.testProfileId,
          this.newNotification.type,
          this.newNotification.title,
          this.newNotification.message,
          { createdBy: 'manual_test' }
        )
        this.newNotification = { type: 'test', title: '', message: '' }
        await this.loadNotifications()
        await this.getNotificationStats()
      } catch (error) {
        console.error('Erreur création notification:', error)
        alert('Erreur lors de la création de la notification')
      } finally {
        this.isCreating = false
      }
    },

    async createQuizNotification() {
      this.isCreatingQuiz = true
      try {
        const percentage = Math.round((this.quizData.score / this.quizData.totalQuestions) * 100)
        await NotificationService.createQuizCompletionNotification(
          this.testProfileId,
          {
            ...this.quizData,
            percentage
          }
        )
        await this.loadNotifications()
        await this.getNotificationStats()
      } catch (error) {
        console.error('Erreur création quiz notification:', error)
        alert('Erreur lors de la création de la notification de quiz')
      } finally {
        this.isCreatingQuiz = false
      }
    },

    async loadNotifications() {
      this.isLoading = true
      try {
        this.notifications = await NotificationService.getNotifications(this.testProfileId)
      } catch (error) {
        console.error('Erreur chargement notifications:', error)
        this.notifications = []
      } finally {
        this.isLoading = false
      }
    },

    async markAsRead(notificationId) {
      try {
        await NotificationService.markAsRead(notificationId)
        await this.loadNotifications()
        await this.getNotificationStats()
      } catch (error) {
        console.error('Erreur marquage notification:', error)
      }
    },

    async markAllAsRead() {
      this.isMarkingAll = true
      try {
        await NotificationService.markAllAsRead(this.testProfileId)
        await this.loadNotifications()
        await this.getNotificationStats()
      } catch (error) {
        console.error('Erreur marquage toutes notifications:', error)
      } finally {
        this.isMarkingAll = false
      }
    },

    async deleteNotification(notificationId) {
      try {
        await NotificationService.deleteNotification(notificationId)
        await this.loadNotifications()
        await this.getNotificationStats()
      } catch (error) {
        console.error('Erreur suppression notification:', error)
      }
    },

    async deleteReadNotifications() {
      this.isDeleting = true
      try {
        await NotificationService.deleteReadNotifications(this.testProfileId)
        await this.loadNotifications()
        await this.getNotificationStats()
      } catch (error) {
        console.error('Erreur suppression notifications lues:', error)
      } finally {
        this.isDeleting = false
      }
    },

    async getNotificationStats() {
      this.isLoadingStats = true
      try {
        this.stats = await NotificationService.getNotificationStats(this.testProfileId)
      } catch (error) {
        console.error('Erreur chargement stats:', error)
        this.stats = null
      } finally {
        this.isLoadingStats = false
      }
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return 'À l\'instant'
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `Il y a ${minutes} min`
      } else if (diff < 86400000) {
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
    },

    goBack() {
      this.$router.push({ path: '/dashboard', query: { profile: this.testProfileId } })
    }
  }
}
</script>

<style scoped>
/* Liquid Glass Design Styles */
.glass-card-dashboard {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  padding: 2rem;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

/* Background blob animations */
@keyframes blob {
  0%, 100% { 
    transform: translate(0, 0) scale(1); 
  }
  33% { 
    transform: translate(30px, -50px) scale(1.1); 
  }
  66% { 
    transform: translate(-20px, 20px) scale(0.9); 
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Input styles */
input[type="number"], input[type="text"], textarea, select {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

input[type="number"]:focus, input[type="text"]:focus, textarea:focus, select:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Button styles */
button {
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
}

button:active {
  transform: translateY(0);
}

/* Notification item animations */
.notification-item {
  transition: all 0.3s ease;
}

.notification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Test result animations */
.test-result {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .glass-card-dashboard {
    padding: 1.5rem;
  }
  
  .max-w-6xl {
    max-width: 100%;
    padding: 0 1rem;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
