<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <!-- Background animated elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <nav class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Retour au dashboard"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-white">Gestion des Activités</h1>
              <p class="text-sm text-white/60 hidden sm:block">Organisez et suivez les activités de vos enfants</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button 
              @click="refreshData"
              :disabled="isLoading"
              class="p-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl backdrop-blur-xl hover:bg-white/10 transition-all"
              title="Actualiser"
            >
              <svg class="w-5 h-5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button 
              @click="showCreateActivityModal = true"
              class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all text-sm flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>Nouvelle activité</span>
            </button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Contenu principal -->
    <main class="relative z-10 container mx-auto px-6 py-12">
      <!-- Statistiques globales -->
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Total des activités</p>
            <p class="text-3xl font-bold text-white">{{ globalStats.totalActivities || 0 }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Activités actives</p>
            <p class="text-3xl font-bold text-white">{{ globalStats.activeActivities || 0 }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Enfants impliqués</p>
            <p class="text-3xl font-bold text-white">{{ childrenStats.length }}</p>
          </div>
        </div>

        <div class="glass-card-stat group">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p class="text-white/60 text-sm">Complétion moyenne</p>
            <p class="text-3xl font-bold text-white">{{ formatPercentage(globalStats.completionRate) }}%</p>
          </div>
        </div>
      </div>

      <!-- Filtres et recherche -->
      <div class="glass-card-dashboard mb-12">
        <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div class="flex flex-col md:flex-row gap-4 flex-1 w-full">
            <div class="relative flex-1">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Rechercher une activité..."
                class="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
              <svg class="absolute left-3 top-2.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <select 
              v-model="selectedChild"
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="" class="bg-slate-900">Tous les enfants</option>
              <option v-for="child in childrenStats" :key="child.id" :value="child.id" class="bg-slate-900">
                {{ child.name }}
              </option>
            </select>
            <select 
              v-model="selectedStatus"
              class="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            >
              <option value="" class="bg-slate-900">Tous les statuts</option>
              <option value="active" class="bg-slate-900">Actives</option>
              <option value="completed" class="bg-slate-900">Terminées</option>
              <option value="paused" class="bg-slate-900">En pause</option>
              <option value="cancelled" class="bg-slate-900">Annulées</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button 
              @click="viewMode = 'grid'"
              :class="[
                'p-2 rounded-xl transition-all',
                viewMode === 'grid' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button 
              @click="viewMode = 'list'"
              :class="[
                'p-2 rounded-xl transition-all',
                viewMode === 'list' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Liste des activités -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-gray-800">
            Activités ({{ filteredActivities.length }})
          </h3>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-500">Trier par:</span>
            <select 
              v-model="sortBy"
              class="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="created_at">Date de création</option>
              <option value="due_date">Date d'échéance</option>
              <option value="title">Titre</option>
              <option value="status">Statut</option>
            </select>
          </div>
        </div>

        <!-- Vue grille -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="activity in filteredActivities" 
            :key="activity.id"
            class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h4 class="font-semibold text-gray-800 mb-2">{{ activity.title }}</h4>
                <p class="text-sm text-gray-600 mb-3">{{ activity.description }}</p>
                <div class="flex items-center space-x-2 mb-3">
                  <span 
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getStatusClass(activity.status)
                    ]"
                  >
                    {{ getStatusLabel(activity.status) }}
                  </span>
                  <span class="text-xs text-gray-500">
                    {{ getChildName(activity.child_id) }}
                  </span>
                </div>
              </div>
              <div class="flex space-x-1">
                <button 
                  @click="editActivity(activity)"
                  class="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Modifier"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button 
                  @click="deleteActivity(activity)"
                  class="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Supprimer"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Créée le:</span>
                <span class="font-medium">{{ formatDate(activity.created_at) }}</span>
              </div>
              <div v-if="activity.due_date" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Échéance:</span>
                <span class="font-medium" :class="getDueDateClass(activity.due_date)">
                  {{ formatDate(activity.due_date) }}
                </span>
              </div>
              <div v-if="activity.priority" class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Priorité:</span>
                <span 
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    getPriorityClass(activity.priority)
                  ]"
                >
                  {{ getPriorityLabel(activity.priority) }}
                </span>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <button 
                  @click="toggleActivityStatus(activity)"
                  :class="[
                    'px-3 py-1 rounded text-sm font-medium transition-colors',
                    activity.status === 'active' 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  ]"
                >
                  {{ activity.status === 'active' ? 'Mettre en pause' : 'Activer' }}
                </button>
                <button 
                  @click="viewActivityDetails(activity)"
                  class="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  Voir détails
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Vue liste -->
        <div v-else class="space-y-4">
          <div 
            v-for="activity in filteredActivities" 
            :key="activity.id"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div class="flex items-center space-x-4 flex-1">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-1">
                  <h4 class="font-semibold text-gray-800">{{ activity.title }}</h4>
                  <span 
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getStatusClass(activity.status)
                    ]"
                  >
                    {{ getStatusLabel(activity.status) }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-2">{{ activity.description }}</p>
                <div class="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{{ getChildName(activity.child_id) }}</span>
                  <span>•</span>
                  <span>Créée le {{ formatDate(activity.created_at) }}</span>
                  <span v-if="activity.due_date">•</span>
                  <span v-if="activity.due_date" :class="getDueDateClass(activity.due_date)">
                    Échéance {{ formatDate(activity.due_date) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button 
                @click="toggleActivityStatus(activity)"
                :class="[
                  'px-3 py-1 rounded text-sm font-medium transition-colors',
                  activity.status === 'active' 
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                ]"
              >
                {{ activity.status === 'active' ? 'Pause' : 'Activer' }}
              </button>
              <button 
                @click="editActivity(activity)"
                class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                title="Modifier"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button 
                @click="deleteActivity(activity)"
                class="p-2 text-red-600 hover:bg-red-50 rounded"
                title="Supprimer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- État vide -->
        <div v-if="filteredActivities.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h4 class="text-lg font-medium text-gray-800 mb-2">Aucune activité trouvée</h4>
          <p class="text-gray-500 mb-4">
            {{ searchQuery || selectedChild || selectedStatus 
              ? 'Aucune activité ne correspond à vos critères de recherche.' 
              : 'Commencez par créer votre première activité pour vos enfants.' 
            }}
          </p>
          <button 
            @click="showCreateActivityModal = true"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Créer une activité
          </button>
        </div>
      </div>
    </main>

    <!-- Modal de création/modification d'activité -->
    <div v-if="showCreateActivityModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-semibold text-gray-800">
              {{ editingActivity ? 'Modifier l\'activité' : 'Nouvelle activité' }}
            </h3>
            <button 
              @click="closeModal"
              class="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <form @submit.prevent="saveActivity" class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Titre de l'activité</label>
            <input 
              v-model="activityForm.title"
              type="text" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Devoirs de mathématiques"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              v-model="activityForm.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Décrivez l'activité en détail..."
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Enfant concerné</label>
              <select 
                v-model="activityForm.child_id"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un enfant</option>
                <option v-for="child in childrenStats" :key="child.id" :value="child.id">
                  {{ child.name }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
              <select 
                v-model="activityForm.priority"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Date d'échéance</label>
              <input 
                v-model="activityForm.due_date"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select 
                v-model="activityForm.status"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="paused">En pause</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button 
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              :disabled="isSaving"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ isSaving ? 'Sauvegarde...' : (editingActivity ? 'Modifier' : 'Créer') }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Affichage de la version -->
    <VersionInfo position="bottom-right" />
  </div>
</template>

<script>
import { useProfileStore } from '../stores/profileStore.js'
import activityService from '../services/activityService.js'
import VersionInfo from './VersionInfo.vue'

export default {
  name: 'ParentActivityManagement',
  components: {
    VersionInfo
  },
  data() {
    return {
      isLoading: false,
      isSaving: false,
      showCreateActivityModal: false,
      editingActivity: null,
      viewMode: 'grid', // 'grid' ou 'list'
      searchQuery: '',
      selectedChild: '',
      selectedStatus: '',
      sortBy: 'created_at',
      childrenStats: [],
      activities: [],
      globalStats: {
        totalActivities: 0,
        activeActivities: 0,
        completionRate: 0
      },
      activityForm: {
        title: '',
        description: '',
        child_id: '',
        priority: 'medium',
        due_date: '',
        status: 'active'
      }
    }
  },
  computed: {
    filteredActivities() {
      let filtered = [...this.activities]
      
      // Filtre par recherche
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(activity => 
          activity.title.toLowerCase().includes(query) ||
          activity.description.toLowerCase().includes(query)
        )
      }
      
      // Filtre par enfant
      if (this.selectedChild) {
        filtered = filtered.filter(activity => activity.child_id === this.selectedChild)
      }
      
      // Filtre par statut
      if (this.selectedStatus) {
        filtered = filtered.filter(activity => activity.status === this.selectedStatus)
      }
      
      // Tri
      filtered.sort((a, b) => {
        switch (this.sortBy) {
          case 'title':
            return a.title.localeCompare(b.title)
          case 'status':
            return a.status.localeCompare(b.status)
          case 'due_date':
            return new Date(a.due_date || 0) - new Date(b.due_date || 0)
          case 'created_at':
          default:
            return new Date(b.created_at) - new Date(a.created_at)
        }
      })
      
      return filtered
    }
  },
  async created() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.isLoading = true
      try {
        const store = useProfileStore()
        await store.loadProfiles()
        
        // Charger les profils enfants
        this.childrenStats = store.nonAdminProfiles || []
        
        // Charger les activités (simulation pour l'instant)
        await this.loadActivities()
        await this.loadGlobalStats()
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async loadActivities() {
      try {
        this.activities = await activityService.getActivities()
      } catch (error) {
        console.error('Erreur lors du chargement des activités:', error)
        this.activities = []
      }
    },
    
    async loadGlobalStats() {
      try {
        const stats = await activityService.getActivityStats()
        this.globalStats = {
          totalActivities: stats.total,
          activeActivities: stats.active,
          completionRate: stats.completion_rate
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
        // Fallback sur les statistiques calculées localement
        this.globalStats = {
          totalActivities: this.activities.length,
          activeActivities: this.activities.filter(a => a.status === 'active').length,
          completionRate: this.activities.length > 0 
            ? Math.round((this.activities.filter(a => a.status === 'completed').length / this.activities.length) * 100)
            : 0
        }
      }
    },
    
    async refreshData() {
      await this.loadData()
    },
    
    getChildName(childId) {
      const child = this.childrenStats.find(c => c.id === childId)
      return child ? child.name : 'Enfant inconnu'
    },
    
    getStatusLabel(status) {
      const labels = {
        'active': 'Active',
        'completed': 'Terminée',
        'paused': 'En pause',
        'cancelled': 'Annulée'
      }
      return labels[status] || status
    },
    
    getStatusClass(status) {
      const classes = {
        'active': 'bg-green-100 text-green-800',
        'completed': 'bg-blue-100 text-blue-800',
        'paused': 'bg-yellow-100 text-yellow-800',
        'cancelled': 'bg-red-100 text-red-800'
      }
      return classes[status] || 'bg-gray-100 text-gray-800'
    },
    
    getPriorityLabel(priority) {
      const labels = {
        'low': 'Faible',
        'medium': 'Moyenne',
        'high': 'Élevée'
      }
      return labels[priority] || priority
    },
    
    getPriorityClass(priority) {
      const classes = {
        'low': 'bg-gray-100 text-gray-800',
        'medium': 'bg-yellow-100 text-yellow-800',
        'high': 'bg-red-100 text-red-800'
      }
      return classes[priority] || 'bg-gray-100 text-gray-800'
    },
    
    getDueDateClass(dueDate) {
      const now = new Date()
      const due = new Date(dueDate)
      const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
      
      if (diffDays < 0) return 'text-red-600 font-semibold'
      if (diffDays === 0) return 'text-orange-600 font-semibold'
      if (diffDays <= 2) return 'text-yellow-600 font-medium'
      return 'text-gray-600'
    },
    
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    formatPercentage(value) {
      if (isNaN(value) || value === null || value === undefined) return 0
      return Math.round(Number(value)) || 0
    },
    
    editActivity(activity) {
      this.editingActivity = activity
      this.activityForm = { ...activity }
      this.showCreateActivityModal = true
    },
    
    async saveActivity() {
      this.isSaving = true
      try {
        if (this.editingActivity) {
          // Modifier l'activité existante
          await activityService.updateActivity(this.editingActivity.id, this.activityForm)
        } else {
          // Créer une nouvelle activité
          await activityService.createActivity(this.activityForm)
        }
        
        // Recharger les données
        await this.loadActivities()
        await this.loadGlobalStats()
        this.closeModal()
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error)
        alert('Erreur lors de la sauvegarde de l\'activité')
      } finally {
        this.isSaving = false
      }
    },
    
    async deleteActivity(activity) {
      if (confirm(`Êtes-vous sûr de vouloir supprimer l'activité "${activity.title}" ?`)) {
        try {
          await activityService.deleteActivity(activity.id)
          // Recharger les données
          await this.loadActivities()
          await this.loadGlobalStats()
        } catch (error) {
          console.error('Erreur lors de la suppression:', error)
          alert('Erreur lors de la suppression de l\'activité')
        }
      }
    },
    
    async toggleActivityStatus(activity) {
      try {
        const newStatus = activity.status === 'active' ? 'paused' : 'active'
        await activityService.updateActivityStatus(activity.id, newStatus)
        // Recharger les données
        await this.loadActivities()
        await this.loadGlobalStats()
      } catch (error) {
        console.error('Erreur lors du changement de statut:', error)
        alert('Erreur lors du changement de statut de l\'activité')
      }
    },
    
    viewActivityDetails(activity) {
      // Rediriger vers une page de détails ou ouvrir un modal
      console.log('Voir détails de l\'activité:', activity)
    },
    
    closeModal() {
      this.showCreateActivityModal = false
      this.editingActivity = null
      this.activityForm = {
        title: '',
        description: '',
        child_id: '',
        priority: 'medium',
        due_date: '',
        status: 'active'
      }
    },
    
    goBack() {
      this.$router.push({ 
        path: '/dashboard',
        query: { 
          profile: this.$route.query.profile || '1',
          unlocked: 'true'
        }
      })
    }
  }
}
</script>

<style scoped>
/* Animations */
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

/* Glass Cards */
.glass-card-dashboard {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  width: 100%;
}

.glass-card-dashboard:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.glass-card-stat {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card-stat:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .glass-card-dashboard {
    padding: 1rem;
    border-radius: 1rem;
  }
}
</style>
