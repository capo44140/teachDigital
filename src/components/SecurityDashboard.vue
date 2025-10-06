<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100">
    <!-- Header -->
    <header class="bg-white shadow-lg">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-800">Tableau de bord de sécurité</h1>
              <p class="text-sm text-gray-600">Surveillance et logs d'audit</p>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="container mx-auto px-6 py-8">
      <!-- Statistiques de sécurité -->
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Événements totaux</p>
              <p class="text-3xl font-bold text-blue-600">{{ securityStats.totalEvents }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Événements critiques</p>
              <p class="text-3xl font-bold text-red-600">{{ securityStats.criticalEvents }}</p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Connexions échouées</p>
              <p class="text-3xl font-bold text-orange-600">{{ securityStats.failedLogins }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Violations de sécurité</p>
              <p class="text-3xl font-bold text-purple-600">{{ securityStats.securityViolations }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Filtres de recherche</h3>
        <div class="grid md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
            <select v-model="filters.userId" class="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Tous les utilisateurs</option>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
            <select v-model="filters.category" class="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Toutes les catégories</option>
              <option value="authentication">Authentification</option>
              <option value="authorization">Autorisation</option>
              <option value="data_access">Accès aux données</option>
              <option value="security">Sécurité</option>
              <option value="api_usage">Utilisation API</option>
              <option value="system">Système</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
            <select v-model="filters.level" class="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Tous les niveaux</option>
              <option value="info">Info</option>
              <option value="warning">Avertissement</option>
              <option value="error">Erreur</option>
              <option value="critical">Critique</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
            <input v-model="filters.startDate" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2">
          </div>
        </div>
        <div class="flex justify-end space-x-4 mt-4">
          <button @click="applyFilters" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Appliquer les filtres
          </button>
          <button @click="clearFilters" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Effacer
          </button>
        </div>
      </div>

      <!-- Logs d'audit -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-800">Logs d'audit</h3>
          <div class="flex space-x-2">
            <button @click="refreshLogs" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Actualiser
            </button>
            <button @click="exportLogs" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Exporter
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(log.timestamp) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ log.userId }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ log.action }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span class="px-2 py-1 text-xs font-medium rounded-full" :class="getCategoryClass(log.category)">
                    {{ log.category }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span class="px-2 py-1 text-xs font-medium rounded-full" :class="getLevelClass(log.level)">
                    {{ log.level }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  <button @click="showLogDetails(log)" class="text-blue-600 hover:text-blue-800">
                    Voir détails
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-6">
          <div class="text-sm text-gray-700">
            Affichage de {{ filteredLogs.length }} logs
          </div>
          <div class="flex space-x-2">
            <button @click="loadMoreLogs" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Charger plus
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal de détails -->
    <div v-if="selectedLog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800">Détails du log</h3>
            <button @click="selectedLog = null" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Action</label>
              <p class="text-sm text-gray-900">{{ selectedLog.action }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Utilisateur</label>
              <p class="text-sm text-gray-900">{{ selectedLog.userId }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Timestamp</label>
              <p class="text-sm text-gray-900">{{ formatDate(selectedLog.timestamp) }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Détails</label>
              <pre class="text-sm text-gray-900 bg-gray-100 p-3 rounded-lg overflow-x-auto">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { auditLogService } from '../services/auditLogService.js'

export default {
  name: 'SecurityDashboard',
  data() {
    return {
      securityStats: {},
      filteredLogs: [],
      users: [],
      filters: {
        userId: '',
        category: '',
        level: '',
        startDate: '',
        endDate: ''
      },
      selectedLog: null
    }
  },
  async created() {
    await this.loadSecurityStats()
    await this.loadLogs()
    await this.loadUsers()
  },
  methods: {
    async loadSecurityStats() {
      this.securityStats = auditLogService.getSecurityStats(7)
    },
    
    async loadLogs() {
      this.filteredLogs = auditLogService.getLogs(this.filters)
    },
    
    async loadUsers() {
      // Charger la liste des utilisateurs depuis le store
      this.users = [
        { id: '1', name: 'Parent' },
        { id: '2', name: 'Ayna' },
        { id: '3', name: 'Nolann' },
        { id: '4', name: 'Elyo' }
      ]
    },
    
    async applyFilters() {
      await this.loadLogs()
    },
    
    clearFilters() {
      this.filters = {
        userId: '',
        category: '',
        level: '',
        startDate: '',
        endDate: ''
      }
      this.loadLogs()
    },
    
    async refreshLogs() {
      await this.loadSecurityStats()
      await this.loadLogs()
    },
    
    exportLogs() {
      const logs = auditLogService.exportLogs(this.filters)
      const blob = new Blob([logs], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    
    showLogDetails(log) {
      this.selectedLog = log
    },
    
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString('fr-FR')
    },
    
    getCategoryClass(category) {
      const classes = {
        authentication: 'bg-blue-100 text-blue-800',
        authorization: 'bg-green-100 text-green-800',
        data_access: 'bg-yellow-100 text-yellow-800',
        security: 'bg-red-100 text-red-800',
        api_usage: 'bg-purple-100 text-purple-800',
        system: 'bg-gray-100 text-gray-800'
      }
      return classes[category] || 'bg-gray-100 text-gray-800'
    },
    
    getLevelClass(level) {
      const classes = {
        info: 'bg-blue-100 text-blue-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        critical: 'bg-red-200 text-red-900'
      }
      return classes[level] || 'bg-gray-100 text-gray-800'
    },
    
    goBack() {
      this.$router.push('/dashboard')
    }
  }
}
</script>
